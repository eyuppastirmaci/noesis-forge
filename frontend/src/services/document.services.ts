import { apiClient } from "@/lib/api";
import {
  Document,
  DocumentListRequest,
  DocumentListResponse,
  UploadDocumentRequest,
  BulkUploadDocumentRequest,
  BulkUploadResponse,
  DOCUMENT_ENDPOINTS,
  SuccessResponse,
  DocumentType,
  SUPPORTED_FILE_TYPES,
  FILE_SIZE_LIMITS,
  FileValidationResult,
} from "@/types";
import { formatFileSize, getCookieValue } from "@/utils";

// Response type definitions for API calls
export interface DocumentUploadResponseData {
  document: Document;
}

export interface DocumentListResponseData extends DocumentListResponse {}

export interface DocumentDetailResponseData {
  document: Document;
}

export interface DocumentPreviewResponseData {
  url: string;
}



export interface BulkDeleteResponseData {
  successful_deletes: number;
  failed_deletes: number;
  total_documents: number;
  failures?: Array<{ id: string; error: string }>;
}



// API Response types
export type DocumentUploadResponse =
  SuccessResponse<DocumentUploadResponseData>;
export type DocumentListApiResponse = SuccessResponse<DocumentListResponseData>;
export type DocumentDetailResponse =
  SuccessResponse<DocumentDetailResponseData>;
export type DocumentPreviewApiResponse =
  SuccessResponse<DocumentPreviewResponseData>;
export type DocumentDeleteResponse = SuccessResponse<null>;
export type BulkDeleteResponse = SuccessResponse<BulkDeleteResponseData>;


export class DocumentService {
  /**
   * Upload a document with progress tracking
   */
  async uploadDocument(
    request: UploadDocumentRequest,
    onProgress?: (progress: number) => void
  ): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append("file", request.file);
    formData.append("title", request.title);

    if (request.description) {
      formData.append("description", request.description);
    }
    if (request.tags) {
      formData.append("tags", request.tags);
    }
    if (request.isPublic !== undefined) {
      formData.append("isPublic", request.isPublic.toString());
    }

