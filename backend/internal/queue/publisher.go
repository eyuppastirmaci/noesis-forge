// backend/internal/queue/publisher.go
package queue

import (
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/streadway/amqp"
)

type Publisher struct {
	url               string
	conn              *amqp.Connection
	channel           *amqp.Channel
	mutex             sync.Mutex
	responseChannels  map[string]chan *QueryEmbeddingResponse
	responseChannelMu sync.RWMutex
	consumerStarted   bool
	consumerMu        sync.Mutex
}

func NewPublisher(url string) (*Publisher, error) {
	p := &Publisher{
		url:              url,
		responseChannels: make(map[string]chan *QueryEmbeddingResponse),
	}

	if err := p.connect(); err != nil {
		return nil, err
	}

	return p, nil
}

func (p *Publisher) connect() error {
	var err error
	var conn *amqp.Connection
	var ch *amqp.Channel

	conn, err = amqp.Dial(p.url)
	if err != nil {
		return fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	ch, err = conn.Channel()
	if err != nil {
		conn.Close()
		return fmt.Errorf("failed to open channel: %w", err)
	}

	go func() {
		<-conn.NotifyClose(make(chan *amqp.Error))
		logrus.Error("RabbitMQ connection closed. Attempting to reconnect...")
		p.mutex.Lock()
		p.conn = nil
		p.channel = nil
		p.mutex.Unlock()
	}()

	queues := []string{
		"document.extraction",
		"document.text.embedding",
		"document.image.embedding",
		"document.summarization",
		"query.embedding",
		"query.embedding.reply",
	}
	for _, queueName := range queues {
		_, err = ch.QueueDeclare(
			queueName, true, false, false, false, nil,
		)
		if err != nil {
			ch.Close()
			conn.Close()
			return fmt.Errorf("failed to declare queue %s: %w", queueName, err)
		}
	}

	p.conn = conn
	p.channel = ch
	return nil
}

func (p *Publisher) ensureConnection() error {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	if p.channel == nil || p.conn == nil || p.conn.IsClosed() {
		logrus.Warn("RabbitMQ connection is down. Reconnecting...")
		return p.connect()
	}
	return nil
}

// PublishDocumentForProcessing now sends storage path instead of presigned URL
func (p *Publisher) PublishDocumentForProcessing(documentID, storagePath string) error {
	if err := p.ensureConnection(); err != nil {
		return fmt.Errorf("failed to ensure RabbitMQ connection: %w", err)
	}

	// Send message with storage path for workers to access directly
	message := map[string]interface{}{
		"document_id":  documentID,
		"storage_path": storagePath,
		"bucket_name":  "noesis-documents",
		"timestamp":    time.Now().Unix(),
	}

	body, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	queues := []string{
		"document.text.embedding",
		"document.image.embedding",
		"document.summarization",
	}

	for _, queueName := range queues {
		err = p.channel.Publish(
			"",        // exchange
			queueName, // routing key (queue name)
			false,     // mandatory
			false,     // immediate
			amqp.Publishing{
				ContentType:  "application/json",
				Body:         body,
				DeliveryMode: amqp.Persistent,
			},
		)

		if errors.Is(err, amqp.ErrClosed) {
			logrus.Warnf("Publish to %s failed due to closed channel. Retrying after reconnect...", queueName)
			if reconErr := p.ensureConnection(); reconErr != nil {
				return fmt.Errorf("failed to reconnect for retrying publish: %w", reconErr)
			}
			err = p.channel.Publish(
				"", queueName, false, false,
				amqp.Publishing{ContentType: "application/json", Body: body, DeliveryMode: amqp.Persistent},
			)
		}

		if err != nil {
			return fmt.Errorf("failed to publish message to %s after retry: %w", queueName, err)
		}
	}

	return nil
}

// QueryEmbeddingRequest represents a request for query embedding
type QueryEmbeddingRequest struct {
	RequestID  string `json:"request_id"`
	Query      string `json:"query"`
	ModelType  string `json:"model_type"` // "text" or "multimodal"
	ReplyQueue string `json:"reply_queue"`
}

// QueryEmbeddingResponse represents the response from worker
type QueryEmbeddingResponse struct {
	RequestID string    `json:"request_id"`
	Embedding []float32 `json:"embedding"`
	Error     string    `json:"error,omitempty"`
}

// PublishQueryEmbedding publishes a query embedding request to RabbitMQ
func (p *Publisher) PublishQueryEmbedding(requestID, query, modelType string) error {
	if err := p.ensureConnection(); err != nil {
		return fmt.Errorf("failed to ensure RabbitMQ connection: %w", err)
	}

	message := QueryEmbeddingRequest{
		RequestID:  requestID,
		Query:      query,
		ModelType:  modelType,
		ReplyQueue: "query.embedding.reply",
	}

	body, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	err = p.channel.Publish(
		"",                // exchange
		"query.embedding", // routing key (queue name)
		false,             // mandatory
		false,             // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         body,
			DeliveryMode: amqp.Persistent,
		},
	)

	if errors.Is(err, amqp.ErrClosed) {
		logrus.Warn("Publish to query.embedding failed due to closed channel. Retrying after reconnect...")
		if reconErr := p.ensureConnection(); reconErr != nil {
			return fmt.Errorf("failed to reconnect for retrying publish: %w", reconErr)
		}
		err = p.channel.Publish(
			"", "query.embedding", false, false,
			amqp.Publishing{ContentType: "application/json", Body: body, DeliveryMode: amqp.Persistent},
		)
	}

	if err != nil {
		return fmt.Errorf("failed to publish query embedding message after retry: %w", err)
	}

	return nil
}

