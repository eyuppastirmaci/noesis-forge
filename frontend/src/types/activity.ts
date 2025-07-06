import { ID, Timestamp } from "./index";
import { CommentPosition } from "./comment";

// Activity Types
export type ActivityType = 
  | "upload"
  | "view" 
  | "download"
  | "update"
  | "delete"
  | "share"
  | "unshare"
  | "comment"
  | "edit_comment"
  | "delete_comment"
  | "resolve_comment"
  | "unresolve_comment"
  | "favorite"
  | "unfavorite"
  | "preview"
  | "rename"
  | "move"
  | "tag_update"
  | "permission_change";

// Activity Metadata
export interface ActivityMetadata {
  // For file operations
  fileSize?: number;
  fileType?: string;
  fileName?: string;
  oldFileName?: string;
  newFileName?: string;
  
  // For updates
  fieldsChanged?: string[];
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  
  // For sharing
  shareType?: string;    // "user", "public", "link"
  shareTarget?: string;  // Email, user ID, or "public"
  shareToken?: string;   // For link sharing
  expiresAt?: Timestamp; // Share expiration
  maxDownloads?: number; // Download limit
  
  // For comments
  commentID?: ID;
  commentContent?: string;
  commentType?: string;
  parentCommentID?: ID;
  
  // For position-based activities (annotations)
  position?: CommentPosition;
  
  // For collections
  collectionID?: ID;
  collectionName?: string;
  
  // For tags
  oldTags?: string[];
  newTags?: string[];
  
  // For permissions
  oldPermissions?: Record<string, any>;
  newPermissions?: Record<string, any>;
  
  // Additional context
  source?: string;      // "web", "mobile", "api"
  duration?: number;    // Duration in milliseconds (for view activities)
  pageCount?: number;   // For PDF activities
  
  // Error information (for failed activities)
  error?: string;
  errorCode?: string;
  stackTrace?: string;
}

// Activity User Response
export interface ActivityUser {
  id: ID;
  username: string;
  name: string;
  email: string;
}

// Activity Document Response
export interface ActivityDocument {
  id: ID;
  title: string;
  originalFileName: string;
  fileType: string;
}

// Activity Response
export interface ActivityResponse {
  id: ID;
  documentID: ID;
  userID: ID;
  activityType: ActivityType;
  description: string;
  metadata: ActivityMetadata;
  ipAddress?: string;
  userAgent?: string;
  user: ActivityUser;
  document?: ActivityDocument;
  icon: string;
  color: string;
  isImportant: boolean;
  createdAt: Timestamp;
}

