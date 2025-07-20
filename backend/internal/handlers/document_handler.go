package handlers

import (
	"archive/zip"
	"bytes"
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
	"github.com/eyuppastirmaci/noesis-forge/internal/queue"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/types"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/eyuppastirmaci/noesis-forge/internal/validations"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

type DocumentHandler struct {
	documentService  *services.DocumentService
	minioService     *services.MinIOService
	userShareService *services.UserShareService
	queuePublisher   *queue.Publisher
}

// Rrepresents the result of a document download operation
type documentResult struct {
	document *models.Document
	content  []byte
	error    error
}

func NewDocumentHandler(
	documentService *services.DocumentService,
	minioService *services.MinIOService,
	userShareService *services.UserShareService,
	queuePublisher *queue.Publisher,
) *DocumentHandler {
	return &DocumentHandler{
		documentService:  documentService,
		minioService:     minioService,
		userShareService: userShareService,
		queuePublisher:   queuePublisher,
	}
}

// Handles single document upload
func (h *DocumentHandler) UploadDocument(c *gin.Context) {
	fmt.Println("1...")

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

	// Get file from form
	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "FILE_REQUIRED", "File is required")
		return
	}

	uploadReq := &types.UploadDocumentRequest{
		Title:       req.Title,
		Description: req.Description,
		Tags:        req.Tags,
		IsPublic:    req.IsPublic,
	}

	// Delegate business logic to service
	document, err := h.documentService.UploadDocument(c.Request.Context(), userID, file, uploadReq)
	if err != nil {
		// Map service errors to HTTP status codes
		status, code := h.mapServiceErrorToHTTP(err)
		utils.ErrorResponse(c, status, code, err.Error())
		return
	}

	if h.queuePublisher != nil {
		logrus.Infof("Publishing document %s to processing queue with storage path", document.ID.String())
		if err := h.queuePublisher.PublishDocumentForProcessing(document.ID.String(), document.StoragePath); err != nil {
			logrus.Errorf("Failed to queue document for processing: %v", err)
		} else {
			logrus.Infof("Successfully queued document %s for processing", document.ID.String())
		}
	} else {
		logrus.Warn("Queue publisher is nil, skipping document processing")
	}

	data := gin.H{
		"document": document,
	}
	utils.SuccessResponse(c, http.StatusCreated, data, "Document uploaded successfully")
}

// Handles document updates
func (h *DocumentHandler) UpdateDocument(c *gin.Context) {
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

	// Get validated request from context
	req, ok := validations.GetValidatedDocumentUpdate(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated data")
		return
	}

	// Get file from form (optional for update)
	var file *multipart.FileHeader
	if req.HasNewFile {
		file, err = c.FormFile("file")
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "FILE_REQUIRED", "File is required when hasNewFile is true")
			return
		}
	}

	// Convert fts.UpdateDocumentRequest to services.UpdateDocumentRequest
	updateReq := &types.UpdateDocumentRequest{
		Title:       req.Title,
		Description: req.Description,
		Tags:        req.Tags,
		IsPublic:    req.IsPublic,
		HasNewFile:  req.HasNewFile,
	}

	// Delegate to service
	document, err := h.documentService.UpdateDocument(c.Request.Context(), userID, documentID, file, updateReq)
	if err != nil {
		status, code := h.mapServiceErrorToHTTP(err)
		utils.ErrorResponse(c, status, code, err.Error())
		return
	}

	data := gin.H{
		"document": document,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Document updated successfully")
}

// Handles document listing with search
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

	listReq := &types.DocumentListRequest{
		Page:     req.Page,
		Limit:    req.Limit,
		Search:   req.Search,
		FileType: req.FileType,
		Status:   req.Status,
		Tags:     req.Tags,
		SortBy:   req.SortBy,
		SortDir:  req.SortDir,
	}

	// Delegate to service (service handles search logic)
	documents, err := h.documentService.GetDocuments(c.Request.Context(), userID, listReq)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, documents, "Documents retrieved successfully")
}

