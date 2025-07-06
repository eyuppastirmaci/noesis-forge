package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ActivityType defines the type of activity performed on a document
type ActivityType string

const (
	ActivityTypeUpload           ActivityType = "upload"            // Document uploaded
	ActivityTypeView             ActivityType = "view"              // Document viewed
	ActivityTypeDownload         ActivityType = "download"          // Document downloaded
	ActivityTypeUpdate           ActivityType = "update"            // Document updated
	ActivityTypeDelete           ActivityType = "delete"            // Document deleted
	ActivityTypeShare            ActivityType = "share"             // Document shared
	ActivityTypeUnshare          ActivityType = "unshare"           // Document unshared
	ActivityTypeComment          ActivityType = "comment"           // Comment added
	ActivityTypeEditComment      ActivityType = "edit_comment"      // Comment edited
	ActivityTypeDeleteComment    ActivityType = "delete_comment"    // Comment deleted
	ActivityTypeResolveComment   ActivityType = "resolve_comment"   // Comment resolved
	ActivityTypeUnresolveComment ActivityType = "unresolve_comment" // Comment unresolved
	ActivityTypeFavorite         ActivityType = "favorite"          // Document favorited
	ActivityTypeUnfavorite       ActivityType = "unfavorite"        // Document unfavorited
	ActivityTypePreview          ActivityType = "preview"           // Document previewed
	ActivityTypeRename           ActivityType = "rename"            // Document renamed
	ActivityTypeMove             ActivityType = "move"              // Document moved to collection
	ActivityTypeTagUpdate        ActivityType = "tag_update"        // Tags updated
	ActivityTypePermissionChange ActivityType = "permission_change" // Permissions changed
)

