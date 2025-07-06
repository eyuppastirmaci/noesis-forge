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
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

// UserShareService handles user-based document sharing
type UserShareService struct {
	db    *gorm.DB
	redis *redis.Client
}

func NewUserShareService(db *gorm.DB, redisClient *redis.Client) *UserShareService {
	return &UserShareService{db: db, redis: redisClient}
}

// CreateUserShare creates a new user-based share for a document
func (s *UserShareService) CreateUserShare(ctx context.Context, ownerID, documentID uuid.UUID, email string, accessLevel models.AccessLevel, expiresInDays int, message string) (*models.UserShare, error) {
	// Check if the document exists and belongs to the owner
	var document models.Document
	if err := s.db.WithContext(ctx).Where("id = ? AND user_id = ?", documentID, ownerID).First(&document).Error; err != nil {
		return nil, fmt.Errorf("document not found or not owned by user")
	}

	// Check if user exists by email
	var sharedWithUser models.User
	var sharedWithUserID *uuid.UUID
	if err := s.db.WithContext(ctx).Where("email = ?", email).First(&sharedWithUser).Error; err == nil {
		sharedWithUserID = &sharedWithUser.ID
	}

	// Calculate expiration time
	var expiresAt *time.Time
	if expiresInDays > 0 {
		t := time.Now().Add(time.Duration(expiresInDays) * 24 * time.Hour)
		expiresAt = &t
	}

	// Check if share already exists
	var existingShare models.UserShare
	if err := s.db.WithContext(ctx).Where("document_id = ? AND owner_id = ? AND shared_with_email = ? AND is_revoked = false", documentID, ownerID, email).First(&existingShare).Error; err == nil {
		// Update existing share
		existingShare.AccessLevel = accessLevel
		existingShare.ExpiresAt = expiresAt
		existingShare.Message = message
		existingShare.SharedWithUserID = sharedWithUserID

		if err := s.db.WithContext(ctx).Save(&existingShare).Error; err != nil {
			return nil, fmt.Errorf("failed to update existing share: %w", err)
		}

		// Create audit log
		s.createUserShareAuditLog(ctx, existingShare.ID, ownerID, "updated", "", "", fmt.Sprintf("Access level updated to %s", accessLevel))

		return &existingShare, nil
	}

	// Create new share
	userShare := &models.UserShare{
		DocumentID:       documentID,
		OwnerID:          ownerID,
		SharedWithEmail:  email,
		SharedWithUserID: sharedWithUserID,
		AccessLevel:      accessLevel,
		ExpiresAt:        expiresAt,
		Message:          message,
	}

	if err := s.db.WithContext(ctx).Create(userShare).Error; err != nil {
		return nil, fmt.Errorf("failed to create user share: %w", err)
	}

	// Create audit log
	s.createUserShareAuditLog(ctx, userShare.ID, ownerID, "created", "", "", fmt.Sprintf("Shared with %s with %s access", email, accessLevel))

	// If user doesn't exist, create invitation
	if sharedWithUserID == nil {
		if err := s.createShareInvitation(ctx, ownerID, documentID, email, accessLevel, expiresAt, message); err != nil {
			// Log error but don't fail the share creation
			fmt.Printf("Failed to create share invitation: %v\n", err)
		}
	} else {
		// Create notification for registered user
		if err := s.createShareNotification(ctx, "document_shared", documentID, ownerID, *sharedWithUserID, fmt.Sprintf("Document '%s' has been shared with you", document.Title), message); err != nil {
			// Log error but don't fail the share creation
			fmt.Printf("Failed to create notification: %v\n", err)
		}
	}

	return userShare, nil
}

// GetSharedWithMe returns documents shared with the specified user
func (s *UserShareService) GetSharedWithMe(ctx context.Context, userID uuid.UUID, email string) ([]models.UserShare, error) {
	var shares []models.UserShare

	query := s.db.WithContext(ctx).
		Preload("Document").
		Preload("Owner").
		Where("(shared_with_user_id = ? OR shared_with_email = ?) AND is_revoked = false", userID, email)

	if err := query.Find(&shares).Error; err != nil {
		return nil, fmt.Errorf("failed to get shared documents: %w", err)
	}

	// Filter out expired shares
	var activeShares []models.UserShare
	for _, share := range shares {
		if !share.IsExpired() {
			activeShares = append(activeShares, share)
		}
	}

	return activeShares, nil
}

// GetSharedByMe returns documents shared by the specified user
func (s *UserShareService) GetSharedByMe(ctx context.Context, ownerID uuid.UUID) ([]models.UserShare, error) {
	var shares []models.UserShare

	if err := s.db.WithContext(ctx).
		Preload("Document").
		Preload("SharedWithUser").
		Where("owner_id = ? AND is_revoked = false", ownerID).
		Find(&shares).Error; err != nil {
		return nil, fmt.Errorf("failed to get shared documents: %w", err)
	}

	return shares, nil
}

