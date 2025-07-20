import { env, pipeline, RawImage } from "@huggingface/transformers";
import { RabbitMQConnection } from "../utils/rabbitmq.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import { MinIOClient } from "../utils/minio-client.js";
import logger from "../utils/logger.js";
import sharp from "sharp";
import crypto from "crypto";
import {
  getDocument,
  GlobalWorkerOptions,
} from "pdfjs-dist/legacy/build/pdf.min.mjs";
import { createCanvas, Image } from "canvas";
import path from "path";
import { createRequire } from "module";

global.Image = Image;

// Setup OffscreenCanvas polyfill
if (typeof globalThis.OffscreenCanvas === "undefined") {
  globalThis.OffscreenCanvas = class OffscreenCanvas {
    constructor(width, height) {
      this.canvas = createCanvas(width, height);
      this.width = width;
      this.height = height;
    }

    getContext(type) {
      return this.canvas.getContext(type);
    }

    async convertToBlob() {
      const buffer = this.canvas.toBuffer("image/png");
      return new Blob([buffer], { type: "image/png" });
    }
  };
}

// Setup Path2D polyfill for PDF.js compatibility
global.Path2D = class Path2D {
  constructor() {
    this.path = [];
  }
  rect() {}
  moveTo() {}
  lineTo() {}
  closePath() {}
};

// Setup DOMMatrix polyfill for PDF.js compatibility
global.DOMMatrix = class DOMMatrix {
  constructor() {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.e = 0;
    this.f = 0;
  }
  scale() {
    return this;
  }
  translate() {
    return this;
  }
};

// Configure PDF.js worker and font paths
const require = createRequire(import.meta.url);
try {
  const pdfjsDistRoot = path.dirname(
    require.resolve("pdfjs-dist/package.json")
  );
  const standardFontDataUrl = path.join(pdfjsDistRoot, "standard_fonts/");
  GlobalWorkerOptions.standardFontDataUrl = standardFontDataUrl;
} catch (error) {
  logger.error(
    { error: error.message },
    "PDF.js font path configuration failed"
  );
}

// Configure Hugging Face transformers environment
env.allowRemoteModels = true;
env.localModelPath = process.env.MODELS_PATH || "/app/models";

class ImageEmbeddingWorker {
  constructor() {
    this.rabbitmq = new RabbitMQConnection();
    this.qdrantClient = new QdrantClient({
      url: process.env.QDRANT_URL || "http://localhost:6333",
    });
    this.minioClient = new MinIOClient();
    this.extractor = null;
  }

  async initialize() {
    logger.info("Initializing image embedding worker");

    try {
      // Load the image feature extraction model
      logger.info("Loading image feature extraction model");
      this.extractor = await pipeline(
        "image-feature-extraction",
        "Xenova/siglip-base-patch16-224",
        { quantized: true }
      );
      logger.info("Image extraction model loaded successfully");

      await this.ensureQdrantCollection();
      logger.info("Worker initialization completed");
    } catch (error) {
      logger.error({ error: error.message }, "Failed to initialize worker");
      throw error;
    }
  }

  async ensureQdrantCollection() {
    try {
      const collectionName = "documents_images";

      const collections = await this.qdrantClient.getCollections();
      const collectionExists = collections.collections.some(
        (col) => col.name === collectionName
      );

      if (!collectionExists) {
        logger.info({ collectionName }, "Creating new Qdrant collection");
        await this.qdrantClient.createCollection(collectionName, {
          vectors: { size: 768, distance: "Cosine" },
        });
        logger.info(
          { collectionName },
          "Qdrant collection created successfully"
        );
      }
    } catch (error) {
      logger.error(
        { error: error.message },
        "Error with Qdrant collection setup"
      );
      throw error;
    }
  }

  async start() {
    logger.info("Starting image embedding worker");

    await this.initialize();
    await this.rabbitmq.connect();
    await this.rabbitmq.consumeQueue(
      "document.image.embedding",
      this.processDocument.bind(this)
    );

    logger.info("Worker started and listening for messages");
  }

  async processDocument({ document_id, storage_path, bucket_name, images }) {
    logger.info(
      { document_id, storage_path },
      "Processing document for image embeddings"
    );
    let totalInserted = 0;

    try {
      let imagesToProcess = images;
      if (!images && storage_path) {
        imagesToProcess = await this.extractImagesFromMinIO(storage_path);
      }

      if (!imagesToProcess || imagesToProcess.length === 0) {
        logger.warn({ document_id }, "No images found to process");
        return;
      }

      logger.info(
        { document_id, imageCount: imagesToProcess.length },
        "Found images to process"
      );

      // Process images in batches to manage memory usage
      const batchSize = 3;
      for (let i = 0; i < imagesToProcess.length; i += batchSize) {
        const batch = imagesToProcess.slice(i, i + batchSize);
        const batchInserted = await this.processBatch(document_id, batch);
        totalInserted += batchInserted;
      }

      logger.info(
        { document_id, totalInserted },
        "Document processing completed"
      );
    } catch (error) {
      logger.error(
        { document_id, error: error.message },
        "Error processing document"
      );
      throw error;
    }
  }

