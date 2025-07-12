package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/models/search"
	"github.com/eyuppastirmaci/noesis-forge/internal/repositories/interfaces"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type documentRepository struct {
	db *gorm.DB
}

func NewDocumentRepository(db *gorm.DB) interfaces.DocumentRepository {
	return &documentRepository{db: db}
}

func (r *documentRepository) Create(ctx context.Context, document *models.Document) error {
	return r.db.WithContext(ctx).Create(document).Error
}

func (r *documentRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Document, error) {
	var document models.Document
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&document).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("document not found")
		}
		return nil, fmt.Errorf("failed to fetch document: %w", err)
	}
	return &document, nil
}

func (r *documentRepository) GetByIDAndUserID(ctx context.Context, id, userID uuid.UUID) (*models.Document, error) {
	var document models.Document
	if err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&document).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("document not found")
		}
		return nil, fmt.Errorf("failed to fetch document: %w", err)
	}
	return &document, nil
}

func (r *documentRepository) Update(ctx context.Context, document *models.Document) error {
	return r.db.WithContext(ctx).Save(document).Error
}

func (r *documentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Document{}, id).Error
}

func (r *documentRepository) IncrementViewCount(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&models.Document{}).
		Where("id = ?", id).
		UpdateColumn("view_count", gorm.Expr("view_count + 1")).Error
}

func (r *documentRepository) IncrementDownloadCount(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&models.Document{}).
		Where("id = ?", id).
		UpdateColumn("download_count", gorm.Expr("download_count + 1")).Error
}

func (r *documentRepository) GetUserStats(ctx context.Context, userID uuid.UUID) (*search.UserStatsResponse, error) {
	var stats search.UserStatsResponse
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Nanosecond)

	// Documents this month
	err := r.db.WithContext(ctx).Model(&models.Document{}).
		Where("user_id = ? AND created_at BETWEEN ? AND ?", userID, startOfMonth, endOfMonth).
		Count(&stats.DocumentsThisMonth).Error
	if err != nil {
		return nil, fmt.Errorf("failed to count documents: %w", err)
	}

	// Total storage usage
	err = r.db.WithContext(ctx).Model(&models.Document{}).
		Where("user_id = ?", userID).
		Select("COALESCE(SUM(file_size), 0)").
		Row().Scan(&stats.TotalStorageUsage)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate storage: %w", err)
	}

	return &stats, nil
}

func (r *documentRepository) GetRevisions(ctx context.Context, documentID uuid.UUID) ([]models.DocumentRevision, error) {
	var revisions []models.DocumentRevision
	if err := r.db.WithContext(ctx).Where("document_id = ?", documentID).
		Order("version DESC").Find(&revisions).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch revisions: %w", err)
	}
	return revisions, nil
}
