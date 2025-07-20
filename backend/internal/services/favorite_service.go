package services

import (
	"context"
	"fmt"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/types"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type FavoriteService struct {
	db *gorm.DB
}

type FavoriteResponse struct {
	ID         uuid.UUID `json:"id"`
	UserID     uuid.UUID `json:"userID"`
	DocumentID uuid.UUID `json:"documentID"`
	CreatedAt  string    `json:"createdAt"`
}

type FavoriteDocumentResponse struct {
	*types.DocumentResponse
	IsFavorited   bool   `json:"isFavorited"`
	FavoritedAt   string `json:"favoritedAt,omitempty"`
	FavoriteCount int64  `json:"favoriteCount"`
}

func NewFavoriteService(db *gorm.DB) *FavoriteService {
	return &FavoriteService{db: db}
}

// Adds a document to user's favorites
func (s *FavoriteService) AddToFavorites(ctx context.Context, userID, documentID uuid.UUID) (*FavoriteResponse, error) {
	// Check if document exists and user has access
	var document models.Document
	if err := s.db.Where("id = ? AND user_id = ?", documentID, userID).First(&document).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("document not found or access denied")
		}
		return nil, fmt.Errorf("failed to fetch document: %w", err)
	}

	// Check if already favorited
	var existingFavorite models.Favorite
	if err := s.db.Where("user_id = ? AND document_id = ?", userID, documentID).First(&existingFavorite).Error; err == nil {
		return nil, fmt.Errorf("document is already in favorites")
	}

	// Create favorite
	favorite := &models.Favorite{
		UserID:     userID,
		DocumentID: documentID,
	}

	if err := s.db.Create(favorite).Error; err != nil {
		return nil, fmt.Errorf("failed to add document to favorites: %w", err)
	}

	logrus.Infof("Document %s added to favorites by user %s", documentID, userID)

	return &FavoriteResponse{
		ID:         favorite.ID,
		UserID:     favorite.UserID,
		DocumentID: favorite.DocumentID,
		CreatedAt:  favorite.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}, nil
}

// Removes a document from user's favorites
func (s *FavoriteService) RemoveFromFavorites(ctx context.Context, userID, documentID uuid.UUID) error {
	result := s.db.Where("user_id = ? AND document_id = ?", userID, documentID).Delete(&models.Favorite{})
	if result.Error != nil {
		return fmt.Errorf("failed to remove document from favorites: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("document not found in favorites")
	}

	logrus.Infof("Document %s removed from favorites by user %s", documentID, userID)
	return nil
}

// Gets all favorite documents for a user
func (s *FavoriteService) GetUserFavorites(ctx context.Context, userID uuid.UUID, page, limit int) (*types.DocumentListResponse, error) {
	offset := (page - 1) * limit

	// Count total favorites
	var total int64
	if err := s.db.Model(&models.Favorite{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count favorites: %w", err)
	}

	// Get favorite documents with pagination
	var favorites []models.Favorite
	query := s.db.Preload("Document").Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit)

	if err := query.Find(&favorites).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch favorite documents: %w", err)
	}

	// Convert to response
	documents := make([]types.DocumentResponse, len(favorites))
	for i, favorite := range favorites {
		documents[i] = types.DocumentResponse{
			ID:               favorite.Document.ID,
			Title:            favorite.Document.Title,
			Description:      favorite.Document.Description,
			FileName:         favorite.Document.FileName,
			OriginalFileName: favorite.Document.OriginalFileName,
			FileSize:         favorite.Document.FileSize,
			FileType:         favorite.Document.FileType,
			MimeType:         favorite.Document.MimeType,
			Status:           favorite.Document.Status,
			Version:          favorite.Document.Version,
			Tags:             favorite.Document.Tags,
			IsPublic:         favorite.Document.IsPublic,
			ViewCount:        favorite.Document.ViewCount,
			DownloadCount:    favorite.Document.DownloadCount,
			UserID:           favorite.Document.UserID,
			ProcessedAt:      favorite.Document.ProcessedAt,
			CreatedAt:        favorite.Document.CreatedAt,
			UpdatedAt:        favorite.Document.UpdatedAt,
			HasThumbnail:     favorite.Document.HasThumbnail,
			StoragePath:      favorite.Document.StoragePath,
		}
	}

	totalPages := int((total + int64(limit) - 1) / int64(limit))

	return &types.DocumentListResponse{
		Documents:  documents,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}, nil
}

// Checks if a document is favorited by user
func (s *FavoriteService) IsFavorited(ctx context.Context, userID, documentID uuid.UUID) (bool, error) {
	var favorite models.Favorite
	err := s.db.Where("user_id = ? AND document_id = ?", userID, documentID).First(&favorite).Error
	if err == gorm.ErrRecordNotFound {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to check if document is favorited: %w", err)
	}
	return true, nil
}

// Gets the total number of times a document has been favorited
func (s *FavoriteService) GetFavoriteCount(ctx context.Context, documentID uuid.UUID) (int64, error) {
	var count int64
	if err := s.db.Model(&models.Favorite{}).Where("document_id = ?", documentID).Count(&count).Error; err != nil {
		return 0, fmt.Errorf("failed to get favorite count: %w", err)
	}
	return count, nil
}
