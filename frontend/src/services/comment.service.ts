import { apiClient } from "@/lib/api";
import {
  Comment,
  CommentResponse,
  CommentsListResponse,
  CreateCommentRequest,
  UpdateCommentRequest,
  CommentListRequest,
  CommentStats,
  CommentExportData,
  COMMENT_ENDPOINTS,
  SuccessResponse,
  HttpStatus,
  ID,
} from "@/types";

// Response type definitions for API calls
export interface CommentCreateResponseData {
  comment: CommentResponse;
}

export interface CommentUpdateResponseData {
  comment: CommentResponse;
}

export interface CommentDetailResponseData {
  comment: CommentResponse;
}

export interface CommentListResponseData extends CommentsListResponse {}

export interface CommentStatsResponseData extends CommentStats {}

export interface CommentExportResponseData extends CommentExportData {}

export interface CommentResolveResponseData {
  comment: CommentResponse;
}

export interface CommentDeleteResponseData {
  message: string;
}

// API Response types
export type CommentCreateResponse = SuccessResponse<CommentCreateResponseData>;
export type CommentUpdateResponse = SuccessResponse<CommentUpdateResponseData>;
export type CommentDetailResponse = SuccessResponse<CommentDetailResponseData>;
export type CommentListApiResponse = SuccessResponse<CommentListResponseData>;
export type CommentStatsResponse = SuccessResponse<CommentStatsResponseData>;
export type CommentExportResponse = SuccessResponse<CommentExportResponseData>;
export type CommentResolveResponse = SuccessResponse<CommentResolveResponseData>;
export type CommentDeleteResponse = SuccessResponse<CommentDeleteResponseData>;

