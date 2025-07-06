package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/redis"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ShareService handles creation & validation of shared links.
type ShareService struct {
	db    *gorm.DB
	redis *redis.Client // optional, may be nil
}

func NewShareService(db *gorm.DB, redisClient *redis.Client) *ShareService {
	return &ShareService{db: db, redis: redisClient}
}

// CreatePublicShare creates a new public share link for a document.
func (s *ShareService) CreatePublicShare(ctx context.Context, ownerID, documentID uuid.UUID, expiresInDays int, maxDownloads *int) (*models.SharedLink, error) {
	// generate random 128-bit token
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}
	token := hex.EncodeToString(b)

	var expiresAt *time.Time
	if expiresInDays > 0 {
		t := time.Now().Add(time.Duration(expiresInDays) * 24 * time.Hour)
		expiresAt = &t
	}

	link := &models.SharedLink{
		DocumentID:   documentID,
		OwnerID:      ownerID,
		Token:        token,
		ExpiresAt:    expiresAt,
		MaxDownloads: maxDownloads,
	}

	if err := s.db.WithContext(ctx).Create(link).Error; err != nil {
		return nil, err
	}

	// Audit log
	s.createAuditLog(ctx, link.ID, "created", "", "")

	return link, nil
}

// ValidateToken validates token, increments download count, returns document.
func (s *ShareService) ValidateToken(ctx context.Context, token string, clientIP, userAgent string) (*models.Document, error) {
	// brute-force protection using Redis
	if s.redis != nil {
		const maxAttempts = 20
		const window = 15 * time.Minute

		attempts, err := s.redis.IncrementShareAttempt(clientIP, window)
		if err != nil {
			// Log error but continue - don't fail if Redis is down
			fmt.Printf("Redis error in share validation: %v\n", err)
		} else if attempts > maxAttempts {
			return nil, fmt.Errorf("too many share access attempts from your IP")
		}
	}

	var link models.SharedLink
	if err := s.db.Preload("Document").Where("token = ? AND is_revoked = false", token).First(&link).Error; err != nil {
		return nil, fmt.Errorf("invalid or expired link")
	}

	// expiry check
	if link.ExpiresAt != nil && link.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("link expired")
	}

	// download limit check
	if link.MaxDownloads != nil && link.DownloadCount >= *link.MaxDownloads {
		return nil, fmt.Errorf("download limit reached")
	}

	// increment counter atomically
	s.db.Model(&link).UpdateColumn("download_count", gorm.Expr("download_count + 1"))

	// audit log
	s.createAuditLog(ctx, link.ID, "downloaded", clientIP, userAgent)

	return link.Document, nil
}

// GetDocumentShares returns all active shares for a document owned by the user
func (s *ShareService) GetDocumentShares(ctx context.Context, ownerID, documentID uuid.UUID) ([]models.SharedLink, error) {
	var shares []models.SharedLink
	err := s.db.WithContext(ctx).
		Where("document_id = ? AND owner_id = ? AND is_revoked = false", documentID, ownerID).
		Find(&shares).Error

	return shares, err
}

// RevokeShare revokes a share link by setting is_revoked to true
func (s *ShareService) RevokeShare(ctx context.Context, ownerID, shareID uuid.UUID) error {
	result := s.db.WithContext(ctx).
		Model(&models.SharedLink{}).
		Where("id = ? AND owner_id = ?", shareID, ownerID).
		Update("is_revoked", true)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("share not found or not owned by user")
	}

	// Audit log
	s.createAuditLog(ctx, shareID, "revoked", "", "")

	return nil
}

func (s *ShareService) createAuditLog(ctx context.Context, linkID uuid.UUID, action, ip, ua string) {
	log := models.ShareAuditLog{
		SharedLinkID: linkID,
		Action:       action,
		IPAddress:    ip,
		UserAgent:    ua,
	}
	s.db.WithContext(ctx).Create(&log)
}
