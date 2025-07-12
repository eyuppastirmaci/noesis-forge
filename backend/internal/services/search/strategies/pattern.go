package strategies

import (
	"context"
	"fmt"
	"strings"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/models/search"
	"gorm.io/gorm"
)

type PatternStrategy struct {
	db *gorm.DB
}

func NewPatternStrategy(db *gorm.DB) search.SearchStrategy {
	return &PatternStrategy{db: db}
}

func (s *PatternStrategy) Name() string {
	return "pattern"
}

func (s *PatternStrategy) CanHandle(req *search.SearchRequest) bool {
	return len(req.Tokens) > 0
}

func (s *PatternStrategy) Search(ctx context.Context, req *search.SearchRequest, filters func(*gorm.DB) *gorm.DB) (*search.SearchResult, error) {
	baseQuery := s.db.WithContext(ctx).Model(&models.Document{}).Where("user_id = ?", req.UserID)
	baseQuery = filters(baseQuery)

	// Build ILIKE query for each significant token
	patternQuery := baseQuery.Session(&gorm.Session{})

	hasValidTokens := false
	for _, token := range req.Tokens {
		if len(token) >= 2 {
			pattern := "%" + token + "%"
			patternQuery = patternQuery.Where(
				"title ILIKE ? OR description ILIKE ? OR tags ILIKE ? OR original_file_name ILIKE ?",
				pattern, pattern, pattern, pattern,
			)
			hasValidTokens = true
		}
	}

	if !hasValidTokens {
		return &search.SearchResult{}, nil
	}

	var total int64
	if err := patternQuery.Count(&total).Error; err != nil || total == 0 {
		return &search.SearchResult{}, nil
	}

	// Score by token matches across all columns
	var docs []models.Document
	selectParts := []string{"*"}
	scoreParts := []string{}

	for _, token := range req.Tokens {
		if len(token) >= 2 {
			// Escape single quotes for SQL
			escapedToken := strings.ReplaceAll(token, "'", "''")
			scoreParts = append(scoreParts, fmt.Sprintf(
				"(CASE WHEN title ILIKE '%%%s%%' THEN 2 ELSE 0 END) + "+
					"(CASE WHEN description ILIKE '%%%s%%' THEN 1 ELSE 0 END) + "+
					"(CASE WHEN tags ILIKE '%%%s%%' THEN 1 ELSE 0 END) + "+
					"(CASE WHEN original_file_name ILIKE '%%%s%%' THEN 1 ELSE 0 END)",
				escapedToken, escapedToken, escapedToken, escapedToken,
			))
		}
	}

	if len(scoreParts) > 0 {
		selectParts = append(selectParts, "("+strings.Join(scoreParts, " + ")+") as search_score")
	} else {
		selectParts = append(selectParts, "1 as search_score")
	}

	err := patternQuery.
		Select(strings.Join(selectParts, ", ")).
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