    try {
      const response = await apiClient.post<DocumentUploadResponseData>(
        DOCUMENT_ENDPOINTS.UPLOAD,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(progress);
            }
          },
          timeout: 300000, // 5 minutes for large files
        }
      );

      return response;
    } catch (error) {
      console.error("[DOCUMENT_SERVICE] Upload operation failed with error:", error);
      throw error;
    }
  }

  /**
   * Get list of documents with filtering and pagination
   */
  async getDocuments(
    request: DocumentListRequest = {}
  ): Promise<DocumentListApiResponse> {
    const params = new URLSearchParams();

    if (request.page) params.append("page", request.page.toString());
    if (request.limit) params.append("limit", request.limit.toString());
    if (request.search) params.append("search", request.search);
    if (request.fileType) params.append("fileType", request.fileType);
    if (request.status) params.append("status", request.status);
    if (request.tags) params.append("tags", request.tags);
    if (request.sortBy) params.append("sortBy", request.sortBy);
    if (request.sortDir) params.append("sortDir", request.sortDir);

    const url = `${DOCUMENT_ENDPOINTS.LIST}?${params.toString()}`;
    
    try {
      const response = await apiClient.get<DocumentListResponseData>(url);
      return response;
    } catch (error) {
      console.error("[DOCUMENT_SERVICE] Failed to retrieve document list:", error);
      throw error;
    }
  }

  /**
   * Get a single document by ID
   */
  async getDocument(id: string): Promise<DocumentDetailResponse> {
    try {
      const response = await apiClient.get<DocumentDetailResponseData>(
        DOCUMENT_ENDPOINTS.GET(id)
      );
      return response;
    } catch (error) {
      console.error("[DOCUMENT_SERVICE] Failed to retrieve document details:", error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<DocumentDeleteResponse> {
    try {
      const response = await apiClient.delete<null>(
        DOCUMENT_ENDPOINTS.DELETE(id)
      );
      return response;
    } catch (error) {
      console.error("[DOCUMENT_SERVICE] Document deletion operation failed:", error);
      throw error;
    }
  }

  /**
   * Download a document
   */
  async downloadDocument(id: string, originalFileName: string): Promise<void> {
    try {
      // Create a new axios instance that bypasses apiClient interceptors
      const downloadClient = (apiClient as any).client.create({
        withCredentials: true,
        timeout: 60000, // 1 minute timeout for downloads
      });

      // Only add the request interceptor for auth (not response interceptor)
      downloadClient.interceptors.request.use(
        async (config: any) => {
          // Get access token from cookies (same as apiClient)
          const accessToken = getCookieValue('access_token');
          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
          }
          return config;
        }
      );

      const response = await downloadClient.get(
        DOCUMENT_ENDPOINTS.DOWNLOAD(id),
        {
          responseType: 'blob', // Important: get response as blob
        }
      );

      // Response.data should be a blob
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = originalFileName; // Use original filename for download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("[DOCUMENT_SERVICE] Document download operation failed:", error);
      throw error;
    }
  }

  /**
   * Get preview URL for a document
   */
  async getDocumentPreview(id: string): Promise<DocumentPreviewApiResponse> {
    try {
      const response = await apiClient.get<DocumentPreviewResponseData>(
        DOCUMENT_ENDPOINTS.PREVIEW(id)
      );
      return response;
    } catch (error) {
      console.error("[DOCUMENT_SERVICE] Failed to generate document preview URL:", error);
      throw error;
    }
  }



  /**
   * Validate a file before upload
   */
  validateFile(file: File): FileValidationResult {
    // Check file size
    if (file.size > FILE_SIZE_LIMITS.MAX_FILE_SIZE) {
      const error = `File size must be less than ${this.formatFileSize(
        FILE_SIZE_LIMITS.MAX_FILE_SIZE
      )}`;
      // File size validation failed
      return { isValid: false, error };
    }

    // Check if file is empty
    if (file.size === 0) {
      const error = "File cannot be empty";
      // Empty file validation failed
      return { isValid: false, error };
    }

    // Check file type
    if (!Object.keys(SUPPORTED_FILE_TYPES).includes(file.type)) {
      const error = "File type not supported. Supported types: PDF, DOCX, DOC, TXT, XLSX, XLS, PPTX, PPT, MD";
      // File type validation failed
      return { isValid: false, error };
    }

    // Check filename length
    if (file.name.length > 255) {
      const error = "Filename is too long (max 255 characters)";
      // Filename length validation failed
      return { isValid: false, error };
    }

    // Check for malicious filenames
    if (this.containsMaliciousCharacters(file.name)) {
      const error = "Filename contains invalid characters";
      // Malicious filename validation failed
      return { isValid: false, error };
    }

    return { isValid: true };
  }

  /**
   * Format file size in human readable format
   */
  formatFileSize(bytes: number): string {
    return formatFileSize(bytes);
  }

  /**
   * Get file type icon
   */
  getFileTypeIcon(fileType: string): string {
    const typeInfo = Object.values(SUPPORTED_FILE_TYPES).find(
      (info) => info.type === fileType
    );
    return typeInfo?.icon || "📎";
  }

  /**
   * Get document type from file
   */
  getDocumentTypeFromFile(file: File): DocumentType {
    const typeInfo =
      SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES];
    return typeInfo?.type || DocumentType.OTHER;
  }

  /**
   * Extract filename without extension
   */
  getFilenameWithoutExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf(".");
    if (lastDotIndex === -1) return filename;
    return filename.substring(0, lastDotIndex);
  }

  /**
   * Check for malicious characters in filename
   */
  private containsMaliciousCharacters(filename: string): boolean {
    const maliciousChars = ["..", "\\", "/", ":", "*", "?", '"', "<", ">", "|"];
    return maliciousChars.some((char) => filename.includes(char));
  }

  /**
   * Validate multiple files for batch upload
   */
  validateFiles(files: File[]): {
    validFiles: File[];
    errors: Array<{ file: File; error: string }>;
  } {
    const validFiles: File[] = [];
    const errors: Array<{ file: File; error: string }> = [];

    let totalSize = 0;

    for (const file of files) {
      const validation = this.validateFile(file);

      if (!validation.isValid) {
        errors.push({ file, error: validation.error || "Invalid file" });
        continue;
      }

      totalSize += file.size;
      if (totalSize > FILE_SIZE_LIMITS.MAX_TOTAL_SIZE) {
        errors.push({
          file,
          error: `Total file size exceeds ${this.formatFileSize(
            FILE_SIZE_LIMITS.MAX_TOTAL_SIZE
          )}`,
        });
        continue;
      }

      validFiles.push(file);
    }

    return { validFiles, errors };
  }

  /**
   * Generate search suggestions based on query
   */
  generateSearchSuggestions(query: string): string[] {
    // This is a simple implementation - you can enhance with AI or analytics
    const suggestions: string[] = [];

    if (query.length < 2) return suggestions;

    // Common document-related suggestions
    const commonTerms = [
      "invoice",
      "contract",
      "report",
      "presentation",
      "spreadsheet",
      "manual",
      "guide",
      "policy",
      "procedure",
      "memo",
    ];

    commonTerms.forEach((term) => {
      if (term.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push(term);
      }
    });

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  /**
   * Upload multiple documents in a single request (bulk upload)
   */
  async bulkUploadDocuments(
    request: BulkUploadDocumentRequest,
    onProgress?: (progress: number) => void
  ): Promise<SuccessResponse<BulkUploadResponse>> {
    const formData = new FormData();
    
    // Append all files with the same field name "files"
    request.files.forEach((file: File) => {
      formData.append("files", file);
    });

    // Append individual metadata for each file
    request.metadata.forEach((meta, index) => {
      formData.append(`files[${index}].title`, meta.title);
      if (meta.description) {
        formData.append(`files[${index}].description`, meta.description);
      }
      if (meta.tags) {
        formData.append(`files[${index}].tags`, meta.tags);
      }
      if (meta.isPublic !== undefined) {
        formData.append(`files[${index}].isPublic`, meta.isPublic.toString());
      }
    });

    try {
      const response = await apiClient.post<BulkUploadResponse>(
        DOCUMENT_ENDPOINTS.BULK_UPLOAD,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(progress);
            }
          },
          timeout: 600000, // 10 minutes for bulk uploads
        }
      );

      return response;
    } catch (error) {
      console.error("[DOCUMENT_SERVICE] Bulk upload operation failed:", error);
      throw error;
    }
  }

  /**
   * Delete multiple documents
   */
  async bulkDeleteDocuments(documentIds: string[]): Promise<BulkDeleteResponse> {
    try {
      const response = await apiClient.post<BulkDeleteResponseData>(
        DOCUMENT_ENDPOINTS.BULK_DELETE,
        { documentIds },
        {
          timeout: 120000, // 2 minutes for bulk operations
        }
      );

      return response;
    } catch (error) {
      console.error("[DOCUMENT_SERVICE] Bulk deletion operation failed:", error);
      throw error;
    }
  }

  /**
   * Download multiple documents as a ZIP file
   */
  async bulkDownloadDocuments(documentIds: string[]): Promise<void> {
    try {
      // Create a new axios instance that bypasses apiClient interceptors
      const downloadClient = (apiClient as any).client.create({
        withCredentials: true,
        timeout: 120000, // 2 minute timeout for bulk downloads
      });

      // Only add the request interceptor for auth (not response interceptor)
      downloadClient.interceptors.request.use(
        async (config: any) => {
          // Get access token from cookies (same as apiClient)
          const accessToken = getCookieValue('access_token');
          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
          }
          return config;
        }
      );

      const response = await downloadClient.post(
        DOCUMENT_ENDPOINTS.BULK_DOWNLOAD,
        { documentIds },
        {
          responseType: 'blob', // Important: get response as blob
        }
      );

      // Response.data should be a blob
      const blob = response.data;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
      const filename = `documents_${timestamp}.zip`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[DOCUMENT_SERVICE] Bulk download operation failed:", error);
      throw error;
    }
  }
}

