package handlers

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
	"sync"
	"time"

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

// BulkUploadDocuments uploads multiple documents concurrently
func (h *DocumentHandler) BulkUploadDocuments(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Parse multipart form
	err = c.Request.ParseMultipartForm(500 << 20) // 500MB max total
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_FORM", "Failed to parse multipart form")
		return
	}

	form := c.Request.MultipartForm
	files := form.File["files"] // Note: "files" instead of "file"

	if len(files) == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "NO_FILES", "No files provided")
		return
	}

	// Get common metadata
	tags := strings.TrimSpace(c.PostForm("tags"))
	isPublicStr := c.PostForm("isPublic")
	isPublic := isPublicStr == "true" || isPublicStr == "1"

	// Validate common metadata
	fieldErrors := make(map[string]string)
	if len(tags) > 500 {
		fieldErrors["tags"] = "Tags must be at most 500 characters"
	}
	if tags != "" {
		if valid, msg := validateTagsForBulk(tags); !valid {
			fieldErrors["tags"] = msg
		}
	}

	if len(fieldErrors) > 0 {
		utils.FieldValidationErrorResponse(c, "Validation failed", fieldErrors)
		return
	}

	// Create context with timeout for the entire bulk operation
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Minute)
	defer cancel()

	// Channel to collect results
	type uploadResult struct {
		index    int
		document *services.DocumentResponse
		err      error
	}

	resultChan := make(chan uploadResult, len(files))

	// Use WaitGroup to wait for all goroutines
	var wg sync.WaitGroup

	// Process each file concurrently
	for i, file := range files {
		wg.Add(1)
		go func(idx int, f *multipart.FileHeader) {
			defer wg.Done()

			// Create individual request for each file
			req := &services.UploadDocumentRequest{
				Title:       getFilenameWithoutExtensionForBulk(f.Filename), // Use filename as title
				Description: "",                                             // Empty description for bulk uploads
				Tags:        tags,
				IsPublic:    isPublic,
			}

			// Upload the document
			document, uploadErr := h.documentService.UploadDocument(ctx, userID, f, req)

			resultChan <- uploadResult{
				index:    idx,
				document: document,
				err:      uploadErr,
			}
		}(i, file)
	}

	// Close result channel when all goroutines complete
	go func() {
		wg.Wait()
		close(resultChan)
	}()

	// Collect all results
	results := make([]uploadResult, len(files))
	successfulUploads := []*services.DocumentResponse{}
	failedUploads := []map[string]interface{}{}

	for result := range resultChan {
		results[result.index] = result

		if result.err != nil {
			failedUploads = append(failedUploads, map[string]interface{}{
				"filename": files[result.index].Filename,
				"error":    result.err.Error(),
			})
		} else {
			successfulUploads = append(successfulUploads, result.document)
		}
	}

	// Prepare response
	response := gin.H{
		"successful_uploads": len(successfulUploads),
		"failed_uploads":     len(failedUploads),
		"total_files":        len(files),
		"documents":          successfulUploads,
	}

	// Add failures if any
	if len(failedUploads) > 0 {
		response["failures"] = failedUploads
	}

	// Determine response status
	if len(successfulUploads) == 0 {
		// All uploads failed
		utils.ErrorResponse(c, http.StatusBadRequest, "ALL_UPLOADS_FAILED", "All file uploads failed")
		return
	} else if len(failedUploads) > 0 {
		// Partial success
		utils.SuccessResponse(c, http.StatusPartialContent, response,
			fmt.Sprintf("Uploaded %d out of %d files successfully", len(successfulUploads), len(files)))
		return
	}

	// All uploads successful
	utils.SuccessResponse(c, http.StatusCreated, response,
		fmt.Sprintf("All %d files uploaded successfully", len(files)))
}

// Helper functions for bulk upload
func validateTagsForBulk(tags string) (bool, string) {
	// Split tags by comma and validate each
	tagList := strings.Split(tags, ",")

	if len(tagList) > 10 {
		return false, "Maximum 10 tags allowed"
	}

	for _, tag := range tagList {
		tag = strings.TrimSpace(tag)
		if len(tag) == 0 {
			continue
		}

		if len(tag) < 2 {
			return false, "Each tag must be at least 2 characters"
		}

		if len(tag) > 50 {
			return false, "Each tag must be at most 50 characters"
		}

		// Check for invalid characters in tags
		if !isValidTagNameForBulk(tag) {
			return false, "Tags can only contain letters, numbers, hyphens, and underscores"
		}
	}

	return true, ""
}

func isValidTagNameForBulk(tag string) bool {
	for _, char := range tag {
		if !((char >= 'a' && char <= 'z') ||
			(char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9') ||
			char == '-' || char == '_' || char == ' ') {
			return false
		}
	}
	return true
}

func getFilenameWithoutExtensionForBulk(filename string) string {
	ext := filepath.Ext(filename)
	return strings.TrimSuffix(filename, ext)
}
