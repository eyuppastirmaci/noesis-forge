import { RabbitMQConnection } from "../messaging/rabbitmq.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import { ModelManager } from "../models/model-manager.js";
import { MinIOClient } from "../storage/minio-client.js";
import BackendClient from "../api/backend-client.js";
import logger from "../logging/logger.js";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.min.mjs";
import crypto from "crypto";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Setup DOMMatrix polyfill for PDF.js compatibility
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;
    }
    scale(x, y = x) {
      return this;
    }
    translate(x, y) {
      return this;
    }
  };
}

class TextEmbeddingWorker {
  constructor() {
    this.rabbitmq = new RabbitMQConnection();
    this.qdrantClient = new QdrantClient({
      url: process.env.QDRANT_URL || "http://localhost:6333",
    });
    this.minioClient = new MinIOClient();
    this.backendClient = new BackendClient();
    this.extractor = null;
    this.modelManager = new ModelManager();
  }

  async initialize() {
    logger.info("Initializing text embedding worker");

    try {
      // Load BGE-M3 model for text embeddings
      logger.info("Loading BGE-M3 text embedding model");
      this.extractor = await this.modelManager.ensureModel(
        "feature-extraction",
        "Xenova/bge-m3",
        { quantized: true }
      );
      logger.info("BGE-M3 model loaded successfully");

      await this.ensureQdrantCollection();
      logger.info("Text embedding worker initialization completed");
    } catch (error) {
      logger.error(
        { error: error.message },
        "Failed to initialize text embedding worker"
      );
      throw error;
    }
  }

  async ensureQdrantCollection() {
    try {
      const collectionName = "documents_text";
      const vectorSize = 1024;

      logger.debug(
        { collectionName, vectorSize },
        "Checking Qdrant collection"
      );

      const collections = await this.qdrantClient.getCollections();
      const collectionExists = collections.collections.some(
        (col) => col.name === collectionName
      );

      if (!collectionExists) {
        logger.info(
          { collectionName, vectorSize },
          "Creating new Qdrant collection"
        );
        await this.qdrantClient.createCollection(collectionName, {
          vectors: { size: vectorSize, distance: "Cosine" },
        });
        logger.info(
          { collectionName },
          "Qdrant collection created successfully"
        );
      } else {
        logger.debug({ collectionName }, "Qdrant collection already exists");
      }
    } catch (error) {
      logger.error(
        { error: error.message },
        "Error ensuring Qdrant collection"
      );
    }
  }

  async start() {
    logger.info("Starting text embedding worker");

    await this.initialize();
    await this.rabbitmq.connect();
    await this.rabbitmq.consumeQueue(
      "document.text.embedding",
      this.processDocument.bind(this)
    );

    logger.info("Worker started and listening for text embedding messages");
  }

  async processDocument({ document_id, storage_path, bucket_name, chunks }) {
    logger.info(
      { document_id, storage_path },
      "Processing document for text embeddings"
    );

    try {
      let chunksToProcess = chunks;

      if (!chunks && storage_path) {
        logger.debug({ document_id }, "Extracting text from storage");
        chunksToProcess = await this.extractTextFromMinIO(storage_path);
        
        // Save extracted text to database
        if (chunksToProcess && chunksToProcess.length > 0) {
          const fullText = chunksToProcess.map(chunk => chunk.text).join('\n');
          await this.backendClient.saveExtractedText(document_id, fullText);
        }
      }

      if (!chunksToProcess || chunksToProcess.length === 0) {
        logger.warn({ document_id }, "No text chunks found to process");
        return;
      }

      logger.info(
        { document_id, chunkCount: chunksToProcess.length },
        "Found text chunks to process"
      );

      // Process chunks in batches to optimize performance
      const batchSize = 16;
      const totalBatches = Math.ceil(chunksToProcess.length / batchSize);

      for (let i = 0; i < chunksToProcess.length; i += batchSize) {
        const batch = chunksToProcess.slice(i, i + batchSize);
        const batchIndex = Math.floor(i / batchSize) + 1;

        logger.debug(
          { document_id, batchIndex, totalBatches },
          "Processing text batch"
        );
        await this.processBatch(document_id, batch, i);
      }

      logger.info(
        { document_id, totalChunks: chunksToProcess.length },
        "Document text processing completed"
      );

      // Trigger summary generation after text processing is complete
      if (chunksToProcess && chunksToProcess.length > 0) {
        await this.triggerSummaryGeneration(document_id, chunksToProcess);
      }
    } catch (error) {
      logger.error(
        { document_id, error: error.message },
        "Error processing document text embeddings"
      );
      throw error;
    }
  }

  async extractTextFromMinIO(storagePath) {
    try {
      logger.debug({ storagePath }, "Downloading file from MinIO");
      const fileBuffer = await this.minioClient.downloadFile(storagePath);
      const pathname = storagePath.toLowerCase();

      if (pathname.endsWith(".pdf")) {
        logger.debug({ storagePath }, "Extracting text from PDF");
        return await this.extractTextFromPDF(fileBuffer);
      } else if (pathname.endsWith(".txt")) {
        logger.debug({ storagePath }, "Processing text file");
        const text = fileBuffer.toString("utf-8");
        return this.chunkText(text);
      } else {
        logger.warn(
          { storagePath },
          "Unsupported file type for text extraction"
        );
        return [];
      }
    } catch (error) {
      logger.error(
        { storagePath, error: error.message },
        "Error extracting text from storage"
      );
      return [];
    }
  }

