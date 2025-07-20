import * as Minio from 'minio';

export class MinIOClient {
  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'minio',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123'
    });
    
    this.bucketName = process.env.MINIO_BUCKET || 'noesis-documents';
    console.log(`MinIO client initialized for bucket: ${this.bucketName}`);
  }

  async downloadFile(storagePath) {
    try {
      console.log(`Downloading file from MinIO: ${storagePath}`);
      
      // Get object from MinIO
      const stream = await this.client.getObject(this.bucketName, storagePath);
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      console.log(`Downloaded file: ${buffer.length} bytes`);
      
      return buffer;
    } catch (error) {
      console.error('Error downloading from MinIO:', error);
      throw error;
    }
  }

  async getFileInfo(storagePath) {
    try {
      const stat = await this.client.statObject(this.bucketName, storagePath);
      return {
        size: stat.size,
        contentType: stat.metaData['content-type'] || 'application/octet-stream',
        lastModified: stat.lastModified
      };
    } catch (error) {
      console.error('Error getting file info from MinIO:', error);
      throw error;
    }
  }
}