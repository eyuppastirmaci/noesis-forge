import amqp from "amqplib";
import logger from "./logger.js";

export class RabbitMQConnection {
  constructor(url) {
    this.url =
      url || process.env.RABBITMQ_URL || "amqp://admin:admin123@localhost:5672";
    this.connection = null;
    this.channel = null;
    this.isConnecting = false;
    this.maxRetries = 10;
    this.retryDelay = 5000; // 5 seconds
    this.currentRetries = 0;

    logger.info(
      {
        url: this.url,
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
      },
      "RabbitMQ connection initialized"
    );
  }

  async connect() {
    if (this.isConnecting) {
      logger.debug("Connection already in progress, waiting for completion");
      return this.waitForConnection();
    }

    this.isConnecting = true;
    logger.info("Starting RabbitMQ connection process");

    while (this.currentRetries < this.maxRetries) {
      try {
        logger.info(
          {
            attempt: this.currentRetries + 1,
            maxRetries: this.maxRetries,
            url: this.url,
          },
          "Attempting RabbitMQ connection"
        );

        // Establish connection to RabbitMQ server
        this.connection = await amqp.connect(this.url);
        this.channel = await this.connection.createChannel();

        // Configure channel for reliable message processing
        await this.channel.prefetch(1);
        logger.debug("Channel prefetch set to 1 for reliable processing");

        // Setup connection event handlers for monitoring
        this.connection.on("error", (err) => {
          logger.error(
            { error: err.message },
            "RabbitMQ connection error occurred"
          );
          this.handleConnectionError();
        });

        this.connection.on("close", () => {
          logger.warn("RabbitMQ connection closed");
          this.connection = null;
          this.channel = null;
          this.isConnecting = false;
        });

        logger.info("RabbitMQ connection established successfully");
        this.isConnecting = false;
        this.currentRetries = 0;

        return this.channel;
      } catch (error) {
        this.currentRetries++;
        logger.warn(
          {
            attempt: this.currentRetries,
            maxRetries: this.maxRetries,
            error: error.message,
          },
          "RabbitMQ connection attempt failed"
        );

        if (this.currentRetries >= this.maxRetries) {
          this.isConnecting = false;
          const errorMessage = `Failed to connect to RabbitMQ after ${this.maxRetries} attempts`;
          logger.error({ maxRetries: this.maxRetries }, errorMessage);
          throw new Error(errorMessage);
        }

        logger.debug({ retryDelay: this.retryDelay }, "Waiting before retry");
        await this.sleep(this.retryDelay);
      }
    }
  }

  async waitForConnection() {
    logger.debug("Waiting for ongoing connection to complete");

    while (this.isConnecting) {
      await this.sleep(100);
    }

    logger.debug("Connection wait completed");
    return this.channel;
  }

  handleConnectionError() {
    logger.warn("Handling connection error, resetting connection state");
    this.connection = null;
    this.channel = null;
    this.isConnecting = false;
    this.currentRetries = 0;
  }

  async ensureConnection() {
    if (!this.connection || !this.channel) {
      logger.debug("Connection not available, establishing new connection");
      await this.connect();
    }
    return this.channel;
  }

  async consumeQueue(queueName, handler) {
    logger.info({ queueName }, "Setting up queue consumer");

    await this.ensureConnection();

    // Ensure queue exists and is durable for reliability
    await this.channel.assertQueue(queueName, { durable: true });
    logger.debug({ queueName }, "Queue asserted successfully");

    logger.info({ queueName }, "Starting message consumption");

    await this.channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          logger.debug(
            {
              queueName,
              messageSize: msg.content.length,
            },
            "Processing message from queue"
          );

          // Execute message handler
          await handler(content, msg);

          // Acknowledge successful processing
          this.channel.ack(msg);
          logger.info(
            { queueName },
            "Message processed and acknowledged successfully"
          );
        } catch (error) {
          logger.error(
            {
              queueName,
              error: error.message,
              messageSize: msg.content.length,
            },
            "Error processing message"
          );

          // Reject message without requeue to prevent infinite loops
          // Consider implementing dead letter queue for failed messages
          this.channel.nack(msg, false, false);
          logger.warn({ queueName }, "Message rejected and not requeued");
        }
      }
    });
  }

  async publishToQueue(queueName, data) {
    logger.debug(
      {
        queueName,
        dataSize: JSON.stringify(data).length,
      },
      "Publishing message to queue"
    );

    await this.ensureConnection();

    // Ensure queue exists before publishing
    await this.channel.assertQueue(queueName, { durable: true });

    const success = this.channel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );

    if (success) {
      logger.info({ queueName }, "Message published successfully");
    } else {
      logger.warn(
        { queueName },
        "Message publishing failed - queue buffer full"
      );
    }

    return success;
  }

  async close() {
    logger.info("Initiating graceful RabbitMQ connection closure");

    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
        logger.debug("Channel closed successfully");
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
        logger.debug("Connection closed successfully");
      }

      logger.info("RabbitMQ connection closed gracefully");
    } catch (error) {
      logger.error(
        { error: error.message },
        "Error during RabbitMQ connection closure"
      );
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
