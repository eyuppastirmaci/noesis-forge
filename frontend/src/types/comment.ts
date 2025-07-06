import { ID, Timestamp } from "./index";

// Comment Types
export type CommentType = "general" | "annotation" | "reply";

export interface CommentPosition {
  // For PDF documents
  page?: number;        // Page number (1-based)
  x?: number;          // X coordinate (percentage)
  y?: number;          // Y coordinate (percentage)
  width?: number;      // Width of annotation area
  height?: number;     // Height of annotation area
  
  // For text-based documents
  textStart?: number;  // Start character position
  textEnd?: number;    // End character position
  
  // For general positioning
  quotedText?: string; // Text that was selected/quoted
}

export interface CommentUser {
  id: ID;
  username: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Comment {
  id: ID;
  documentID: ID;
  userID: ID;
  content: string;
  commentType: CommentType;
  position?: CommentPosition;
  parentCommentID?: ID;
  isResolved: boolean;
  resolvedBy?: ID;
  resolvedAt?: Timestamp;
  isEdited: boolean;
  editedAt?: Timestamp;
  user: CommentUser;
  replyCount: number;
  replies?: Comment[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Request Types
export interface CreateCommentRequest {
  content: string;
  commentType?: CommentType;
  position?: CommentPosition;
  parentCommentID?: ID;
}

export interface UpdateCommentRequest {
  content: string;
}

// Response Types
export interface CommentResponse {
  id: ID;
  documentID: ID;
  userID: ID;
  content: string;
  commentType: CommentType;
  position?: CommentPosition;
  parentCommentID?: ID;
  isResolved: boolean;
  resolvedBy?: ID;
  resolvedAt?: Timestamp;
  isEdited: boolean;
  editedAt?: Timestamp;
  user: CommentUser;
  replyCount: number;
  replies?: CommentResponse[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CommentsListResponse {
  comments: CommentResponse[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

// Comment List Request Parameters
export interface CommentListRequest {
  page?: number;
  limit?: number;
  resolved?: boolean;
}

// Comment Filter Types
export interface CommentFilters {
  resolved?: boolean;
  commentType?: CommentType;
  userId?: ID;
  dateRange?: {
    from?: Timestamp;
    to?: Timestamp;
  };
}

// Comment Sort Types
export type CommentSortField = "createdAt" | "updatedAt" | "replyCount";
export type CommentSortDirection = "asc" | "desc";

export interface CommentSort {
  field: CommentSortField;
  direction: CommentSortDirection;
}

// Comment Stats Types
export interface CommentStats {
  totalComments: number;
  resolvedComments: number;
  unresolvedComments: number;
  annotationCount: number;
  generalCommentCount: number;
  replyCount: number;
  topCommenter?: CommentUser;
}

// Comment Permission Types
export interface CommentPermissions {
  canComment: boolean;
  canEditOwn: boolean;
  canDeleteOwn: boolean;
  canResolve: boolean;
  canViewAll: boolean;
  canModerate: boolean;
}

// Comment UI State Types
export interface CommentUIState {
  isLoading: boolean;
  isSubmitting: boolean;
  error?: string;
  selectedComment?: ID;
  replyingTo?: ID;
  editingComment?: ID;
  showResolved: boolean;
  filters: CommentFilters;
  sort: CommentSort;
}

// Comment Thread Types
export interface CommentThread {
  rootComment: Comment;
  replies: Comment[];
  totalReplies: number;
  isExpanded: boolean;
  isLoading: boolean;
}

// Comment Event Types
export interface CommentEvent {
  type: "comment_added" | "comment_updated" | "comment_deleted" | "comment_resolved" | "comment_unresolved";
  comment: Comment;
  documentId: ID;
  userId: ID;
  timestamp: Timestamp;
}

// Comment Mention Types
export interface CommentMention {
  id: ID;
  username: string;
  name: string;
  position: {
    start: number;
    end: number;
  };
}

// Comment Draft Types
export interface CommentDraft {
  id: ID;
  content: string;
  position?: CommentPosition;
  parentCommentID?: ID;
  lastSaved: Timestamp;
  autoSave: boolean;
}

// API Endpoints
export const COMMENT_ENDPOINTS = {
  // Document comments
  DOCUMENT_COMMENTS: (documentId: ID) => `/documents/${documentId}/comments`,
  
  // Comment management
  COMMENT_BY_ID: (commentId: ID) => `/comments/${commentId}`,
  RESOLVE_COMMENT: (commentId: ID) => `/comments/${commentId}/resolve`,
  UNRESOLVE_COMMENT: (commentId: ID) => `/comments/${commentId}/unresolve`,
  
  // Comment replies
  COMMENT_REPLIES: (commentId: ID) => `/comments/${commentId}/replies`,
} as const;

// Query Keys
export const COMMENT_QUERY_KEYS = {
  ALL: ["comments"] as const,
  DOCUMENT_COMMENTS: (documentId: ID) => ["comments", "document", documentId] as const,
  COMMENT_BY_ID: (commentId: ID) => ["comments", "detail", commentId] as const,
  COMMENT_REPLIES: (commentId: ID) => ["comments", "replies", commentId] as const,
  COMMENT_STATS: (documentId: ID) => ["comments", "stats", documentId] as const,
} as const;

// Mutation Keys
export const COMMENT_MUTATION_KEYS = {
  CREATE: ["comments", "create"] as const,
  UPDATE: ["comments", "update"] as const,
  DELETE: ["comments", "delete"] as const,
  RESOLVE: ["comments", "resolve"] as const,
  UNRESOLVE: ["comments", "unresolve"] as const,
  REPLY: ["comments", "reply"] as const,
} as const;

// Comment Validation
export const COMMENT_VALIDATION = {
  CONTENT_MIN_LENGTH: 1,
  CONTENT_MAX_LENGTH: 5000,
  REPLY_MAX_DEPTH: 5,
  MENTIONS_MAX_COUNT: 10,
} as const;

// Comment Error Codes
export enum CommentErrorCode {
  COMMENT_NOT_FOUND = "COMMENT_NOT_FOUND",
  COMMENT_ACCESS_DENIED = "COMMENT_ACCESS_DENIED",
  COMMENT_ALREADY_RESOLVED = "COMMENT_ALREADY_RESOLVED",
  COMMENT_CONTENT_TOO_LONG = "COMMENT_CONTENT_TOO_LONG",
  COMMENT_CONTENT_EMPTY = "COMMENT_CONTENT_EMPTY",
  COMMENT_THREAD_TOO_DEEP = "COMMENT_THREAD_TOO_DEEP",
  COMMENT_MENTIONS_LIMIT_EXCEEDED = "COMMENT_MENTIONS_LIMIT_EXCEEDED",
  COMMENT_PERMISSION_DENIED = "COMMENT_PERMISSION_DENIED",
  COMMENT_DOCUMENT_NOT_FOUND = "COMMENT_DOCUMENT_NOT_FOUND",
  COMMENT_PARENT_NOT_FOUND = "COMMENT_PARENT_NOT_FOUND",
  COMMENT_EDIT_TIME_EXPIRED = "COMMENT_EDIT_TIME_EXPIRED",
}

// Comment Notification Types
export interface CommentNotification {
  id: ID;
  type: "comment_reply" | "comment_mention" | "comment_resolved";
  commentId: ID;
  documentId: ID;
  documentTitle: string;
  fromUser: CommentUser;
  message: string;
  isRead: boolean;
  createdAt: Timestamp;
}

// Comment Export Types
export interface CommentExportData {
  documentId: ID;
  documentTitle: string;
  comments: Comment[];
  exportedAt: Timestamp;
  exportedBy: CommentUser;
}

// Annotation-specific Types
export interface AnnotationData {
  id: ID;
  position: CommentPosition;
  content: string;
  color?: string;
  opacity?: number;
  isHighlight?: boolean;
  isSticky?: boolean;
}

export interface AnnotationTool {
  type: "highlight" | "sticky_note" | "text_comment" | "shape";
  cursor: string;
  color: string;
  opacity: number;
}

// Comment Activity Types
export interface CommentActivity {
  id: ID;
  type: "created" | "updated" | "deleted" | "resolved" | "unresolved" | "replied";
  commentId: ID;
  userId: ID;
  user: CommentUser;
  timestamp: Timestamp;
  details?: Record<string, any>;
}

// Real-time Comment Types
export interface CommentRealTimeEvent {
  type: "comment_added" | "comment_updated" | "comment_deleted" | "comment_resolved" | "user_typing";
  documentId: ID;
  data: any;
  userId: ID;
  timestamp: Timestamp;
}

export interface CommentTypingIndicator {
  userId: ID;
  user: CommentUser;
  documentId: ID;
  commentId?: ID;
  isTyping: boolean;
  lastActivity: Timestamp;
} 