package handlers

import (
	"net/http"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type InternalHandler struct {
	documentService *services.DocumentService
	db              *gorm.DB
}

func NewInternalHandler(documentService *services.DocumentService, db *gorm.DB) *InternalHandler {
	return &InternalHandler{
		documentService: documentService,
		db:              db,
	}
}

type UpdateExtractedTextRequest struct {
	ExtractedText string `json:"extracted_text"`
}

type UpdateStatusRequest struct {
	Status string `json:"status"`
}

// Internal endpoint for workers to update extracted text
func (h *InternalHandler) UpdateExtractedText(c *gin.Context) {
	documentIDStr := c.Param("id")
	documentID, err := uuid.Parse(documentIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_DOCUMENT_ID", "Invalid document ID")
		return
	}

	var req UpdateExtractedTextRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	// Find document
	var document models.Document
	if err := h.db.Where("id = ?", documentID).First(&document).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "DOCUMENT_NOT_FOUND", "Document not found")
		return
	}

	// Update extracted text, status and processed time
	now := time.Now()
	updates := map[string]interface{}{
		"extracted_text": req.ExtractedText,
		"status":         models.DocumentStatusReady,
		"processed_at":   &now,
	}

	if err := h.db.Model(&document).Updates(updates).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "UPDATE_FAILED", "Failed to update document")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{
		"document_id": documentID,
		"status":      "ready",
		"updated":     true,
	}, "Document updated successfully")
}

// Internal endpoint for workers to update document status
func (h *InternalHandler) UpdateStatus(c *gin.Context) {
	documentIDStr := c.Param("id")
	documentID, err := uuid.Parse(documentIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_DOCUMENT_ID", "Invalid document ID")
		return
	}

	var req UpdateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	// Update status
	if err := h.db.Model(&models.Document{}).Where("id = ?", documentID).Update("status", req.Status).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "UPDATE_FAILED", "Failed to update document status")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{
		"document_id": documentID,
		"status":      req.Status,
		"updated":     true,
	}, "Document status updated successfully")
}
