import { apiClient } from "@/lib/api";
import {
  ActivityResponse,
  ActivitiesListResponse,
  ActivityStatsResponse,
  ActivityListRequest,
  ActivityFilters,
  ActivityExportData,
  ActivityExportOptions,
  ActivitySearchRequest,
  ActivitySearchResponse,
  ActivityAnalytics,
  ACTIVITY_ENDPOINTS,
  SuccessResponse,
  ID,
  ActivityType,
} from "@/types";

// Response type definitions for API calls
export interface ActivityListResponseData extends ActivitiesListResponse {}

export interface ActivityStatsResponseData extends ActivityStatsResponse {}

export interface ActivityExportResponseData extends ActivityExportData {}

export interface ActivitySearchResponseData extends ActivitySearchResponse {}

export interface ActivityAnalyticsResponseData extends ActivityAnalytics {}

// API Response types
export type ActivityListApiResponse = SuccessResponse<ActivityListResponseData>;
export type ActivityStatsApiResponse = SuccessResponse<ActivityStatsResponseData>;
export type ActivityExportApiResponse = SuccessResponse<ActivityExportResponseData>;
export type ActivitySearchApiResponse = SuccessResponse<ActivitySearchResponseData>;
export type ActivityAnalyticsApiResponse = SuccessResponse<ActivityAnalyticsResponseData>;

