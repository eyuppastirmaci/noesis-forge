package services

import (
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type ActivityService struct {
	db *gorm.DB
}

func NewActivityService(db *gorm.DB) *ActivityService {
	return &ActivityService{
		db: db,
	}
}

// Holds context information for activity logging
type ActivityContext struct {
	UserID     uuid.UUID
	DocumentID uuid.UUID
	IPAddress  string
	UserAgent  string
	Source     string // "web", "mobile", "api"
}

// Creates an ActivityContext from a Gin context
func (s *ActivityService) CreateActivityContext(c *gin.Context, documentID uuid.UUID) *ActivityContext {
	userID, exists := c.Get("userID")
	if !exists {
		return nil
	}

	return &ActivityContext{
		UserID:     userID.(uuid.UUID),
		DocumentID: documentID,
		IPAddress:  s.getClientIP(c),
		UserAgent:  c.GetHeader("User-Agent"),
		Source:     s.detectSource(c),
	}
}

// Logs a generic activity
func (s *ActivityService) LogActivity(ctx *ActivityContext, activityType models.ActivityType, description string, metadata models.ActivityMetadata) error {
	if ctx == nil {
		return fmt.Errorf("activity context is required")
	}

	activity := models.DocumentActivity{
		DocumentID:   ctx.DocumentID,
		UserID:       ctx.UserID,
		ActivityType: activityType,
		Description:  description,
		Metadata:     metadata,
		IPAddress:    ctx.IPAddress,
		UserAgent:    ctx.UserAgent,
	}

	// Set source in metadata if not already set
	if metadata.Source == nil {
		activity.Metadata.Source = &ctx.Source
	}

	if err := s.db.Create(&activity).Error; err != nil {
		logrus.WithError(err).WithFields(logrus.Fields{
			"user_id":       ctx.UserID,
			"document_id":   ctx.DocumentID,
			"activity_type": activityType,
		}).Error("Failed to log activity")
		return err
	}

	logrus.WithFields(logrus.Fields{
		"user_id":       ctx.UserID,
		"document_id":   ctx.DocumentID,
		"activity_type": activityType,
		"description":   description,
	}).Debug("Activity logged successfully")

	return nil
}

// Document Upload Activity
func (s *ActivityService) LogDocumentUpload(ctx *ActivityContext, document *models.Document) error {
	metadata := models.ActivityMetadata{
		FileSize: &document.FileSize,
		FileType: (*string)(&document.FileType),
		FileName: &document.OriginalFileName,
	}

	description := fmt.Sprintf("Uploaded document '%s'", document.Title)
	return s.LogActivity(ctx, models.ActivityTypeUpload, description, metadata)
}

// Document View Activity
func (s *ActivityService) LogDocumentView(ctx *ActivityContext, document *models.Document, duration int64) error {
	metadata := models.ActivityMetadata{
		Duration: &duration,
	}

	if document.FileType == models.DocumentTypePDF {
		// Add page count if available from document
		if document.PageCount != nil {
			metadata.PageCount = document.PageCount
		}
	}

	description := fmt.Sprintf("Viewed document '%s'", document.Title)
	return s.LogActivity(ctx, models.ActivityTypeView, description, metadata)
}

// Document Download Activity
func (s *ActivityService) LogDocumentDownload(ctx *ActivityContext, document *models.Document) error {
	metadata := models.ActivityMetadata{
		FileSize: &document.FileSize,
		FileType: (*string)(&document.FileType),
		FileName: &document.OriginalFileName,
	}

	description := fmt.Sprintf("Downloaded document '%s'", document.Title)
	return s.LogActivity(ctx, models.ActivityTypeDownload, description, metadata)
}

// Document Update Activity
func (s *ActivityService) LogDocumentUpdate(ctx *ActivityContext, document *models.Document, changedFields []string, oldValues, newValues map[string]interface{}) error {
	metadata := models.ActivityMetadata{
		FieldsChanged: changedFields,
		OldValues:     oldValues,
		NewValues:     newValues,
	}

	var description string
	if len(changedFields) == 1 {
		description = fmt.Sprintf("Updated %s of document '%s'", changedFields[0], document.Title)
	} else {
		description = fmt.Sprintf("Updated %d fields of document '%s'", len(changedFields), document.Title)
	}

	return s.LogActivity(ctx, models.ActivityTypeUpdate, description, metadata)
}

// Document Delete Activity
func (s *ActivityService) LogDocumentDelete(ctx *ActivityContext, document *models.Document) error {
	metadata := models.ActivityMetadata{
		FileSize: &document.FileSize,
		FileType: (*string)(&document.FileType),
		FileName: &document.OriginalFileName,
	}

	description := fmt.Sprintf("Deleted document '%s'", document.Title)
	return s.LogActivity(ctx, models.ActivityTypeDelete, description, metadata)
}

// Document Share Activity
func (s *ActivityService) LogDocumentShare(ctx *ActivityContext, document *models.Document, shareType, shareTarget string, shareToken *string, expiresAt *time.Time, maxDownloads *int) error {
	metadata := models.ActivityMetadata{
		ShareType:    &shareType,
		ShareTarget:  &shareTarget,
		ShareToken:   shareToken,
		ExpiresAt:    expiresAt,
		MaxDownloads: maxDownloads,
	}

	description := fmt.Sprintf("Shared document '%s' via %s", document.Title, shareType)
	if shareTarget != "public" {
		description += fmt.Sprintf(" with %s", shareTarget)
	}

	return s.LogActivity(ctx, models.ActivityTypeShare, description, metadata)
}

// Document Unshare Activity
func (s *ActivityService) LogDocumentUnshare(ctx *ActivityContext, document *models.Document, shareType, shareTarget string) error {
	metadata := models.ActivityMetadata{
		ShareType:   &shareType,
		ShareTarget: &shareTarget,
	}

	description := fmt.Sprintf("Revoked share of document '%s' from %s", document.Title, shareTarget)
	return s.LogActivity(ctx, models.ActivityTypeUnshare, description, metadata)
}

// Comment Activity
func (s *ActivityService) LogComment(ctx *ActivityContext, document *models.Document, comment *models.DocumentComment) error {
	commentType := string(comment.CommentType)
	metadata := models.ActivityMetadata{
		CommentID:       &comment.ID,
		CommentContent:  &comment.Content,
		CommentType:     &commentType,
		ParentCommentID: comment.ParentCommentID,
		Position:        comment.Position,
	}

	var description string
	if comment.IsReply() {
		description = fmt.Sprintf("Replied to a comment on document '%s'", document.Title)
	} else if comment.IsAnnotation() {
		description = fmt.Sprintf("Added annotation to document '%s'", document.Title)
	} else {
		description = fmt.Sprintf("Commented on document '%s'", document.Title)
	}

	return s.LogActivity(ctx, models.ActivityTypeComment, description, metadata)
}

// Edit Comment Activity
func (s *ActivityService) LogEditComment(ctx *ActivityContext, document *models.Document, comment *models.DocumentComment, oldContent string) error {
	commentType := string(comment.CommentType)
	metadata := models.ActivityMetadata{
		CommentID:      &comment.ID,
		CommentContent: &comment.Content,
		CommentType:    &commentType,
		OldValues:      map[string]interface{}{"content": oldContent},
		NewValues:      map[string]interface{}{"content": comment.Content},
	}

	description := fmt.Sprintf("Edited comment on document '%s'", document.Title)
	return s.LogActivity(ctx, models.ActivityTypeEditComment, description, metadata)
}

// Delete Comment Activity
func (s *ActivityService) LogDeleteComment(ctx *ActivityContext, document *models.Document, comment *models.DocumentComment) error {
	commentType := string(comment.CommentType)
	metadata := models.ActivityMetadata{
		CommentID:      &comment.ID,
		CommentContent: &comment.Content,
		CommentType:    &commentType,
	}

	description := fmt.Sprintf("Deleted comment on document '%s'", document.Title)
	return s.LogActivity(ctx, models.ActivityTypeDeleteComment, description, metadata)
}

// Resolve Comment Activity
func (s *ActivityService) LogResolveComment(ctx *ActivityContext, document *models.Document, comment *models.DocumentComment) error {
	commentType := string(comment.CommentType)
	metadata := models.ActivityMetadata{
		CommentID:   &comment.ID,
		CommentType: &commentType,
	}

	description := fmt.Sprintf("Resolved comment on document '%s'", document.Title)
	return s.LogActivity(ctx, models.ActivityTypeResolveComment, description, metadata)
}

// Unresolve Comment Activity
func (s *ActivityService) LogUnresolveComment(ctx *ActivityContext, document *models.Document, comment *models.DocumentComment) error {
	commentType := string(comment.CommentType)
	metadata := models.ActivityMetadata{
		CommentID:   &comment.ID,
		CommentType: &commentType,
	}

	description := fmt.Sprintf("Unresolved comment on document '%s'", document.Title)
	return s.LogActivity(ctx, models.ActivityTypeUnresolveComment, description, metadata)
}

// Favorite Activity
func (s *ActivityService) LogFavorite(ctx *ActivityContext, document *models.Document) error {
	metadata := models.ActivityMetadata{}

	description := fmt.Sprintf("Added document '%s' to favorites", document.Title)
	return s.LogActivity(ctx, models.ActivityTypeFavorite, description, metadata)
}

// Unfavorite Activity
func (s *ActivityService) LogUnfavorite(ctx *ActivityContext, document *models.Document) error {
	metadata := models.ActivityMetadata{}

	description := fmt.Sprintf("Removed document '%s' from favorites", document.Title)
	return s.LogActivity(ctx, models.ActivityTypeUnfavorite, description, metadata)
}

// Preview Activity
func (s *ActivityService) LogPreview(ctx *ActivityContext, document *models.Document) error {
	metadata := models.ActivityMetadata{
		FileType: (*string)(&document.FileType),
	}

	description := fmt.Sprintf("Previewed document '%s'", document.Title)
	return s.LogActivity(ctx, models.ActivityTypePreview, description, metadata)
}

// Rename Activity
func (s *ActivityService) LogRename(ctx *ActivityContext, document *models.Document, oldTitle string) error {
	metadata := models.ActivityMetadata{
		OldValues: map[string]interface{}{"title": oldTitle},
		NewValues: map[string]interface{}{"title": document.Title},
	}

	description := fmt.Sprintf("Renamed document from '%s' to '%s'", oldTitle, document.Title)
	return s.LogActivity(ctx, models.ActivityTypeRename, description, metadata)
}

// Tag Update Activity
func (s *ActivityService) LogTagUpdate(ctx *ActivityContext, document *models.Document, oldTags, newTags []string) error {
	metadata := models.ActivityMetadata{
		OldTags: oldTags,
		NewTags: newTags,
	}

	description := fmt.Sprintf("Updated tags for document '%s'", document.Title)
	return s.LogActivity(ctx, models.ActivityTypeTagUpdate, description, metadata)
}

// Permission Change Activity
func (s *ActivityService) LogPermissionChange(ctx *ActivityContext, document *models.Document, oldPermissions, newPermissions map[string]interface{}) error {
	metadata := models.ActivityMetadata{
		OldPermissions: oldPermissions,
		NewPermissions: newPermissions,
	}

	description := fmt.Sprintf("Changed permissions for document '%s'", document.Title)
	return s.LogActivity(ctx, models.ActivityTypePermissionChange, description, metadata)
}

// Error Activity (for failed operations)
func (s *ActivityService) LogError(ctx *ActivityContext, activityType models.ActivityType, errorMsg, errorCode string) error {
	metadata := models.ActivityMetadata{
		Error:     &errorMsg,
		ErrorCode: &errorCode,
	}

	description := fmt.Sprintf("Failed to %s document", strings.ToLower(string(activityType)))
	return s.LogActivity(ctx, activityType, description, metadata)
}

// Helper methods

// Extracts the real client IP address
func (s *ActivityService) getClientIP(c *gin.Context) string {
	// Check X-Forwarded-For header first (for proxies)
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		// Take the first IP in the list
		if ips := strings.Split(xff, ","); len(ips) > 0 {
			ip := strings.TrimSpace(ips[0])
			if net.ParseIP(ip) != nil {
				return ip
			}
		}
	}

	// Check X-Real-IP header
	if xri := c.GetHeader("X-Real-IP"); xri != "" {
		if net.ParseIP(xri) != nil {
			return xri
		}
	}

	// Fallback to RemoteAddr
	if ip, _, err := net.SplitHostPort(c.Request.RemoteAddr); err == nil {
		if net.ParseIP(ip) != nil {
			return ip
		}
	}

	return c.ClientIP()
}