  async extractImagesFromMinIO(storagePath) {
    try {
      const fileBuffer = await this.minioClient.downloadFile(storagePath);
      const isPdf = storagePath.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        return await this.extractImagesFromPDF(fileBuffer);
      } else {
        const base64 = fileBuffer.toString("base64");
        return [{ pageNumber: 1, base64: base64 }];
      }
    } catch (error) {
      logger.error(
        { storagePath, error: error.message },
        "Error extracting images from storage"
      );
      return [];
    }
  }

  async extractImagesFromPDF(pdfBuffer) {
    try {
      const pdfDocument = await getDocument({
        data: new Uint8Array(pdfBuffer),
        verbosity: 0,
        disableFontFace: true,
        stopAtErrors: false,
      }).promise;

      const images = [];
      const numPages = pdfDocument.numPages;
      logger.info({ numPages }, "PDF loaded successfully");

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const page = await pdfDocument.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.0 });

          // Render PDF page to canvas
          const canvas = new globalThis.OffscreenCanvas(
            Math.floor(viewport.width),
            Math.floor(viewport.height)
          );
          const context = canvas.getContext("2d");

          await page.render({
            canvasContext: context,
            viewport: viewport,
            intent: "print",
            renderInteractiveForms: false,
            annotationMode: 0,
          }).promise;

          const blob = await canvas.convertToBlob();
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");

          images.push({ pageNumber: pageNum, base64: base64 });
        } catch (pageError) {
          logger.warn(
            { pageNum, error: pageError.message },
            "Failed to extract page, creating placeholder"
          );

          try {
            // Create placeholder image for failed pages
            const placeholderBuffer = await sharp({
              create: {
                width: 800,
                height: 1000,
                channels: 3,
                background: { r: 240, g: 240, b: 240 },
              },
            })
              .png()
              .toBuffer();

            images.push({
              pageNumber: pageNum,
              base64: placeholderBuffer.toString("base64"),
            });
          } catch (placeholderError) {
            logger.error(
              { pageNum, error: placeholderError.message },
              "Failed to create placeholder for page"
            );
          }
        }
      }

      await pdfDocument.destroy();
      logger.info(
        { extractedImages: images.length, totalPages: numPages },
        "PDF image extraction completed"
      );
      return images;
    } catch (error) {
      logger.error({ error: error.message }, "PDF extraction failed");
      return [];
    }
  }

  async processBatch(document_id, images) {
    const points = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const pageNumber = image.pageNumber || i + 1;

      try {
        const embedding = await this.createImageEmbedding(image.base64);

        points.push({
          id: crypto.randomUUID(),
          vector: embedding,
          payload: {
            document_id,
            page_number: pageNumber,
            type: "page_image",
            created_at: new Date().toISOString(),
          },
        });
      } catch (pageError) {
        logger.error(
          { document_id, pageNumber, error: pageError.message },
          "Error processing page"
        );
      }
    }

    if (points.length === 0) {
      logger.warn({ document_id }, "No embeddings created for batch");
      return 0;
    }

    // Insert embeddings into vector database
    await this.qdrantClient.upsert("documents_images", { wait: true, points });
    logger.info(
      { document_id, inserted: points.length },
      "Batch embeddings inserted successfully"
    );

    return points.length;
  }

  async createImageEmbedding(base64Data) {
    const imageBuffer = Buffer.from(base64Data, "base64");
    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");

    const tempFile = path.join(
      os.tmpdir(),
      `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`
    );

    try {
      // Resize and preprocess image for model input
      await sharp(imageBuffer)
        .resize(224, 224, { fit: "cover", position: "center" })
        .removeAlpha()
        .png()
        .toFile(tempFile);

      const rawImage = await RawImage.read(tempFile);
      const outputs = await this.extractor(rawImage, {
        pooling: "mean",
        normalize: true,
      });

      // Extract embedding vector from model output
      let embedding;
      if (outputs.ort_tensor) {
        const d = outputs.ort_tensor.dims;
        const data = outputs.ort_tensor.data;

        if (d.length === 3 && d[0] === 1 && d[2] === 768) {
          // Handle 3D tensor output
          const [_, N, H] = d;
          embedding = new Array(H).fill(0);
          for (let i = 0; i < N; i++) {
            for (let j = 0; j < H; j++) {
              embedding[j] += data[i * H + j];
            }
          }
          embedding = embedding.map((v) => v / N);
        } else if (d.length === 2 && d[1] === 768) {
          // Handle 2D tensor output
          embedding = Array.from(data);
        } else {
          throw new Error(`Unexpected tensor dimensions: ${JSON.stringify(d)}`);
        }
      } else {
        throw new Error("No tensor found in model output");
      }

      // Normalize embedding vector
      let norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
      if (norm > 0) {
        embedding = embedding.map((v) => v / norm);
      }

      await fs.unlink(tempFile);
      return embedding;
    } catch (error) {
      logger.error(
        { error: error.message },
        "Failed to create image embedding"
      );
      await fs.unlink(tempFile).catch(() => {});
      throw error;
    }
  }

  async stop() {
    logger.info("Stopping image embedding worker");
    if (this.rabbitmq) {
      await this.rabbitmq.close();
    }
    logger.info("Worker stopped successfully");
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

const worker = new ImageEmbeddingWorker();
worker.start().catch((error) => {
  logger.error({ error: error.message }, "Failed to start worker");
  process.exit(1);
});
