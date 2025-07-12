package postgres

import (
	"context"
	"strings"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/models/search"
	"github.com/eyuppastirmaci/noesis-forge/internal/repositories/interfaces"
	"gorm.io/gorm"
)

type documentSearchRepository struct {
	db *gorm.DB
}

func NewDocumentSearchRepository(db *gorm.DB) interfaces.DocumentSearchRepository {
	return &documentSearchRepository{db: db}
}

func (r *documentSearchRepository) SearchDocuments(ctx context.Context, req *search.SearchRequest) (*search.SearchResult, error) {
	baseQuery := r.db.WithContext(ctx).Model(&models.Document{}).Where("user_id = ?", req.UserID)
	baseQuery = r.applyFilters(baseQuery, req)

	// Calculate total
	var total int64
	if err := baseQuery.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, err
	}

	// Apply pagination and sorting
	query := baseQuery.Offset((req.Page - 1) * req.Limit).Limit(req.Limit)

	// Apply sorting
	orderBy := r.buildOrderBy(req)
	query = query.Order(orderBy)

	var documents []models.Document
	if err := query.Find(&documents).Error; err != nil {
		return nil, err
	}

	totalPages := int((total + int64(req.Limit) - 1) / int64(req.Limit))

	return &search.SearchResult{
		Documents:  documents,
		Total:      total,
		Page:       req.Page,
		Limit:      req.Limit,
		TotalPages: totalPages,
	}, nil
}

func (r *documentSearchRepository) CountSearchResults(ctx context.Context, req *search.SearchRequest) (int64, error) {
	baseQuery := r.db.WithContext(ctx).Model(&models.Document{}).Where("user_id = ?", req.UserID)
	baseQuery = r.applyFilters(baseQuery, req)

	var total int64
	return total, baseQuery.Count(&total).Error
}

func (r *documentSearchRepository) applyFilters(q *gorm.DB, req *search.SearchRequest) *gorm.DB {
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

func (r *documentSearchRepository) buildOrderBy(req *search.SearchRequest) string {
	sortableCols := map[string]string{
		"date":      "created_at",
		"title":     "LOWER(title)",
		"size":      "file_size",
		"views":     "view_count",
		"downloads": "download_count",
		"relevance": "search_score",
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
