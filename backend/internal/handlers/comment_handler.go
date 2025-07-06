package handlers

import (
	"context"
	"net/http"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/eyuppastirmaci/noesis-forge/internal/validations"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CommentHandler struct {
	db          *gorm.DB
	authService *services.AuthService
}

func NewCommentHandler(db *gorm.DB, authService *services.AuthService) *CommentHandler {
	return &CommentHandler{
		db:          db,
		authService: authService,
	}
}

// Request/Response DTOs
type CreateCommentRequest struct {
	Content         string                  `json:"content" binding:"required,min=1,max=5000"`
	CommentType     models.CommentType      `json:"commentType"`
	Position        *models.CommentPosition `json:"position,omitempty"`
	ParentCommentID *uuid.UUID              `json:"parentCommentID,omitempty"`
}

type UpdateCommentRequest struct {
	Content string `json:"content" binding:"required,min=1,max=5000"`
}

type CommentResponse struct {
	ID              uuid.UUID               `json:"id"`
	DocumentID      uuid.UUID               `json:"documentID"`
	UserID          uuid.UUID               `json:"userID"`
	Content         string                  `json:"content"`
	CommentType     models.CommentType      `json:"commentType"`
	Position        *models.CommentPosition `json:"position,omitempty"`
	ParentCommentID *uuid.UUID              `json:"parentCommentID,omitempty"`
	IsResolved      bool                    `json:"isResolved"`
	ResolvedBy      *uuid.UUID              `json:"resolvedBy,omitempty"`
	ResolvedAt      *string                 `json:"resolvedAt,omitempty"`
	IsEdited        bool                    `json:"isEdited"`
	EditedAt        *string                 `json:"editedAt,omitempty"`
	User            UserResponse            `json:"user"`
	ReplyCount      int                     `json:"replyCount"`
	Replies         []CommentResponse       `json:"replies,omitempty"`
	CreatedAt       string                  `json:"createdAt"`
	UpdatedAt       string                  `json:"updatedAt"`
}

type UserResponse struct {
	ID       uuid.UUID `json:"id"`
	Username string    `json:"username"`
	Name     string    `json:"name"`
	Email    string    `json:"email"`
	Avatar   *string   `json:"avatar,omitempty"`
}

type CommentsListResponse struct {
	Comments []CommentResponse `json:"comments"`
	Total    int64             `json:"total"`
	Page     int               `json:"page"`
	Limit    int               `json:"limit"`
	HasNext  bool              `json:"hasNext"`
}

func (h *CommentHandler) GetDocumentComments(c *gin.Context) {
	documentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_DOCUMENT_ID", "Invalid document ID", err.Error())
		return
	}

	// Get validated list request
	listReq, ok := validations.GetValidatedCommentList(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_FAILED", "Failed to get validated request")
		return
	}

	// Check if document exists and user has access
	var document models.Document
	if err := h.db.Where("id = ?", documentID).First(&document).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "DOCUMENT_NOT_FOUND", "Document not found")
			return
		}
		utils.InternalServerErrorResponse(c, "Failed to get document", err.Error())
		return
	}

	// Get current user
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedResponse(c, "USER_NOT_AUTHENTICATED", "User not authenticated")
		return
	}

	// Check if user has access to document (owner or shared)
	if document.UserID != userID.(uuid.UUID) && !document.IsPublic {
		// Check if document is shared with user
		var userShare models.UserShare
		if err := h.db.Where("document_id = ? AND shared_with_user_id = ?", documentID, userID).First(&userShare).Error; err != nil {
			utils.ForbiddenResponse(c, "ACCESS_DENIED", "Access denied")
			return
		}
	}

	// Build query for top-level comments (not replies)
	query := h.db.Model(&models.DocumentComment{}).
		Where("document_id = ? AND parent_comment_id IS NULL", documentID).
		Preload("User").
		Preload("Replies", func(db *gorm.DB) *gorm.DB {
			return db.Preload("User").Order("created_at ASC")
		})

	if listReq.Resolved != nil {
		query = query.Where("is_resolved = ?", *listReq.Resolved)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to count comments", err.Error())
		return
	}

	// Get comments with pagination
	var comments []models.DocumentComment
	offset := (listReq.Page - 1) * listReq.Limit
	if err := query.Offset(offset).Limit(listReq.Limit).Order("created_at DESC").Find(&comments).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to get comments", err.Error())
		return
	}

	// Transform to response format
	response := CommentsListResponse{
		Comments: make([]CommentResponse, len(comments)),
		Total:    total,
		Page:     listReq.Page,
		Limit:    listReq.Limit,
		HasNext:  int64(listReq.Page*listReq.Limit) < total,
	}

	for i, comment := range comments {
		response.Comments[i] = h.transformCommentToResponse(comment)
	}

	utils.SuccessResponse(c, http.StatusOK, response, "Comments retrieved successfully")
}

