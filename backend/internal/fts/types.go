package fts

import (
	"context"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SearchRequest struct {
	UserID   uuid.UUID
	Query    string
	Tokens   []string
	Page     int
	Limit    int
	FileType string
	Status   string
	Tags     string
	SortBy   string
	SortDir  string
}

type SearchResult struct {
	Documents  []models.Document
	Total      int64
	Page       int
	Limit      int
	TotalPages int
}

type SearchStrategy interface {
	Name() string
	Search(ctx context.Context, req *SearchRequest, filters func(*gorm.DB) *gorm.DB) (*SearchResult, error)
	CanHandle(req *SearchRequest) bool
}

type UploadDocumentRequest struct {
	Title       string `json:"title" validate:"required,min=1,max=255"`
	Description string `json:"description" validate:"max=1000"`
	Tags        string `json:"tags" validate:"max=500"`
	IsPublic    bool   `json:"isPublic"`
}

type UpdateDocumentRequest struct {
	Title       string `json:"title" validate:"required,min=1,max=255"`
	Description string `json:"description" validate:"max=1000"`
	Tags        string `json:"tags" validate:"max=500"`
	IsPublic    bool   `json:"isPublic"`
	HasNewFile  bool   `json:"hasNewFile"`
}

type DocumentResponse struct {
	ID               uuid.UUID             `json:"id"`
	Title            string                `json:"title"`
	Description      string                `json:"description"`
	FileName         string                `json:"fileName"`
	OriginalFileName string                `json:"originalFileName"`
	FileSize         int64                 `json:"fileSize"`
	FileType         models.DocumentType   `json:"fileType"`
	MimeType         string                `json:"mimeType"`
	Status           models.DocumentStatus `json:"status"`
	Version          int                   `json:"version"`
	Tags             string                `json:"tags"`
	IsPublic         bool                  `json:"isPublic"`
	ViewCount        int64                 `json:"viewCount"`
	DownloadCount    int64                 `json:"downloadCount"`
	PageCount        *int                  `json:"pageCount,omitempty"`
	UserID           uuid.UUID             `json:"userID"`
	ProcessedAt      *time.Time            `json:"processedAt,omitempty"`
	CreatedAt        time.Time             `json:"createdAt"`
	UpdatedAt        time.Time             `json:"updatedAt"`
	HasThumbnail     bool                  `json:"hasThumbnail"`
	UserAccessLevel  string                `json:"userAccessLevel"`
	SearchScore      float64               `json:"searchScore,omitempty"`
}

type DocumentListResponse struct {
	Documents  []DocumentResponse `json:"documents"`
	Total      int64              `json:"total"`
	Page       int                `json:"page"`
	Limit      int                `json:"limit"`
	TotalPages int                `json:"totalPages"`
}

type UserStatsResponse struct {
	DocumentsThisMonth int64 `json:"documentsThisMonth"`
	TotalStorageUsage  int64 `json:"totalStorageUsage"`
}
