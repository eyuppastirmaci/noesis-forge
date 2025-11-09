import logger from "./logging/logger.js";
import { RabbitMQConnection } from "./messaging/rabbitmq.js";
import { TextEmbeddingWorker } from "./embedding/text-embedding.js";
import { startQueryEmbeddingConsumer } from "./embedding/query-embedding.js";

/**
 * Main worker coordinator
 * Starts all worker processes for document processing
 */
class WorkerCoordinator {
  constructor() {
    this.rabbitmq = null;
    this.textEmbeddingWorker = null;
    this.isShuttingDown = false;
  }

  async start() {
    try {
      logger.info("Starting NoesisForge Workers...");

      // Initialize RabbitMQ connection
      this.rabbitmq = new RabbitMQConnection();
      const channel = await this.rabbitmq.connect();

      if (!channel) {
        throw new Error("Failed to establish RabbitMQ channel");
      }

      logger.info("RabbitMQ connection established");

      // Start text embedding worker for document processing
      this.textEmbeddingWorker = new TextEmbeddingWorker();
      await this.textEmbeddingWorker.start();
      logger.info("Text embedding worker started");

      // Start query embedding consumer for search queries
      await startQueryEmbeddingConsumer(channel);
      logger.info("Query embedding consumer started");

      logger.info("All workers started successfully! 🚀");

      // Setup graceful shutdown handlers
      this.setupShutdownHandlers();
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        "Failed to start workers"
      );
      await this.shutdown();
      process.exit(1);
    }
  }

  setupShutdownHandlers() {
    const shutdownSignals = ["SIGINT", "SIGTERM"];

    shutdownSignals.forEach((signal) => {
      process.on(signal, async () => {
        if (this.isShuttingDown) {
          logger.warn("Shutdown already in progress...");
          return;
        }

        logger.info(`Received ${signal}, initiating graceful shutdown...`);
        await this.shutdown();
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", async (error) => {
      logger.error(
        { error: error.message, stack: error.stack },
        "Uncaught exception occurred"
      );
      await this.shutdown();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", async (reason, promise) => {
      logger.error(
        { reason, promise },
        "Unhandled promise rejection occurred"
      );
      await this.shutdown();
      process.exit(1);
    });
  }

  async shutdown() {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info("Shutting down workers...");

    try {
      // Stop text embedding worker
      if (this.textEmbeddingWorker) {
        await this.textEmbeddingWorker.stop();
        logger.info("Text embedding worker stopped");
      }

      // Close RabbitMQ connection
      if (this.rabbitmq) {
        await this.rabbitmq.close();
        logger.info("RabbitMQ connection closed");
      }

      logger.info("All workers shut down gracefully ✓");
    } catch (error) {
      logger.error(
        { error: error.message },
        "Error during shutdown"
      );
    }
  }
}

// Start the worker coordinator
const coordinator = new WorkerCoordinator();
coordinator.start().catch((error) => {
  logger.error({ error: error.message }, "Failed to start worker coordinator");
  process.exit(1);
});
