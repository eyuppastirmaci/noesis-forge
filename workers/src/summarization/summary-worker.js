import { RabbitMQConnection } from "../messaging/rabbitmq.js";
import { ModelManager } from "../models/model-manager.js";
import BackendClient from "../api/backend-client.js";
import logger from "../logging/logger.js";

class SummaryWorker {
  constructor() {
    this.rabbitmq = new RabbitMQConnection();
    this.backendClient = new BackendClient();
    this.modelManager = new ModelManager();
    this.summarizer = null;
    
    // Configuration for summarization - Optimized for compatibility
    this.maxLength = parseInt(process.env.SUMMARY_MAX_LENGTH) || 200;
    this.minLength = parseInt(process.env.SUMMARY_MIN_LENGTH) || 50;
    this.maxInputLength = parseInt(process.env.SUMMARY_MAX_INPUT) || 1000; // Reduced for better compatibility
  }

  async initialize() {
    logger.info("Initializing summary worker");

    try {
      // Load smaller, more compatible summarization model
      logger.info("Loading DistilBART summarization model for better compatibility");
      this.summarizer = await this.modelManager.ensureModel(
        "summarization",
        "sshleifer/distilbart-cnn-12-6", // Smaller, faster, more compatible
        { quantized: true }
      );
      logger.info("DistilBART summarization model loaded successfully");
      
      logger.info(
        { 
          model: "sshleifer/distilbart-cnn-12-6",
          maxLength: this.maxLength,
          minLength: this.minLength,
          maxInputLength: this.maxInputLength
        },
        "Summary worker initialization completed"
      );
    } catch (error) {
      logger.error(
        { error: error.message },
        "Failed to initialize summary worker"
      );
      throw error;
    }
  }


  async start() {
    logger.info("Starting summary worker");

    await this.initialize();
    await this.rabbitmq.connect();
    await this.rabbitmq.consumeQueue(
      "document.summarization",
      this.processDocument.bind(this)
    );

    logger.info("Summary worker started and listening for messages");
  }

  async processDocument({ document_id, extracted_text, storage_path }) {
    logger.info(
      { document_id },
      "Processing document for summarization"
    );

    try {
      let textToSummarize = extracted_text;

      // If no extracted text provided, try to get it from database or extract from storage
      if (!textToSummarize && storage_path) {
        logger.warn(
          { document_id },
          "No extracted text provided, cannot generate summary without text content"
        );
        return;
      }

      if (!textToSummarize || textToSummarize.trim().length === 0) {
        logger.warn({ document_id }, "No text content available for summarization");
        return;
      }

      logger.debug(
        { 
          document_id, 
          textLength: textToSummarize.length,
          preview: textToSummarize.substring(0, 200) + "..."
        },
        "Generating summary for document text"
      );

      // Generate summary using DistilBART
      const summary = await this.generateSummary(textToSummarize);
      
      if (!summary) {
        logger.error({ document_id }, "Failed to generate summary");
        return;
      }

      // Save summary to database
      const saveSuccess = await this.backendClient.saveSummary(document_id, summary);
      
      if (saveSuccess) {
        logger.info(
          { 
            document_id, 
            summaryLength: summary.length 
          },
          "Document summary generated and saved successfully"
        );
      } else {
        logger.error(
          { document_id },
          "Failed to save generated summary to database"
        );
      }

    } catch (error) {
      logger.error(
        { document_id, error: error.message },
        "Error processing document for summarization"
      );
      throw error;
    }
  }

  async generateSummary(text) {
    try {
      // Truncate text if too long for DistilBART model (more conservative limit)
      const truncatedText = text.length > this.maxInputLength 
        ? text.substring(0, this.maxInputLength) + "...[content truncated for processing]"
        : text;

      logger.debug(
        { 
          model: "sshleifer/distilbart-cnn-12-6",
          originalLength: text.length,
          processedLength: truncatedText.length,
          maxOutputLength: this.maxLength,
          minOutputLength: this.minLength
        },
        "Generating summary using DistilBART model"
      );

      // Use DistilBART summarization model - smaller and more compatible
      const summaryResult = await this.summarizer(truncatedText, {
        max_length: this.maxLength,
        min_length: this.minLength,
        do_sample: false,  // Deterministic output for consistency
        early_stopping: true,
        num_beams: 4,      // Good balance between quality and speed
        length_penalty: 2.0, // Prefer shorter summaries
      });

      if (!summaryResult || !summaryResult[0] || !summaryResult[0].summary_text) {
        throw new Error("Invalid response from summarization model");
      }

      const generatedSummary = summaryResult[0].summary_text.trim();
      
      logger.info(
        { 
          summaryLength: generatedSummary.length,
          originalTextLength: text.length,
          compressionRatio: Math.round((generatedSummary.length / text.length) * 100) + "%",
          model: "sshleifer/distilbart-cnn-12-6"
        },
        "Summary generated successfully with DistilBART"
      );

      return generatedSummary;

    } catch (error) {
      logger.error(
        { 
          error: error.message,
          model: "sshleifer/distilbart-cnn-12-6"
        },
        "Failed to generate summary using DistilBART model"
      );
      throw error;
    }
  }


  async stop() {
    logger.info("Stopping summary worker");
    if (this.rabbitmq) {
      await this.rabbitmq.close();
    }
    logger.info("Summary worker stopped successfully");
  }
}

// Graceful shutdown handlers
process.on("SIGINT", async () => {
  logger.info("Received SIGINT, shutting down gracefully");
  if (worker) {
    await worker.stop();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, shutting down gracefully");
  if (worker) {
    await worker.stop();
  }
  process.exit(0);
});

const worker = new SummaryWorker();
worker.start().catch((error) => {
  logger.error(
    { error: error.message },
    "Failed to start summary worker"
  );
  process.exit(1);
});