package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AccessLevel string

const (
	AccessLevelView     AccessLevel = "view"
	AccessLevelDownload AccessLevel = "download"
	AccessLevelEdit     AccessLevel = "edit"
)

type ShareStatus string

const (
	ShareStatusActive  ShareStatus = "active"
	ShareStatusExpired ShareStatus = "expired"
	ShareStatusRevoked ShareStatus = "revoked"
)

// UserShare represents a document shared with a specific user
type UserShare struct {
	ID               uuid.UUID   `json:"id" gorm:"type:uuid;primary_key"`
	DocumentID       uuid.UUID   `json:"documentID" gorm:"type:uuid;not null;index"`
	OwnerID          uuid.UUID   `json:"ownerID" gorm:"type:uuid;not null;index"`
	SharedWithEmail  string      `json:"sharedWithEmail" gorm:"not null;index"`
	SharedWithUserID *uuid.UUID  `json:"sharedWithUserID,omitempty" gorm:"type:uuid;index"`
	AccessLevel      AccessLevel `json:"accessLevel" gorm:"not null"`
	ExpiresAt        *time.Time  `json:"expiresAt"`
	IsRevoked        bool        `json:"isRevoked" gorm:"default:false"`
	AcceptedAt       *time.Time  `json:"acceptedAt"`
	LastAccessedAt   *time.Time  `json:"lastAccessedAt"`
	Message          string      `json:"message,omitempty"` // Optional message from sharer

	// Relations
	Document       *Document `json:"document,omitempty" gorm:"foreignKey:DocumentID"`
	Owner          *User     `json:"owner,omitempty" gorm:"foreignKey:OwnerID"`
	SharedWithUser *User     `json:"sharedWithUser,omitempty" gorm:"foreignKey:SharedWithUserID"`

	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (us *UserShare) BeforeCreate(tx *gorm.DB) error {
	if us.ID == uuid.Nil {
		us.ID = uuid.New()
	}
	return nil
}

// IsExpired checks if the share has expired
func (us *UserShare) IsExpired() bool {
	if us.ExpiresAt == nil {
		return false
	}
	return us.ExpiresAt.Before(time.Now())
}

// GetStatus returns the current status of the share
func (us *UserShare) GetStatus() ShareStatus {
	if us.IsRevoked {
		return ShareStatusRevoked
	}
	if us.IsExpired() {
		return ShareStatusExpired
	}
	return ShareStatusActive
}

// ShareNotification represents notifications for sharing events
type ShareNotification struct {
	ID         uuid.UUID `json:"id" gorm:"type:uuid;primary_key"`
	Type       string    `json:"type" gorm:"not null"` // document_shared, access_granted, access_revoked, document_updated
	Title      string    `json:"title" gorm:"not null"`
	Message    string    `json:"message" gorm:"not null"`
	DocumentID uuid.UUID `json:"documentID" gorm:"type:uuid;not null;index"`
	FromUserID uuid.UUID `json:"fromUserID" gorm:"type:uuid;not null;index"`
	ToUserID   uuid.UUID `json:"toUserID" gorm:"type:uuid;not null;index"`
	IsRead     bool      `json:"isRead" gorm:"default:false"`

	// Metadata as JSON string
	Metadata string `json:"metadata,omitempty"` // JSON string for additional data

	// Relations
	Document *Document `json:"document,omitempty" gorm:"foreignKey:DocumentID"`
	FromUser *User     `json:"fromUser,omitempty" gorm:"foreignKey:FromUserID"`
	ToUser   *User     `json:"toUser,omitempty" gorm:"foreignKey:ToUserID"`

	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (sn *ShareNotification) BeforeCreate(tx *gorm.DB) error {
	if sn.ID == uuid.Nil {
		sn.ID = uuid.New()
	}
	return nil
}

// UserShareAuditLog records every significant event for user shares
type UserShareAuditLog struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key"`
	UserShareID uuid.UUID `json:"userShareID" gorm:"type:uuid;not null;index"`
	UserID      uuid.UUID `json:"userID" gorm:"type:uuid;not null;index"`
	Action      string    `json:"action" gorm:"size:32;not null"` // created, accessed, updated, revoked
	IPAddress   string    `json:"ipAddress" gorm:"size:45"`       // IPv6 max length 45
	UserAgent   string    `json:"userAgent"`
	Details     string    `json:"details,omitempty"` // Additional details about the action

	// Relations
	UserShare *UserShare `json:"userShare,omitempty" gorm:"foreignKey:UserShareID"`
	User      *User      `json:"user,omitempty" gorm:"foreignKey:UserID"`

	CreatedAt time.Time `json:"createdAt"`
}

func (usal *UserShareAuditLog) BeforeCreate(tx *gorm.DB) error {
	if usal.ID == uuid.Nil {
		usal.ID = uuid.New()
	}
	return nil
}

// ShareInvitation represents an invitation to access a document for users not yet registered
type ShareInvitation struct {
	ID          uuid.UUID   `json:"id" gorm:"type:uuid;primary_key"`
	DocumentID  uuid.UUID   `json:"documentID" gorm:"type:uuid;not null;index"`
	OwnerID     uuid.UUID   `json:"ownerID" gorm:"type:uuid;not null;index"`
	Email       string      `json:"email" gorm:"not null;index"`
	AccessLevel AccessLevel `json:"accessLevel" gorm:"not null"`
	Token       string      `json:"token" gorm:"uniqueIndex;size:64;not null"`
	ExpiresAt   *time.Time  `json:"expiresAt"`
	Message     string      `json:"message,omitempty"`
	IsAccepted  bool        `json:"isAccepted" gorm:"default:false"`
	AcceptedAt  *time.Time  `json:"acceptedAt"`

	// Relations
	Document *Document `json:"document,omitempty" gorm:"foreignKey:DocumentID"`
	Owner    *User     `json:"owner,omitempty" gorm:"foreignKey:OwnerID"`

	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (si *ShareInvitation) BeforeCreate(tx *gorm.DB) error {
	if si.ID == uuid.Nil {
		si.ID = uuid.New()
	}
	return nil
}

// IsExpired checks if the invitation has expired
func (si *ShareInvitation) IsExpired() bool {
	if si.ExpiresAt == nil {
		return false
	}
	return si.ExpiresAt.Before(time.Now())
}
