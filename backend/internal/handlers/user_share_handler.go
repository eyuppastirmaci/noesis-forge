package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserShareHandler struct {
	userShareService *services.UserShareService
}

func NewUserShareHandler(userShareService *services.UserShareService) *UserShareHandler {
	return &UserShareHandler{userShareService: userShareService}
}

// CreateUserShare handles POST /documents/:id/share/users
func (h *UserShareHandler) CreateUserShare(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	documentIDParam := c.Param("id")
	docID, err := uuid.Parse(documentIDParam)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "invalid document id")
		return
	}

	var body struct {
		Emails        []string           `json:"emails" binding:"required"`
		AccessLevel   models.AccessLevel `json:"accessLevel" binding:"required"`
		ExpiresInDays int                `json:"expiresInDays"`
		Message       string             `json:"message"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_BODY", err.Error())
		return
	}

	// Validate access level
	if body.AccessLevel != models.AccessLevelView &&
		body.AccessLevel != models.AccessLevelDownload &&
		body.AccessLevel != models.AccessLevelEdit {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_ACCESS_LEVEL", "access level must be 'view', 'download', or 'edit'")
		return
	}

	var createdShares []models.UserShare
	var errors []string

	// Create shares for each email
	for _, email := range body.Emails {
		share, err := h.userShareService.CreateUserShare(
			c.Request.Context(),
			userID,
			docID,
			email,
			body.AccessLevel,
			body.ExpiresInDays,
			body.Message,
		)
		if err != nil {
			errors = append(errors, "Failed to share with "+email+": "+err.Error())
		} else {
			createdShares = append(createdShares, *share)
		}
	}

	// Return response
	if len(errors) > 0 && len(createdShares) == 0 {
		utils.ErrorResponse(c, http.StatusInternalServerError, "SHARE_FAILED", "Failed to create any shares")
		return
	}

	response := gin.H{
		"shares": createdShares,
	}
	if len(errors) > 0 {
		response["errors"] = errors
	}

	utils.SuccessResponse(c, http.StatusCreated, response, "User shares created")
}

// GetSharedWithMe handles GET /shares/with-me
func (h *UserShareHandler) GetSharedWithMe(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get user email from context or database
	var user models.User
	if err := h.userShareService.GetDB().Where("id = ?", userID).First(&user).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "USER_NOT_FOUND", "user not found")
		return
	}

	shares, err := h.userShareService.GetSharedWithMe(c.Request.Context(), userID, user.Email)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	// Transform the data to match frontend interface
	type SharedWithMeResponse struct {
		ID       string `json:"id"`
		Document struct {
			ID            string `json:"id"`
			Title         string `json:"title"`
			FileType      string `json:"fileType"`
			FileSize      int64  `json:"fileSize"`
			CreatedAt     string `json:"createdAt"`
			Status        string `json:"status"`
			Version       int    `json:"version"`
			ViewCount     int    `json:"viewCount"`
			DownloadCount int    `json:"downloadCount"`
			HasThumbnail  bool   `json:"hasThumbnail"`
		} `json:"document"`
		SharedBy struct {
			ID     string  `json:"id"`
			Name   string  `json:"name"`
			Email  string  `json:"email"`
			Avatar *string `json:"avatar"`
		} `json:"sharedBy"`
		Share struct {
			ID             string  `json:"id"`
			AccessLevel    string  `json:"accessLevel"`
			SharedAt       string  `json:"sharedAt"`
			ExpiresAt      *string `json:"expiresAt"`
			IsRevoked      bool    `json:"isRevoked"`
			AcceptedAt     *string `json:"acceptedAt"`
			LastAccessedAt *string `json:"lastAccessedAt"`
		} `json:"share"`
	}

	var response []SharedWithMeResponse
	for _, share := range shares {
		item := SharedWithMeResponse{
			ID: share.ID.String(),
			Document: struct {
				ID            string `json:"id"`
				Title         string `json:"title"`
				FileType      string `json:"fileType"`
				FileSize      int64  `json:"fileSize"`
				CreatedAt     string `json:"createdAt"`
				Status        string `json:"status"`
				Version       int    `json:"version"`
				ViewCount     int    `json:"viewCount"`
				DownloadCount int    `json:"downloadCount"`
				HasThumbnail  bool   `json:"hasThumbnail"`
			}{
				ID:            share.Document.ID.String(),
				Title:         share.Document.Title,
				FileType:      string(share.Document.FileType),
				FileSize:      share.Document.FileSize,
				CreatedAt:     share.Document.CreatedAt.Format(time.RFC3339),
				Status:        string(share.Document.Status),
				Version:       share.Document.Version,
				ViewCount:     int(share.Document.ViewCount),
				DownloadCount: int(share.Document.DownloadCount),
				HasThumbnail:  share.Document.HasThumbnail,
			},
			SharedBy: struct {
				ID     string  `json:"id"`
				Name   string  `json:"name"`
				Email  string  `json:"email"`
				Avatar *string `json:"avatar"`
			}{
				ID:     share.Owner.ID.String(),
				Name:   share.Owner.Name,
				Email:  share.Owner.Email,
				Avatar: &share.Owner.Avatar,
			},
			Share: struct {
				ID             string  `json:"id"`
				AccessLevel    string  `json:"accessLevel"`
				SharedAt       string  `json:"sharedAt"`
				ExpiresAt      *string `json:"expiresAt"`
				IsRevoked      bool    `json:"isRevoked"`
				AcceptedAt     *string `json:"acceptedAt"`
				LastAccessedAt *string `json:"lastAccessedAt"`
			}{
				ID:             share.ID.String(),
				AccessLevel:    string(share.AccessLevel),
				SharedAt:       share.CreatedAt.Format(time.RFC3339),
				ExpiresAt:      nil,
				IsRevoked:      share.IsRevoked,
				AcceptedAt:     nil,
				LastAccessedAt: nil,
			},
		}

		// Handle optional fields
		if share.ExpiresAt != nil {
			expiresAt := share.ExpiresAt.Format(time.RFC3339)
			item.Share.ExpiresAt = &expiresAt
		}
		if share.AcceptedAt != nil {
			acceptedAt := share.AcceptedAt.Format(time.RFC3339)
			item.Share.AcceptedAt = &acceptedAt
		}
		if share.LastAccessedAt != nil {
			lastAccessedAt := share.LastAccessedAt.Format(time.RFC3339)
			item.Share.LastAccessedAt = &lastAccessedAt
		}

		response = append(response, item)
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"shares": response}, "Shared documents retrieved")
}

// GetSharedByMe handles GET /shares/by-me
func (h *UserShareHandler) GetSharedByMe(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	shares, err := h.userShareService.GetSharedByMe(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	// Group shares by document
	documentShares := make(map[string][]models.UserShare)
	for _, share := range shares {
		docID := share.Document.ID.String()
		documentShares[docID] = append(documentShares[docID], share)
	}

	// Transform the data to match frontend interface
	type SharedByMeResponse struct {
		ID       string `json:"id"`
		Document struct {
			ID            string `json:"id"`
			Title         string `json:"title"`
			FileType      string `json:"fileType"`
			FileSize      int64  `json:"fileSize"`
			CreatedAt     string `json:"createdAt"`
			Status        string `json:"status"`
			Version       int    `json:"version"`
			ViewCount     int    `json:"viewCount"`
			DownloadCount int    `json:"downloadCount"`
			HasThumbnail  bool   `json:"hasThumbnail"`
		} `json:"document"`
		Shares []struct {
			ID         string `json:"id"`
			SharedWith struct {
				ID     *string `json:"id"`
				Name   *string `json:"name"`
				Email  string  `json:"email"`
				Avatar *string `json:"avatar"`
			} `json:"sharedWith"`
			AccessLevel    string  `json:"accessLevel"`
			SharedAt       string  `json:"sharedAt"`
			ExpiresAt      *string `json:"expiresAt"`
			IsRevoked      bool    `json:"isRevoked"`
			AcceptedAt     *string `json:"acceptedAt"`
			LastAccessedAt *string `json:"lastAccessedAt"`
		} `json:"shares"`
		TotalShares  int `json:"totalShares"`
		ActiveShares int `json:"activeShares"`
	}

	var response []SharedByMeResponse
	for docID, docShares := range documentShares {
		if len(docShares) == 0 {
			continue
		}

		firstShare := docShares[0]
		item := SharedByMeResponse{
			ID: docID,
			Document: struct {
				ID            string `json:"id"`
				Title         string `json:"title"`
				FileType      string `json:"fileType"`
				FileSize      int64  `json:"fileSize"`
				CreatedAt     string `json:"createdAt"`
				Status        string `json:"status"`
				Version       int    `json:"version"`
				ViewCount     int    `json:"viewCount"`
				DownloadCount int    `json:"downloadCount"`
				HasThumbnail  bool   `json:"hasThumbnail"`
			}{
				ID:            firstShare.Document.ID.String(),
				Title:         firstShare.Document.Title,
				FileType:      string(firstShare.Document.FileType),
				FileSize:      firstShare.Document.FileSize,
				CreatedAt:     firstShare.Document.CreatedAt.Format(time.RFC3339),
				Status:        string(firstShare.Document.Status),
				Version:       firstShare.Document.Version,
				ViewCount:     int(firstShare.Document.ViewCount),
				DownloadCount: int(firstShare.Document.DownloadCount),
				HasThumbnail:  firstShare.Document.HasThumbnail,
			},
			TotalShares:  len(docShares),
			ActiveShares: 0,
		}

		// Add individual shares
		for _, share := range docShares {
			if !share.IsRevoked {
				item.ActiveShares++
			}

			shareItem := struct {
				ID         string `json:"id"`
				SharedWith struct {
					ID     *string `json:"id"`
					Name   *string `json:"name"`
					Email  string  `json:"email"`
					Avatar *string `json:"avatar"`
				} `json:"sharedWith"`
				AccessLevel    string  `json:"accessLevel"`
				SharedAt       string  `json:"sharedAt"`
				ExpiresAt      *string `json:"expiresAt"`
				IsRevoked      bool    `json:"isRevoked"`
				AcceptedAt     *string `json:"acceptedAt"`
				LastAccessedAt *string `json:"lastAccessedAt"`
			}{
				ID: share.ID.String(),
				SharedWith: struct {
					ID     *string `json:"id"`
					Name   *string `json:"name"`
					Email  string  `json:"email"`
					Avatar *string `json:"avatar"`
				}{
					ID:     nil,
					Name:   nil,
					Email:  share.SharedWithEmail,
					Avatar: nil,
				},
				AccessLevel:    string(share.AccessLevel),
				SharedAt:       share.CreatedAt.Format(time.RFC3339),
				ExpiresAt:      nil,
				IsRevoked:      share.IsRevoked,
				AcceptedAt:     nil,
				LastAccessedAt: nil,
			}

			// If there's a registered user
			if share.SharedWithUser != nil {
				userID := share.SharedWithUser.ID.String()
				userName := share.SharedWithUser.Name
				userAvatar := &share.SharedWithUser.Avatar
				shareItem.SharedWith.ID = &userID
				shareItem.SharedWith.Name = &userName
				shareItem.SharedWith.Avatar = userAvatar
			}

			// Handle optional fields
			if share.ExpiresAt != nil {
				expiresAt := share.ExpiresAt.Format(time.RFC3339)
				shareItem.ExpiresAt = &expiresAt
			}
			if share.AcceptedAt != nil {
				acceptedAt := share.AcceptedAt.Format(time.RFC3339)
				shareItem.AcceptedAt = &acceptedAt
			}
			if share.LastAccessedAt != nil {
				lastAccessedAt := share.LastAccessedAt.Format(time.RFC3339)
				shareItem.LastAccessedAt = &lastAccessedAt
			}

			item.Shares = append(item.Shares, shareItem)
		}

		response = append(response, item)
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"shares": response}, "Shared documents retrieved")
}

// RevokeUserShare handles DELETE /shares/:shareId
func (h *UserShareHandler) RevokeUserShare(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	shareIDParam := c.Param("shareId")
	shareID, err := uuid.Parse(shareIDParam)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_SHARE_ID", "invalid share id")
		return
	}

	err = h.userShareService.RevokeUserShare(c.Request.Context(), userID, shareID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "REVOKE_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, nil, "User share revoked successfully")
}

// UpdateUserShareAccess handles PUT /shares/:shareId/access
func (h *UserShareHandler) UpdateUserShareAccess(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	shareIDParam := c.Param("shareId")
	shareID, err := uuid.Parse(shareIDParam)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_SHARE_ID", "invalid share id")
		return
	}

	var body struct {
		AccessLevel models.AccessLevel `json:"accessLevel" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_BODY", err.Error())
		return
	}

	// Validate access level
	if body.AccessLevel != models.AccessLevelView &&
		body.AccessLevel != models.AccessLevelDownload &&
		body.AccessLevel != models.AccessLevelEdit {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_ACCESS_LEVEL", "access level must be 'view', 'download', or 'edit'")
		return
	}

	err = h.userShareService.UpdateUserShareAccess(c.Request.Context(), userID, shareID, body.AccessLevel)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, nil, "Access level updated successfully")
}