// Activities List Response
export interface ActivitiesListResponse {
  activities: ActivityResponse[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
}

// Activity Stats Response
export interface ActivityStatsResponse {
  totalActivities: number;
  todayActivities: number;
  thisWeekActivities: number;
  activityBreakdown: Record<ActivityType, number>;
  recentDocuments: DocumentActivitySummary[];
  topUsers: UserActivitySummary[];
}

export interface DocumentActivitySummary {
  documentID: ID;
  title: string;
  originalFileName: string;
  activityCount: number;
  lastActivity: Timestamp;
}

export interface UserActivitySummary {
  userID: ID;
  username: string;
  name: string;
  activityCount: number;
  lastActivity: Timestamp;
}

// Activity List Request Parameters
export interface ActivityListRequest {
  page?: number;
  limit?: number;
  activityType?: ActivityType;
  userId?: ID;
  documentId?: ID;
  fromDate?: Timestamp;
  toDate?: Timestamp;
}

// Activity Filter Types
export interface ActivityFilters {
  activityType?: ActivityType;
  userId?: ID;
  documentId?: ID;
  dateRange?: {
    from?: Timestamp;
    to?: Timestamp;
  };
  source?: string;
  isImportant?: boolean;
}

// Activity Sort Types
export type ActivitySortField = "createdAt" | "activityType" | "user" | "document";
export type ActivitySortDirection = "asc" | "desc";

export interface ActivitySort {
  field: ActivitySortField;
  direction: ActivitySortDirection;
}

// Activity UI State Types
export interface ActivityUIState {
  isLoading: boolean;
  error?: string;
  selectedActivity?: ID;
  filters: ActivityFilters;
  sort: ActivitySort;
  groupBy?: "date" | "type" | "user" | "document";
  showDetails: boolean;
}

// Activity Group Types
export interface ActivityGroup {
  key: string;
  title: string;
  count: number;
  activities: ActivityResponse[];
  isExpanded: boolean;
}

// Activity Timeline Types
export interface ActivityTimelineItem {
  id: ID;
  type: "activity" | "milestone" | "separator";
  activity?: ActivityResponse;
  milestone?: {
    title: string;
    description: string;
    icon: string;
    color: string;
  };
  separator?: {
    title: string;
    type: "date" | "month" | "year";
  };
  timestamp: Timestamp;
}

// Activity Feed Types
export interface ActivityFeed {
  items: ActivityTimelineItem[];
  hasMore: boolean;
  isLoading: boolean;
  lastLoadedAt: Timestamp;
  totalCount: number;
}

// Activity Notification Types
export interface ActivityNotification {
  id: ID;
  activityId: ID;
  type: "activity_mention" | "activity_important" | "activity_document_shared";
  fromUser: ActivityUser;
  document: ActivityDocument;
  message: string;
  isRead: boolean;
  createdAt: Timestamp;
}

// Activity Export Types
export interface ActivityExportData {
  documentId?: ID;
  userId?: ID;
  activities: ActivityResponse[];
  exportedAt: Timestamp;
  exportedBy: ActivityUser;
  filters: ActivityFilters;
  totalCount: number;
}

export interface ActivityExportOptions {
  format: "json" | "csv" | "pdf";
  dateRange?: {
    from: Timestamp;
    to: Timestamp;
  };
  includeMetadata: boolean;
  includeUserDetails: boolean;
  includeDocumentDetails: boolean;
  activityTypes?: ActivityType[];
}

// Activity Search Types
export interface ActivitySearchRequest {
  query: string;
  filters?: ActivityFilters;
  sort?: ActivitySort;
  page?: number;
  limit?: number;
}

export interface ActivitySearchResponse {
  activities: ActivityResponse[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  query: string;
  searchTime: number;
}

// Activity Analytics Types
export interface ActivityAnalytics {
  dailyStats: DailyActivityStats[];
  weeklyStats: WeeklyActivityStats[];
  monthlyStats: MonthlyActivityStats[];
  typeBreakdown: TypeBreakdownStats[];
  userBreakdown: UserBreakdownStats[];
  documentBreakdown: DocumentBreakdownStats[];
  peakHours: PeakHoursStats[];
}

export interface DailyActivityStats {
  date: string;
  totalActivities: number;
  typeBreakdown: Record<ActivityType, number>;
  uniqueUsers: number;
  uniqueDocuments: number;
}

export interface WeeklyActivityStats {
  week: string;
  totalActivities: number;
  averageDaily: number;
  growth: number;
}

export interface MonthlyActivityStats {
  month: string;
  totalActivities: number;
  averageDaily: number;
  growth: number;
}

export interface TypeBreakdownStats {
  activityType: ActivityType;
  count: number;
  percentage: number;
  trend: "up" | "down" | "stable";
}

export interface UserBreakdownStats {
  user: ActivityUser;
  count: number;
  percentage: number;
  topActivityType: ActivityType;
}

export interface DocumentBreakdownStats {
  document: ActivityDocument;
  count: number;
  percentage: number;
  topActivityType: ActivityType;
}

export interface PeakHoursStats {
  hour: number;
  count: number;
  percentage: number;
}

// Activity Icon and Color Mapping
export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  upload: "upload",
  view: "eye",
  download: "download",
  update: "edit",
  delete: "trash",
  share: "share",
  unshare: "share-off",
  comment: "message-circle",
  edit_comment: "edit",
  delete_comment: "trash",
  resolve_comment: "check-circle",
  unresolve_comment: "x-circle",
  favorite: "heart",
  unfavorite: "heart-off",
  preview: "eye",
  rename: "edit",
  move: "folder",
  tag_update: "tag",
  permission_change: "shield",
};

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  upload: "green",
  view: "blue",
  preview: "blue",
  download: "indigo",
  update: "yellow",
  rename: "yellow",
  edit_comment: "yellow",
  delete: "red",
  delete_comment: "red",
  share: "purple",
  comment: "purple",
  unshare: "gray",
  unfavorite: "gray",
  resolve_comment: "green",
  unresolve_comment: "orange",
  favorite: "pink",
  move: "teal",
  tag_update: "cyan",
  permission_change: "amber",
};