// Create singleton instance
export const documentService = new DocumentService();

// React Query hooks
export const documentQueries = {
  /**
   * Query for document list
   */
  list: (request: DocumentListRequest = {}) => ({
    queryKey: ["documents", "list", request],
    queryFn: async () => {
      const response = await documentService.getDocuments(request);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true, // For pagination
  }),

  /**
   * Query for single document
   */
  detail: (id: string) => ({
    queryKey: ["documents", "detail", id],
    queryFn: async () => {
      const response = await documentService.getDocument(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  }),

  /**
   * Query for document preview
   */
  preview: (id: string) => ({
    queryKey: ["documents", "preview", id],
    queryFn: async () => {
      const response = await documentService.getDocumentPreview(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: 30 * 60 * 1000, // 30 minutes
  }),



  /**
   * Infinite query for document list (for infinite scroll)
   */
  infiniteList: (baseRequest: Omit<DocumentListRequest, "page"> = {}) => ({
    queryKey: ["documents", "infinite", baseRequest],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await documentService.getDocuments({
        ...baseRequest,
        page: pageParam,
      });
      return response.data;
    },
    getNextPageParam: (lastPage: DocumentListResponse) => {
      return lastPage.page < lastPage.totalPages
        ? lastPage.page + 1
        : undefined;
    },
    staleTime: 5 * 60 * 1000,
  }),
};

export const documentMutations = {
  /**
   * Upload document mutation
   */
  upload: () => ({
    mutationFn: async ({
      request,
      onProgress,
    }: {
      request: UploadDocumentRequest;
      onProgress?: (progress: number) => void;
    }) => {
      const response = await documentService.uploadDocument(
        request,
        onProgress
      );
      return response.data;
    },
  }),

  /**
   * Bulk upload documents mutation
   */
  bulkUpload: () => ({
    mutationFn: async ({
      request,
      onProgress,
    }: {
      request: BulkUploadDocumentRequest;
      onProgress?: (progress: number) => void;
    }) => {
      const response = await documentService.bulkUploadDocuments(
        request,
        onProgress
      );
      return response.data;
    },
  }),

  /**
   * Delete document mutation
   */
  delete: () => ({
    mutationFn: async (id: string) => {
      const response = await documentService.deleteDocument(id);
      return response;
    },
  }),

  /**
   * Bulk delete documents mutation
   */
  bulkDelete: () => ({
    mutationFn: async ({ documentIds }: { documentIds: string[] }) => {
      const response = await documentService.bulkDeleteDocuments(documentIds);
      return response.data;
    },
  }),

  /**
   * Download document mutation
   */
  download: () => ({
    mutationFn: async ({
      id,
      originalFileName,
    }: {
      id: string;
      originalFileName: string;
    }) => {
      await documentService.downloadDocument(id, originalFileName);
    },
  }),

  /**
   * Bulk download documents mutation
   */
  bulkDownload: () => ({
    mutationFn: async ({ documentIds }: { documentIds: string[] }) => {
      await documentService.bulkDownloadDocuments(documentIds);
    },
  }),
};