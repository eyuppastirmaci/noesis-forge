import { RabbitMQConnection } from "../utils/rabbitmq.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import { ModelManager } from "../utils/model-manager.js";
import { MinIOClient } from "../utils/minio-client.js";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.min.mjs";
import crypto from "crypto";

// Set up global polyfills for pdfjs
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Create minimal DOM polyfills if needed
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
    this.extractor = null;
    this.modelManager = new ModelManager();
  }

  async initialize() {
    console.log("Initializing Text Embedding Worker...");

    try {
      // Load BGE-M3 model for text embeddings
      this.extractor = await this.modelManager.ensureModel(
        "feature-extraction",
        "Xenova/bge-m3",
        { quantized: true }
      );

      console.log("BGE-M3 model ready");

      // Ensure Qdrant collection exists
      await this.ensureQdrantCollection();
    } catch (error) {
      console.error("Failed to initialize Text Embedding Worker:", error);
      throw error;
    }
  }

  async ensureQdrantCollection() {
    try {
      // Check if collection exists
      const collections = await this.qdrantClient.getCollections();
      const collectionExists = collections.collections.some(
        (col) => col.name === "documents_text"
      );

      if (!collectionExists) {
        console.log("Creating Qdrant collection: documents_text");
        await this.qdrantClient.createCollection("documents_text", {
          vectors: {
            size: 1024, // BGE-M3 embedding size
            distance: "Cosine",
          },
        });
        console.log("Qdrant collection created successfully");
      } else {
        console.log("Qdrant collection documents_text already exists");
      }
    } catch (error) {
      console.error("Error ensuring Qdrant collection:", error);
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
    console.log(`Processing document ${document_id} for text embeddings`);

    try {
      let chunksToProcess = chunks;

      // If no chunks provided, extract from file using storage path
      if (!chunks && storage_path) {
        console.log(`Downloading and extracting text from MinIO: ${storage_path}`);
        chunksToProcess = await this.extractTextFromMinIO(storage_path);
      }

      if (!chunksToProcess || chunksToProcess.length === 0) {
        console.log("No text chunks to process");
        return;
      }

      console.log(
        `Creating embeddings for document ${document_id} with ${chunksToProcess.length} chunks`
      );

      const batchSize = 8;
      for (let i = 0; i < chunksToProcess.length; i += batchSize) {
        const batch = chunksToProcess.slice(i, i + batchSize);
        console.log(
          `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
            chunksToProcess.length / batchSize
          )}`
        );

        await this.processBatch(document_id, batch, i);
      }

      console.log(
        `Successfully processed all ${chunksToProcess.length} chunks for document ${document_id}`
      );
    } catch (error) {
      console.error(`Error embedding document ${document_id}:`, error);
      throw error;
    }
  }

  async extractTextFromMinIO(storagePath) {
    try {
      // Download file from MinIO
      const fileBuffer = await this.minioClient.downloadFile(storagePath);
      
      // Determine file type from storage path
      const pathname = storagePath.toLowerCase();
      
      if (pathname.endsWith('.pdf')) {
        return await this.extractTextFromPDF(fileBuffer);
      } else if (pathname.endsWith('.txt')) {
        const text = fileBuffer.toString('utf-8');
        return this.chunkText(text);
      } else {
        console.log('Unsupported file type for text extraction');
        return [];
      }
    } catch (error) {
      console.error("Error extracting text from MinIO:", error);
      return [];
    }
  }

  async extractTextFromPDF(pdfBuffer) {
    try {
      console.log("Extracting text from PDF...");

      // Load PDF document using legacy build
      const pdfDocument = await getDocument({
        data: new Uint8Array(pdfBuffer),
        useSystemFonts: true,
        disableFontFace: true,
        standardFontDataUrl: null,
      }).promise;

      const chunks = [];
      const numPages = pdfDocument.numPages;
      console.log(`PDF has ${numPages} pages`);

      // Process each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();

          // Extract text from page
          const pageText = textContent.items
            .map((item) => item.str)
            .join(" ")
            .trim();

          if (pageText.length > 0) {
            // Split page text into smaller chunks
            const pageChunks = this.chunkText(pageText, pageNum);
            chunks.push(...pageChunks);
          }

          console.log(
            `Processed page ${pageNum}/${numPages}: ${pageText.length} characters`
          );
        } catch (pageError) {
          console.error(`Error processing page ${pageNum}:`, pageError);
        }
      }

      console.log(`Extracted ${chunks.length} text chunks from PDF`);
      return chunks;
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      return [];
    }
  }

  chunkText(text, pageNumber = null) {
    // Simple text chunking strategy
    const maxChunkSize = 512; // Characters per chunk
    const chunks = [];

    // Split by sentences first
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    let currentChunk = "";
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();

      // If adding this sentence would exceed the chunk size, save current chunk
      if (
        currentChunk.length + trimmedSentence.length + 1 > maxChunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push({
          text: currentChunk.trim(),
          pageNumber: pageNumber,
          size: currentChunk.length,
          chunkIndex: chunkIndex++,
        });
        currentChunk = "";
      }

      // Add sentence to current chunk
      if (currentChunk.length > 0) {
        currentChunk += " ";
      }
      currentChunk += trimmedSentence;

      // If this single sentence is too long, split it further
      if (currentChunk.length > maxChunkSize) {
        // Split by words
        const words = currentChunk.split(" ");
        let wordChunk = "";

        for (const word of words) {
          if (
            wordChunk.length + word.length + 1 > maxChunkSize &&
            wordChunk.length > 0
          ) {
            chunks.push({
              text: wordChunk.trim(),
              pageNumber: pageNumber,
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

    // Add remaining text as the last chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        pageNumber: pageNumber,
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
        // Generate embedding for chunk text
        const output = await this.extractor(chunk.text, {
          pooling: "mean",
          normalize: true,
        });
        const embedding = Array.from(output.data);

        // Create a proper UUID for the point ID
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
        console.error(`Error processing chunk ${chunkIndex}:`, chunkError);
        // Continue with next chunk
      }
    }

    if (points.length === 0) {
      console.log("No chunks were successfully processed in this batch");
      return;
    }

    // Upsert to Qdrant
    console.log(`Upserting ${points.length} embeddings to Qdrant...`);
    await this.qdrantClient.upsert("documents_text", {
      wait: true,
      points,
    });

    console.log(`Successfully embedded ${points.length} chunks in batch`);
  }

  async stop() {
    console.log("Stopping Text Embedding Worker...");

    if (this.rabbitmq) {
      await this.rabbitmq.close();
    }

    console.log("Text Embedding Worker stopped");
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("Received SIGINT, shutting down gracefully...");
  if (worker) {
    await worker.stop();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down gracefully...");
  if (worker) {
    await worker.stop();
  }
  process.exit(0);
});

// Start worker
const worker = new TextEmbeddingWorker();
worker.start().catch((error) => {
  console.error("Failed to start Text Embedding Worker:", error);
  process.exit(1);
});