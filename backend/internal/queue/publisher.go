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
	url     string
	conn    *amqp.Connection
	channel *amqp.Channel
	mutex   sync.Mutex
}

func NewPublisher(url string) (*Publisher, error) {
	p := &Publisher{
		url: url,
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
	logrus.Info("Successfully connected to RabbitMQ and declared queues")
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

	logrus.Infof("Successfully published message for document %s to embedding queues", documentID)
	return nil
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