export class ActivityService {
  /**
   * Get activities for a specific document
   */
  async getDocumentActivities(
    documentId: ID,
    request: ActivityListRequest = {}
  ): Promise<ActivityListApiResponse> {
    const params = new URLSearchParams();

    if (request.page) params.append("page", request.page.toString());
    if (request.limit) params.append("limit", request.limit.toString());
    if (request.activityType) params.append("activity_type", request.activityType);
    if (request.userId) params.append("user_id", request.userId);
    if (request.fromDate) params.append("from_date", request.fromDate);
    if (request.toDate) params.append("to_date", request.toDate);

    const url = `${ACTIVITY_ENDPOINTS.DOCUMENT_ACTIVITIES(documentId)}${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    try {
      const response = await apiClient.get<ActivityListResponseData>(url);
      return response;
    } catch (error) {
      console.error("[ACTIVITY_SERVICE] Failed to get document activities:", error);
      throw error;
    }
  }

  /**
   * Get user's activities across all documents
   */
  async getUserActivities(
    request: ActivityListRequest = {}
  ): Promise<ActivityListApiResponse> {
    const params = new URLSearchParams();

    if (request.page) params.append("page", request.page.toString());
    if (request.limit) params.append("limit", request.limit.toString());
    if (request.activityType) params.append("activity_type", request.activityType);
    if (request.documentId) params.append("document_id", request.documentId);
    if (request.fromDate) params.append("from_date", request.fromDate);
    if (request.toDate) params.append("to_date", request.toDate);

    const url = `${ACTIVITY_ENDPOINTS.USER_ACTIVITIES}${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    try {
      const response = await apiClient.get<ActivityListResponseData>(url);
      return response;
    } catch (error) {
      console.error("[ACTIVITY_SERVICE] Failed to get user activities:", error);
      throw error;
    }
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(
    documentId?: ID
  ): Promise<ActivityStatsApiResponse> {
    const params = new URLSearchParams();
    if (documentId) params.append("document_id", documentId);

    const url = `${ACTIVITY_ENDPOINTS.ACTIVITY_STATS}${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    try {
      const response = await apiClient.get<ActivityStatsResponseData>(url);
      return response;
    } catch (error) {
      console.error("[ACTIVITY_SERVICE] Failed to get activity stats:", error);
      throw error;
    }
  }

  /**
   * Search activities
   */
  async searchActivities(
    request: ActivitySearchRequest
  ): Promise<ActivitySearchApiResponse> {
    try {
      const response = await apiClient.post<ActivitySearchResponseData>(
        ACTIVITY_ENDPOINTS.SEARCH_ACTIVITIES,
        request
      );
      return response;
    } catch (error) {
      console.error("[ACTIVITY_SERVICE] Failed to search activities:", error);
      throw error;
    }
  }

  /**
   * Export activities
   */
  async exportActivities(
    documentId?: ID,
    options: ActivityExportOptions = { 
      format: "json",
      includeMetadata: true,
      includeUserDetails: true,
      includeDocumentDetails: true
    }
  ): Promise<ActivityExportApiResponse> {
    try {
      const requestData = {
        documentId,
        ...options,
      };

      const response = await apiClient.post<ActivityExportResponseData>(
        ACTIVITY_ENDPOINTS.EXPORT_ACTIVITIES,
        requestData
      );
      return response;
    } catch (error) {
      console.error("[ACTIVITY_SERVICE] Failed to export activities:", error);
      throw error;
    }
  }

  /**
   * Get activity analytics
   */
  async getActivityAnalytics(
    filters?: ActivityFilters
  ): Promise<ActivityAnalyticsApiResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.documentId) params.append("document_id", filters.documentId);
      if (filters?.userId) params.append("user_id", filters.userId);
      if (filters?.activityType) params.append("activity_type", filters.activityType);
      if (filters?.dateRange?.from) params.append("from_date", filters.dateRange.from);
      if (filters?.dateRange?.to) params.append("to_date", filters.dateRange.to);
      if (filters?.source) params.append("source", filters.source);
      if (filters?.isImportant !== undefined) params.append("is_important", filters.isImportant.toString());

      const url = `/activities/analytics${params.toString() ? `?${params.toString()}` : ""}`;
      
      const response = await apiClient.get<ActivityAnalyticsResponseData>(url);
      return response;
    } catch (error) {
      console.error("[ACTIVITY_SERVICE] Failed to get activity analytics:", error);
      throw error;
    }
  }

  /**
   * Get filtered activities with advanced filtering
   */
  async getFilteredActivities(
    filters: ActivityFilters,
    pagination: { page?: number; limit?: number } = {}
  ): Promise<ActivityListApiResponse> {
    const params = new URLSearchParams();

    // Pagination
    if (pagination.page) params.append("page", pagination.page.toString());
    if (pagination.limit) params.append("limit", pagination.limit.toString());

    // Filters
    if (filters.activityType) params.append("activity_type", filters.activityType);
    if (filters.userId) params.append("user_id", filters.userId);
    if (filters.documentId) params.append("document_id", filters.documentId);
    if (filters.dateRange?.from) params.append("from_date", filters.dateRange.from);
    if (filters.dateRange?.to) params.append("to_date", filters.dateRange.to);
    if (filters.source) params.append("source", filters.source);
    if (filters.isImportant !== undefined) params.append("is_important", filters.isImportant.toString());

    const url = `${ACTIVITY_ENDPOINTS.USER_ACTIVITIES}${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    try {
      const response = await apiClient.get<ActivityListResponseData>(url);
      return response;
    } catch (error) {
      console.error("[ACTIVITY_SERVICE] Failed to get filtered activities:", error);
      throw error;
    }
  }

  /**
   * Group activities by date, type, user, or document
   */
  groupActivities(
    activities: ActivityResponse[],
    groupBy: "date" | "type" | "user" | "document"
  ): Record<string, ActivityResponse[]> {
    return activities.reduce((groups, activity) => {
      let key: string;

      switch (groupBy) {
        case "date":
          key = new Date(activity.createdAt).toDateString();
          break;
        case "type":
          key = activity.activityType;
          break;
        case "user":
          key = activity.user.name || activity.user.username;
          break;
        case "document":
          key = activity.document?.title || "Unknown Document";
          break;
        default:
          key = "Other";
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(activity);

      return groups;
    }, {} as Record<string, ActivityResponse[]>);
  }

  /**
   * Filter activities by date range
   */
  filterActivitiesByDateRange(
    activities: ActivityResponse[],
    fromDate?: string,
    toDate?: string
  ): ActivityResponse[] {
    return activities.filter((activity) => {
      const activityDate = new Date(activity.createdAt);
      
      if (fromDate && activityDate < new Date(fromDate)) {
        return false;
      }
      
      if (toDate && activityDate > new Date(toDate)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Filter activities by type
   */
  filterActivitiesByType(
    activities: ActivityResponse[],
    activityTypes: ActivityType[]
  ): ActivityResponse[] {
    return activities.filter((activity) =>
      activityTypes.includes(activity.activityType)
    );
  }

  /**
   * Filter important activities only
   */
  filterImportantActivities(activities: ActivityResponse[]): ActivityResponse[] {
    return activities.filter((activity) => activity.isImportant);
  }

  /**
   * Sort activities
   */
  sortActivities(
    activities: ActivityResponse[],
    sortBy: "createdAt" | "activityType" | "user" | "document",
    direction: "asc" | "desc" = "desc"
  ): ActivityResponse[] {
    return [...activities].sort((a, b) => {
      let valueA: string | Date;
      let valueB: string | Date;

      switch (sortBy) {
        case "createdAt":
          valueA = new Date(a.createdAt);
          valueB = new Date(b.createdAt);
          break;
        case "activityType":
          valueA = a.activityType;
          valueB = b.activityType;
          break;
        case "user":
          valueA = a.user.name || a.user.username;
          valueB = b.user.name || b.user.username;
          break;
        case "document":
          valueA = a.document?.title || "";
          valueB = b.document?.title || "";
          break;
        default:
          return 0;
      }

      if (valueA < valueB) {
        return direction === "asc" ? -1 : 1;
      }
      if (valueA > valueB) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * Get activity summary for a time period
   */
  getActivitySummary(activities: ActivityResponse[]): {
    totalActivities: number;
    uniqueUsers: number;
    uniqueDocuments: number;
    activityBreakdown: Record<ActivityType, number>;
    mostActiveUser?: { user: any; count: number };
    mostActiveDocument?: { document: any; count: number };
  } {
    const summary = {
      totalActivities: activities.length,
      uniqueUsers: new Set(activities.map(a => a.userID)).size,
      uniqueDocuments: new Set(activities.map(a => a.documentID)).size,
      activityBreakdown: {} as Record<ActivityType, number>,
      mostActiveUser: undefined as { user: any; count: number } | undefined,
      mostActiveDocument: undefined as { document: any; count: number } | undefined,
    };

    // Activity breakdown
    activities.forEach(activity => {
      summary.activityBreakdown[activity.activityType] = 
        (summary.activityBreakdown[activity.activityType] || 0) + 1;
    });

    // Most active user
    const userCounts: Record<string, { user: any; count: number }> = {};
    activities.forEach(activity => {
      const userId = activity.userID;
      if (!userCounts[userId]) {
        userCounts[userId] = { user: activity.user, count: 0 };
      }
      userCounts[userId].count++;
    });
    
    const topUser = Object.values(userCounts).sort((a, b) => b.count - a.count)[0];
    if (topUser) {
      summary.mostActiveUser = topUser;
    }

    // Most active document
    const docCounts: Record<string, { document: any; count: number }> = {};
    activities.forEach(activity => {
      const docId = activity.documentID;
      if (activity.document && !docCounts[docId]) {
        docCounts[docId] = { document: activity.document, count: 0 };
      }
      if (docCounts[docId]) {
        docCounts[docId].count++;
      }
    });
    
    const topDoc = Object.values(docCounts).sort((a, b) => b.count - a.count)[0];
    if (topDoc) {
      summary.mostActiveDocument = topDoc;
    }

    return summary;
  }

  /**
   * Format activity for display
   */
  formatActivityMessage(activity: ActivityResponse): string {
    const { user, activityType, document } = activity;
    const userName = user.name || user.username;
    const documentTitle = document?.title || "a document";

    switch (activityType) {
      case "upload":
        return `${userName} uploaded ${documentTitle}`;
      case "view":
        return `${userName} viewed ${documentTitle}`;
      case "download":
        return `${userName} downloaded ${documentTitle}`;
      case "update":
        return `${userName} updated ${documentTitle}`;
      case "delete":
        return `${userName} deleted ${documentTitle}`;
      case "share":
        return `${userName} shared ${documentTitle}`;
      case "unshare":
        return `${userName} unshared ${documentTitle}`;
      case "comment":
        return `${userName} commented on ${documentTitle}`;
      case "edit_comment":
        return `${userName} edited a comment on ${documentTitle}`;
      case "delete_comment":
        return `${userName} deleted a comment on ${documentTitle}`;
      case "resolve_comment":
        return `${userName} resolved a comment on ${documentTitle}`;
      case "unresolve_comment":
        return `${userName} unresolved a comment on ${documentTitle}`;
      case "favorite":
        return `${userName} favorited ${documentTitle}`;
      case "unfavorite":
        return `${userName} unfavorited ${documentTitle}`;
      case "preview":
        return `${userName} previewed ${documentTitle}`;
      case "rename":
        return `${userName} renamed ${documentTitle}`;
      case "move":
        return `${userName} moved ${documentTitle}`;
      case "tag_update":
        return `${userName} updated tags on ${documentTitle}`;
      case "permission_change":
        return `${userName} changed permissions on ${documentTitle}`;
      default:
        return `${userName} performed an action on ${documentTitle}`;
    }
  }

  /**
   * Get relative time string for activity
   */
  getRelativeTime(dateString: string): string {
    const now = new Date();
    const activityDate = new Date(dateString);
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    
    return activityDate.toLocaleDateString();
  }

  /**
   * Download activity export file
   */
  async downloadActivityExport(
    exportData: ActivityExportData,
    format: "json" | "csv" | "pdf"
  ): Promise<void> {
    try {
      let content: string;
      let mimeType: string;
      let filename: string;

      switch (format) {
        case "json":
          content = JSON.stringify(exportData, null, 2);
          mimeType = "application/json";
          filename = `activities-${Date.now()}.json`;
          break;
        case "csv":
          content = this.convertToCSV(exportData.activities);
          mimeType = "text/csv";
          filename = `activities-${Date.now()}.csv`;
          break;
        case "pdf":
          // For PDF, we'd typically use a library like jsPDF
          // For now, we'll fall back to JSON
          content = JSON.stringify(exportData, null, 2);
          mimeType = "application/json";
          filename = `activities-${Date.now()}.json`;
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[ACTIVITY_SERVICE] Failed to download export:", error);
      throw error;
    }
  }

  /**
   * Convert activities to CSV format
   */
  private convertToCSV(activities: ActivityResponse[]): string {
    const headers = [
      "ID",
      "Activity Type",
      "Description", 
      "User",
      "Document",
      "Created At",
      "IP Address",
      "Source",
      "Is Important"
    ];

    const csvRows = [
      headers.join(","),
      ...activities.map(activity => [
        activity.id,
        activity.activityType,
        `"${activity.description.replace(/"/g, '""')}"`,
        `"${activity.user.name || activity.user.username}"`,
        `"${activity.document?.title || 'N/A'}"`,
        activity.createdAt,
        activity.ipAddress || "N/A",
        activity.metadata.source || "N/A",
        activity.isImportant
      ].join(","))
    ];

    return csvRows.join("\n");
  }
}

// Export a singleton instance
export const activityService = new ActivityService(); 