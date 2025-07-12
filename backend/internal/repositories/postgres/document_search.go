package postgres

import (
	"context"
	"fmt"
	"strings"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/types"
	"gorm.io/gorm"
)

type documentSearchRepository struct {
	db *gorm.DB
}

func NewDocumentSearchRepository(db *gorm.DB) *documentSearchRepository {
	return &documentSearchRepository{db: db}
}

func (r *documentSearchRepository) SearchDocuments(ctx context.Context, req *types.SearchRequest) (*types.SearchResult, error) {
	// Build base query
	baseQuery := r.db.WithContext(ctx).Model(&models.Document{}).Where("user_id = ?", req.UserID)

	// Apply filters
	query := r.applyFilters(baseQuery, req)

	// Count total results
	var total int64
	if err := query.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count search results: %w", err)
	}

	if total == 0 {
		return &types.SearchResult{}, nil
	}

	// Build order by clause
	orderBy := r.buildOrderBy(req)

	// Execute search with pagination
	var documents []models.Document
	if err := query.
		Order(orderBy).
		Offset((req.Page - 1) * req.Limit).
		Limit(req.Limit).
		Find(&documents).Error; err != nil {
		return nil, fmt.Errorf("failed to execute search: %w", err)
	}

	totalPages := int((total + int64(req.Limit) - 1) / int64(req.Limit))

	return &types.SearchResult{
		Documents:  documents,
		Total:      total,
		Page:       req.Page,
		Limit:      req.Limit,
		TotalPages: totalPages,
	}, nil
}

func (r *documentSearchRepository) CountSearchResults(ctx context.Context, req *types.SearchRequest) (int64, error) {
	baseQuery := r.db.WithContext(ctx).Model(&models.Document{}).Where("user_id = ?", req.UserID)
	query := r.applyFilters(baseQuery, req)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return 0, fmt.Errorf("failed to count search results: %w", err)
	}

	return total, nil
}

func (r *documentSearchRepository) applyFilters(q *gorm.DB, req *types.SearchRequest) *gorm.DB {
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

func (r *documentSearchRepository) buildOrderBy(req *types.SearchRequest) string {
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
