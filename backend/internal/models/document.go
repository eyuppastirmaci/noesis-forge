package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DocumentStatus string
type DocumentType string

const (
	DocumentStatusProcessing DocumentStatus = "processing"
	DocumentStatusReady      DocumentStatus = "ready"
	DocumentStatusFailed     DocumentStatus = "failed"
	DocumentStatusDeleted    DocumentStatus = "deleted"
)

const (
	DocumentTypePDF   DocumentType = "pdf"
	DocumentTypeDOCX  DocumentType = "docx"
	DocumentTypeTXT   DocumentType = "txt"
	DocumentTypeXLSX  DocumentType = "xlsx"
	DocumentTypePPTX  DocumentType = "pptx"
	DocumentTypeOther DocumentType = "other"
)

type Document struct {
	ID               uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Title            string         `json:"title" gorm:"not null"`
	Description      string         `json:"description"`
	FileName         string         `json:"fileName" gorm:"not null"`         // UUID-based filename in storage
	OriginalFileName string         `json:"originalFileName" gorm:"not null"` // Original filename from user
	FileSize         int64          `json:"fileSize" gorm:"not null"`
	FileType         DocumentType   `json:"fileType" gorm:"not null"`
	MimeType         string         `json:"mimeType" gorm:"not null"`
	Status           DocumentStatus `json:"status" gorm:"default:'processing'"`

	// MinIO storage info
	StoragePath   string `json:"-" gorm:"not null"` // MinIO object path
	StorageBucket string `json:"-" gorm:"not null"` // MinIO bucket name

	// Thumbnail info (server-generated thumbnails)
	ThumbnailPath string `json:"-" gorm:""`                         // Path to thumbnail file in storage (e.g., "uuid.jpg")
	HasThumbnail  bool   `json:"hasThumbnail" gorm:"default:false"` // Whether thumbnail exists

	// Processing info
	ExtractedText string     `json:"-" gorm:"type:text"` // Extracted text content
	ProcessedAt   *time.Time `json:"processedAt,omitempty"`

	// Versioning
	Version  int        `json:"version" gorm:"default:1"`
	ParentID *uuid.UUID `json:"parentID,omitempty" gorm:"type:uuid"`
	Parent   *Document  `json:"parent,omitempty" gorm:"foreignKey:ParentID"`

	// Metadata
	Tags          string `json:"tags"` // Comma-separated tags
	IsPublic      bool   `json:"isPublic" gorm:"default:false"`
	ViewCount     int64  `json:"viewCount" gorm:"default:0"`
	DownloadCount int64  `json:"downloadCount" gorm:"default:0"`

	// Relations
	UserID uuid.UUID `json:"userID" gorm:"type:uuid;not null"`
	User   User      `json:"user,omitempty" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`

	// Timestamps
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (d *Document) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}

// GetFileExtension returns file extension from file
func (d *Document) GetFileExtension() string {
	for i := len(d.FileName) - 1; i >= 0; i-- {
		if d.FileName[i] == '.' {
			return d.FileName[i+1:]
		}
	}
	return ""
}

// GetPublicURL returns public accessible URL (if needed)
func (d *Document) GetPublicURL() string {
	// This feature will be implemented in the future.
	return ""
}

type DocumentCollection struct {
	ID           uuid.UUID `json:"id" gorm:"type:uuid;primary_key"`
	DocumentID   uuid.UUID `json:"documentID" gorm:"type:uuid;not null"`
	CollectionID uuid.UUID `json:"collectionID" gorm:"type:uuid;not null"`
	AddedAt      time.Time `json:"addedAt"`

	Document   Document   `json:"document,omitempty" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Collection Collection `json:"collection,omitempty" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

func (dc *DocumentCollection) BeforeCreate(tx *gorm.DB) error {
	if dc.ID == uuid.Nil {
		dc.ID = uuid.New()
	}
	return nil
}

type Collection struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key"`
	Name        string    `json:"name" gorm:"not null"`
	Description string    `json:"description"`
	IsPublic    bool      `json:"isPublic" gorm:"default:false"`

	UserID uuid.UUID `json:"userID" gorm:"type:uuid;not null"`
	User   User      `json:"user,omitempty" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`

	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (c *Collection) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}
