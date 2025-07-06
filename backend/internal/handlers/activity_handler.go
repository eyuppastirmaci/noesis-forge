package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ActivityHandler struct {
	db *gorm.DB
}

func NewActivityHandler(db *gorm.DB) *ActivityHandler {
	return &ActivityHandler{db: db}
}

// Response DTOs
type ActivityResponse struct {
	ID           uuid.UUID                `json:"id"`
	DocumentID   uuid.UUID                `json:"documentID"`
	UserID       uuid.UUID                `json:"userID"`
	ActivityType models.ActivityType      `json:"activityType"`
	Description  string                   `json:"description"`
	Metadata     models.ActivityMetadata  `json:"metadata"`
	IPAddress    string                   `json:"ipAddress,omitempty"`
	UserAgent    string                   `json:"userAgent,omitempty"`
	User         UserActivityResponse     `json:"user"`
	Document     DocumentActivityResponse `json:"document,omitempty"`
	Icon         string                   `json:"icon"`
	Color        string                   `json:"color"`
	IsImportant  bool                     `json:"isImportant"`
	CreatedAt    string                   `json:"createdAt"`
}

type UserActivityResponse struct {
	ID       uuid.UUID `json:"id"`
	Username string    `json:"username"`
	Name     string    `json:"name"`
	Email    string    `json:"email"`
}

type DocumentActivityResponse struct {
	ID               uuid.UUID `json:"id"`
	Title            string    `json:"title"`
	OriginalFileName string    `json:"originalFileName"`
	FileType         string    `json:"fileType"`
}

type ActivitiesListResponse struct {
	Activities []ActivityResponse `json:"activities"`
	Total      int64              `json:"total"`
	Page       int                `json:"page"`
	Limit      int                `json:"limit"`
	HasNext    bool               `json:"hasNext"`
}

type ActivityStatsResponse struct {
	TotalActivities    int64                         `json:"totalActivities"`
	TodayActivities    int64                         `json:"todayActivities"`
	ThisWeekActivities int64                         `json:"thisWeekActivities"`
	ActivityBreakdown  map[models.ActivityType]int64 `json:"activityBreakdown"`
	RecentDocuments    []DocumentActivitySummary     `json:"recentDocuments"`
	TopUsers           []UserActivitySummary         `json:"topUsers"`
}

type DocumentActivitySummary struct {
	DocumentID       uuid.UUID `json:"documentID"`
	Title            string    `json:"title"`
	OriginalFileName string    `json:"originalFileName"`
	ActivityCount    int64     `json:"activityCount"`
	LastActivity     string    `json:"lastActivity"`
}

type UserActivitySummary struct {
	UserID        uuid.UUID `json:"userID"`
	Username      string    `json:"username"`
	Name          string    `json:"name"`
	ActivityCount int64     `json:"activityCount"`
	LastActivity  string    `json:"lastActivity"`
}

func (h *ActivityHandler) GetDocumentActivities(c *gin.Context) {
	documentID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_DOCUMENT_ID", "Invalid document ID", err.Error())
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

	// Parse pagination parameters
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	// Build query
	query := h.db.Model(&models.DocumentActivity{}).
		Where("document_id = ?", documentID).
		Preload("User").
		Preload("Document")

	// Apply filters
	if activityType := c.Query("activity_type"); activityType != "" {
		query = query.Where("activity_type = ?", activityType)
	}

	if filterUserID := c.Query("user_id"); filterUserID != "" {
		if userUUID, err := uuid.Parse(filterUserID); err == nil {
			query = query.Where("user_id = ?", userUUID)
		}
	}

	if fromDate := c.Query("from_date"); fromDate != "" {
		if parsedDate, err := time.Parse(time.RFC3339, fromDate); err == nil {
			query = query.Where("created_at >= ?", parsedDate)
		}
	}

	if toDate := c.Query("to_date"); toDate != "" {
		if parsedDate, err := time.Parse(time.RFC3339, toDate); err == nil {
			query = query.Where("created_at <= ?", parsedDate)
		}
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to count activities", err.Error())
		return
	}

	// Get activities with pagination
	var activities []models.DocumentActivity
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&activities).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to get activities", err.Error())
		return
	}

	// Transform to response format
	response := ActivitiesListResponse{
		Activities: make([]ActivityResponse, len(activities)),
		Total:      total,
		Page:       page,
		Limit:      limit,
		HasNext:    int64(page*limit) < total,
	}

	for i, activity := range activities {
		response.Activities[i] = h.transformActivityToResponse(activity)
	}

	utils.SuccessResponse(c, http.StatusOK, response, "Activities retrieved successfully")
}