// DocumentActivity represents an activity or action performed on a document
type DocumentActivity struct {
	ID           uuid.UUID    `json:"id" gorm:"type:uuid;primary_key"`
	DocumentID   uuid.UUID    `json:"documentID" gorm:"type:uuid;not null;index"`
	UserID       uuid.UUID    `json:"userID" gorm:"type:uuid;not null"`
	ActivityType ActivityType `json:"activityType" gorm:"not null;index"`

	// Activity description and metadata
	Description string           `json:"description" gorm:"type:text"`
	Metadata    ActivityMetadata `json:"metadata" gorm:"type:jsonb"`

	// IP and User Agent for security tracking
	IPAddress string `json:"ipAddress,omitempty" gorm:"column:ip_address"`
	UserAgent string `json:"userAgent,omitempty" gorm:"column:user_agent"`

	// Relations
	Document Document `json:"document,omitempty" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	User     User     `json:"user,omitempty" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`

	// Timestamps
	CreatedAt time.Time `json:"createdAt"`
}

// ActivityMetadata contains flexible metadata for different activity types
type ActivityMetadata struct {
	// For file operations
	FileSize    *int64  `json:"fileSize,omitempty"`
	FileType    *string `json:"fileType,omitempty"`
	FileName    *string `json:"fileName,omitempty"`
	OldFileName *string `json:"oldFileName,omitempty"`
	NewFileName *string `json:"newFileName,omitempty"`

	// For updates
	FieldsChanged []string               `json:"fieldsChanged,omitempty"`
	OldValues     map[string]interface{} `json:"oldValues,omitempty"`
	NewValues     map[string]interface{} `json:"newValues,omitempty"`

	// For sharing
	ShareType    *string    `json:"shareType,omitempty"`    // "user", "public", "link"
	ShareTarget  *string    `json:"shareTarget,omitempty"`  // Email, user ID, or "public"
	ShareToken   *string    `json:"shareToken,omitempty"`   // For link sharing
	ExpiresAt    *time.Time `json:"expiresAt,omitempty"`    // Share expiration
	MaxDownloads *int       `json:"maxDownloads,omitempty"` // Download limit

	// For comments
	CommentID       *uuid.UUID `json:"commentID,omitempty"`
	CommentContent  *string    `json:"commentContent,omitempty"`
	CommentType     *string    `json:"commentType,omitempty"`
	ParentCommentID *uuid.UUID `json:"parentCommentID,omitempty"`

	// For position-based activities (annotations)
	Position *CommentPosition `json:"position,omitempty"`

	// For collections
	CollectionID   *uuid.UUID `json:"collectionID,omitempty"`
	CollectionName *string    `json:"collectionName,omitempty"`

	// For tags
	OldTags []string `json:"oldTags,omitempty"`
	NewTags []string `json:"newTags,omitempty"`

	// For permissions
	OldPermissions map[string]interface{} `json:"oldPermissions,omitempty"`
	NewPermissions map[string]interface{} `json:"newPermissions,omitempty"`

	// Additional context
	Source    *string `json:"source,omitempty"`    // "web", "mobile", "api"
	Duration  *int64  `json:"duration,omitempty"`  // Duration in milliseconds (for view activities)
	PageCount *int    `json:"pageCount,omitempty"` // For PDF activities

	// Error information (for failed activities)
	Error      *string `json:"error,omitempty"`
	ErrorCode  *string `json:"errorCode,omitempty"`
	StackTrace *string `json:"stackTrace,omitempty"`
}

func (da *DocumentActivity) BeforeCreate(tx *gorm.DB) error {
	if da.ID == uuid.Nil {
		da.ID = uuid.New()
	}
	return nil
}

// GetActivityIcon returns the icon name for the activity type
func (da *DocumentActivity) GetActivityIcon() string {
	switch da.ActivityType {
	case ActivityTypeUpload:
		return "upload"
	case ActivityTypeView:
		return "eye"
	case ActivityTypeDownload:
		return "download"
	case ActivityTypeUpdate:
		return "edit"
	case ActivityTypeDelete:
		return "trash"
	case ActivityTypeShare:
		return "share"
	case ActivityTypeUnshare:
		return "share-off"
	case ActivityTypeComment:
		return "message-circle"
	case ActivityTypeEditComment:
		return "edit"
	case ActivityTypeDeleteComment:
		return "trash"
	case ActivityTypeResolveComment:
		return "check-circle"
	case ActivityTypeUnresolveComment:
		return "x-circle"
	case ActivityTypeFavorite:
		return "heart"
	case ActivityTypeUnfavorite:
		return "heart-off"
	case ActivityTypePreview:
		return "eye"
	case ActivityTypeRename:
		return "edit"
	case ActivityTypeMove:
		return "folder"
	case ActivityTypeTagUpdate:
		return "tag"
	case ActivityTypePermissionChange:
		return "shield"
	default:
		return "activity"
	}
}

// GetActivityColor returns the color for the activity type
func (da *DocumentActivity) GetActivityColor() string {
	switch da.ActivityType {
	case ActivityTypeUpload:
		return "green"
	case ActivityTypeView, ActivityTypePreview:
		return "blue"
	case ActivityTypeDownload:
		return "indigo"
	case ActivityTypeUpdate, ActivityTypeRename, ActivityTypeEditComment:
		return "yellow"
	case ActivityTypeDelete, ActivityTypeDeleteComment:
		return "red"
	case ActivityTypeShare, ActivityTypeComment:
		return "purple"
	case ActivityTypeUnshare, ActivityTypeUnfavorite:
		return "gray"
	case ActivityTypeResolveComment:
		return "green"
	case ActivityTypeUnresolveComment:
		return "orange"
	case ActivityTypeFavorite:
		return "pink"
	case ActivityTypeMove:
		return "teal"
	case ActivityTypeTagUpdate:
		return "cyan"
	case ActivityTypePermissionChange:
		return "amber"
	default:
		return "gray"
	}
}

// IsImportant returns true if this activity should be highlighted
func (da *DocumentActivity) IsImportant() bool {
	importantTypes := []ActivityType{
		ActivityTypeUpload,
		ActivityTypeDelete,
		ActivityTypeShare,
		ActivityTypeUpdate,
		ActivityTypePermissionChange,
	}

	for _, t := range importantTypes {
		if da.ActivityType == t {
			return true
		}
	}
	return false
}

// GetMetadataJSON returns metadata as JSON string
func (da *DocumentActivity) GetMetadataJSON() (string, error) {
	bytes, err := json.Marshal(da.Metadata)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// SetMetadataFromJSON sets metadata from JSON string
func (da *DocumentActivity) SetMetadataFromJSON(jsonStr string) error {
	return json.Unmarshal([]byte(jsonStr), &da.Metadata)
}
