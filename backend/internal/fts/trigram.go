package fts

import (
	"context"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"gorm.io/gorm"
)

type TrigramStrategy struct {
	db *gorm.DB
}

func NewTrigramStrategy(db *gorm.DB) SearchStrategy {
	return &TrigramStrategy{db: db}
}

func (s *TrigramStrategy) Name() string {
	return "trigram"
}

// CanHandle decides if this strategy applies to the current request
func (s *TrigramStrategy) CanHandle(req *SearchRequest) bool {
	return len(req.Query) >= 3 // Minimum 3 chars required for meaningful trigram analysis
}

// Search executes PostgreSQL trigram similarity matching and returns scored results
func (s *TrigramStrategy) Search(ctx context.Context, req *SearchRequest, filters func(*gorm.DB) *gorm.DB) (*SearchResult, error) {
	// Build base query scoped to the user and any extra filters
	baseQuery := s.db.WithContext(ctx).Model(&models.Document{}).Where("user_id = ?", req.UserID)
	baseQuery = filters(baseQuery) // Apply external filters

	// Use PostgreSQL trigram % operator for fuzzy similarity matching
	// % operator finds strings that are similar based on trigram decomposition
	trigramQuery := baseQuery.Session(&gorm.Session{}).Where(
		"title % ? OR description % ? OR original_file_name % ?",
		req.Query, req.Query, req.Query,
	)

	// Count matches using trigram similarity
	var total int64
	if err := trigramQuery.Count(&total).Error; err != nil {
		return &SearchResult{}, nil
	}

	if total == 0 {
		// Fallback: Manual similarity check with lower threshold
		// When % operator returns no results, try explicit similarity() function
		manualQuery := baseQuery.Session(&gorm.Session{}).Where(
			"similarity(title, ?) > 0.1 OR similarity(description, ?) > 0.1 OR similarity(original_file_name, ?) > 0.1",
			req.Query, req.Query, req.Query,
		)

		// Re-count with manual similarity threshold (0.1 = 10% similarity)
		if err := manualQuery.Count(&total).Error; err != nil || total == 0 {
			return &SearchResult{}, nil // No similar results found even with low threshold
		}

		trigramQuery = manualQuery // Switch to manual query for results
	}

	// Retrieve documents with similarity scoring
	var docs []models.Document
	err := trigramQuery.
		// Calculate similarity score using GREATEST to pick highest similarity across columns
		Select("*, GREATEST(similarity(title, ?), similarity(description, ?), similarity(original_file_name, ?)) as search_score",
								req.Query, req.Query, req.Query).
		Order("search_score DESC, created_at DESC"). // Order by similarity score first, then recency
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
