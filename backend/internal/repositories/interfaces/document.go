package interfaces

import (
	"context"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/models/search"
	"github.com/google/uuid"
)

type DocumentRepository interface {
	// Basic CRUD
	Create(ctx context.Context, document *models.Document) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Document, error)
	GetByIDAndUserID(ctx context.Context, id, userID uuid.UUID) (*models.Document, error)
	Update(ctx context.Context, document *models.Document) error
	Delete(ctx context.Context, id uuid.UUID) error

	// Stats
	GetUserStats(ctx context.Context, userID uuid.UUID) (*search.UserStatsResponse, error)
	GetRevisions(ctx context.Context, documentID uuid.UUID) ([]models.DocumentRevision, error)

	// Count operations
	IncrementViewCount(ctx context.Context, id uuid.UUID) error
	IncrementDownloadCount(ctx context.Context, id uuid.UUID) error
}

type DocumentSearchRepository interface {
	// Search operations
	SearchDocuments(ctx context.Context, req *search.SearchRequest) (*search.SearchResult, error)
	CountSearchResults(ctx context.Context, req *search.SearchRequest) (int64, error)
}
