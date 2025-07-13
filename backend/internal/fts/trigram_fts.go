package fts

import (
	"context"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/types"
	"gorm.io/gorm"
)

type TrigramStrategy struct {
	db *gorm.DB
}

func NewTrigramStrategy(db *gorm.DB) types.SearchStrategy {
	return &TrigramStrategy{db: db}
}

func (s *TrigramStrategy) Name() string {
	return "trigram"
}

func (s *TrigramStrategy) CanHandle(req *types.SearchRequest) bool {
	return len(req.Query) >= 3
}

func (s *TrigramStrategy) Search(ctx context.Context, req *types.SearchRequest, filters func(*gorm.DB) *gorm.DB) (*types.SearchResult, error) {
	query := req.Query
	baseQuery := s.db.WithContext(ctx).Model(&models.Document{}).Where("user_id = ?", req.UserID)
	baseQuery = filters(baseQuery)

	// Trigram % operator (fast match using GIN index)
	trigramQuery := baseQuery.Session(&gorm.Session{}).Where(
		"title % ? OR description % ? OR original_file_name % ?", query, query, query,
	)

	var total int64
	if err := trigramQuery.Count(&total).Error; err != nil {
		return &types.SearchResult{}, nil
	}

	if total == 0 {
		// Fallback: similarity() function with threshold
		trigramQuery = baseQuery.Session(&gorm.Session{}).Where(
			"similarity(title, ?) > 0.1 OR similarity(description, ?) > 0.1 OR similarity(original_file_name, ?) > 0.1",
			query, query, query,
		)

		if err := trigramQuery.Count(&total).Error; err != nil || total == 0 {
			return &types.SearchResult{}, nil
		}
	}

	var docs []models.Document
	err := trigramQuery.
		Select(`
			*, 
			(
				GREATEST(similarity(title, ?), 0) * 3 +
				GREATEST(similarity(description, ?), 0) * 2 +
				GREATEST(similarity(original_file_name, ?), 0) * 1
			) as search_score
		`, query, query, query).
		Order("search_score DESC, created_at DESC").
		Offset((req.Page - 1) * req.Limit).
		Limit(req.Limit).
		Find(&docs).Error

	if err != nil {
		return &types.SearchResult{}, nil
	}

	totalPages := int((total + int64(req.Limit) - 1) / int64(req.Limit))
	return &types.SearchResult{
		Documents:  docs,
		Total:      total,
		Page:       req.Page,
		Limit:      req.Limit,
		TotalPages: totalPages,
	}, nil
}