func (h *CommentHandler) CreateComment(c *gin.Context) {
	documentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_DOCUMENT_ID", "Invalid document ID", err.Error())
		return
	}

	// Get validated request
	req, ok := validations.GetValidatedCommentCreate(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_FAILED", "Failed to get validated request")
		return
	}

	// Get current user
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedResponse(c, "USER_NOT_AUTHENTICATED", "User not authenticated")
		return
	}

	// Check if document exists and user has access
	var document models.Document
	if err := h.db.Where("id = ?", documentID).First(&document).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "DOCUMENT_NOT_FOUND", "Document not found")
			return
		}
		utils.InternalServerErrorResponse(c, "Failed to get document", err.Error())
		return
	}

	// Check if user has access to document (owner or shared)
	if document.UserID != userID.(uuid.UUID) && !document.IsPublic {
		// Check if document is shared with user
		var userShare models.UserShare
		if err := h.db.Where("document_id = ? AND shared_with_user_id = ?", documentID, userID).First(&userShare).Error; err != nil {
			utils.ForbiddenResponse(c, "ACCESS_DENIED", "Access denied")
			return
		}
	}

	// Validate parent comment if it's a reply
	if req.ParentCommentID != nil {
		var parentComment models.DocumentComment
		if err := h.db.Where("id = ? AND document_id = ?", *req.ParentCommentID, documentID).First(&parentComment).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				utils.ErrorResponse(c, http.StatusBadRequest, "PARENT_COMMENT_NOT_FOUND", "Parent comment not found", err.Error())
				return
			}
			utils.InternalServerErrorResponse(c, "Failed to validate parent comment", err.Error())
			return
		}
		// Don't override comment type - user can reply with any comment type
	}

	// Create comment
	comment := models.DocumentComment{
		DocumentID:      documentID,
		UserID:          userID.(uuid.UUID),
		Content:         req.Content,
		CommentType:     req.CommentType,
		Position:        req.Position,
		ParentCommentID: req.ParentCommentID,
	}

	if err := h.db.Create(&comment).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to create comment", err.Error())
		return
	}

	// Load relations
	if err := h.db.Preload("User").Preload("Replies", func(db *gorm.DB) *gorm.DB {
		return db.Preload("User").Order("created_at ASC")
	}).First(&comment, comment.ID).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to load comment", err.Error())
		return
	}

	response := h.transformCommentToResponse(comment)
	utils.SuccessResponse(c, http.StatusCreated, response, "Comment created successfully")
}

func (h *CommentHandler) UpdateComment(c *gin.Context) {
	// Get validated comment ID
	commentID, ok := validations.GetValidatedCommentID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_FAILED", "Failed to get validated comment ID")
		return
	}

	// Get validated request
	req, ok := validations.GetValidatedCommentUpdate(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_FAILED", "Failed to get validated request")
		return
	}

	// Get current user
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedResponse(c, "USER_NOT_AUTHENTICATED", "User not authenticated")
		return
	}

	// Get comment
	var comment models.DocumentComment
	if err := h.db.Where("id = ?", commentID).First(&comment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "COMMENT_NOT_FOUND", "Comment not found")
			return
		}
		utils.InternalServerErrorResponse(c, "Failed to get comment", err.Error())
		return
	}

	// Check if user can edit this comment
	if !comment.CanEdit(userID.(uuid.UUID)) {
		utils.ForbiddenResponse(c, "EDIT_FORBIDDEN", "You can only edit your own comments")
		return
	}

	// Update comment
	comment.Content = req.Content
	comment.MarkAsEdited()

	if err := h.db.Save(&comment).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to update comment", err.Error())
		return
	}

	// Load relations
	if err := h.db.Preload("User").Preload("Replies", func(db *gorm.DB) *gorm.DB {
		return db.Preload("User").Order("created_at ASC")
	}).First(&comment, comment.ID).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to load comment", err.Error())
		return
	}

	response := h.transformCommentToResponse(comment)
	utils.SuccessResponse(c, http.StatusOK, response, "Comment updated successfully")
}

func (h *CommentHandler) DeleteComment(c *gin.Context) {
	// Get validated comment ID
	commentID, ok := validations.GetValidatedCommentID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_FAILED", "Failed to get validated comment ID")
		return
	}

	// Get current user
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedResponse(c, "USER_NOT_AUTHENTICATED", "User not authenticated")
		return
	}

	// Get comment
	var comment models.DocumentComment
	if err := h.db.Where("id = ?", commentID).First(&comment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "COMMENT_NOT_FOUND", "Comment not found")
			return
		}
		utils.InternalServerErrorResponse(c, "Failed to get comment", err.Error())
		return
	}

	// Check if user can delete this comment
	if !comment.CanDelete(userID.(uuid.UUID)) {
		utils.ForbiddenResponse(c, "DELETE_FORBIDDEN", "You can only delete your own comments")
		return
	}

	// Delete comment (soft delete)
	if err := h.db.Delete(&comment).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to delete comment", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, nil, "Comment deleted successfully")
}

