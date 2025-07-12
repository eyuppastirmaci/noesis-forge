package search

import (
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/google/uuid"
)

type DocumentListRequest struct {
	Page     int    `json:"page" validate:"min=1"`
	Limit    int    `json:"limit" validate:"min=1,max=100"`
	Search   string `json:"search"`
	FileType string `json:"fileType"`
	Status   string `json:"status"`
	Tags     string `json:"tags"`
	SortBy   string `json:"sortBy"`  // name, date, size, views
	SortDir  string `json:"sortDir"` // asc, desc
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
