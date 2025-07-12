package strategies

import (
	"context"
	"strings"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/models/search"
	"gorm.io/gorm"
)

type FuzzyFTSStrategy struct {
	db *gorm.DB
}

func NewFuzzyFTSStrategy(db *gorm.DB) search.SearchStrategy {
	return &FuzzyFTSStrategy{db: db}
}

func (s *FuzzyFTSStrategy) Name() string {
	return "fuzzy_fts"
}

func (s *FuzzyFTSStrategy) CanHandle(req *search.SearchRequest) bool {
	return len(req.Tokens) > 0 && len(req.Query) >= 3
}

func (s *FuzzyFTSStrategy) Search(ctx context.Context, req *search.SearchRequest, filters func(*gorm.DB) *gorm.DB) (*search.SearchResult, error) {
	baseQuery := s.db.WithContext(ctx).Model(&models.Document{}).Where("user_id = ?", req.UserID)
	baseQuery = filters(baseQuery)

	// Build fuzzy query with prefix matching
	fuzzyQueryParts := []string{}
	for _, token := range req.Tokens {
		if len(token) >= 3 {
			// Add both exact and prefix versions
			fuzzyQueryParts = append(fuzzyQueryParts, token+":*")
		}
	}

	if len(fuzzyQueryParts) == 0 {
		return &search.SearchResult{}, nil
	}

	ftsQueryString := strings.Join(fuzzyQueryParts, " | ") // OR instead of AND for flexibility
	ftsQuery := baseQuery.Session(&gorm.Session{}).
		Where("search_vector @@ to_tsquery('english', ?)", ftsQueryString)

	var total int64
	if err := ftsQuery.Count(&total).Error; err != nil || total == 0 {
		return &search.SearchResult{}, nil
	}

	var docs []models.Document
	err := ftsQuery.
		Select("*, ts_rank(search_vector, to_tsquery('english', ?)) as search_score", ftsQueryString).
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
