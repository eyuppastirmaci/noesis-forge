package search

import (
	"context"

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
