package strategies

import (
	"context"
	"strings"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/models/search"
	"gorm.io/gorm"
)

type ExactFTSStrategy struct {
	db *gorm.DB
}

func NewExactFTSStrategy(db *gorm.DB) search.SearchStrategy {
	return &ExactFTSStrategy{db: db}
}

func (s *ExactFTSStrategy) Name() string {
	return "exact_fts"
}

func (s *ExactFTSStrategy) CanHandle(req *search.SearchRequest) bool {
	return len(req.Tokens) > 0 && len(req.Query) >= 3
}

func (s *ExactFTSStrategy) Search(ctx context.Context, req *search.SearchRequest, filters func(*gorm.DB) *gorm.DB) (*search.SearchResult, error) {
	baseQuery := s.db.WithContext(ctx).Model(&models.Document{}).Where("user_id = ?", req.UserID)
	baseQuery = filters(baseQuery)

	// Build exact match query
	exactQueryParts := []string{}
	for _, token := range req.Tokens {
		if len(token) >= 2 {
			exactQueryParts = append(exactQueryParts, token)
		}
	}

	if len(exactQueryParts) == 0 {
		return &search.SearchResult{}, nil
	}

	ftsQueryString := strings.Join(exactQueryParts, " & ")
	ftsQuery := baseQuery.Session(&gorm.Session{}).
		Where("search_vector @@ websearch_to_tsquery('english', ?)", ftsQueryString)

	var total int64
	if err := ftsQuery.Count(&total).Error; err != nil || total == 0 {
		return &search.SearchResult{}, nil
	}

	var docs []models.Document
	err := ftsQuery.
		Select("*, ts_rank(search_vector, websearch_to_tsquery('english', ?)) as search_score", ftsQueryString).
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
