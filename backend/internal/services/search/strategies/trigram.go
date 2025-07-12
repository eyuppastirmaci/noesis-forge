package strategies

import (
	"context"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/models/search"
	"gorm.io/gorm"
)

type TrigramStrategy struct {
	db *gorm.DB
}

func NewTrigramStrategy(db *gorm.DB) search.SearchStrategy {
	return &TrigramStrategy{db: db}
}

func (s *TrigramStrategy) Name() string {
	return "trigram"
}

func (s *TrigramStrategy) CanHandle(req *search.SearchRequest) bool {
	return len(req.Query) >= 3
}

func (s *TrigramStrategy) Search(ctx context.Context, req *search.SearchRequest, filters func(*gorm.DB) *gorm.DB) (*search.SearchResult, error) {
	baseQuery := s.db.WithContext(ctx).Model(&models.Document{}).Where("user_id = ?", req.UserID)
	baseQuery = filters(baseQuery)

	trigramQuery := baseQuery.Session(&gorm.Session{}).Where(
		"title % ? OR description % ? OR original_file_name % ?",
		req.Query, req.Query, req.Query,
	)

	var total int64
	if err := trigramQuery.Count(&total).Error; err != nil {
		return &search.SearchResult{}, nil
	}

	if total == 0 {
		// Manual similarity check
		manualQuery := baseQuery.Session(&gorm.Session{}).Where(
			"similarity(title, ?) > 0.1 OR similarity(description, ?) > 0.1 OR similarity(original_file_name, ?) > 0.1",
			req.Query, req.Query, req.Query,
		)

		if err := manualQuery.Count(&total).Error; err != nil || total == 0 {
			return &search.SearchResult{}, nil
		}

		trigramQuery = manualQuery
	}

	var docs []models.Document
	err := trigramQuery.
		Select("*, GREATEST(similarity(title, ?), similarity(description, ?), similarity(original_file_name, ?)) as search_score",
			req.Query, req.Query, req.Query).
		Order("search_score DESC, created_at DESC").
		Offset((req.Page - 1) * req.Limit).
		Limit(req.Limit).
		Find(&docs).Error

	if err != nil {
		return &search.SearchResult{}, nil
	}

	totalPages := int((total + int64(req.Limit) - 1) / int64(req.Limit))

	return &search.SearchResult{
		Documents:  docs,
		Total:      total,
		Page:       req.Page,
		Limit:      req.Limit,
		TotalPages: totalPages,
	}, nil
}