// startReplyConsumer starts a global consumer for the reply queue
func (p *Publisher) startReplyConsumer() error {
	p.consumerMu.Lock()
	defer p.consumerMu.Unlock()

	if p.consumerStarted {
		return nil
	}

	if err := p.ensureConnection(); err != nil {
		return fmt.Errorf("failed to ensure RabbitMQ connection: %w", err)
	}

	// Create a consumer for the reply queue
	msgs, err := p.channel.Consume(
		"query.embedding.reply", // queue
		"",                      // consumer tag
		false,                   // auto-ack
		false,                   // exclusive
		false,                   // no-local
		false,                   // no-wait
		nil,                     // args
	)
	if err != nil {
		return fmt.Errorf("failed to consume from reply queue: %w", err)
	}

	p.consumerStarted = true

	// Start goroutine to process replies
	go func() {
		for msg := range msgs {
			var response QueryEmbeddingResponse
			if err := json.Unmarshal(msg.Body, &response); err != nil {
				// Invalid message format, nack and requeue
				msg.Nack(false, true)
				continue
			}

			// Acknowledge message
			msg.Ack(false)

			// Find the waiting channel for this request
			p.responseChannelMu.RLock()
			ch, exists := p.responseChannels[response.RequestID]
			p.responseChannelMu.RUnlock()

			if exists {
				// Send response to waiting channel
				select {
				case ch <- &response:
					logrus.Infof("Response delivered successfully (RequestID: %s)", response.RequestID)
				default:
					logrus.Warnf("Channel full or closed (RequestID: %s)", response.RequestID)
				}
			} else {
				logrus.Warnf("No waiting channel found for RequestID: %s", response.RequestID)
			}
		}
		logrus.Warn("Reply consumer goroutine ended")
	}()

	return nil
}

// ConsumeQueryEmbeddingResponse waits for a response with the given requestID
func (p *Publisher) ConsumeQueryEmbeddingResponse(requestID string, timeout time.Duration) (*QueryEmbeddingResponse, error) {

	// Ensure the reply consumer is started
	if err := p.startReplyConsumer(); err != nil {
		logrus.Errorf("[Publisher] Failed to start reply consumer: %v", err)
		return nil, fmt.Errorf("failed to start reply consumer: %w", err)
	}

	// Create a channel for this request
	responseChan := make(chan *QueryEmbeddingResponse, 1)

	p.responseChannelMu.Lock()
	p.responseChannels[requestID] = responseChan
	p.responseChannelMu.Unlock()

	// Clean up channel when done
	defer func() {
		p.responseChannelMu.Lock()
		delete(p.responseChannels, requestID)
		p.responseChannelMu.Unlock()
		close(responseChan)
	}()

	// Wait for response with timeout
	select {
	case <-time.After(timeout):
		logrus.Errorf("[Publisher] Timeout waiting for response (RequestID: %s)", requestID)
		return nil, fmt.Errorf("timeout waiting for embedding response")
	case response, ok := <-responseChan:
		if !ok {
			logrus.Errorf("[Publisher] Response channel closed (RequestID: %s)", requestID)
			return nil, fmt.Errorf("response channel closed")
		}
		if response.Error != "" {
			logrus.Errorf("[Publisher] Worker returned error (RequestID: %s): %s", requestID, response.Error)
			return nil, fmt.Errorf("worker error: %s", response.Error)
		}
		return response, nil
	}
}

func (p *Publisher) Close() {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	if p.channel != nil {
		p.channel.Close()
	}
	if p.conn != nil {
		p.conn.Close()
	}
}
