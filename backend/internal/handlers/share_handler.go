package handlers

import (
	"net/http"

	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ShareHandler struct {
	shareService *services.ShareService
	minioService *services.MinIOService
}

func NewShareHandler(shareService *services.ShareService, minioService *services.MinIOService) *ShareHandler {
	return &ShareHandler{shareService: shareService, minioService: minioService}
}

// CreateShare handles POST /documents/:id/share (public link only for MVP)
func (h *ShareHandler) CreateShare(c *gin.Context) {
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

	// Simple body struct
	var body struct {
		ExpiresInDays int  `json:"expiresInDays"`
		MaxDownloads  *int `json:"maxDownloads"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_BODY", err.Error())
		return
	}

	link, err := h.shareService.CreatePublicShare(c.Request.Context(), userID, docID, body.ExpiresInDays, body.MaxDownloads)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "CREATE_FAILED", err.Error())
		return
	}

	data := gin.H{
		"shareURL": "localhost:8000/share/" + link.Token,
	}
	utils.SuccessResponse(c, http.StatusCreated, data, "Share link created")
}

// DownloadShared handles GET /share/:token/download
func (h *ShareHandler) DownloadShared(c *gin.Context) {
	token := c.Param("token")
	clientIP := c.ClientIP()
	ua := c.GetHeader("User-Agent")

	doc, err := h.shareService.ValidateToken(c.Request.Context(), token, clientIP, ua)
	if err != nil {
		utils.ErrorResponse(c, http.StatusForbidden, "TOKEN_INVALID", err.Error())
		return
	}

	// Get file from MinIO and stream it directly
	reader, err := h.minioService.DownloadFile(c.Request.Context(), doc.StoragePath)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "STORAGE_ERROR", err.Error())
		return
	}
	defer reader.Close()

	// Set appropriate headers for inline viewing (not download)
	c.Header("Content-Disposition", "inline; filename=\""+doc.OriginalFileName+"\"")
	c.Header("Content-Type", doc.MimeType)

	// Stream the file
	c.DataFromReader(http.StatusOK, -1, doc.MimeType, reader, nil)
}

// GetDocumentShares handles GET /documents/:id/shares
func (h *ShareHandler) GetDocumentShares(c *gin.Context) {
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

	shares, err := h.shareService.GetDocumentShares(c.Request.Context(), userID, docID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"shares": shares}, "Shares retrieved successfully")
}

// RevokeShare handles DELETE /documents/:id/shares/:shareId
func (h *ShareHandler) RevokeShare(c *gin.Context) {
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

	err = h.shareService.RevokeShare(c.Request.Context(), userID, shareID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "REVOKE_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, nil, "Share revoked successfully")
}