// Handles single document retrieval
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

	// Delegate to service
	document, err := h.documentService.GetDocument(c.Request.Context(), userID, documentID)
	if err != nil {
		if strings.Contains(err.Error(), "document not found") || strings.Contains(err.Error(), "access denied") {
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

// Handles document title retrieval
func (h *DocumentHandler) GetDocumentTitle(c *gin.Context) {
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

	// Delegate to service
	title, err := h.documentService.GetDocumentTitle(c.Request.Context(), userID, documentID)
	if err != nil {
		if strings.Contains(err.Error(), "document not found") || strings.Contains(err.Error(), "access denied") {
			utils.NotFoundResponse(c, "DOCUMENT_NOT_FOUND", "Document not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	data := gin.H{
		"title": title,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Document title retrieved successfully")
}

// Handles document deletion
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

	// Delegate to service
	err = h.documentService.DeleteDocument(c.Request.Context(), userID, documentID)
	if err != nil {
		if strings.Contains(err.Error(), "document not found") || strings.Contains(err.Error(), "access denied") {
			utils.NotFoundResponse(c, "DOCUMENT_NOT_FOUND", "Document not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, nil, "Document deleted successfully")
}

// Handles document download
func (h *DocumentHandler) DownloadDocument(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		logrus.Errorf("[DOWNLOAD_HANDLER] Auth error: %v", err)
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get validated document ID from context
	documentID, ok := validations.GetValidatedDocumentID(c)
	if !ok {
		logrus.Error("[DOWNLOAD_HANDLER] Failed to get validated document ID")
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated document ID")
		return
	}

	// Get document via service (handles access control)
	document, err := h.documentService.DownloadDocument(c.Request.Context(), userID, documentID)
	if err != nil {
		logrus.Errorf("[DOWNLOAD_HANDLER] Service error: %v", err)
		if strings.Contains(err.Error(), "document not found") || strings.Contains(err.Error(), "access denied") {
			utils.NotFoundResponse(c, "DOCUMENT_NOT_FOUND", "Document not found or download access denied")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "DOWNLOAD_FAILED", err.Error())
		return
	}

	// Get file from MinIO
	fileReader, err := h.minioService.DownloadFile(c.Request.Context(), document.StoragePath)
	if err != nil {
		logrus.Errorf("[DOWNLOAD_HANDLER] MinIO download error: %v", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "DOWNLOAD_FAILED", "Failed to retrieve file")
		return
	}
	defer fileReader.Close()

	// Read file content to avoid header conflicts
	fileContent, err := io.ReadAll(fileReader)
	if err != nil {
		logrus.Errorf("[DOWNLOAD_HANDLER] Failed to read file content: %v", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "DOWNLOAD_FAILED", "Failed to read file content")
		return
	}

	// Safely escape filename for Content-Disposition header
	safeFilename := strings.ReplaceAll(document.OriginalFileName, "\"", "\\\"")

	// Set HTTP headers
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", safeFilename))
	c.Header("Content-Type", document.MimeType)
	c.Header("Content-Length", fmt.Sprintf("%d", len(fileContent)))
	c.Header("Cache-Control", "no-cache")

	// Send file data
	c.Data(http.StatusOK, document.MimeType, fileContent)
}

// Handles document preview URL generation
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

	// Get document model via service to verify access
	var document models.Document
	err = h.documentService.GetDocumentModel(c.Request.Context(), userID, documentID, &document)
	if err != nil {
		if strings.Contains(err.Error(), "document not found") {
			// Try shared access through service
			_, err = h.documentService.GetDocument(c.Request.Context(), userID, documentID)
			if err != nil {
				utils.NotFoundResponse(c, "DOCUMENT_NOT_FOUND", "Document not found or preview access denied")
				return
			}

			// If service call succeeded, we need to get the document model differently
			// This is a limitation of the current design - we could improve this
			utils.ErrorResponse(c, http.StatusInternalServerError, "PREVIEW_FAILED", "Failed to get document details")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "PREVIEW_FAILED", "Failed to get document details")
		return
	}

	// Generate presigned URL for preview (valid for 1 hour)
	url, err := h.minioService.GeneratePresignedURL(c.Request.Context(), document.StoragePath, 3600*time.Second)
	if err != nil {
		logrus.Errorf("[PREVIEW] Failed to generate presigned URL for document %s: %v", documentID, err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "PREVIEW_FAILED", "Failed to generate preview URL")
		return
	}

	data := gin.H{
		"url": url,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Preview URL generated successfully")
}

// Serves thumbnail image for a document
func (h *DocumentHandler) GetDocumentThumbnail(c *gin.Context) {
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

	// Get document model via service to verify access
	var document models.Document
	err = h.documentService.GetDocumentModel(c.Request.Context(), userID, documentID, &document)
	if err != nil {
		if strings.Contains(err.Error(), "document not found") {
			// Try shared access - get document via service
			_, err = h.documentService.GetDocument(c.Request.Context(), userID, documentID)
			if err != nil {
				utils.NotFoundResponse(c, "DOCUMENT_NOT_FOUND", "Document not found or access denied")
				return
			}

			// Similar issue as preview - need to refactor this
			utils.ErrorResponse(c, http.StatusInternalServerError, "FETCH_FAILED", "Failed to get document details")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	// Check if document has thumbnail
	if !document.HasThumbnail || document.ThumbnailPath == "" {
		utils.NotFoundResponse(c, "THUMBNAIL_NOT_FOUND", "Thumbnail not available for this document")
		return
	}

	// Get thumbnail from MinIO
	thumbnailReader, err := h.minioService.DownloadFile(c.Request.Context(), document.ThumbnailPath)
	if err != nil {
		logrus.Errorf("Failed to download thumbnail from storage: %v", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "THUMBNAIL_DOWNLOAD_FAILED", "Failed to download thumbnail")
		return
	}
	defer thumbnailReader.Close()

	// Read thumbnail data
	thumbnailData, err := io.ReadAll(thumbnailReader)
	if err != nil {
		logrus.Errorf("Failed to read thumbnail data: %v", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "THUMBNAIL_READ_FAILED", "Failed to read thumbnail data")
		return
	}

	// Set appropriate headers for image
	c.Header("Content-Type", "image/jpeg")
	c.Header("Content-Length", fmt.Sprintf("%d", len(thumbnailData)))
	c.Header("Cache-Control", "public, max-age=3600") // Cache for 1 hour

	// Serve thumbnail data
	c.Data(http.StatusOK, "image/jpeg", thumbnailData)
}

// Retrieves user document statistics
func (h *DocumentHandler) GetUserStats(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Delegate to service
	stats, err := h.documentService.GetUserStats(c.Request.Context(), userID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "STATS_FETCH_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, stats, "User stats retrieved successfully")
}

// Handles multiple document uploads concurrently
func (h *DocumentHandler) BulkUploadDocuments(c *gin.Context) {
	fmt.Println("Bulk Upload Here...")

	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get validated request from context
	req, ok := validations.GetValidatedBulkDocumentUpload(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated data")
		return
	}

	// Create context with timeout for the entire bulk operation
	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Minute)
	defer cancel()

	// Channel to collect results
	type uploadResult struct {
		index    int
		document *types.DocumentResponse
		err      error
	}

	resultChan := make(chan uploadResult, len(req.Files))
	var wg sync.WaitGroup

	// Process each file concurrently
	for i, file := range req.Files {
		wg.Add(1)
		go func(idx int, f *multipart.FileHeader, meta validations.FileMetadata) {
			defer wg.Done()

			// Create individual request for each file using its metadata
			uploadReq := &types.UploadDocumentRequest{
				Title:       meta.Title,
				Description: meta.Description,
				Tags:        meta.Tags,
				IsPublic:    meta.IsPublic,
			}

			// Delegate to service
			document, uploadErr := h.documentService.UploadDocument(ctx, userID, f, uploadReq)

			if uploadErr == nil && document != nil && h.queuePublisher != nil {
				logrus.Infof("Publishing document %s to processing queue", document.ID)
				if err := h.queuePublisher.PublishDocumentForProcessing(document.ID.String(), document.StoragePath); err != nil {
					logrus.Errorf("Failed to queue document %s for processing: %v", document.ID, err)
				} else {
					logrus.Infof("Successfully queued document %s for processing", document.ID)
				}
			}

			resultChan <- uploadResult{
				index:    idx,
				document: document,
				err:      uploadErr,
			}
		}(i, file, req.Metadata[i])
	}

	// Close result channel when all goroutines complete
	go func() {
		wg.Wait()
		close(resultChan)
	}()

	// Collect all results
	results := make([]uploadResult, len(req.Files))
	successfulUploads := []*types.DocumentResponse{}
	failedUploads := []map[string]interface{}{}

	for result := range resultChan {
		results[result.index] = result

		if result.err != nil {
			failedUploads = append(failedUploads, map[string]interface{}{
				"filename": req.Files[result.index].Filename,
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
		"total_files":        len(req.Files),
		"documents":          successfulUploads,
	}

	// Add failures if any
	if len(failedUploads) > 0 {
		response["failures"] = failedUploads
	}

	// Determine response status based on results
	if len(successfulUploads) == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "ALL_UPLOADS_FAILED", "All file uploads failed")
		return
	} else if len(failedUploads) > 0 {
		utils.SuccessResponse(c, http.StatusPartialContent, response,
			fmt.Sprintf("Uploaded %d out of %d files successfully", len(successfulUploads), len(req.Files)))
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, response,
		fmt.Sprintf("All %d files uploaded successfully", len(req.Files)))
}

// Handles multiple document deletions concurrently
func (h *DocumentHandler) BulkDeleteDocuments(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get validated request from context
	req, ok := validations.GetValidatedBulkDelete(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated data")
		return
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Minute)
	defer cancel()

	// Channel to collect results
	type deleteResult struct {
		documentID string
		success    bool
		error      error
	}

	resultChan := make(chan deleteResult, len(req.DocumentIDs))
	semaphore := make(chan struct{}, 10) // Limit concurrent operations to 10
	var wg sync.WaitGroup

	// Process each document concurrently
	for _, documentID := range req.DocumentIDs {
		wg.Add(1)
		go func(docID string) {
			defer wg.Done()

			// Acquire semaphore
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			// Parse UUID
			docUUID, parseErr := uuid.Parse(docID)
			if parseErr != nil {
				resultChan <- deleteResult{
					documentID: docID,
					success:    false,
					error:      fmt.Errorf("invalid document ID format"),
				}
				return
			}

			// Delegate to service
			deleteErr := h.documentService.DeleteDocument(ctx, userID, docUUID)
			resultChan <- deleteResult{
				documentID: docID,
				success:    deleteErr == nil,
				error:      deleteErr,
			}
		}(documentID)
	}

	// Close result channel when all goroutines complete
	go func() {
		wg.Wait()
		close(resultChan)
	}()

	// Collect all results
	successfulDeletes := 0
	failedDeletes := 0
	failures := []map[string]interface{}{}

	for result := range resultChan {
		if result.success {
			successfulDeletes++
		} else {
			failedDeletes++
			failures = append(failures, map[string]interface{}{
				"id":    result.documentID,
				"error": result.error.Error(),
			})
		}
	}

	// Prepare response
	response := gin.H{
		"successful_deletes": successfulDeletes,
		"failed_deletes":     failedDeletes,
		"total_documents":    len(req.DocumentIDs),
	}

	// Add failures if any
	if len(failures) > 0 {
		response["failures"] = failures
	}

	// Determine response status
	if successfulDeletes == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "ALL_DELETES_FAILED", "All document deletions failed")
		return
	} else if failedDeletes > 0 {
		utils.SuccessResponse(c, http.StatusPartialContent, response,
			fmt.Sprintf("Deleted %d out of %d documents successfully", successfulDeletes, len(req.DocumentIDs)))
		return
	}

	utils.SuccessResponse(c, http.StatusOK, response,
		fmt.Sprintf("All %d documents deleted successfully", len(req.DocumentIDs)))
}

// Creates a ZIP file with multiple documents
func (h *DocumentHandler) BulkDownloadDocuments(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get validated request from context
	req, ok := validations.GetValidatedBulkDownload(c)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated data")
		return
	}

	// Create context with timeout
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Minute)
	defer cancel()

	// Channel to collect document fetch results
	resultChan := make(chan documentResult, len(req.DocumentIDs))
	semaphore := make(chan struct{}, 5) // Limit concurrent downloads to 5
	var wg sync.WaitGroup

	// Fetch documents and their content concurrently
	for _, documentID := range req.DocumentIDs {
		wg.Add(1)
		go func(docID string) {
			defer wg.Done()

			// Acquire semaphore
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			// Parse UUID
			docUUID, parseErr := uuid.Parse(docID)
			if parseErr != nil {
				resultChan <- documentResult{
					error: fmt.Errorf("invalid document ID format: %s", docID),
				}
				return
			}

			// Get document via service (handles access control)
			document, fetchErr := h.documentService.DownloadDocument(ctx, userID, docUUID)
			if fetchErr != nil {
				resultChan <- documentResult{
					error: fmt.Errorf("failed to fetch document %s: %w", docID, fetchErr),
				}
				return
			}

			// Download file content from MinIO
			fileReader, downloadErr := h.minioService.DownloadFile(ctx, document.StoragePath)
			if downloadErr != nil {
				resultChan <- documentResult{
					error: fmt.Errorf("failed to download file for document %s: %w", docID, downloadErr),
				}
				return
			}
			defer fileReader.Close()

			// Read file content
			content, readErr := io.ReadAll(fileReader)
			if readErr != nil {
				resultChan <- documentResult{
					error: fmt.Errorf("failed to read file content for document %s: %w", docID, readErr),
				}
				return
			}

			resultChan <- documentResult{
				document: document,
				content:  content,
				error:    nil,
			}
		}(documentID)
	}

	// Close result channel when all goroutines complete
	go func() {
		wg.Wait()
		close(resultChan)
	}()

	// Create ZIP and collect results
	zipBuffer, successfulDownloads, _ := h.createZipFromResults(resultChan, req.DocumentIDs)

	if successfulDownloads == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "NO_FILES_DOWNLOADED", "No files could be downloaded")
		return
	}

	// Generate filename for ZIP
	timestamp := time.Now().Format("20060102_150405")
	zipFilename := fmt.Sprintf("documents_%s.zip", timestamp)

	// Set response headers for ZIP download
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", zipFilename))
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Length", fmt.Sprintf("%d", zipBuffer.Len()))
	c.Header("Cache-Control", "no-cache")

	// Send ZIP file data
	c.Data(http.StatusOK, "application/zip", zipBuffer.Bytes())
}

// Retrieves document version history
func (h *DocumentHandler) GetDocumentRevisions(c *gin.Context) {
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

	// Delegate to service
	revisions, err := h.documentService.GetDocumentRevisions(c.Request.Context(), userID, documentID)
	if err != nil {
		if strings.Contains(err.Error(), "document not found") || strings.Contains(err.Error(), "access denied") {
			utils.NotFoundResponse(c, "DOCUMENT_NOT_FOUND", "Document not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	data := gin.H{
		"revisions": revisions,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Revisions retrieved successfully")
}

// Helper methods for HTTP layer

// mapServiceErrorToHTTP maps service layer errors to appropriate HTTP status codes
func (h *DocumentHandler) mapServiceErrorToHTTP(err error) (int, string) {
	errorMsg := err.Error()

	// File validation errors
	if strings.Contains(errorMsg, "file type not supported") {
		return http.StatusBadRequest, "INVALID_FILE_TYPE"
	}
	if strings.Contains(errorMsg, "file size too large") {
		return http.StatusBadRequest, "FILE_TOO_LARGE"
	}

	// Access control errors
	if strings.Contains(errorMsg, "document not found") || strings.Contains(errorMsg, "access denied") {
		return http.StatusNotFound, "DOCUMENT_NOT_FOUND"
	}
	if strings.Contains(errorMsg, "insufficient access") {
		return http.StatusForbidden, "ACCESS_DENIED"
	}

	// Storage errors
	if strings.Contains(errorMsg, "failed to upload") || strings.Contains(errorMsg, "storage") {
		return http.StatusInternalServerError, "STORAGE_ERROR"
	}

	// Database errors
	if strings.Contains(errorMsg, "failed to save") || strings.Contains(errorMsg, "database") {
		return http.StatusInternalServerError, "DATABASE_ERROR"
	}

	// Default to internal server error
	return http.StatusInternalServerError, "INTERNAL_ERROR"
}

// Creates ZIP file from document results
func (h *DocumentHandler) createZipFromResults(resultChan chan documentResult, documentIDs []string) (*bytes.Buffer, int, int) {
	var zipBuffer bytes.Buffer
	zipWriter := zip.NewWriter(&zipBuffer)

	successfulDownloads := 0
	failedDownloads := 0
	usedFilenames := make(map[string]bool)

	for result := range resultChan {
		if result.error != nil {
			failedDownloads++
			logrus.Errorf("[BULK_DOWNLOAD] Error: %v", result.error)
			continue
		}

		// Generate unique filename
		filename := result.document.OriginalFileName
		counter := 1
		baseFilename := strings.TrimSuffix(filename, filepath.Ext(filename))
		extension := filepath.Ext(filename)

		// Handle duplicate filenames
		for usedFilenames[filename] {
			filename = fmt.Sprintf("%s_%d%s", baseFilename, counter, extension)
			counter++
		}
		usedFilenames[filename] = true

		// Create file entry in ZIP
		fileWriter, err := zipWriter.Create(filename)
		if err != nil {
			failedDownloads++
			logrus.Errorf("[BULK_DOWNLOAD] Failed to create ZIP entry for %s: %v", filename, err)
			continue
		}

		// Write file content
		_, err = fileWriter.Write(result.content)
		if err != nil {
			failedDownloads++
			logrus.Errorf("[BULK_DOWNLOAD] Failed to write file content to ZIP for %s: %v", filename, err)
			continue
		}

		successfulDownloads++
	}

	// Close ZIP writer
	zipWriter.Close()

	return &zipBuffer, successfulDownloads, failedDownloads
}