func (h *ActivityHandler) GetUserActivities(c *gin.Context) {
	// Get current user
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedResponse(c, "USER_NOT_AUTHENTICATED", "User not authenticated")
		return
	}

	// Parse pagination parameters
	page := 1
	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	// Build query
	query := h.db.Model(&models.DocumentActivity{}).
		Where("user_id = ?", userID.(uuid.UUID)).
		Preload("User").
		Preload("Document")

	// Apply filters
	if activityType := c.Query("activity_type"); activityType != "" {
		query = query.Where("activity_type = ?", activityType)
	}

	if documentID := c.Query("document_id"); documentID != "" {
		if docUUID, err := uuid.Parse(documentID); err == nil {
			query = query.Where("document_id = ?", docUUID)
		}
	}

	if fromDate := c.Query("from_date"); fromDate != "" {
		if parsedDate, err := time.Parse(time.RFC3339, fromDate); err == nil {
			query = query.Where("created_at >= ?", parsedDate)
		}
	}

	if toDate := c.Query("to_date"); toDate != "" {
		if parsedDate, err := time.Parse(time.RFC3339, toDate); err == nil {
			query = query.Where("created_at <= ?", parsedDate)
		}
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to count activities", err.Error())
		return
	}

	// Get activities with pagination
	var activities []models.DocumentActivity
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&activities).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to get activities", err.Error())
		return
	}

	// Transform to response format
	response := ActivitiesListResponse{
		Activities: make([]ActivityResponse, len(activities)),
		Total:      total,
		Page:       page,
		Limit:      limit,
		HasNext:    int64(page*limit) < total,
	}

	for i, activity := range activities {
		response.Activities[i] = h.transformActivityToResponse(activity)
	}

	utils.SuccessResponse(c, http.StatusOK, response, "User activities retrieved successfully")
}