  async extractTextFromPDF(pdfBuffer) {
    try {
      logger.debug("Starting PDF text extraction");

      // Configure PDF.js font path
      const pdfjsDistRoot = path.dirname(
        require.resolve("pdfjs-dist/package.json")
      );
      const standardFontDataUrl = path.join(pdfjsDistRoot, "standard_fonts/");

      const pdfDocument = await getDocument({
        data: new Uint8Array(pdfBuffer),
        standardFontDataUrl: standardFontDataUrl,
      }).promise;

      const chunks = [];
      const numPages = pdfDocument.numPages;
      logger.info({ numPages }, "PDF loaded successfully for text extraction");

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => item.str)
            .join(" ")
            .trim();

          if (pageText.length > 0) {
            const pageChunks = this.chunkText(pageText, pageNum);
            chunks.push(...pageChunks);

            if (pageNum % 10 === 0) {
              logger.debug(
                { pageNum, totalPages: numPages },
                "PDF text extraction progress"
              );
            }
          }
        } catch (pageError) {
          logger.warn(
            { pageNum, error: pageError.message },
            "Error processing PDF page"
          );
        }
      }

      logger.info(
        { extractedChunks: chunks.length, totalPages: numPages },
        "PDF text extraction completed"
      );
      return chunks;
    } catch (error) {
      logger.error({ error: error.message }, "PDF text extraction failed");
      return [];
    }
  }

  chunkText(text, pageNumber = null) {
    const maxChunkSize = 512;
    const chunks = [];

    // Split text into sentences for better semantic chunks
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    let currentChunk = "";
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();

      // Check if adding sentence would exceed chunk size
      if (
        currentChunk.length + trimmedSentence.length + 1 > maxChunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push({
          text: currentChunk.trim(),
          pageNumber,
          size: currentChunk.length,
          chunkIndex: chunkIndex++,
        });
        currentChunk = "";
      }

      if (currentChunk.length > 0) {
        currentChunk += " ";
      }
      currentChunk += trimmedSentence;

      // Handle very long sentences by splitting on words
      if (currentChunk.length > maxChunkSize) {
        const words = currentChunk.split(" ");
        let wordChunk = "";

        for (const word of words) {
          if (
            wordChunk.length + word.length + 1 > maxChunkSize &&
            wordChunk.length > 0
          ) {
            chunks.push({
              text: wordChunk.trim(),
              pageNumber,
              size: wordChunk.length,
              chunkIndex: chunkIndex++,
            });
            wordChunk = "";
          }

          if (wordChunk.length > 0) {
            wordChunk += " ";
          }
          wordChunk += word;
        }
        currentChunk = wordChunk;
      }
    }

    // Add remaining text as final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        pageNumber,
        size: currentChunk.length,
        chunkIndex: chunkIndex++,
      });
    }

    return chunks;
  }

  async processBatch(document_id, chunks, startIndex) {
    const points = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkIndex = startIndex + i;

      try {
        logger.debug(
          { document_id, chunkIndex },
          "Creating embedding for text chunk"
        );

        // Generate embedding using BGE-M3 model
        const output = await this.extractor(chunk.text, {
          pooling: "mean",
          normalize: true,
        });
        const embedding = Array.from(output.data);
        const pointId = crypto.randomUUID();

        points.push({
          id: pointId,
          vector: embedding,
          payload: {
            document_id,
            chunk_index: chunkIndex,
            text: chunk.text,
            page_number: chunk.pageNumber || null,
            size: chunk.size || chunk.text.length,
            type: "text_chunk",
            created_at: new Date().toISOString(),
          },
        });
      } catch (chunkError) {
        logger.error(
          { document_id, chunkIndex, error: chunkError.message },
          "Error processing text chunk"
        );
      }
    }

    if (points.length === 0) {
      logger.warn({ document_id }, "No embeddings created for text batch");
      return;
    }

    // Insert text embeddings into vector database
    logger.debug(
      { document_id, pointCount: points.length },
      "Inserting text embeddings into Qdrant"
    );
    await this.qdrantClient.upsert("documents_text", { wait: true, points });
    logger.info(
      { document_id, inserted: points.length },
      "Text batch embeddings inserted successfully"
    );
  }

  async triggerSummaryGeneration(document_id, chunks) {
    try {
      // Combine all chunks into full text
      const fullText = chunks.map(chunk => chunk.text).join('\n');
      
      const message = {
        document_id: document_id,
        extracted_text: fullText,
        timestamp: new Date().toISOString(),
      };

      logger.debug(
        { document_id, textLength: fullText.length },
        "Triggering summary generation"
      );

      await this.rabbitmq.publishToQueue("document.summarization", message);
      
      logger.info(
        { document_id },
        "Summary generation triggered successfully"
      );
    } catch (error) {
      logger.error(
        { document_id, error: error.message },
        "Failed to trigger summary generation"
      );
    }
  }

  async stop() {
    logger.info("Stopping text embedding worker");
    if (this.rabbitmq) {
      await this.rabbitmq.close();
    }
    logger.info("Text embedding worker stopped successfully");
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

const worker = new TextEmbeddingWorker();
worker.start().catch((error) => {
  logger.error(
    { error: error.message },
    "Failed to start text embedding worker"
  );
  process.exit(1);
});
