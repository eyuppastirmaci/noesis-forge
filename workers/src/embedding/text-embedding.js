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
    try {
      // Load BGE-M3 model for text embeddings
      this.extractor = await this.modelManager.ensureModel(
        "feature-extraction",
        "Xenova/bge-m3",
        { quantized: true }
      );

      await this.ensureQdrantCollection();
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

      const collections = await this.qdrantClient.getCollections();
      const collectionExists = collections.collections.some(
        (col) => col.name === collectionName
      );

      if (!collectionExists) {
        await this.qdrantClient.createCollection(collectionName, {
          vectors: { size: vectorSize, distance: "Cosine" },
        });
      }
    } catch (error) {
      logger.error(
        { error: error.message },
        "Error ensuring Qdrant collection"
      );
    }
  }

  async start() {
    await this.initialize();
    await this.rabbitmq.connect();
    await this.rabbitmq.consumeQueue(
      "document.text.embedding",
      this.processDocument.bind(this)
    );
  }

  async processDocument({ document_id, storage_path, bucket_name, chunks }) {
    // Mark text embedding as processing
    await this.backendClient.updateProcessingTask(
      document_id,
      "text-embedding",
      "processing",
      0,
      "text-embedding-worker"
    );

    try {
      let chunksToProcess = chunks;

      if (!chunks && storage_path) {
        chunksToProcess = await this.extractTextFromMinIO(storage_path);

        // Save extracted text to database
        if (chunksToProcess && chunksToProcess.length > 0) {
          const fullText = chunksToProcess
            .map((chunk) => chunk.text)
            .join("\n");
          await this.backendClient.saveExtractedText(document_id, fullText);
        }
      }

      if (!chunksToProcess || chunksToProcess.length === 0) {
        logger.warn({ document_id }, "No text chunks found to process");
        return;
      }

      // Process chunks in batches to optimize performance
      const batchSize = 16;
      const totalBatches = Math.ceil(chunksToProcess.length / batchSize);

      for (let i = 0; i < chunksToProcess.length; i += batchSize) {
        const batch = chunksToProcess.slice(i, i + batchSize);
        const batchIndex = Math.floor(i / batchSize) + 1;

        await this.processBatch(document_id, batch, i);
      }

      // Mark text embedding as completed
      await this.backendClient.updateProcessingTask(
        document_id,
        "text-embedding",
        "completed",
        100,
        "text-embedding-worker"
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

      // Mark text embedding as failed
      await this.backendClient.updateProcessingTask(
        document_id,
        "text-embedding",
        "failed",
        0,
        "text-embedding-worker",
        error.message
      );

      throw error;
    }
  }

  async extractTextFromMinIO(storagePath) {
    try {
      const fileBuffer = await this.minioClient.downloadFile(storagePath);
      const pathname = storagePath.toLowerCase();

      if (pathname.endsWith(".pdf")) {
        return await this.extractTextFromPDF(fileBuffer);
      } else if (pathname.endsWith(".txt")) {
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

    await this.qdrantClient.upsert("documents_text", { wait: true, points });
  }

  async triggerSummaryGeneration(document_id, chunks) {
    try {
      // Combine all chunks into full text
      const fullText = chunks.map((chunk) => chunk.text).join("\n");

      const message = {
        document_id: document_id,
        extracted_text: fullText,
        timestamp: new Date().toISOString(),
      };

      await this.rabbitmq.publishToQueue("document.summarization", message);
    } catch (error) {
      logger.error(
        { document_id, error: error.message },
        "Failed to trigger summary generation"
      );
    }
  }

  async stop() {
    if (this.rabbitmq) {
      await this.rabbitmq.close();
    }
  }
}

// Graceful shutdown handlers
process.on("SIGINT", async () => {
  if (worker) {
    await worker.stop();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
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
