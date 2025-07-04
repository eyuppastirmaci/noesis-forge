package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SharedLink struct {
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primary_key"`
	DocumentID    uuid.UUID  `json:"documentID" gorm:"type:uuid;not null;index"`
	OwnerID       uuid.UUID  `json:"ownerID" gorm:"type:uuid;not null;index"`
	Token         string     `json:"token" gorm:"uniqueIndex;size:64;not null"`
	ExpiresAt     *time.Time `json:"expiresAt"`
	MaxDownloads  *int       `json:"maxDownloads"`
	DownloadCount int        `json:"downloadCount" gorm:"default:0"`
	IsRevoked     bool       `json:"isRevoked" gorm:"default:false"`

	// Relations
	Document *Document `json:"document,omitempty" gorm:"foreignKey:DocumentID"`

	// Future-proof fields
	RequireAuth  bool   `json:"requireAuth" gorm:"default:false"`
	PasswordHash string `json:"passwordHash"`
	AllowedIPs   string `json:"allowedIPs"` // comma-separated list – future use

	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (sl *SharedLink) BeforeCreate(tx *gorm.DB) error {
	if sl.ID == uuid.Nil {
		sl.ID = uuid.New()
	}
	return nil
}

// ShareAuditLog records every significant event for a shared link.
type ShareAuditLog struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primary_key"`
	SharedLinkID uuid.UUID `json:"sharedLinkID" gorm:"type:uuid;not null;index"`
	Action       string    `json:"action" gorm:"size:32;not null"`
	IPAddress    string    `json:"ipAddress" gorm:"size:45"` // IPv6 max length 45
	UserAgent    string    `json:"userAgent"`
	CreatedAt    time.Time `json:"createdAt"`
}

func (l *ShareAuditLog) BeforeCreate(tx *gorm.DB) error {
	if l.ID == uuid.Nil {
		l.ID = uuid.New()
	}
	return nil
}