// GetShareNotifications handles GET /shares/notifications
func (h *UserShareHandler) GetShareNotifications(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	notifications, err := h.userShareService.GetShareNotifications(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"notifications": notifications}, "Notifications retrieved")
}

// MarkNotificationAsRead handles PUT /shares/notifications/:id/read
func (h *UserShareHandler) MarkNotificationAsRead(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	notificationIDParam := c.Param("id")
	notificationID, err := uuid.Parse(notificationIDParam)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "invalid notification id")
		return
	}

	err = h.userShareService.MarkNotificationAsRead(c.Request.Context(), userID, notificationID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, nil, "Notification marked as read")
}

// ValidateAccess handles GET /documents/:id/access
func (h *UserShareHandler) ValidateAccess(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	documentIDParam := c.Param("id")
	docID, err := uuid.Parse(documentIDParam)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "invalid document id")
		return
	}

	// Get required access level from query parameter
	requiredAccessParam := c.Query("access")
	if requiredAccessParam == "" {
		requiredAccessParam = "view"
	}

	var requiredAccess models.AccessLevel
	switch requiredAccessParam {
	case "view":
		requiredAccess = models.AccessLevelView
	case "download":
		requiredAccess = models.AccessLevelDownload
	case "edit":
		requiredAccess = models.AccessLevelEdit
	default:
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_ACCESS_LEVEL", "access level must be 'view', 'download', or 'edit'")
		return
	}

	hasAccess, err := h.userShareService.ValidateUserAccess(c.Request.Context(), userID, docID, requiredAccess)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "VALIDATION_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"hasAccess": hasAccess}, "Access validated")
}

