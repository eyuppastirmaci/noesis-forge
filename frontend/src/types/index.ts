// User types
export type {
  User,
  PublicUser,
  CreateUserRequest,
  UpdateUserRequest,
  ChangePasswordRequest,
} from "./user";

export { UserStatus } from "./user";

// Role & Permission types
export type {
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignRoleRequest,
} from "./role";

export { PermissionCategory } from "./role";

// Authentication types
export type {
  TokenPair,
  TokenClaims,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  LogoutRequest,
  NextAuthUser,
  DecodedJWT,
} from "./auth";

export { AuthErrorCode } from "./auth";

// Favorite types
export type {
  Favorite,
  FavoriteResponse,
  IsFavoritedResponse,
  FavoriteCountResponse,
} from "./favorite";

export {
  FAVORITE_ENDPOINTS,
  FAVORITE_QUERY_KEYS,
  FAVORITE_MUTATION_KEYS,
} from "./favorite";

// Document types
export type {
  Document,
  Collection,
  DocumentCollection,
  UploadDocumentRequest,
  UpdateDocumentRequest,
  BulkUploadDocumentRequest,
  BulkUploadResponse,
  DocumentListRequest,
  DocumentListResponse,
  DocumentResponse,
  DocumentTitleResponse,
  DocumentPreviewResponse,
  DocumentUploadProgress,
  FileValidationResult,
  DocumentSortField,
  DocumentSortDirection,
  DocumentFilterStatus,
  DocumentFilterType,
  ProcessingTask,
  ProcessingQueueItem,
  ProcessingQueueResponse,
  DocumentProcessingProgress,
} from "./document";

export {
  DocumentStatus,
  DocumentType,
  DocumentErrorCode,
  ProcessingTaskType,
  ProcessingTaskStatus,
  DOCUMENT_ENDPOINTS,
  DOCUMENT_QUERY_KEYS,
  DOCUMENT_MUTATION_KEYS,
  SUPPORTED_FILE_TYPES,
  FILE_SIZE_LIMITS,
} from "./document";

// Share types
export type { CreateShareRequest, CreateShareResponse, ShareItem, GetSharesResponse } from "./share";
export { SHARE_ENDPOINTS } from "./share";

// Comment types
export type {
  Comment,
  CommentType,
  CommentPosition,
  CommentUser,
  CommentResponse,
  CommentsListResponse,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentListRequest,
  CommentFilters,
  CommentSort,
  CommentStats,
  CommentPermissions,
  CommentUIState,
  CommentThread,
  CommentEvent,
  CommentMention,
  CommentDraft,
  CommentNotification,
  CommentExportData,
  AnnotationData,
  AnnotationTool,
  CommentActivity,
  CommentRealTimeEvent,
  CommentTypingIndicator,
} from "./comment";

export {
  COMMENT_ENDPOINTS,
  COMMENT_QUERY_KEYS,
  COMMENT_MUTATION_KEYS,
  COMMENT_VALIDATION,
  CommentErrorCode,
} from "./comment";

// Activity types
export type {
  ActivityType,
  ActivityMetadata,
  ActivityUser,
  ActivityDocument,
  ActivityResponse,
  ActivitiesListResponse,
  ActivityStatsResponse,
  DocumentActivitySummary,
  UserActivitySummary,
  ActivityListRequest,
  ActivityFilters,
  ActivitySort,
  ActivityUIState,
  ActivityGroup,
  ActivityTimelineItem,
  ActivityFeed,
  ActivityNotification,
  ActivityExportData,
  ActivityExportOptions,
  ActivitySearchRequest,
  ActivitySearchResponse,
  ActivityAnalytics,
  DailyActivityStats,
  WeeklyActivityStats,
  MonthlyActivityStats,
  TypeBreakdownStats,
  UserBreakdownStats,
  DocumentBreakdownStats,
  PeakHoursStats,
  ActivityRealTimeEvent,
  ActivitySubscription,
  ActivityPreferences,
} from "./activity";

