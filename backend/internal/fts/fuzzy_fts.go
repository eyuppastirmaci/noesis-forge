package fts

import (
	"context"
	"regexp"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/types"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type FuzzyFTSStrategy struct {
	db *gorm.DB
}

func NewFuzzyFTSStrategy(db *gorm.DB) types.SearchStrategy {
	return &FuzzyFTSStrategy{db}
}

func (s *FuzzyFTSStrategy) Name() string {
	return "fuzzy_fts"
}

// CanHandle determines if this strategy is appropriate for the request.
// It handles general queries that do not include advanced FTS syntax or operators.
func (s *FuzzyFTSStrategy) CanHandle(r *types.SearchRequest) bool {
	return !regexp.MustCompile(`(&|\||!|:")`).MatchString(r.Query)
}

// Search performs a fuzzy full-text search using low-threshold trigram similarity and a hybrid ranking.
func (s *FuzzyFTSStrategy) Search(
	ctx context.Context,
	req *types.SearchRequest,
	filters func(*gorm.DB) *gorm.DB,
) (*types.SearchResult, error) {
	similarityThreshold := 0.18

	// Build the base query with user scope and fuzzy similarity filtering across multiple fields.
	baseQuery := s.db.WithContext(ctx).Model(&models.Document{})
	baseQuery = filters(baseQuery)
	baseQuery = baseQuery.Where("user_id = ?", req.UserID).
		Where(`
			similarity(title, ?) > ? OR 
			similarity(description, ?) > ? OR 
			similarity(original_file_name, ?) > ?
		`, req.Query, similarityThreshold, req.Query, similarityThreshold, req.Query, similarityThreshold)

	var total int64
	if err := baseQuery.Count(&total).Error; err != nil || total == 0 {
		logrus.Warn("No documents found even with a very low similarity threshold.")
		return &types.SearchResult{}, nil
	}

	// Apply ranking, highlighting, and ordering to the fuzzy-matched documents.
	dataQuery := baseQuery.
		Select(`
			documents.*,
			ts_rank_cd(search_vector, plainto_tsquery('english', ?)) * 0.6 +
			GREATEST(similarity(title, ?), similarity(description, ?)) * 0.4 AS search_score,
		`, req.Query, req.Query, req.Query, req.Query, req.Query).
		Order("search_score DESC, created_at DESC")

	var docs []models.Document
	if err := dataQuery.
		Offset((req.Page - 1) * req.Limit).
		Limit(req.Limit).
		Find(&docs).Error; err != nil {
		return nil, err
	}

	return &types.SearchResult{
		Documents:  docs,
		Total:      total,
		Page:       req.Page,
		Limit:      req.Limit,
		TotalPages: int((total + int64(req.Limit) - 1) / int64(req.Limit)),
	}, nil
}
