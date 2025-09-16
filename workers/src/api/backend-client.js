import axios from "axios";
import logger from "../logging/logger.js";

class BackendClient {
  constructor() {
    this.baseURL = process.env.INTERNAL_API_URL || 'http://localhost:8000/api/v1';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Internal-Worker': 'true'
      },
      timeout: 30000
    });
  }

  /**
   * Saves extracted text to the backend database
   * @param {string} documentId - The document ID
   * @param {string} extractedText - The extracted text content
   * @returns {Promise<boolean>} - Success status
   */
  async saveExtractedText(documentId, extractedText) {
    try {
      const response = await this.client.patch(
        `/internal/documents/${documentId}/extracted-text`,
        {
          extracted_text: extractedText
        }
      );
      return true;
    } catch (error) {
      logger.error(
        { 
          document_id: documentId, 
          error: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          baseURL: this.baseURL
        },
        "Failed to save extracted text to database"
      );
      
      return false;
    }
  }

  /**
   * Updates document status in the backend
   * @param {string} documentId - The document ID  
   * @param {string} status - The new status (ready, failed, processing)
   * @returns {Promise<boolean>} - Success status
   */
  async updateDocumentStatus(documentId, status) {
    try {
      const response = await this.client.patch(
        `/internal/documents/${documentId}/status`,
        {
          status: status
        }
      );
      return true;
    } catch (error) {
      logger.error(
        {
          document_id: documentId,
          status: status,
          error: error.message,
          responseStatus: error.response?.status,
          baseURL: this.baseURL
        },
        "Failed to update document status in database"
      );

      return false;
    }
  }

  /**
   * Test the backend connection
   * @returns {Promise<boolean>} - Connection status
   */
  async testConnection() {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      logger.error(
        { 
          baseURL: this.baseURL, 
          error: error.message 
        },
        "Backend connection test failed"
      );
      return false;
    }
  }

  /**
   * Get the configured backend URL
   * @returns {string} - The backend base URL
   */
  getBaseURL() {
    return this.baseURL;
  }
}

export default BackendClient;