// RevokeUserShare revokes a user share
func (s *UserShareService) RevokeUserShare(ctx context.Context, ownerID, shareID uuid.UUID) error {
	result := s.db.WithContext(ctx).
		Model(&models.UserShare{}).
		Where("id = ? AND owner_id = ?", shareID, ownerID).
		Update("is_revoked", true)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("share not found or not owned by user")
	}

	// Create audit log
	s.createUserShareAuditLog(ctx, shareID, ownerID, "revoked", "", "", "Share revoked by owner")

	return nil
}

// UpdateUserShareAccess updates the access level of a user share
func (s *UserShareService) UpdateUserShareAccess(ctx context.Context, ownerID, shareID uuid.UUID, accessLevel models.AccessLevel) error {
	result := s.db.WithContext(ctx).
		Model(&models.UserShare{}).
		Where("id = ? AND owner_id = ?", shareID, ownerID).
		Update("access_level", accessLevel)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("share not found or not owned by user")
	}

	// Create audit log
	s.createUserShareAuditLog(ctx, shareID, ownerID, "updated", "", "", fmt.Sprintf("Access level updated to %s", accessLevel))

	return nil
}

// ValidateUserAccess validates if a user has access to a document
func (s *UserShareService) ValidateUserAccess(ctx context.Context, userID uuid.UUID, documentID uuid.UUID, requiredAccess models.AccessLevel) (bool, error) {
	logrus.Infof("[VALIDATE_ACCESS] Checking access for user %s to document %s, required level: %s", userID, documentID, requiredAccess)

	var share models.UserShare

	// Get user email to check both user ID and email-based shares
	var user models.User
	if err := s.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err != nil {
		logrus.Errorf("[VALIDATE_ACCESS] User not found: %v", err)
		return false, fmt.Errorf("user not found")
	}

	logrus.Infof("[VALIDATE_ACCESS] User found: %s (%s)", user.Email, userID)

	// Check if user has access either by user ID or email
	if err := s.db.WithContext(ctx).
		Where("document_id = ? AND (shared_with_user_id = ? OR shared_with_email = ?) AND is_revoked = false", documentID, userID, user.Email).
		First(&share).Error; err != nil {
		logrus.Infof("[VALIDATE_ACCESS] No share found for user %s (email: %s) to document %s: %v", userID, user.Email, documentID, err)
		return false, nil // Not found is not an error, just no access
	}

	logrus.Infof("[VALIDATE_ACCESS] Share found: ID=%s, AccessLevel=%s, IsRevoked=%v, ExpiresAt=%v", share.ID, share.AccessLevel, share.IsRevoked, share.ExpiresAt)

	// Check if expired
	if share.IsExpired() {
		logrus.Infof("[VALIDATE_ACCESS] Share is expired")
		return false, nil
	}

	// Check access level
	switch requiredAccess {
	case models.AccessLevelView:
		logrus.Infof("[VALIDATE_ACCESS] View access granted")
		return true, nil // All access levels include view
	case models.AccessLevelDownload:
		hasDownload := share.AccessLevel == models.AccessLevelDownload || share.AccessLevel == models.AccessLevelEdit
		logrus.Infof("[VALIDATE_ACCESS] Download access check: share.AccessLevel=%s, hasDownload=%v", share.AccessLevel, hasDownload)
		return hasDownload, nil
	case models.AccessLevelEdit:
		hasEdit := share.AccessLevel == models.AccessLevelEdit
		logrus.Infof("[VALIDATE_ACCESS] Edit access check: share.AccessLevel=%s, hasEdit=%v", share.AccessLevel, hasEdit)
		return hasEdit, nil
	default:
		logrus.Errorf("[VALIDATE_ACCESS] Invalid access level: %s", requiredAccess)
		return false, fmt.Errorf("invalid access level")
	}
}

// RecordAccess records when a user accesses a shared document
func (s *UserShareService) RecordAccess(ctx context.Context, userID uuid.UUID, documentID uuid.UUID, action string, ipAddress, userAgent string) error {
	// Get user email to check both user ID and email-based shares
	var user models.User
	if err := s.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err != nil {
		return fmt.Errorf("user not found")
	}

	// Update last accessed time
	s.db.WithContext(ctx).
		Model(&models.UserShare{}).
		Where("document_id = ? AND (shared_with_user_id = ? OR shared_with_email = ?)", documentID, userID, user.Email).
		Update("last_accessed_at", time.Now())

	// Get the share for audit log
	var share models.UserShare
	if err := s.db.WithContext(ctx).
		Where("document_id = ? AND (shared_with_user_id = ? OR shared_with_email = ?)", documentID, userID, user.Email).
		First(&share).Error; err != nil {
		return err
	}

	// Create audit log
	s.createUserShareAuditLog(ctx, share.ID, userID, action, ipAddress, userAgent, "User accessed document via share")

	return nil
}

