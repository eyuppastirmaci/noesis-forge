package fts

import (
	"context"
	"strings"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"gorm.io/gorm"
)

type FuzzyFTSStrategy struct {
	db *gorm.DB
}

func NewFuzzyFTSStrategy(db *gorm.DB) SearchStrategy {
	return &FuzzyFTSStrategy{db: db}
}

func (s *FuzzyFTSStrategy) Name() string {
	return "fuzzy_fts"
}

// CanHandle decides if this strategy applies to the current request
func (s *FuzzyFTSStrategy) CanHandle(req *SearchRequest) bool {
	return len(req.Tokens) > 0 && len(req.Query) >= 3 // Basic guard to avoid pointless FTS
}

// Search executes PostgreSQL full-text search with fuzzy matching and returns paged results
func (s *FuzzyFTSStrategy) Search(ctx context.Context, req *SearchRequest, filters func(*gorm.DB) *gorm.DB) (*SearchResult, error) {
	// Build base query scoped to the user and any extra filters
	baseQuery := s.db.WithContext(ctx).Model(&models.Document{}).Where("user_id = ?", req.UserID)
	baseQuery = filters(baseQuery) // Apply external filters

	// Build fuzzy query with prefix matching for flexible search results
	fuzzyQueryParts := []string{}
	for _, token := range req.Tokens {
		if len(token) >= 3 { // Require minimum 3 chars for meaningful prefix matching
			// Add prefix wildcard for fuzzy matching
			fuzzyQueryParts = append(fuzzyQueryParts, token+":*")
		}
	}

	if len(fuzzyQueryParts) == 0 { // No valid terms means nothing to search
		return &SearchResult{}, nil
	}

	// Build tsquery string using | to allow any terms
	ftsQueryString := strings.Join(fuzzyQueryParts, " | ") // OR instead of AND for flexibility
	// Use to_tsquery for more precise control over prefix matching
	ftsQuery := baseQuery.Session(&gorm.Session{}).
		Where("search_vector @@ to_tsquery('english', ?)", ftsQueryString)

	var total int64
	if err := ftsQuery.Count(&total).Error; err != nil || total == 0 {
		return &SearchResult{}, nil
	}

	var docs []models.Document
	err := ftsQuery.
		Select("*, ts_rank(search_vector, to_tsquery('english', ?)) as search_score", ftsQueryString).
		Order("search_score DESC, created_at DESC").
		Offset((req.Page - 1) * req.Limit).
		Limit(req.Limit).
		Find(&docs).Error

	if err != nil {
		return &SearchResult{}, nil
	}

	totalPages := int((total + int64(req.Limit) - 1) / int64(req.Limit))

	return &SearchResult{
		Documents:  docs,
		Total:      total,
		Page:       req.Page,
		Limit:      req.Limit,
		TotalPages: totalPages,
	}, nil
}