// Activity Messages
export const ACTIVITY_MESSAGES: Record<ActivityType, string> = {
  upload: "uploaded",
  view: "viewed",
  download: "downloaded",
  update: "updated",
  delete: "deleted",
  share: "shared",
  unshare: "unshared",
  comment: "commented on",
  edit_comment: "edited comment on",
  delete_comment: "deleted comment on",
  resolve_comment: "resolved comment on",
  unresolve_comment: "unresolved comment on",
  favorite: "favorited",
  unfavorite: "unfavorited",
  preview: "previewed",
  rename: "renamed",
  move: "moved",
  tag_update: "updated tags on",
  permission_change: "changed permissions on",
};

// API Endpoints
export const ACTIVITY_ENDPOINTS = {
  // Document activities
  DOCUMENT_ACTIVITIES: (documentId: ID) => `/documents/${documentId}/activities`,
  
  // User activities
  USER_ACTIVITIES: "/activities",
  ACTIVITY_STATS: "/activities/stats",
  
  // Activity export
  EXPORT_ACTIVITIES: "/activities/export",
  
  // Activity search
  SEARCH_ACTIVITIES: "/activities/search",
} as const;

// Query Keys
export const ACTIVITY_QUERY_KEYS = {
  ALL: ["activities"] as const,
  DOCUMENT_ACTIVITIES: (documentId: ID) => ["activities", "document", documentId] as const,
  USER_ACTIVITIES: (userId?: ID) => ["activities", "user", userId] as const,
  ACTIVITY_STATS: (documentId?: ID) => ["activities", "stats", documentId] as const,
  ACTIVITY_SEARCH: (query: string) => ["activities", "search", query] as const,
  ACTIVITY_ANALYTICS: (filters?: ActivityFilters) => ["activities", "analytics", filters] as const,
} as const;

// Mutation Keys
export const ACTIVITY_MUTATION_KEYS = {
  EXPORT: ["activities", "export"] as const,
  CLEANUP: ["activities", "cleanup"] as const,
} as const;

// Activity Error Codes
export enum ActivityErrorCode {
  ACTIVITY_NOT_FOUND = "ACTIVITY_NOT_FOUND",
  ACTIVITY_ACCESS_DENIED = "ACTIVITY_ACCESS_DENIED",
  ACTIVITY_EXPORT_FAILED = "ACTIVITY_EXPORT_FAILED",
  ACTIVITY_CLEANUP_FAILED = "ACTIVITY_CLEANUP_FAILED",
  ACTIVITY_SEARCH_FAILED = "ACTIVITY_SEARCH_FAILED",
  ACTIVITY_ANALYTICS_FAILED = "ACTIVITY_ANALYTICS_FAILED",
}

// Activity Real-time Types
export interface ActivityRealTimeEvent {
  type: "activity_added" | "activity_updated" | "activity_deleted";
  documentId: ID;
  activity: ActivityResponse;
  userId: ID;
  timestamp: Timestamp;
}

// Activity Subscription Types
export interface ActivitySubscription {
  documentId?: ID;
  userId?: ID;
  activityTypes?: ActivityType[];
  isActive: boolean;
  lastActivity?: Timestamp;
}

// Activity Preferences
export interface ActivityPreferences {
  showImportantOnly: boolean;
  groupByDate: boolean;
  showUserDetails: boolean;
  showMetadata: boolean;
  refreshInterval: number; // seconds
  maxItems: number;
  enableNotifications: boolean;
  notificationTypes: ActivityType[];
} 