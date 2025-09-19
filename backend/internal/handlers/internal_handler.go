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
	documentService       *services.DocumentService
	processingTaskService *services.ProcessingTaskService
	db                    *gorm.DB
}

func NewInternalHandler(documentService *services.DocumentService, processingTaskService *services.ProcessingTaskService, db *gorm.DB) *InternalHandler {
	return &InternalHandler{
		documentService:       documentService,
		processingTaskService: processingTaskService,
		db:                    db,
	}
}

type UpdateExtractedTextRequest struct {
	ExtractedText string `json:"extracted_text"`
}

type UpdateStatusRequest struct {
	Status string `json:"status"`
}

type UpdateSummaryRequest struct {
	Summary string `json:"summary"`
}

type UpdateProcessingTaskRequest struct {
	TaskType     string `json:"task_type"`     // text-embedding, image-embedding, summarization
	Status       string `json:"status"`        // pending, processing, completed, failed
	Progress     int    `json:"progress"`      // 0-100
	WorkerID     string `json:"worker_id"`     // Optional worker identifier
	ErrorMessage string `json:"error_message"` // Optional error message if failed
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

// Internal endpoint for workers to update document summary
func (h *InternalHandler) UpdateSummary(c *gin.Context) {
	documentIDStr := c.Param("id")
	documentID, err := uuid.Parse(documentIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_DOCUMENT_ID", "Invalid document ID")
		return
	}

	var req UpdateSummaryRequest
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

	// Update summary
	updates := map[string]interface{}{
		"summary": req.Summary,
	}

	if err := h.db.Model(&document).Updates(updates).Error; err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "UPDATE_FAILED", "Failed to update document summary")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{
		"document_id": documentID,
		"updated":     true,
	}, "Document summary updated successfully")
}

// Internal endpoint for workers to update processing task status
func (h *InternalHandler) UpdateProcessingTask(c *gin.Context) {
	documentIDStr := c.Param("id")
	documentID, err := uuid.Parse(documentIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_DOCUMENT_ID", "Invalid document ID")
		return
	}

	var req UpdateProcessingTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}

	// Validate document exists
	var document models.Document
	if err := h.db.Where("id = ?", documentID).First(&document).Error; err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "DOCUMENT_NOT_FOUND", "Document not found")
		return
	}

	// Convert string types to models types
	taskType := models.ProcessingTaskType(req.TaskType)
	status := models.ProcessingTaskStatus(req.Status)

	// Update task status
	if req.Progress > 0 && req.Progress < 100 {
		// Update progress
		if err := h.processingTaskService.SetTaskProgress(documentID, taskType, req.Progress, req.WorkerID); err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "UPDATE_FAILED", "Failed to update processing task progress")
			return
		}
	} else {
		// Update status
		if err := h.processingTaskService.UpdateTaskStatus(documentID, taskType, status, req.ErrorMessage); err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "UPDATE_FAILED", "Failed to update processing task status")
			return
		}
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{
		"document_id": documentID,
		"task_type":   req.TaskType,
		"status":      req.Status,
		"progress":    req.Progress,
		"updated":     true,
	}, "Processing task updated successfully")
}

// Internal endpoint to get processing status for a document
func (h *InternalHandler) GetProcessingStatus(c *gin.Context) {
	documentIDStr := c.Param("id")
	documentID, err := uuid.Parse(documentIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_DOCUMENT_ID", "Invalid document ID")
		return
	}

	// Get processing progress
	progress, err := h.processingTaskService.GetProcessingProgress(documentID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "FETCH_FAILED", "Failed to fetch processing status")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, progress, "Processing status fetched successfully")
}