func (h *ActivityHandler) GetActivityStats(c *gin.Context) {
	// Get current user
	userID, exists := c.Get("userID")
	if !exists {
		utils.UnauthorizedResponse(c, "USER_NOT_AUTHENTICATED", "User not authenticated")
		return
	}

	// Base query
	baseQuery := h.db.Model(&models.DocumentActivity{}).Where("user_id = ?", userID.(uuid.UUID))

	// Filter by document if specified
	if documentID := c.Query("document_id"); documentID != "" {
		if docUUID, err := uuid.Parse(documentID); err == nil {
			baseQuery = baseQuery.Where("document_id = ?", docUUID)
		}
	}

	// Get total activities
	var totalActivities int64
	if err := baseQuery.Count(&totalActivities).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to count total activities", err.Error())
		return
	}

	// Get today's activities
	today := time.Now().Truncate(24 * time.Hour)
	var todayActivities int64
	if err := baseQuery.Where("created_at >= ?", today).Count(&todayActivities).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to count today's activities", err.Error())
		return
	}

	// Get this week's activities
	weekStart := time.Now().AddDate(0, 0, -int(time.Now().Weekday())).Truncate(24 * time.Hour)
	var thisWeekActivities int64
	if err := baseQuery.Where("created_at >= ?", weekStart).Count(&thisWeekActivities).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to count this week's activities", err.Error())
		return
	}

	// Get activity breakdown by type
	var activityBreakdown []struct {
		ActivityType models.ActivityType `json:"activity_type"`
		Count        int64               `json:"count"`
	}
	if err := baseQuery.Select("activity_type, COUNT(*) as count").Group("activity_type").Scan(&activityBreakdown).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to get activity breakdown", err.Error())
		return
	}

	// Convert to map
	breakdownMap := make(map[models.ActivityType]int64)
	for _, item := range activityBreakdown {
		breakdownMap[item.ActivityType] = item.Count
	}

	// Get recent documents (top 5 most active documents)
	var recentDocs []struct {
		DocumentID       uuid.UUID `json:"document_id"`
		Title            string    `json:"title"`
		OriginalFileName string    `json:"original_file_name"`
		ActivityCount    int64     `json:"activity_count"`
		LastActivity     time.Time `json:"last_activity"`
	}
	if err := h.db.Model(&models.DocumentActivity{}).
		Select("document_id, COUNT(*) as activity_count, MAX(document_activities.created_at) as last_activity").
		Joins("LEFT JOIN documents ON documents.id = document_activities.document_id").
		Where("document_activities.user_id = ?", userID.(uuid.UUID)).
		Group("document_id, documents.title, documents.original_file_name").
		Order("activity_count DESC, last_activity DESC").
		Limit(5).
		Scan(&recentDocs).Error; err != nil {
		utils.InternalServerErrorResponse(c, "Failed to get recent documents", err.Error())
		return
	}

	// Transform recent documents
	recentDocuments := make([]DocumentActivitySummary, len(recentDocs))
	for i, doc := range recentDocs {
		recentDocuments[i] = DocumentActivitySummary{
			DocumentID:       doc.DocumentID,
			Title:            doc.Title,
			OriginalFileName: doc.OriginalFileName,
			ActivityCount:    doc.ActivityCount,
			LastActivity:     doc.LastActivity.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	// Get top users (if not filtered by document) - for shared documents
	var topUsers []UserActivitySummary
	if c.Query("document_id") != "" {
		// For specific document, show other users who have activities
		var topUserData []struct {
			UserID        uuid.UUID `json:"user_id"`
			Username      string    `json:"username"`
			Name          string    `json:"name"`
			ActivityCount int64     `json:"activity_count"`
			LastActivity  time.Time `json:"last_activity"`
		}
		if err := h.db.Model(&models.DocumentActivity{}).
			Select("user_id, COUNT(*) as activity_count, MAX(document_activities.created_at) as last_activity").
			Joins("LEFT JOIN users ON users.id = document_activities.user_id").
			Where("document_id = ? AND user_id != ?", c.Query("document_id"), userID.(uuid.UUID)).
			Group("user_id, users.username, users.name").
			Order("activity_count DESC, last_activity DESC").
			Limit(5).
			Scan(&topUserData).Error; err != nil {
			utils.InternalServerErrorResponse(c, "Failed to get top users", err.Error())
			return
		}

		topUsers = make([]UserActivitySummary, len(topUserData))
		for i, user := range topUserData {
			topUsers[i] = UserActivitySummary{
				UserID:        user.UserID,
				Username:      user.Username,
				Name:          user.Name,
				ActivityCount: user.ActivityCount,
				LastActivity:  user.LastActivity.Format("2006-01-02T15:04:05Z07:00"),
			}
		}
	}

	response := ActivityStatsResponse{
		TotalActivities:    totalActivities,
		TodayActivities:    todayActivities,
		ThisWeekActivities: thisWeekActivities,
		ActivityBreakdown:  breakdownMap,
		RecentDocuments:    recentDocuments,
		TopUsers:           topUsers,
	}

	utils.SuccessResponse(c, http.StatusOK, response, "Activity statistics retrieved successfully")
}

// Helper function to transform activity to response
func (h *ActivityHandler) transformActivityToResponse(activity models.DocumentActivity) ActivityResponse {
	response := ActivityResponse{
		ID:           activity.ID,
		DocumentID:   activity.DocumentID,
		UserID:       activity.UserID,
		ActivityType: activity.ActivityType,
		Description:  activity.Description,
		Metadata:     activity.Metadata,
		IPAddress:    activity.IPAddress,
		UserAgent:    activity.UserAgent,
		User: UserActivityResponse{
			ID:       activity.User.ID,
			Username: activity.User.Username,
			Name:     activity.User.Name,
			Email:    activity.User.Email,
		},
		Icon:        activity.GetActivityIcon(),
		Color:       activity.GetActivityColor(),
		IsImportant: activity.IsImportant(),
		CreatedAt:   activity.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	// Add document info if available
	if activity.Document.ID != uuid.Nil {
		response.Document = DocumentActivityResponse{
			ID:               activity.Document.ID,
			Title:            activity.Document.Title,
			OriginalFileName: activity.Document.OriginalFileName,
			FileType:         string(activity.Document.FileType),
		}
	}

	return response
}
