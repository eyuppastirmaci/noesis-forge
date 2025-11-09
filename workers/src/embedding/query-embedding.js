import logger from "../logging/logger.js";
import { TextEmbeddingWorker } from "./text-embedding.js";

const QUEUE_NAME = "query.embedding";
const REPLY_QUEUE = "query.embedding.reply";

/**
 * Start query embedding consumer
 * Processes search query embedding requests from backend
 * @param {import('amqplib').Channel} channel - RabbitMQ channel
 */
export async function startQueryEmbeddingConsumer(channel) {
  try {
    // Ensure queues exist
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.assertQueue(REPLY_QUEUE, { durable: true });

    // Prefetch 1 message at a time for better load distribution
    channel.prefetch(1);

    // Initialize text embedding worker
    const embeddingWorker = new TextEmbeddingWorker();
    await embeddingWorker.initialize();

    // Consume messages from query embedding queue
    channel.consume(
      QUEUE_NAME,
      async (msg) => {
        if (!msg) return;

        const startTime = Date.now();
        let requestData;

        try {
          // Parse message
          requestData = JSON.parse(msg.content.toString());
          const { request_id, query, model_type, reply_queue } = requestData;

          // Validate input
          if (!query || typeof query !== "string") {
            throw new Error("Invalid query: must be a non-empty string");
          }

          // Generate embedding based on model type
          let embedding;

          if (model_type === "text" || !model_type) {
            // Use text embedding model (BGE-M3)
            embedding = await embeddingWorker.generateEmbedding(query);
          } else if (model_type === "multimodal") {
            // For multimodal queries, we can still use text embedding
            // In future, could combine with image features if needed
            embedding = await embeddingWorker.generateEmbedding(query);
          } else {
            throw new Error(`Unsupported model type: ${model_type}`);
          }

          // Convert Float32Array to regular array for JSON serialization
          const embeddingArray = Array.from(embedding);

          // Prepare response
          const response = {
            request_id,
            embedding: embeddingArray,
            error: null,
          };

          // Send response to reply queue
          channel.sendToQueue(
            reply_queue || REPLY_QUEUE,
            Buffer.from(JSON.stringify(response)),
            {
              persistent: true,
              contentType: "application/json",
            }
          );

          channel.ack(msg);
        } catch (error) {
          logger.error(
            `QueryEmbedding Error processing message:`,
            error.message
          );

          try {
            const { request_id, reply_queue } = requestData || {};

            if (request_id) {
              const errorResponse = {
                request_id,
                embedding: null,
                error: error.message || "Unknown error occurred",
              };

              channel.sendToQueue(
                reply_queue || REPLY_QUEUE,
                Buffer.from(JSON.stringify(errorResponse)),
                {
                  persistent: true,
                  contentType: "application/json",
                }
              );

            }
          } catch (replyError) {
            logger.error(
              `QueryEmbedding Failed to send error response:`,
              replyError.message
            );
          }

          channel.nack(msg, false, false);
        }
      },
      {
        noAck: false, // Manual acknowledgment
      }
    );

  } catch (error) {
    logger.error("QueryEmbedding Failed to start consumer:", error);
    throw error;
  }
}

/**
 * Graceful shutdown handler
 * @param {TextEmbeddingWorker} worker
 */
export async function shutdownQueryEmbeddingWorker(worker) {
  try {
    if (worker) {
      await worker.cleanup();
    }
  } catch (error) {
    logger.error("QueryEmbedding Error during shutdown:", error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const amqp = await import("amqplib");
      const rabbitmqUrl =
        process.env.RABBITMQ_URL || "amqp://admin:admin123@localhost:5672";

      const connection = await amqp.connect(rabbitmqUrl);
      const channel = await connection.createChannel();

      // Start the consumer
      await startQueryEmbeddingConsumer(channel);

      // Handle graceful shutdown
      process.on("SIGINT", async () => {
        await channel.close();
        await connection.close();
        process.exit(0);
      });

      process.on("SIGTERM", async () => {
        await channel.close();
        await connection.close();
        process.exit(0);
      });
    } catch (error) {
      logger.error(
        { error: error.message },
        "Failed to start query embedding worker"
      );
      process.exit(1);
    }
  })();
}