export class CommentService {
  /**
   * Get comments for a specific document
   */
  async getDocumentComments(
    documentId: ID,
    request: CommentListRequest = {}
  ): Promise<CommentListApiResponse> {
    const params = new URLSearchParams();

    if (request.page) params.append("page", request.page.toString());
    if (request.limit) params.append("limit", request.limit.toString());
    if (request.resolved !== undefined) 
      params.append("resolved", request.resolved.toString());

    const url = `${COMMENT_ENDPOINTS.DOCUMENT_COMMENTS(documentId)}${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    try {
      const response = await apiClient.get<CommentListResponseData>(url);
      return response;
    } catch (error) {
      console.error("[COMMENT_SERVICE] Failed to get document comments:", error);
      throw error;
    }
  }

  /**
   * Create a new comment on a document
   */
  async createComment(
    documentId: ID,
    request: CreateCommentRequest
  ): Promise<CommentCreateResponse> {
    try {
      const response = await apiClient.post<CommentCreateResponseData>(
        COMMENT_ENDPOINTS.DOCUMENT_COMMENTS(documentId),
        request
      );
      return response;
    } catch (error) {
      console.error("[COMMENT_SERVICE] Failed to create comment:", error);
      throw error;
    }
  }

  /**
   * Update an existing comment
   */
  async updateComment(
    commentId: ID,
    request: UpdateCommentRequest
  ): Promise<CommentUpdateResponse> {
    try {
      const response = await apiClient.put<CommentUpdateResponseData>(
        COMMENT_ENDPOINTS.COMMENT_BY_ID(commentId),
        request
      );
      return response;
    } catch (error) {
      console.error("[COMMENT_SERVICE] Failed to update comment:", error);
      throw error;
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: ID): Promise<CommentDeleteResponse> {
    try {
      const response = await apiClient.delete<CommentDeleteResponseData>(
        COMMENT_ENDPOINTS.COMMENT_BY_ID(commentId)
      );
      return response;
    } catch (error) {
      console.error("[COMMENT_SERVICE] Failed to delete comment:", error);
      throw error;
    }
  }

  /**
   * Get a specific comment by ID
   */
  async getComment(commentId: ID): Promise<CommentDetailResponse> {
    try {
      const response = await apiClient.get<CommentDetailResponseData>(
        COMMENT_ENDPOINTS.COMMENT_BY_ID(commentId)
      );
      return response;
    } catch (error) {
      console.error("[COMMENT_SERVICE] Failed to get comment:", error);
      throw error;
    }
  }

  /**
   * Resolve a comment
   */
  async resolveComment(commentId: ID): Promise<CommentResolveResponse> {
    try {
      const response = await apiClient.post<CommentResolveResponseData>(
        COMMENT_ENDPOINTS.RESOLVE_COMMENT(commentId)
      );
      return response;
    } catch (error) {
      console.error("[COMMENT_SERVICE] Failed to resolve comment:", error);
      throw error;
    }
  }

  /**
   * Unresolve a comment
   */
  async unresolveComment(commentId: ID): Promise<CommentResolveResponse> {
    try {
      const response = await apiClient.post<CommentResolveResponseData>(
        COMMENT_ENDPOINTS.UNRESOLVE_COMMENT(commentId)
      );
      return response;
    } catch (error) {
      console.error("[COMMENT_SERVICE] Failed to unresolve comment:", error);
      throw error;
    }
  }

  /**
   * Reply to a comment (create a child comment)
   */
  async replyToComment(
    documentId: ID,
    parentCommentId: ID,
    content: string
  ): Promise<CommentCreateResponse> {
    const request: CreateCommentRequest = {
      content,
      commentType: "reply",
      parentCommentID: parentCommentId,
    };

    return this.createComment(documentId, request);
  }

  /**
   * Create an annotation comment with position data
   */
  async createAnnotation(
    documentId: ID,
    request: CreateCommentRequest
  ): Promise<CommentCreateResponse> {
    const annotationRequest: CreateCommentRequest = {
      ...request,
      commentType: "annotation",
    };

    return this.createComment(documentId, annotationRequest);
  }

  /**
   * Get comment statistics for a document
   */
  async getCommentStats(documentId: ID): Promise<CommentStatsResponse> {
    try {
      // This would typically be a separate endpoint, but we'll calculate from comments list
      const commentsResponse = await this.getDocumentComments(documentId, { limit: 1000 });
      
      const comments = commentsResponse.data.comments;
      const stats: CommentStats = {
        totalComments: comments.length,
        resolvedComments: comments.filter(c => c.isResolved).length,
        unresolvedComments: comments.filter(c => !c.isResolved).length,
        annotationCount: comments.filter(c => c.commentType === "annotation").length,
        generalCommentCount: comments.filter(c => c.commentType === "general").length,
        replyCount: comments.reduce((sum, c) => sum + c.replyCount, 0),
      };

      // Find top commenter
      const userCommentCounts = comments.reduce((acc, comment) => {
        acc[comment.user.id] = (acc[comment.user.id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topCommenterEntry = Object.entries(userCommentCounts)
        .sort(([,a], [,b]) => b - a)[0];

      if (topCommenterEntry) {
        const topComment = comments.find(c => c.user.id === topCommenterEntry[0]);
        if (topComment) {
          stats.topCommenter = topComment.user;
        }
      }

      return {
        success: true,
        statusCode: HttpStatus.OK,
        timestamp: new Date().toISOString(),
        message: "Comment statistics retrieved successfully",
        data: stats,
      };
    } catch (error) {
      console.error("[COMMENT_SERVICE] Failed to get comment stats:", error);
      throw error;
    }
  }

  /**
   * Export comments for a document
   */
  async exportComments(
    documentId: ID,
    options: CommentExportOptions
  ): Promise<CommentExportResponse> {
    try {
      // For now, we'll get all comments and format them
      const commentsResponse = await this.getDocumentComments(documentId, { limit: 1000 });
      
      let filteredComments = commentsResponse.data.comments;

      // Apply filters based on options
      if (options.includeResolved === false) {
        filteredComments = filteredComments.filter(c => !c.isResolved);
      }
      if (options.includeUnresolved === false) {
        filteredComments = filteredComments.filter(c => c.isResolved);
      }
      if (options.commentTypes) {
        filteredComments = filteredComments.filter(c => 
          options.commentTypes!.includes(c.commentType)
        );
      }
      if (options.dateRange) {
        filteredComments = filteredComments.filter(c => {
          const commentDate = new Date(c.createdAt);
          const fromDate = options.dateRange!.from ? new Date(options.dateRange!.from) : null;
          const toDate = options.dateRange!.to ? new Date(options.dateRange!.to) : null;
          
          return (!fromDate || commentDate >= fromDate) && 
                 (!toDate || commentDate <= toDate);
        });
      }

      const exportData: CommentExportData = {
        documentId,
        documentTitle: "Document", // This would come from document service
        comments: filteredComments.map(c => ({
          id: c.id,
          documentID: c.documentID,
          userID: c.userID,
          content: c.content,
          commentType: c.commentType,
          position: c.position,
          parentCommentID: c.parentCommentID,
          isResolved: c.isResolved,
          resolvedBy: c.resolvedBy,
          resolvedAt: c.resolvedAt,
          isEdited: c.isEdited,
          editedAt: c.editedAt,
          user: c.user,
          replyCount: c.replyCount,
          replies: c.replies,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
        exportedAt: new Date().toISOString(),
        exportedBy: filteredComments[0]?.user || {
          id: "unknown",
          username: "unknown",
          name: "Unknown User",
          email: "unknown@example.com",
        },
      };

      return {
        success: true,
        statusCode: HttpStatus.OK,
        timestamp: new Date().toISOString(),
        message: "Comments exported successfully",
        data: exportData,
      };
    } catch (error) {
      console.error("[COMMENT_SERVICE] Failed to export comments:", error);
      throw error;
    }
  }

  /**
   * Bulk operations for comments
   */
  async bulkDeleteComments(commentIds: ID[]): Promise<SuccessResponse<{ deletedCount: number }>> {
    try {
      const deletePromises = commentIds.map(id => this.deleteComment(id));
      const results = await Promise.allSettled(deletePromises);
      
      const successCount = results.filter(r => r.status === "fulfilled").length;
      
      return {
        success: true,
        statusCode: HttpStatus.OK,
        timestamp: new Date().toISOString(),
        message: `Successfully deleted ${successCount} of ${commentIds.length} comments`,
        data: { deletedCount: successCount },
      };
    } catch (error) {
      console.error("[COMMENT_SERVICE] Failed to bulk delete comments:", error);
      throw error;
    }
  }

  async bulkResolveComments(commentIds: ID[]): Promise<SuccessResponse<{ resolvedCount: number }>> {
    try {
      const resolvePromises = commentIds.map(id => this.resolveComment(id));
      const results = await Promise.allSettled(resolvePromises);
      
      const successCount = results.filter(r => r.status === "fulfilled").length;
      
      return {
        success: true,
        statusCode: HttpStatus.OK,
        timestamp: new Date().toISOString(),
        message: `Successfully resolved ${successCount} of ${commentIds.length} comments`,
        data: { resolvedCount: successCount },
      };
    } catch (error) {
      console.error("[COMMENT_SERVICE] Failed to bulk resolve comments:", error);
      throw error;
    }
  }

  async bulkUnresolveComments(commentIds: ID[]): Promise<SuccessResponse<{ unresolvedCount: number }>> {
    try {
      const unresolvePromises = commentIds.map(id => this.unresolveComment(id));
      const results = await Promise.allSettled(unresolvePromises);
      
      const successCount = results.filter(r => r.status === "fulfilled").length;
      
      return {
        success: true,
        statusCode: HttpStatus.OK,
        timestamp: new Date().toISOString(),
        message: `Successfully unresolved ${successCount} of ${commentIds.length} comments`,
        data: { unresolvedCount: successCount },
      };
    } catch (error) {
      console.error("[COMMENT_SERVICE] Failed to bulk unresolve comments:", error);
      throw error;
    }
  }

  /**
   * Search comments within a document
   */
  async searchComments(
    documentId: ID,
    query: string,
    options: {
      includeResolved?: boolean;
      commentType?: string;
      limit?: number;
    } = {}
  ): Promise<CommentListApiResponse> {
    try {
      // For now, we'll get all comments and filter client-side
      // In a real implementation, this would be a server-side search
      const allComments = await this.getDocumentComments(documentId, { limit: 1000 });
      
      let filteredComments = allComments.data.comments.filter(comment =>
        comment.content.toLowerCase().includes(query.toLowerCase()) ||
        comment.user.name.toLowerCase().includes(query.toLowerCase()) ||
        comment.user.username.toLowerCase().includes(query.toLowerCase())
      );

      if (options.includeResolved === false) {
        filteredComments = filteredComments.filter(c => !c.isResolved);
      }

      if (options.commentType) {
        filteredComments = filteredComments.filter(c => c.commentType === options.commentType);
      }

      if (options.limit) {
        filteredComments = filteredComments.slice(0, options.limit);
      }

      const response: CommentListResponseData = {
        comments: filteredComments,
        total: filteredComments.length,
        page: 1,
        limit: filteredComments.length,
        hasNext: false,
      };

      return {
        success: true,
        statusCode: HttpStatus.OK,
        timestamp: new Date().toISOString(),
        message: "Comments search completed successfully",
        data: response,
      };
    } catch (error) {
      console.error("[COMMENT_SERVICE] Failed to search comments:", error);
      throw error;
    }
  }

  /**
   * Get comment thread (parent + all replies)
   */
  async getCommentThread(parentCommentId: ID): Promise<CommentDetailResponse> {
    try {
      const response = await this.getComment(parentCommentId);
      // The API should include replies in the response
      return response;
    } catch (error) {
      console.error("[COMMENT_SERVICE] Failed to get comment thread:", error);
      throw error;
    }
  }

  /**
   * Validate comment content
   */
  validateComment(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push("Comment content cannot be empty");
    }

    if (content.length > 5000) {
      errors.push("Comment content cannot exceed 5000 characters");
    }

    if (content.trim().length < 1) {
      errors.push("Comment must contain at least 1 character");
    }

    // Check for potentially malicious content
    const maliciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        errors.push("Comment contains invalid content");
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format comment content for display
   */
  formatCommentContent(content: string): string {
    // Basic text formatting
    return content
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>");
  }

  /**
   * Extract mentions from comment content
   */
  extractMentions(content: string): { username: string; position: { start: number; end: number } }[] {
    const mentionPattern = /@(\w+)/g;
    const mentions: { username: string; position: { start: number; end: number } }[] = [];
    let match;

    while ((match = mentionPattern.exec(content)) !== null) {
      mentions.push({
        username: match[1],
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    }

    return mentions;
  }
}

// Export a singleton instance
export const commentService = new CommentService();

// Extended comment export options interface
export interface CommentExportOptions {
  format: "json" | "csv" | "pdf";
  includeResolved?: boolean;
  includeUnresolved?: boolean;
  includeReplies?: boolean;
  commentTypes?: string[];
  dateRange?: {
    from?: string;
    to?: string;
  };
} 