func (h *CommentHandler) ResolveComment(c *gin.Context) {
	// Get validated comment ID
	commentID, ok := validations.GetValidatedCommentID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_FAILED", "Failed to get validated comment ID")
		return
	}

	// Get current user
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedResponse(c, "USER_NOT_AUTHENTICATED", "User not authenticated")
		return
	}

	// Get comment with document
	var comment models.DocumentComment
	if err := h.db.Preload("Document").Where("id = ?", commentID).First(&comment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "COMMENT_NOT_FOUND", "Comment not found")
			return
		}
		utils.InternalServerErrorResponse(c, "Failed to get comment", err.Error())
		return
	}

	// Check if user can resolve this comment
	if !comment.CanResolve(userID.(uuid.UUID), comment.Document.UserID) {
		utils.ForbiddenResponse(c, "RESOLVE_FORBIDDEN", "You can only resolve your own comments or comments on your documents")
		return
	}

	// Resolve comment
	comment.Resolve(userID.(uuid.UUID))

	if err := h.db.Save(&comment).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to resolve comment", err.Error())
		return
	}

	// Load relations
	if err := h.db.Preload("User").Preload("Replies", func(db *gorm.DB) *gorm.DB {
		return db.Preload("User").Order("created_at ASC")
	}).First(&comment, comment.ID).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to load comment", err.Error())
		return
	}

	response := h.transformCommentToResponse(comment)
	utils.SuccessResponse(c, http.StatusOK, response, "Comment resolved successfully")
}

func (h *CommentHandler) UnresolveComment(c *gin.Context) {
	// Get validated comment ID
	commentID, ok := validations.GetValidatedCommentID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_FAILED", "Failed to get validated comment ID")
		return
	}

	// Get current user
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedResponse(c, "USER_NOT_AUTHENTICATED", "User not authenticated")
		return
	}

	// Get comment with document
	var comment models.DocumentComment
	if err := h.db.Preload("Document").Where("id = ?", commentID).First(&comment).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.NotFoundResponse(c, "COMMENT_NOT_FOUND", "Comment not found")
			return
		}
		utils.InternalServerErrorResponse(c, "Failed to get comment", err.Error())
		return
	}

	// Check if user can unresolve this comment
	if !comment.CanResolve(userID.(uuid.UUID), comment.Document.UserID) {
		utils.ForbiddenResponse(c, "UNRESOLVE_FORBIDDEN", "You can only unresolve your own comments or comments on your documents")
		return
	}

	// Unresolve comment
	comment.Unresolve()

	if err := h.db.Save(&comment).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to unresolve comment", err.Error())
		return
	}

	// Load relations
	if err := h.db.Preload("User").Preload("Replies", func(db *gorm.DB) *gorm.DB {
		return db.Preload("User").Order("created_at ASC")
	}).First(&comment, comment.ID).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to load comment", err.Error())
		return
	}

	// TODO: Create activity log

	response := h.transformCommentToResponse(comment)
	utils.SuccessResponse(c, http.StatusOK, response, "Comment unresolved successfully")
}

// Helper function to transform comment to response
func (h *CommentHandler) transformCommentToResponse(comment models.DocumentComment) CommentResponse {
	response := CommentResponse{
		ID:              comment.ID,
		DocumentID:      comment.DocumentID,
		UserID:          comment.UserID,
		Content:         comment.Content,
		CommentType:     comment.CommentType,
		Position:        comment.Position,
		ParentCommentID: comment.ParentCommentID,
		IsResolved:      comment.IsResolved,
		ResolvedBy:      comment.ResolvedBy,
		IsEdited:        comment.IsEdited,
		User: UserResponse{
			ID:       comment.User.ID,
			Username: comment.User.Username,
			Name:     comment.User.Name,
			Email:    comment.User.Email,
		},
		ReplyCount: len(comment.Replies),
		CreatedAt:  comment.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:  comment.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	// Set avatar URL if avatar path exists
	if comment.User.Avatar != "" {
		if avatarURL, err := h.authService.GetAvatarURL(context.Background(), comment.User.Avatar); err == nil && avatarURL != "" {
			response.User.Avatar = &avatarURL
		}
	}

	if comment.ResolvedAt != nil {
		resolvedAt := comment.ResolvedAt.Format("2006-01-02T15:04:05Z07:00")
		response.ResolvedAt = &resolvedAt
	}

	if comment.EditedAt != nil {
		editedAt := comment.EditedAt.Format("2006-01-02T15:04:05Z07:00")
		response.EditedAt = &editedAt
	}

	// Transform replies
	if len(comment.Replies) > 0 {
		response.Replies = make([]CommentResponse, len(comment.Replies))
		for i, reply := range comment.Replies {
			response.Replies[i] = h.transformCommentToResponse(reply)
		}
	}

	return response
}
