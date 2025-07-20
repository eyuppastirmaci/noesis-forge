import amqp from "amqplib";

export class RabbitMQConnection {
  constructor(url) {
    this.url = url || process.env.RABBITMQ_URL || "amqp://admin:admin123@localhost:5672";
    this.connection = null;
    this.channel = null;
    this.isConnecting = false;
    this.maxRetries = 10;
    this.retryDelay = 5000; // 5 seconds
    this.currentRetries = 0;
  }

  async connect() {
    if (this.isConnecting) {
      console.log('Connection already in progress, waiting...');
      return this.waitForConnection();
    }

    this.isConnecting = true;

    while (this.currentRetries < this.maxRetries) {
      try {
        console.log(`Attempting to connect to RabbitMQ (attempt ${this.currentRetries + 1}/${this.maxRetries})...`);
        console.log(`Connecting to: ${this.url}`);
        
        this.connection = await amqp.connect(this.url);
        this.channel = await this.connection.createChannel();

        // Set prefetch to process one message at a time
        await this.channel.prefetch(1);

        // Handle connection events
        this.connection.on('error', (err) => {
          console.error('RabbitMQ connection error:', err);
          this.handleConnectionError();
        });

        this.connection.on('close', () => {
          console.log('RabbitMQ connection closed');
          this.connection = null;
          this.channel = null;
          this.isConnecting = false;
        });

        console.log("Connected to RabbitMQ successfully");
        this.isConnecting = false;
        this.currentRetries = 0;
        
        return this.channel;
        
      } catch (error) {
        console.error(`RabbitMQ connection failed (attempt ${this.currentRetries + 1}):`, error.message);
        this.currentRetries++;
        
        if (this.currentRetries >= this.maxRetries) {
          this.isConnecting = false;
          throw new Error(`Failed to connect to RabbitMQ after ${this.maxRetries} attempts`);
        }
        
        console.log(`Retrying in ${this.retryDelay/1000} seconds...`);
        await this.sleep(this.retryDelay);
      }
    }
  }

  async waitForConnection() {
    while (this.isConnecting) {
      await this.sleep(100);
    }
    return this.channel;
  }

  handleConnectionError() {
    this.connection = null;
    this.channel = null;
    this.isConnecting = false;
    this.currentRetries = 0;
  }

  async ensureConnection() {
    if (!this.connection || !this.channel) {
      await this.connect();
    }
    return this.channel;
  }

  async consumeQueue(queueName, handler) {
    await this.ensureConnection();
    
    await this.channel.assertQueue(queueName, { durable: true });

    console.log(`Waiting for messages in ${queueName}...`);

    await this.channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          console.log(`Processing message from ${queueName}:`, content);
          
          await handler(content, msg);
          this.channel.ack(msg);
          console.log(`Message processed successfully from ${queueName}`);
          
        } catch (error) {
          console.error("Error processing message:", error);
          
          // Reject message and don't requeue to avoid infinite loops
          // You might want to implement a dead letter queue here
          this.channel.nack(msg, false, false);
        }
      }
    });
  }

  async publishToQueue(queueName, data) {
    await this.ensureConnection();
    
    await this.channel.assertQueue(queueName, { durable: true });

    return this.channel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      
      console.log('RabbitMQ connection closed gracefully');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}