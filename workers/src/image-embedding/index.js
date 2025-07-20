import { env, RawImage } from "@huggingface/transformers";
import { RabbitMQConnection } from "../utils/rabbitmq.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import { ModelManager } from "../utils/model-manager.js";
import { MinIOClient } from "../utils/minio-client.js";
import sharp from "sharp";
import crypto from "crypto";

import { getDocument } from "pdfjs-dist/legacy/build/pdf.min.mjs";
import { createCanvas } from "canvas";

// Configure transformers.js environment
env.allowRemoteModels = true;
env.localModelPath = process.env.MODELS_PATH || "/app/models";

// Set up Canvas polyfill for PDF.js
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Global Canvas setup for PDF.js
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

    async convertToBlob(options = {}) {
      const buffer = this.canvas.toBuffer("image/png");
      return new Blob([buffer], { type: options.type || "image/png" });
    }
  };
}

// Add DOMMatrix polyfill
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

class ImageEmbeddingWorker {
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
    console.log("Initializing Image Embedding Worker...");

    try {
      // Load SigLIP model for image embeddings
      console.log("Loading SigLIP model for image feature extraction...");
      this.extractor = await this.modelManager.ensureModel(
        "image-feature-extraction",
        "Xenova/siglip-base-patch16-224",
        { quantized: true }
      );

      console.log("SigLIP model ready");

      // Ensure Qdrant collection exists
      await this.ensureQdrantCollection();
    } catch (error) {
      console.error("Failed to initialize Image Embedding Worker:", error);
      throw error;
    }
  }

  async ensureQdrantCollection() {
    try {
      // Check if collection exists
      const collections = await this.qdrantClient.getCollections();
      const collectionExists = collections.collections.some(
        (col) => col.name === "documents_images"
      );

      if (!collectionExists) {
        console.log("Creating Qdrant collection: documents_images");
        await this.qdrantClient.createCollection("documents_images", {
          vectors: {
            size: 768, // SigLIP embedding size
            distance: "Cosine",
          },
        });
        console.log("Qdrant collection created successfully");
      } else {
        console.log("Qdrant collection documents_images already exists");
      }
    } catch (error) {
      console.error("Error ensuring Qdrant collection:", error);
      // Don't throw here, collection might exist but API might have issues
    }
  }

  async start() {
    await this.initialize();
    await this.rabbitmq.connect();
    await this.rabbitmq.consumeQueue(
      "document.image.embedding",
      this.processDocument.bind(this)
    );
  }

  async processDocument({ document_id, storage_path, bucket_name, images }) {
    console.log(`Processing document ${document_id} for image embeddings`);

    try {
      let imagesToProcess = images;

      // If no images provided, extract from file using storage path
      if (!images && storage_path) {
        console.log(`Downloading file from MinIO using storage path: ${storage_path}`);
        imagesToProcess = await this.extractImagesFromMinIO(storage_path);
      }

      if (!imagesToProcess || imagesToProcess.length === 0) {
        console.log("No images to process");
        return;
      }

      console.log(
        `Creating image embeddings for document ${document_id} with ${imagesToProcess.length} pages`
      );

      const batchSize = 3;
      for (let i = 0; i < imagesToProcess.length; i += batchSize) {
        const batch = imagesToProcess.slice(i, i + batchSize);
        console.log(
          `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
            imagesToProcess.length / batchSize
          )}`
        );

        await this.processBatch(document_id, batch);
      }

      console.log(
        `Successfully processed all ${imagesToProcess.length} images for document ${document_id}`
      );
    } catch (error) {
      console.error(
        `Error embedding images for document ${document_id}:`,
        error
      );
      throw error;
    }
  }

  async extractImagesFromMinIO(storagePath) {
    try {
      // Download file from MinIO
      const fileBuffer = await this.minioClient.downloadFile(storagePath);
      
      // Check if it's a PDF based on the storage path
      const isPdf = storagePath.toLowerCase().endsWith('.pdf');
      
      if (isPdf) {
        return await this.extractImagesFromPDF(fileBuffer);
      } else {
        // For non-PDF images, return as base64
        const base64 = fileBuffer.toString('base64');
        return [
          {
            pageNumber: 1,
            base64: base64,
          },
        ];
      }
    } catch (error) {
      console.error("Error extracting images from MinIO:", error);
      return [];
    }
  }

  async extractImagesFromPDF(pdfBuffer) {
    try {
      console.log("Extracting images from PDF...");

      // Load PDF document using legacy build
      const pdfDocument = await getDocument({
        data: new Uint8Array(pdfBuffer),
        useSystemFonts: true,
        disableFontFace: true,
        standardFontDataUrl: null,
      }).promise;

      const images = [];
      const numPages = pdfDocument.numPages;
      console.log(`PDF has ${numPages} pages`);

      // Process each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const page = await pdfDocument.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 });

          // Create canvas using our polyfill
          const canvas = new globalThis.OffscreenCanvas(
            viewport.width,
            viewport.height
          );
          const context = canvas.getContext("2d");

          // Render page to canvas
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          // Convert to image blob
          const blob = await canvas.convertToBlob({ type: "image/png" });
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");

          images.push({
            pageNumber: pageNum,
            base64: base64,
          });

          console.log(`Processed page ${pageNum}/${numPages}`);
        } catch (pageError) {
          console.error(`Error processing page ${pageNum}:`, pageError);
          // Create a simple placeholder image for failed pages
          try {
            const placeholderBuffer = await sharp({
              create: {
                width: 800,
                height: 1000,
                channels: 3,
                background: { r: 255, g: 255, b: 255 },
              },
            })
              .png()
              .toBuffer();

            images.push({
              pageNumber: pageNum,
              base64: placeholderBuffer.toString("base64"),
            });

            console.log(`Created placeholder for page ${pageNum}`);
          } catch (placeholderError) {
            console.error(
              `Failed to create placeholder for page ${pageNum}:`,
              placeholderError
            );
          }
        }
      }

      console.log(`Extracted ${images.length} images from PDF`);
      return images;
    } catch (error) {
      console.error("Error extracting images from PDF:", error);
      return [];
    }
  }

  async processBatch(document_id, images) {
    const points = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const pageNumber = image.pageNumber || i + 1;

      console.log(`Processing page ${pageNumber}`);

      try {
        // Generate embedding
        const embedding = await this.createImageEmbedding(image.base64);

        // Validate embedding dimensions
        if (embedding.length !== 768) {
          console.error(
            `Invalid embedding dimension: expected 768, got ${embedding.length}`
          );
          continue;
        }

        // Create a proper UUID for the point ID
        const pointId = crypto.randomUUID();

        points.push({
          id: pointId,
          vector: embedding,
          payload: {
            document_id,
            page_number: pageNumber,
            type: "page_image",
            created_at: new Date().toISOString(),
          },
        });
      } catch (pageError) {
        console.error(`Error processing page ${pageNumber}:`, pageError);
        // Continue with next page instead of failing entire batch
      }
    }

    if (points.length === 0) {
      console.log("No images were successfully processed in this batch");
      return;
    }

    // Upsert to Qdrant
    console.log(`Upserting ${points.length} embeddings to Qdrant...`);
    await this.qdrantClient.upsert("documents_images", {
      wait: true,
      points,
    });

    console.log(`Successfully embedded ${points.length} images in batch`);
  }

  async createImageEmbedding(base64Data) {
    try {
      // Decode base64 to buffer
      const imageBuffer = Buffer.from(base64Data, "base64");

      console.log("Processing image through SigLIP model...");

      // Use Sharp to preprocess and save as temporary file for RawImage
      const fs = await import("fs/promises");
      const path = await import("path");
      const os = await import("os");

      const tempDir = os.tmpdir();
      const tempFile = path.join(
        tempDir,
        `temp_image_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}.png`
      );

      try {
        // Preprocess image with sharp and save as PNG
        await sharp(imageBuffer)
          .resize(224, 224, {
            fit: "cover",
            position: "center",
          })
          .removeAlpha()
          .png()
          .toFile(tempFile);

        // Load with RawImage
        const rawImage = await RawImage.read(tempFile);

        console.log(
          `Loaded image: ${rawImage.width}x${rawImage.height}x${rawImage.channels}`
        );

        // Get model output
        const outputs = await this.extractor(rawImage);

        let embedding;

        // Handle different output formats from @huggingface/transformers v3
        if (
          outputs.data &&
          (Array.isArray(outputs.data) ||
            outputs.data.constructor === Float32Array)
        ) {
          // Direct tensor data - common in new version
          console.log("Using direct tensor data");
          embedding = Array.from(outputs.data);

          // If we have dims, we might need to handle batching
          if (outputs.dims && outputs.dims.length > 1) {
            const lastDim = outputs.dims[outputs.dims.length - 1];

            // If last dimension is 768 (embedding size), take first sample
            if (lastDim === 768) {
              embedding = Array.from(outputs.data.slice(0, lastDim));
              console.log("Extracted first embedding from batch");
            }
          }
        } else if (outputs.image_embeds) {
          console.log("Using image_embeds output");
          embedding = Array.from(outputs.image_embeds.data);
        } else if (outputs.pooler_output) {
          console.log("Using pooler_output");
          embedding = Array.from(outputs.pooler_output.data);
        } else if (outputs.last_hidden_state) {
          console.log("Using last_hidden_state with mean pooling");
          const hiddenState = outputs.last_hidden_state;
          const [batchSize, seqLength, hiddenSize] = hiddenState.dims;

          // Mean pooling across sequence dimension
          embedding = new Array(hiddenSize).fill(0);
          const data = hiddenState.data;

          for (let i = 0; i < seqLength; i++) {
            for (let j = 0; j < hiddenSize; j++) {
              embedding[j] += data[i * hiddenSize + j];
            }
          }
          // Average
          embedding = embedding.map((val) => val / seqLength);
        } else {
          // Try to handle tensor structure directly
          console.log("Attempting direct tensor extraction...");

          // Check if this is a tensor-like object with expected dimensions
          if (outputs.dims && outputs.data) {
            const dims = outputs.dims;
            const data = outputs.data;

            console.log("Tensor dimensions:", dims);
            console.log("Data length:", data.length);

            // For SigLIP, expect [batch_size, embedding_dim] or [batch_size, seq_length, embedding_dim]
            if (dims.length === 2 && dims[1] === 768) {
              // [batch_size, 768] - take first sample
              embedding = Array.from(data.slice(0, 768));
              console.log("Extracted embedding from 2D tensor");
            } else if (dims.length === 3 && dims[2] === 768) {
              // [batch_size, seq_length, 768] - mean pool over sequence
              const [batchSize, seqLength, embeddingSize] = dims;
              embedding = new Array(embeddingSize).fill(0);

              // Take first batch, mean pool over sequence
              for (let i = 0; i < seqLength; i++) {
                for (let j = 0; j < embeddingSize; j++) {
                  embedding[j] += data[i * embeddingSize + j];
                }
              }
              embedding = embedding.map((val) => val / seqLength);
              console.log(
                "Extracted embedding from 3D tensor with mean pooling"
              );
            } else {
              throw new Error(
                `Unexpected tensor dimensions: ${dims.join("x")}`
              );
            }
          } else {
            console.error("Available outputs:", Object.keys(outputs));
            throw new Error("No suitable embedding output found in model");
          }
        }

        console.log(`Generated embedding with ${embedding.length} dimensions`);

        // Validate embedding dimensions for SigLIP (should be 768)
        if (embedding.length !== 768) {
          console.error(
            `Dimension mismatch: expected 768, got ${embedding.length}`
          );
          throw new Error(
            `Expected embedding dimension 768, got ${embedding.length}`
          );
        }

        // Normalize the embedding
        const norm = Math.sqrt(
          embedding.reduce((sum, val) => sum + val * val, 0)
        );
        if (norm > 0) {
          embedding = embedding.map((val) => val / norm);
        }

        console.log("Successfully created normalized embedding");

        // Clean up temp file
        await fs.unlink(tempFile).catch(() => {});

        return embedding;
      } catch (error) {
        // Clean up temp file in case of error
        await fs.unlink(tempFile).catch(() => {});
        throw error;
      }
    } catch (error) {
      console.error("Error creating image embedding:", error);
      throw error;
    }
  }

  async stop() {
    console.log("Stopping Image Embedding Worker...");

    if (this.rabbitmq) {
      await this.rabbitmq.close();
    }

    console.log("Image Embedding Worker stopped");
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
const worker = new ImageEmbeddingWorker();
worker.start().catch((error) => {
  console.error("Failed to start Image Embedding Worker:", error);
  process.exit(1);
});