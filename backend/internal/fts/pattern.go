package fts

import (
	"context"
	"fmt"
	"strings"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"gorm.io/gorm"
)

type PatternStrategy struct {
	db *gorm.DB
}

func NewPatternStrategy(db *gorm.DB) SearchStrategy {
	return &PatternStrategy{db: db}
}

func (s *PatternStrategy) Name() string {
	return "pattern"
}

// CanHandle decides if this strategy applies to the current request
func (s *PatternStrategy) CanHandle(req *SearchRequest) bool {
	return len(req.Tokens) > 0 // No minimum query length, handles any tokenized input
}

// Search executes SQL ILIKE pattern matching across multiple columns and returns scored results
func (s *PatternStrategy) Search(ctx context.Context, req *SearchRequest, filters func(*gorm.DB) *gorm.DB) (*SearchResult, error) {
	// Build base query scoped to the user and any extra filters
	baseQuery := s.db.WithContext(ctx).Model(&models.Document{}).Where("user_id = ?", req.UserID)
	baseQuery = filters(baseQuery) // Apply external filters

	// Build ILIKE query for each significant token across multiple columns
	patternQuery := baseQuery.Session(&gorm.Session{})

	hasValidTokens := false
	for _, token := range req.Tokens {
		if len(token) >= 2 { // Minimum 2 chars to avoid noise in pattern matching
			// Create wildcard pattern for substring matching
			pattern := "%" + token + "%"
			// Search across title, description, tags, and original_file_name columns
			patternQuery = patternQuery.Where(
				"title ILIKE ? OR description ILIKE ? OR tags ILIKE ? OR original_file_name ILIKE ?",
				pattern, pattern, pattern, pattern,
			)
			hasValidTokens = true
		}
	}

	if !hasValidTokens { // No valid tokens means nothing to search
		return &SearchResult{}, nil
	}

	var total int64
	if err := patternQuery.Count(&total).Error; err != nil || total == 0 {
		return &SearchResult{}, nil
	}

	var docs []models.Document
	selectParts := []string{"*"}
	scoreParts := []string{}

	for _, token := range req.Tokens {
		if len(token) >= 2 {
			// Escape single quotes for SQL injection prevention
			escapedToken := strings.ReplaceAll(token, "'", "''")
			// Create weighted scoring: title=2pts, description=1pt, tags=1pt, filename=1pt
			scoreParts = append(scoreParts, fmt.Sprintf(
				"(CASE WHEN title ILIKE '%%%s%%' THEN 2 ELSE 0 END) + "+
					"(CASE WHEN description ILIKE '%%%s%%' THEN 1 ELSE 0 END) + "+
					"(CASE WHEN tags ILIKE '%%%s%%' THEN 1 ELSE 0 END) + "+
					"(CASE WHEN original_file_name ILIKE '%%%s%%' THEN 1 ELSE 0 END)",
				escapedToken, escapedToken, escapedToken, escapedToken,
			))
		}
	}

	// Combine all scoring parts or provide default score
	if len(scoreParts) > 0 {
		selectParts = append(selectParts, "("+strings.Join(scoreParts, " + ")+") as search_score")
	} else {
		selectParts = append(selectParts, "1 as search_score") // Fallback score
	}

	err := patternQuery.
		Select(strings.Join(selectParts, ", ")).
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
