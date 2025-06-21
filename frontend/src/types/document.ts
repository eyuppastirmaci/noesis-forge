// Document Status Enum
export enum DocumentStatus {
    PROCESSING = "processing",
    READY = "ready",
    FAILED = "failed",
    DELETED = "deleted",
  }
  
  // Document Type Enum
  export enum DocumentType {
    PDF = "pdf",
    DOCX = "docx", 
    TXT = "txt",
    XLSX = "xlsx",
    PPTX = "pptx",
    OTHER = "other",
  }
  
  // Core Document Interface
  export interface Document {
    id: string;
    title: string;
    description: string;
    fileName: string; // UUID-based filename in storage
    originalFileName: string; // Original filename from user
    fileSize: number;
    fileType: DocumentType;
    mimeType: string;
    status: DocumentStatus;
    version: number;
    tags: string;
    isPublic: boolean;
    viewCount: number;
    downloadCount: number;
    userID: string;
    processedAt?: string;
    createdAt: string;
    updatedAt: string;
  }
  
  // Collection Interface (for future use)
  export interface Collection {
    id: string;
    name: string;
    description: string;
    isPublic: boolean;
    userID: string;
    createdAt: string;
    updatedAt: string;
  }
  
  // Document Collection Relation (for future use)
  export interface DocumentCollection {
    id: string;
    documentID: string;
    collectionID: string;
    addedAt: string;
    document?: Document;
    collection?: Collection;
  }
  
  // === Request/Response Types ===
  
  // Upload Document Request
  export interface UploadDocumentRequest {
    title: string;
    description?: string;
    tags?: string;
    isPublic?: boolean;
    file: File;
  }
  
  // Document List Request
  export interface DocumentListRequest {
    page?: number;
    limit?: number;
    search?: string;
    fileType?: string;
    status?: string;
    tags?: string;
    sortBy?: string; // name, date, size, views
    sortDir?: string; // asc, desc
  }
  
  // Document List Response
  export interface DocumentListResponse {
    documents: Document[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
  
  // Document Response (Single)
  export interface DocumentResponse {
    document: Document;
  }
  
  // Document Preview Response
  export interface DocumentPreviewResponse {
    url: string;
  }
  
  // Document Upload Progress
  export interface DocumentUploadProgress {
    documentId?: string;
    progress: number;
    status: 'uploading' | 'processing' | 'completed' | 'error';
    error?: string;
  }
  
  // === API Endpoints ===
  export const DOCUMENT_ENDPOINTS = {
    // Document CRUD
    UPLOAD: "/documents/upload",
    BULK_UPLOAD: "/documents/bulk-upload",
    LIST: "/documents",
    GET: (id: string) => `/documents/${id}`,
    DELETE: (id: string) => `/documents/${id}`,
    
    // File operations
    DOWNLOAD: (id: string) => `/documents/${id}/download`,
    PREVIEW: (id: string) => `/documents/${id}/preview`,
    
    // Collections (for future)
    COLLECTIONS: "/collections",
    COLLECTION_BY_ID: (id: string) => `/collections/${id}`,
    COLLECTION_DOCUMENTS: (id: string) => `/collections/${id}/documents`,
  } as const;
  
  // === Query Keys ===
  export const DOCUMENT_QUERY_KEYS = {
    // Document queries
    DOCUMENTS: {
      ALL: ["documents"] as const,
      LIST: (params: DocumentListRequest) => ["documents", "list", params] as const,
      BY_ID: (id: string) => ["documents", "detail", id] as const,
      PREVIEW: (id: string) => ["documents", "preview", id] as const,
      SEARCH: (query: string) => ["documents", "search", query] as const,
    },
    
    // Collection queries (for future)
    COLLECTIONS: {
      ALL: ["collections"] as const,
      BY_ID: (id: string) => ["collections", id] as const,
      DOCUMENTS: (id: string) => ["collections", id, "documents"] as const,
    },
  } as const;
  
  // === Mutation Keys ===
  export const DOCUMENT_MUTATION_KEYS = {
    // Document mutations
    DOCUMENTS: {
      UPLOAD: "documents.upload",
      DELETE: "documents.delete", 
      UPDATE: "documents.update",
      DOWNLOAD: "documents.download",
    },
    
    // Collection mutations (for future)
    COLLECTIONS: {
      CREATE: "collections.create",
      UPDATE: "collections.update",
      DELETE: "collections.delete",
      ADD_DOCUMENT: "collections.addDocument",
      REMOVE_DOCUMENT: "collections.removeDocument",
    },
  } as const;
  
  // === Validation & Utilities ===
  
  // File Validation Result
  export interface FileValidationResult {
    isValid: boolean;
    error?: string;
  }
  
  // Supported File Types
  export const SUPPORTED_FILE_TYPES = {
    'application/pdf': { ext: '.pdf', type: DocumentType.PDF, icon: '📄' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', type: DocumentType.DOCX, icon: '📝' },
    'application/msword': { ext: '.doc', type: DocumentType.DOCX, icon: '📝' },
    'text/plain': { ext: '.txt', type: DocumentType.TXT, icon: '📋' },
    'text/markdown': { ext: '.md', type: DocumentType.TXT, icon: '📋' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: '.xlsx', type: DocumentType.XLSX, icon: '📊' },
    'application/vnd.ms-excel': { ext: '.xls', type: DocumentType.XLSX, icon: '📊' },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: '.pptx', type: DocumentType.PPTX, icon: '📽️' },
    'application/vnd.ms-powerpoint': { ext: '.ppt', type: DocumentType.PPTX, icon: '📽️' },
  } as const;
  
  // File Size Limits
  export const FILE_SIZE_LIMITS = {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    MAX_TOTAL_SIZE: 500 * 1024 * 1024, // 500MB for batch upload
  } as const;
  
  // Document Error Codes (Backend'den gelen error codes'lar)
  export enum DocumentErrorCode {
    // Upload errors
    UPLOAD_FAILED = "UPLOAD_FAILED",
    FILE_REQUIRED = "FILE_REQUIRED",
    INVALID_FORM = "INVALID_FORM",
    
    // File validation errors
    FILE_SIZE_TOO_LARGE = "FILE_SIZE_TOO_LARGE",
    FILE_TYPE_NOT_SUPPORTED = "FILE_TYPE_NOT_SUPPORTED",
    INVALID_FILENAME = "INVALID_FILENAME",
    
    // Document operation errors
    DOCUMENT_NOT_FOUND = "DOCUMENT_NOT_FOUND",
    FETCH_FAILED = "FETCH_FAILED",
    DELETE_FAILED = "DELETE_FAILED",
    DOWNLOAD_FAILED = "DOWNLOAD_FAILED",
    PREVIEW_FAILED = "PREVIEW_FAILED",
    
    // Storage errors
    STORAGE_ERROR = "STORAGE_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    
    // Permission errors
    ACCESS_DENIED = "ACCESS_DENIED",
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
  }
  
  // Helper Types
  export type DocumentSortField = "name" | "date" | "size" | "views" | "title";
  export type DocumentSortDirection = "asc" | "desc";
  export type DocumentFilterStatus = DocumentStatus | "all";
  export type DocumentFilterType = DocumentType | "all";

  // File metadata for individual files in bulk upload
  export interface FileMetadata {
    title: string;
    description?: string;
    tags?: string;
    isPublic?: boolean;
  }

  // Bulk upload types
  export interface BulkUploadDocumentRequest {
    files: File[];
    metadata: FileMetadata[];
  }

  export interface BulkUploadResponse {
    successful_uploads: number;
    failed_uploads: number;
    total_files: number;
    documents: Document[];
    failures?: Array<{
      filename: string;
      error: string;
    }>;
  }