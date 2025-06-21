import { apiClient } from "@/lib/api";
import { getSession } from "next-auth/react";
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
  STORAGE_KEYS,
} from "@/types";

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

// API Response types
export type DocumentUploadResponse =
  SuccessResponse<DocumentUploadResponseData>;
export type DocumentListApiResponse = SuccessResponse<DocumentListResponseData>;
export type DocumentDetailResponse =
  SuccessResponse<DocumentDetailResponseData>;
export type DocumentPreviewApiResponse =
  SuccessResponse<DocumentPreviewResponseData>;
export type DocumentDeleteResponse = SuccessResponse<null>;

export class DocumentService {
  /**
   * Upload a document with progress tracking
   */
  async uploadDocument(
    request: UploadDocumentRequest,
    onProgress?: (progress: number) => void
  ): Promise<DocumentUploadResponse> {
    console.log("[DOCUMENT_SERVICE] 🚀 Starting upload:", {
      fileName: request.file.name,
      fileSize: this.formatFileSize(request.file.size),
      title: request.title
    });

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
              console.log(`[DOCUMENT_SERVICE] 📊 Upload progress: ${progress}%`);
              onProgress(progress);
            }
          },
          timeout: 300000, // 5 minutes for large files
        }
      );

      console.log("[DOCUMENT_SERVICE] ✅ Upload successful:", {
        documentId: response.data.document.id,
        fileName: response.data.document.originalFileName
      });

      return response;
    } catch (error) {
      console.error("[DOCUMENT_SERVICE] ❌ Upload failed:", error);
      throw error;
    }
  }

  /**
   * Get list of documents with filtering and pagination
   */
  async getDocuments(
    request: DocumentListRequest = {}
  ): Promise<DocumentListApiResponse> {
    console.log("[DOCUMENT_SERVICE] 📋 Fetching documents:", request);

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
      console.log("[DOCUMENT_SERVICE] ✅ Documents fetched:", {
        total: response.data.total,
        page: response.data.page
      });
      return response;
    } catch (error) {
      console.error("[DOCUMENT_SERVICE] ❌ Failed to fetch documents:", error);
      throw error;
    }
  }

  /**
   * Get a single document by ID
   */
  async getDocument(id: string): Promise<DocumentDetailResponse> {
    console.log("[DOCUMENT_SERVICE] 📄 Fetching document:", id);

    try {
      const response = await apiClient.get<DocumentDetailResponseData>(
        DOCUMENT_ENDPOINTS.GET(id)
      );
      console.log("[DOCUMENT_SERVICE] ✅ Document fetched:", response.data.document.title);
      return response;
    } catch (error) {
      console.error("[DOCUMENT_SERVICE] ❌ Failed to fetch document:", error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<DocumentDeleteResponse> {
    console.log("[DOCUMENT_SERVICE] 🗑️ Deleting document:", id);

    try {
      const response = await apiClient.delete<null>(
        DOCUMENT_ENDPOINTS.DELETE(id)
      );
      console.log("[DOCUMENT_SERVICE] ✅ Document deleted successfully");
      return response;
    } catch (error) {
      console.error("[DOCUMENT_SERVICE] ❌ Failed to delete document:", error);
      throw error;
    }
  }

  /**
   * Download a document - Updated to use NextAuth session
   */
  async downloadDocument(id: string, originalFileName: string): Promise<void> {
    console.log("[DOCUMENT_SERVICE] ⬇️ Starting download:", { id, originalFileName });

    try {
      // 🔥 Updated: Use NextAuth session instead of localStorage
      let token: string | null = null;
      
      try {
        const session = await getSession();
        token = session?.accessToken as string || null;
        console.log("[DOCUMENT_SERVICE] 🔑 Token from NextAuth:", !!token);
      } catch (sessionError) {
        console.warn("[DOCUMENT_SERVICE] ⚠️ Failed to get NextAuth session, fallback to localStorage");
        token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      }

      if (!token) {
        throw new Error("No authentication token available");
      }

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"
        }${DOCUMENT_ENDPOINTS.DOWNLOAD(id)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = originalFileName; // Use original filename for download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log("[DOCUMENT_SERVICE] ✅ Download completed:", originalFileName);
    } catch (error) {
      console.error("[DOCUMENT_SERVICE] ❌ Download error:", error);
      throw error;
    }
  }

  /**
   * Get preview URL for a document
   */
  async getDocumentPreview(id: string): Promise<DocumentPreviewApiResponse> {
    console.log("[DOCUMENT_SERVICE] 👁️ Getting preview URL:", id);

    try {
      const response = await apiClient.get<DocumentPreviewResponseData>(
        DOCUMENT_ENDPOINTS.PREVIEW(id)
      );
      console.log("[DOCUMENT_SERVICE] ✅ Preview URL generated");
      return response;
    } catch (error) {
      console.error("[DOCUMENT_SERVICE] ❌ Failed to get preview URL:", error);
      throw error;
    }
  }

  /**
   * Validate a file before upload
   */
  validateFile(file: File): FileValidationResult {
    console.log("[DOCUMENT_SERVICE] 🔍 Validating file:", {
      name: file.name,
      size: this.formatFileSize(file.size),
      type: file.type
    });

    // Check file size
    if (file.size > FILE_SIZE_LIMITS.MAX_FILE_SIZE) {
      const error = `File size must be less than ${this.formatFileSize(
        FILE_SIZE_LIMITS.MAX_FILE_SIZE
      )}`;
      console.warn("[DOCUMENT_SERVICE] ❌ File too large:", error);
      return { isValid: false, error };
    }

    // Check if file is empty
    if (file.size === 0) {
      const error = "File cannot be empty";
      console.warn("[DOCUMENT_SERVICE] ❌ Empty file:", error);
      return { isValid: false, error };
    }

    // Check file type
    if (!Object.keys(SUPPORTED_FILE_TYPES).includes(file.type)) {
      const error = "File type not supported. Supported types: PDF, DOCX, DOC, TXT, XLSX, XLS, PPTX, PPT, MD";
      console.warn("[DOCUMENT_SERVICE] ❌ Unsupported file type:", file.type);
      return { isValid: false, error };
    }

    // Check filename length
    if (file.name.length > 255) {
      const error = "Filename is too long (max 255 characters)";
      console.warn("[DOCUMENT_SERVICE] ❌ Filename too long:", file.name.length);
      return { isValid: false, error };
    }

    // Check for malicious filenames
    if (this.containsMaliciousCharacters(file.name)) {
      const error = "Filename contains invalid characters";
      console.warn("[DOCUMENT_SERVICE] ❌ Malicious filename:", file.name);
      return { isValid: false, error };
    }

    console.log("[DOCUMENT_SERVICE] ✅ File validation passed");
    return { isValid: true };
  }

  /**
   * Format file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
    console.log("[DOCUMENT_SERVICE] 🔍 Validating multiple files:", files.length);

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

    console.log("[DOCUMENT_SERVICE] 📊 Validation results:", {
      validFiles: validFiles.length,
      errors: errors.length,
      totalSize: this.formatFileSize(totalSize)
    });

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
   * 🔧 Debug method for checking authentication
   */
  async debugAuth(): Promise<void> {
    console.log("=== 🔍 DOCUMENT SERVICE AUTH DEBUG ===");
    
    try {
      const session = await getSession();
      console.log("NextAuth Session:", {
        exists: !!session,
        userEmail: session?.user?.email,
        hasAccessToken: !!session?.accessToken,
        tokenLength: session?.accessToken ? (session.accessToken as string).length : 0
      });
      
      const localToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      console.log("LocalStorage Token:", {
        exists: !!localToken,
        tokenLength: localToken?.length || 0
      });
      
    } catch (error) {
      console.error("Auth debug error:", error);
    }
    
    console.log("=== 🔍 DOCUMENT SERVICE AUTH DEBUG END ===");
  }

  /**
   * Upload multiple documents in a single request (bulk upload)
   */
  async bulkUploadDocuments(
    request: BulkUploadDocumentRequest,
    onProgress?: (progress: number) => void
  ): Promise<SuccessResponse<BulkUploadResponse>> {
    console.log("[DOCUMENT_SERVICE] 🚀 Starting bulk upload:", {
      fileCount: request.files.length,
      totalSize: this.formatFileSize(
        request.files.reduce((sum: number, file: File) => sum + file.size, 0)
      ),
    });

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
              console.log(`[DOCUMENT_SERVICE] 📊 Bulk upload progress: ${progress}%`);
              onProgress(progress);
            }
          },
          timeout: 600000, // 10 minutes for bulk uploads
        }
      );

      console.log("[DOCUMENT_SERVICE] ✅ Bulk upload successful:", {
        successful: response.data.successful_uploads,
        failed: response.data.failed_uploads,
        total: response.data.total_files,
      });

      return response;
    } catch (error) {
      console.error("[DOCUMENT_SERVICE] ❌ Bulk upload failed:", error);
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
      console.log("[DOCUMENT_MUTATIONS] 🚀 Upload mutation started");
      const response = await documentService.uploadDocument(
        request,
        onProgress
      );
      console.log("[DOCUMENT_MUTATIONS] ✅ Upload mutation completed");
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
      console.log("[DOCUMENT_MUTATIONS] 🚀 Bulk upload mutation started");
      const response = await documentService.bulkUploadDocuments(
        request,
        onProgress
      );
      console.log("[DOCUMENT_MUTATIONS] ✅ Bulk upload mutation completed");
      return response.data;
    },
  }),

  /**
   * Delete document mutation
   */
  delete: () => ({
    mutationFn: async (id: string) => {
      console.log("[DOCUMENT_MUTATIONS] 🗑️ Delete mutation started:", id);
      const response = await documentService.deleteDocument(id);
      console.log("[DOCUMENT_MUTATIONS] ✅ Delete mutation completed");
      return response;
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
      console.log("[DOCUMENT_MUTATIONS] ⬇️ Download mutation started:", { id, originalFileName });
      await documentService.downloadDocument(id, originalFileName);
      console.log("[DOCUMENT_MUTATIONS] ✅ Download mutation completed");
    },
  }),
};