// Detects the source of the request
func (s *ActivityService) detectSource(c *gin.Context) string {
	userAgent := c.GetHeader("User-Agent")
	userAgent = strings.ToLower(userAgent)

	// Check for mobile indicators
	if strings.Contains(userAgent, "mobile") ||
		strings.Contains(userAgent, "android") ||
		strings.Contains(userAgent, "iphone") ||
		strings.Contains(userAgent, "ipad") {
		return "mobile"
	}

	// Check for API clients
	if strings.Contains(userAgent, "postman") ||
		strings.Contains(userAgent, "insomnia") ||
		strings.Contains(userAgent, "curl") ||
		strings.Contains(userAgent, "wget") ||
		strings.Contains(userAgent, "httpie") {
		return "api"
	}

	// Default to web
	return "web"
}

// Logs multiple activities in a single transaction
func (s *ActivityService) BulkLogActivities(activities []models.DocumentActivity) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, activity := range activities {
			if err := tx.Create(&activity).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// Gets quick stats for a user or document
func (s *ActivityService) GetActivityStats(userID *uuid.UUID, documentID *uuid.UUID, since *time.Time) (map[string]interface{}, error) {
	query := s.db.Model(&models.DocumentActivity{})

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	if documentID != nil {
		query = query.Where("document_id = ?", *documentID)
	}

	if since != nil {
		query = query.Where("created_at >= ?", *since)
	}

	var totalCount int64
	if err := query.Count(&totalCount).Error; err != nil {
		return nil, err
	}

	// Get activity breakdown
	var breakdown []struct {
		ActivityType models.ActivityType `json:"activity_type"`
		Count        int64               `json:"count"`
	}
	if err := query.Select("activity_type, COUNT(*) as count").Group("activity_type").Scan(&breakdown).Error; err != nil {
		return nil, err
	}

	breakdownMap := make(map[string]int64)
	for _, item := range breakdown {
		breakdownMap[string(item.ActivityType)] = item.Count
	}

	return map[string]interface{}{
		"total_count": totalCount,
		"breakdown":   breakdownMap,
	}, nil
}

// Removes activities older than the specified duration
func (s *ActivityService) CleanupOldActivities(olderThan time.Duration) error {
	cutoff := time.Now().Add(-olderThan)

	result := s.db.Where("created_at < ?", cutoff).Delete(&models.DocumentActivity{})
	if result.Error != nil {
		return result.Error
	}

	logrus.WithFields(logrus.Fields{
		"deleted_count": result.RowsAffected,
		"cutoff_date":   cutoff,
	}).Info("Cleaned up old activities")

	return nil
}
