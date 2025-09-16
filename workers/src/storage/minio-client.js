import { Client as MinioClient } from "minio";
import logger from "../logging/logger.js";

export class MinIOClient {
  constructor() {
    // Initialize MinIO client with environment configuration
    this.client = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT || "minio",
      port: parseInt(process.env.MINIO_PORT || "9000"),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
      secretKey: process.env.MINIO_SECRET_KEY || "minioadmin123",
    });

    this.bucketName = process.env.MINIO_BUCKET || "noesis-documents";

    logger.info(
      {
        bucketName: this.bucketName,
        endpoint: process.env.MINIO_ENDPOINT || "minio",
        port: process.env.MINIO_PORT || "9000",
      },
      "MinIO client initialized successfully"
    );
  }

  async downloadFile(storagePath) {
    logger.debug(
      { storagePath, bucketName: this.bucketName },
      "Starting file download from MinIO"
    );

    try {
      // Get object stream from MinIO bucket
      const stream = await this.client.getObject(this.bucketName, storagePath);

      // Convert readable stream to buffer for processing
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      logger.info(
        {
          storagePath,
          bucketName: this.bucketName,
          fileSize: buffer.length,
        },
        "File downloaded successfully from MinIO"
      );

      return buffer;
    } catch (error) {
      logger.error(
        {
          storagePath,
          bucketName: this.bucketName,
          error: error.message,
        },
        "Failed to download file from MinIO"
      );
      throw error;
    }
  }

  async getFileInfo(storagePath) {
    logger.debug(
      { storagePath, bucketName: this.bucketName },
      "Getting file info from MinIO"
    );

    try {
      // Get object metadata and statistics
      const stat = await this.client.statObject(this.bucketName, storagePath);

      const fileInfo = {
        size: stat.size,
        contentType:
          stat.metaData["content-type"] || "application/octet-stream",
        lastModified: stat.lastModified,
      };

      logger.info(
        {
          storagePath,
          bucketName: this.bucketName,
          fileSize: fileInfo.size,
          contentType: fileInfo.contentType,
        },
        "File info retrieved successfully from MinIO"
      );

      return fileInfo;
    } catch (error) {
      logger.error(
        {
          storagePath,
          bucketName: this.bucketName,
          error: error.message,
        },
        "Failed to get file info from MinIO"
      );
      throw error;
    }
  }
}
