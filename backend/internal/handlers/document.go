package handlers

import (
	"io"
	"net/http"
	"strings"

	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/eyuppastirmaci/noesis-forge/internal/validations"
	"github.com/gin-gonic/gin"
)

type DocumentHandler struct {
	documentService *services.DocumentService
	minioService    *services.MinIOService
}

func NewDocumentHandler(documentService *services.DocumentService, minioService *services.MinIOService) *DocumentHandler {
	return &DocumentHandler{
		documentService: documentService,
		minioService:    minioService,
	}
}

func (h *DocumentHandler) UploadDocument(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get validated request from context
	req, ok := validations.GetValidatedDocumentUpload(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated data")
		return
	}

	// Get file from form (already validated by middleware)
	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "FILE_REQUIRED", "File is required")
		return
	}

	// Upload document
	document, err := h.documentService.UploadDocument(c.Request.Context(), userID, file, req)
	if err != nil {
		// Handle storage/database errors
		status := http.StatusInternalServerError
		code := "UPLOAD_FAILED"

		// Check for specific storage errors
		if strings.Contains(err.Error(), "failed to upload file to storage") {
			code = "STORAGE_ERROR"
		} else if strings.Contains(err.Error(), "failed to save document record") {
			code = "DATABASE_ERROR"
		}

		utils.ErrorResponse(c, status, code, err.Error())
		return
	}

	data := gin.H{
		"document": document,
	}
	utils.SuccessResponse(c, http.StatusCreated, data, "Document uploaded successfully")
}

func (h *DocumentHandler) GetDocuments(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get validated request from context
	req, ok := validations.GetValidatedDocumentList(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated data")
		return
	}

	documents, err := h.documentService.GetDocuments(c.Request.Context(), userID, req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, documents, "Documents retrieved successfully")
}

func (h *DocumentHandler) GetDocument(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get validated document ID from context
	documentID, ok := validations.GetValidatedDocumentID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated document ID")
		return
	}

	document, err := h.documentService.GetDocument(c.Request.Context(), userID, documentID)
	if err != nil {
		if err.Error() == "document not found" {
			utils.NotFoundResponse(c, "DOCUMENT_NOT_FOUND", "Document not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	data := gin.H{
		"document": document,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Document retrieved successfully")
}

func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get validated document ID from context
	documentID, ok := validations.GetValidatedDocumentID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated document ID")
		return
	}

	err = h.documentService.DeleteDocument(c.Request.Context(), userID, documentID)
	if err != nil {
		if err.Error() == "document not found" {
			utils.NotFoundResponse(c, "DOCUMENT_NOT_FOUND", "Document not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, nil, "Document deleted successfully")
}

func (h *DocumentHandler) DownloadDocument(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get validated document ID from context
	documentID, ok := validations.GetValidatedDocumentID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated document ID")
		return
	}

	// Get document info
	document, err := h.documentService.DownloadDocument(c.Request.Context(), userID, documentID)
	if err != nil {
		if err.Error() == "document not found" {
			utils.NotFoundResponse(c, "DOCUMENT_NOT_FOUND", "Document not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "DOWNLOAD_FAILED", err.Error())
		return
	}

	// Get file from MinIO
	fileReader, err := h.minioService.DownloadFile(c.Request.Context(), document.StoragePath)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "DOWNLOAD_FAILED", "Failed to retrieve file")
		return
	}
	defer fileReader.Close()

	// Set headers for file download
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename="+document.OriginalFileName)
	c.Header("Content-Type", document.MimeType)

	// Stream the file to client using io.Copy
	_, err = io.Copy(c.Writer, fileReader)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "DOWNLOAD_FAILED", "Failed to stream file")
		return
	}
}

func (h *DocumentHandler) GetDocumentPreview(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get validated document ID from context
	documentID, ok := validations.GetValidatedDocumentID(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated document ID")
		return
	}

	// Get the full document model to access StoragePath
	var document models.Document
	if err := h.documentService.GetDocumentModel(c.Request.Context(), userID, documentID, &document); err != nil {
		if err.Error() == "document not found" {
			utils.NotFoundResponse(c, "DOCUMENT_NOT_FOUND", "Document not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "PREVIEW_FAILED", "Failed to get document details")
		return
	}

	// Generate presigned URL for preview (valid for 1 hour)
	url, err := h.minioService.GeneratePresignedURL(c.Request.Context(), document.StoragePath, 3600)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "PREVIEW_FAILED", "Failed to generate preview URL")
		return
	}

	data := gin.H{
		"url": url,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Preview URL generated successfully")
}
