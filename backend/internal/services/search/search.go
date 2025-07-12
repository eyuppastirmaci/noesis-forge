package search

import (
	"context"
	"strings"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/models/search"
	"github.com/eyuppastirmaci/noesis-forge/internal/services/search/strategies"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SearchService struct {
	db         *gorm.DB
	strategies []search.SearchStrategy
}

func NewSearchService(db *gorm.DB) *SearchService {
	strategies := []search.SearchStrategy{
		strategies.NewExactFTSStrategy(db),
		strategies.NewFuzzyFTSStrategy(db),
		strategies.NewTrigramStrategy(db),
		strategies.NewPatternStrategy(db),
	}

	return &SearchService{
		db:         db,
		strategies: strategies,
	}
}

func (s *SearchService) SearchDocuments(ctx context.Context, req *search.DocumentListRequest, userID uuid.UUID) (*search.SearchResult, error) {
	// Preprocess search query
	cleanSearch, tokens := utils.PreprocessQuery(req.Search)
	useSearch := cleanSearch != ""

	searchReq := &search.SearchRequest{
		UserID:   userID,
		Query:    cleanSearch,
		Tokens:   tokens,
		Page:     req.Page,
		Limit:    req.Limit,
		FileType: req.FileType,
		Status:   req.Status,
		Tags:     req.Tags,
		SortBy:   req.SortBy,
		SortDir:  req.SortDir,
	}

	// Auto-adjust sorting when no search query
	if !useSearch && searchReq.SortBy == "relevance" {
		searchReq.SortBy = "date"
		searchReq.SortDir = "desc"
	}

	// Apply filters function
	addFilters := func(q *gorm.DB) *gorm.DB {
		return s.applyFilters(q, searchReq)
	}

	if useSearch {
		// Try search strategies in order
		for _, strategy := range s.strategies {
			if strategy.CanHandle(searchReq) {
				result, err := strategy.Search(ctx, searchReq, addFilters)
				if err == nil && result.Total > 0 {
					return result, nil
				}
			}
		}
		// No search results found
		return &search.SearchResult{}, nil
	}

	// Normal listing (no search) - use basic repository
	baseQuery := s.db.WithContext(ctx).Model(&models.Document{}).Where("user_id = ?", userID)
	query := addFilters(baseQuery)

	var total int64
	if err := query.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, err
	}

	orderBy := s.buildOrderBy(searchReq)
	var docs []models.Document
	if err := query.Order(orderBy).
		Offset((searchReq.Page - 1) * searchReq.Limit).
		Limit(searchReq.Limit).
		Find(&docs).Error; err != nil {
		return nil, err
	}

	totalPages := int((total + int64(searchReq.Limit) - 1) / int64(searchReq.Limit))

	return &search.SearchResult{
		Documents:  docs,
		Total:      total,
		Page:       searchReq.Page,
		Limit:      searchReq.Limit,
		TotalPages: totalPages,
	}, nil
}

func (s *SearchService) applyFilters(q *gorm.DB, req *search.SearchRequest) *gorm.DB {
	if req.FileType != "" && req.FileType != "all" {
		q = q.Where("file_type = ?", req.FileType)
	}
	if req.Status != "" && req.Status != "all" {
		q = q.Where("status = ?", req.Status)
	}
	if req.Tags != "" {
		tags := strings.Split(req.Tags, ",")
		for _, tag := range tags {
			trimmedTag := strings.TrimSpace(tag)
			if trimmedTag != "" {
				q = q.Where("tags ILIKE ?", "%"+trimmedTag+"%")
			}
		}
	}
	return q
}

func (s *SearchService) buildOrderBy(req *search.SearchRequest) string {
	sortableCols := map[string]string{
		"date":      "created_at",
		"title":     "LOWER(title)",
		"size":      "file_size",
		"views":     "view_count",
		"downloads": "download_count",
	}

	col, ok := sortableCols[req.SortBy]
	if !ok {
		col = "created_at"
	}

	dir := "DESC"
	if strings.ToLower(req.SortDir) == "asc" {
		dir = "ASC"
	}

	return col + " " + dir
}