// GetShareNotifications returns unread notifications for a user
func (s *UserShareService) GetShareNotifications(ctx context.Context, userID uuid.UUID) ([]models.ShareNotification, error) {
	var notifications []models.ShareNotification

	if err := s.db.WithContext(ctx).
		Preload("Document").
		Preload("FromUser").
		Where("to_user_id = ? AND is_read = false", userID).
		Order("created_at DESC").
		Find(&notifications).Error; err != nil {
		return nil, fmt.Errorf("failed to get notifications: %w", err)
	}

	return notifications, nil
}

// MarkNotificationAsRead marks a notification as read
func (s *UserShareService) MarkNotificationAsRead(ctx context.Context, userID, notificationID uuid.UUID) error {
	result := s.db.WithContext(ctx).
		Model(&models.ShareNotification{}).
		Where("id = ? AND to_user_id = ?", notificationID, userID).
		Update("is_read", true)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("notification not found")
	}

	return nil
}

// Helper methods

func (s *UserShareService) createShareInvitation(ctx context.Context, ownerID, documentID uuid.UUID, email string, accessLevel models.AccessLevel, expiresAt *time.Time, message string) error {
	// Generate random token
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return fmt.Errorf("failed to generate token: %w", err)
	}
	token := hex.EncodeToString(b)

	invitation := &models.ShareInvitation{
		DocumentID:  documentID,
		OwnerID:     ownerID,
		Email:       email,
		AccessLevel: accessLevel,
		Token:       token,
		ExpiresAt:   expiresAt,
		Message:     message,
	}

	return s.db.WithContext(ctx).Create(invitation).Error
}

func (s *UserShareService) createShareNotification(ctx context.Context, notificationType string, documentID, fromUserID, toUserID uuid.UUID, title, message string) error {
	notification := &models.ShareNotification{
		Type:       notificationType,
		Title:      title,
		Message:    message,
		DocumentID: documentID,
		FromUserID: fromUserID,
		ToUserID:   toUserID,
	}

	return s.db.WithContext(ctx).Create(notification).Error
}

func (s *UserShareService) createUserShareAuditLog(ctx context.Context, shareID, userID uuid.UUID, action, ipAddress, userAgent, details string) {
	log := models.UserShareAuditLog{
		UserShareID: shareID,
		UserID:      userID,
		Action:      action,
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
		Details:     details,
	}
	s.db.WithContext(ctx).Create(&log)
}

// GetUserAccessLevel returns the user's access level for a document (empty string if no access)
func (s *UserShareService) GetUserAccessLevel(ctx context.Context, userID uuid.UUID, documentID uuid.UUID) (string, error) {
	logrus.Infof("[GET_ACCESS_LEVEL] Getting access level for user %s to document %s", userID, documentID)

	var share models.UserShare

	// Get user email to check both user ID and email-based shares
	var user models.User
	if err := s.db.WithContext(ctx).Where("id = ?", userID).First(&user).Error; err != nil {
		logrus.Errorf("[GET_ACCESS_LEVEL] User not found: %v", err)
		return "", fmt.Errorf("user not found")
	}

	logrus.Infof("[GET_ACCESS_LEVEL] User found: %s (%s)", user.Email, userID)

	// Check if user has access either by user ID or email
	if err := s.db.WithContext(ctx).
		Where("document_id = ? AND (shared_with_user_id = ? OR shared_with_email = ?) AND is_revoked = false", documentID, userID, user.Email).
		First(&share).Error; err != nil {
		logrus.Infof("[GET_ACCESS_LEVEL] No share found for user %s (email: %s) to document %s: %v", userID, user.Email, documentID, err)
		return "", nil // Not found is not an error, just no access
	}

	logrus.Infof("[GET_ACCESS_LEVEL] Share found: ID=%s, AccessLevel=%s, IsRevoked=%v, ExpiresAt=%v", share.ID, share.AccessLevel, share.IsRevoked, share.ExpiresAt)

	// Check if expired
	if share.IsExpired() {
		logrus.Infof("[GET_ACCESS_LEVEL] Share is expired")
		return "", nil
	}

	// Convert access level to string
	accessLevel := string(share.AccessLevel)
	logrus.Infof("[GET_ACCESS_LEVEL] User access level: %s", accessLevel)
	return accessLevel, nil
}

// GetDB returns the database instance
func (s *UserShareService) GetDB() *gorm.DB {
	return s.db
}