export {
  ACTIVITY_ICONS,
  ACTIVITY_COLORS,
  ACTIVITY_MESSAGES,
  ACTIVITY_ENDPOINTS,
  ACTIVITY_QUERY_KEYS,
  ACTIVITY_MUTATION_KEYS,
  ActivityErrorCode,
} from "./activity";

// API types
export type {
  ApiResponse,
  ApiError,
  ValidationError,
  SuccessResponse,
  AuthTokens,
} from "./api";

export {
  HttpStatus,
  ApiClientError,
  isSuccessResponse,
  isApiClientError,
  extractFieldErrors,
  getErrorMessage,
} from "./api";

// Common utility types
export type ID = string;
export type Timestamp = string; // ISO date string
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// API endpoint paths - for type safety
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    PROFILE: "/auth/profile",
    CHANGE_PASSWORD: "/auth/change-password",
    FULL_NAME: "/auth/profile/full-name",
    FULL_NAME_BY_ID: (id: string) => `/auth/users/${id}/full-name`,
  },

  // Role endpoints
  ROLES: {
    BASE: "/roles",
    BY_ID: (id: string) => `/roles/${id}`,
    PERMISSIONS: "/roles/permissions",
    PERMISSIONS_BY_CATEGORY: (category: string) =>
      `/roles/permissions/categories/${category}`,
    ASSIGN: "/roles/assign",
  },

  // Document endpoints (imported from document types)
  DOCUMENTS: {
    UPLOAD: "/documents/upload",
    LIST: "/documents",
    GET: (id: string) => `/documents/${id}`,
    DELETE: (id: string) => `/documents/${id}`,
    DOWNLOAD: (id: string) => `/documents/${id}/download`,
    PREVIEW: (id: string) => `/documents/${id}/preview`,
  },

  // Health endpoints
  HEALTH: {
    BASE: "/health",
    READY: "/health/ready",
    LIVE: "/health/live",
  },
} as const;

// HTTP Methods type
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// Storage keys - for localStorage/sessionStorage
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER: "user",
  THEME: "theme",
  LANGUAGE: "language",
} as const;

// Query keys - For TanStack Query
export const QUERY_KEYS = {
  // Auth queries
  AUTH: {
    PROFILE: ["auth", "profile"] as const,
    VERIFY_TOKEN: ["auth", "verify"] as const,
  },

  // Role queries
  ROLES: {
    ALL: ["roles"] as const,
    BY_ID: (id: string) => ["roles", id] as const,
    PERMISSIONS: ["roles", "permissions"] as const,
    PERMISSIONS_BY_CATEGORY: (category: string) =>
      ["roles", "permissions", category] as const,
  },

  // Document queries (imported from document types)
  DOCUMENTS: {
    ALL: ["documents"] as const,
    LIST: (params: any) => ["documents", "list", params] as const,
    BY_ID: (id: string) => ["documents", "detail", id] as const,
    PREVIEW: (id: string) => ["documents", "preview", id] as const,
    SEARCH: (query: string) => ["documents", "search", query] as const,
  },

  // Health queries
  HEALTH: {
    STATUS: ["health"] as const,
  },
} as const;

// Mutation keys - For TanStack Query
export const MUTATION_KEYS = {
  // Auth mutations
  AUTH: {
    LOGIN: "auth.login",
    REGISTER: "auth.register",
    LOGOUT: "auth.logout",
    REFRESH: "auth.refresh",
    UPDATE_PROFILE: "auth.updateProfile",
    CHANGE_PASSWORD: "auth.changePassword",
  },

  // Role mutations
  ROLES: {
    CREATE: "roles.create",
    UPDATE: "roles.update",
    DELETE: "roles.delete",
    ASSIGN: "roles.assign",
  },

  // Document mutations
  DOCUMENTS: {
    UPLOAD: "documents.upload",
    DELETE: "documents.delete",
    UPDATE: "documents.update",
    DOWNLOAD: "documents.download",
  },
} as const;