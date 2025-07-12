package fts

import (
	"context"
	"strings"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"gorm.io/gorm"
)

type ExactFTSStrategy struct {
	db *gorm.DB
}

func NewExactFTSStrategy(db *gorm.DB) SearchStrategy {
	return &ExactFTSStrategy{db: db}
}

func (s *ExactFTSStrategy) Name() string {
	return "exact_fts"
}

// CanHandle decides if this strategy applies to the current request
func (s *ExactFTSStrategy) CanHandle(req *SearchRequest) bool {
	return len(req.Tokens) > 0 && len(req.Query) >= 3 // Basic guard to avoid pointless FTS
}

// Search executes the actual PostgreSQL full-text search and returns paged results
func (s *ExactFTSStrategy) Search(
	ctx context.Context,
	req *SearchRequest,
	filters func(*gorm.DB) *gorm.DB,
) (*SearchResult, error) {
	// Build base query scoped to the user and any extra filters
	baseQuery := s.db.WithContext(ctx).
		Model(&models.Document{}).
		Where("user_id = ?", req.UserID)
	baseQuery = filters(baseQuery) // Apply external filters

	// Gather tokens of length ≥2 to build an AND tsquery
	exactQueryParts := []string{}
	for _, token := range req.Tokens {
		if len(token) >= 2 { // Skip trivial tokens to keep query precise
			exactQueryParts = append(exactQueryParts, token) // Keep significant terms
		}
	}

	if len(exactQueryParts) == 0 { // No valid terms means nothing to search
		return &SearchResult{}, nil
	}

	// Build tsquery string using & to require all terms
	ftsQueryString := strings.Join(exactQueryParts, " & ")
	// Inject tsquery into Postgres websearch_to_tsquery for ranking
	ftsQuery := baseQuery.Session(&gorm.Session{}).
		Where("search_vector @@ websearch_to_tsquery('english', ?)", ftsQueryString)

	// Count total matches for pagination metadata
	var total int64
	if err := ftsQuery.Count(&total).Error; err != nil || total == 0 {
		return &SearchResult{}, nil
	}

	// Retrieve paged documents ordered by relevance score and recency
	var docs []models.Document
	err := ftsQuery.
		Select("*, ts_rank(search_vector, websearch_to_tsquery('english', ?)) as search_score", ftsQueryString).
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
