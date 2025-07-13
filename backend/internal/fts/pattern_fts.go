package fts

import (
	"context"
	"fmt"
	"strings"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/types"
	"gorm.io/gorm"
)

type PatternStrategy struct {
	db *gorm.DB
}

func NewPatternStrategy(db *gorm.DB) types.SearchStrategy {
	return &PatternStrategy{db: db}
}

func (s *PatternStrategy) Name() string {
	return "pattern"
}

func (s *PatternStrategy) CanHandle(req *types.SearchRequest) bool {
	return len(req.Tokens) > 0
}

func (s *PatternStrategy) Search(ctx context.Context, req *types.SearchRequest, filters func(*gorm.DB) *gorm.DB) (*types.SearchResult, error) {
	baseQuery := s.db.WithContext(ctx).Model(&models.Document{}).Where("user_id = ?", req.UserID)
	baseQuery = filters(baseQuery)

	// Phrase match support
	if strings.HasPrefix(req.Query, `"`) && strings.HasSuffix(req.Query, `"`) && len(req.Query) > 2 {
		phrase := strings.Trim(req.Query, `"`)
		pattern := "%" + phrase + "%"
		baseQuery = baseQuery.Where(`
			title ILIKE ? OR description ILIKE ? OR tags ILIKE ? OR original_file_name ILIKE ?
		`, pattern, pattern, pattern, pattern)
	} else {
		// Build OR-based pattern query
		orQuery := s.db
		valid := false
		for _, token := range req.Tokens {
			if len(token) < 2 {
				continue
			}
			pattern := "%" + token + "%"
			orQuery = orQuery.Or(
				s.db.Where("title ILIKE ?", pattern).
					Or("description ILIKE ?", pattern).
					Or("tags ILIKE ?", pattern).
					Or("original_file_name ILIKE ?", pattern),
			)
			valid = true
		}
		if !valid {
			return &types.SearchResult{}, nil
		}
		baseQuery = baseQuery.Where(orQuery)
	}

	var total int64
	if err := baseQuery.Count(&total).Error; err != nil || total == 0 {
		return &types.SearchResult{}, nil
	}

	var docs []models.Document

	// Scoring logic
	scoreParts := []string{}
	for _, token := range req.Tokens {
		if len(token) >= 2 {
			escaped := strings.ReplaceAll(token, "'", "''")
			scoreParts = append(scoreParts, fmt.Sprintf(`
				(CASE WHEN title ILIKE '%%%s%%' THEN 3 ELSE 0 END) +
				(CASE WHEN description ILIKE '%%%s%%' THEN 2 ELSE 0 END) +
				(CASE WHEN tags ILIKE '%%%s%%' THEN 4 ELSE 0 END) +
				(CASE WHEN original_file_name ILIKE '%%%s%%' THEN 1 ELSE 0 END)
			`, escaped, escaped, escaped, escaped))
		}
	}

	selectParts := []string{"*"}
	if len(scoreParts) > 0 {
		selectParts = append(selectParts, fmt.Sprintf("(%s) AS search_score", strings.Join(scoreParts, " + ")))
	} else {
		selectParts = append(selectParts, "1 AS search_score")
	}

	err := baseQuery.
		Select(strings.Join(selectParts, ", ")).
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