// RecordAccess handles POST /documents/:id/access
func (h *UserShareHandler) RecordAccess(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	documentIDParam := c.Param("id")
	docID, err := uuid.Parse(documentIDParam)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "invalid document id")
		return
	}

	var body struct {
		Action string `json:"action" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_BODY", err.Error())
		return
	}

	clientIP := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	err = h.userShareService.RecordAccess(c.Request.Context(), userID, docID, body.Action, clientIP, userAgent)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "RECORD_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, nil, "Access recorded")
}

// GetPublicLinks handles GET /shares/public-links
func (h *UserShareHandler) GetPublicLinks(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get page and limit from query parameters
	pageParam := c.DefaultQuery("page", "1")
	limitParam := c.DefaultQuery("limit", "10")

	page, err := strconv.Atoi(pageParam)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitParam)
	if err != nil || limit < 1 || limit > 100 {
		limit = 10
	}

	offset := (page - 1) * limit

	var links []models.SharedLink
	var total int64

	// Get total count
	if err := h.userShareService.GetDB().Model(&models.SharedLink{}).
		Where("owner_id = ? AND is_revoked = false", userID).
		Count(&total).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "COUNT_FAILED", err.Error())
		return
	}

	// Get links with pagination
	if err := h.userShareService.GetDB().
		Preload("Document").
		Where("owner_id = ? AND is_revoked = false", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&links).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	// Transform to frontend format
	type PublicLinkResponse struct {
		ID               string      `json:"id"`
		Document         interface{} `json:"document"`
		ShareUrl         string      `json:"shareUrl"`
		Token            string      `json:"token"`
		CreatedAt        string      `json:"createdAt"`
		ExpiresAt        *string     `json:"expiresAt"`
		MaxDownloads     *int        `json:"maxDownloads"`
		CurrentDownloads int         `json:"currentDownloads"`
		IsRevoked        bool        `json:"isRevoked"`
		Status           string      `json:"status"`
	}

	var transformedLinks []PublicLinkResponse
	for _, link := range links {
		// Determine status
		status := "active"
		if link.IsRevoked {
			status = "revoked"
		} else if link.ExpiresAt != nil && link.ExpiresAt.Before(time.Now()) {
			status = "expired"
		}

		// Create share URL
		shareUrl := fmt.Sprintf("http://localhost:8080/share/%s", link.Token)

		// Format expiration date
		var expiresAtStr *string
		if link.ExpiresAt != nil {
			expStr := link.ExpiresAt.Format(time.RFC3339)
			expiresAtStr = &expStr
		}

		transformedLinks = append(transformedLinks, PublicLinkResponse{
			ID:               link.ID.String(),
			Document:         link.Document,
			ShareUrl:         shareUrl,
			Token:            link.Token,
			CreatedAt:        link.CreatedAt.Format(time.RFC3339),
			ExpiresAt:        expiresAtStr,
			MaxDownloads:     link.MaxDownloads,
			CurrentDownloads: link.DownloadCount,
			IsRevoked:        link.IsRevoked,
			Status:           status,
		})
	}

	response := gin.H{
		"links": transformedLinks,
		"pagination": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		},
	}

	utils.SuccessResponse(c, http.StatusOK, response, "Public links retrieved")
}

// Helper method to get database instance
func (h *UserShareHandler) GetDB() *gorm.DB {
	return h.userShareService.GetDB()
}
