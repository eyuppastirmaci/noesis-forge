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
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/eyuppastirmaci/noesis-forge/internal/validations"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
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
	logrus.Infof("[DOWNLOAD_HANDLER] Starting download request")

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

	logrus.Infof("[DOWNLOAD_HANDLER] Fetching document %s for user %s", documentID, userID)

	// Get document info
	document, err := h.documentService.DownloadDocument(c.Request.Context(), userID, documentID)
	if err != nil {
		logrus.Errorf("[DOWNLOAD_HANDLER] Document fetch error: %v", err)
		if err.Error() == "document not found" {
			utils.NotFoundResponse(c, "DOCUMENT_NOT_FOUND", "Document not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "DOWNLOAD_FAILED", err.Error())
		return
	}

	logrus.Infof("[DOWNLOAD_HANDLER] Document found: %s (original: %s)", document.FileName, document.OriginalFileName)

	// Get file from MinIO
	logrus.Infof("[DOWNLOAD_HANDLER] Downloading file from storage: %s", document.StoragePath)
	fileReader, err := h.minioService.DownloadFile(c.Request.Context(), document.StoragePath)
	if err != nil {
		logrus.Errorf("[DOWNLOAD_HANDLER] MinIO download error: %v", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "DOWNLOAD_FAILED", "Failed to retrieve file")
		return
	}
	defer fileReader.Close()

	// Read file content into buffer to avoid header conflicts
	fileContent, err := io.ReadAll(fileReader)
	if err != nil {
		logrus.Errorf("[DOWNLOAD_HANDLER] Failed to read file content: %v", err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "DOWNLOAD_FAILED", "Failed to read file content")
		return
	}

	// Safely escape filename for Content-Disposition header
	safeFilename := strings.ReplaceAll(document.OriginalFileName, "\"", "\\\"")
	logrus.Infof("[DOWNLOAD_HANDLER] Setting response headers for file: %s", safeFilename)

	// Set all headers before writing response body
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", safeFilename))
	c.Header("Content-Type", document.MimeType)
	c.Header("Content-Length", fmt.Sprintf("%d", len(fileContent)))
	c.Header("Cache-Control", "no-cache")

	logrus.Infof("[DOWNLOAD_HANDLER] Headers set, sending file data")

	// Send file data
	c.Data(http.StatusOK, document.MimeType, fileContent)

	logrus.Infof("[DOWNLOAD_HANDLER] File download completed successfully")
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
	logrus.Infof("[PREVIEW] Generating presigned URL for document %s, storage path: %s", documentID, document.StoragePath)
	url, err := h.minioService.GeneratePresignedURL(c.Request.Context(), document.StoragePath, 3600*time.Second)
	if err != nil {
		logrus.Errorf("[PREVIEW] Failed to generate presigned URL for document %s: %v", documentID, err)
		utils.ErrorResponse(c, http.StatusInternalServerError, "PREVIEW_FAILED", "Failed to generate preview URL")
		return
	}
	logrus.Infof("[PREVIEW] Successfully generated presigned URL for document %s", documentID)

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
		document *services.DocumentResponse
		err      error
	}

	resultChan := make(chan uploadResult, len(req.Files))

	// Use WaitGroup to wait for all goroutines
	var wg sync.WaitGroup

	// Process each file concurrently
	for i, file := range req.Files {
		wg.Add(1)
		go func(idx int, f *multipart.FileHeader, meta validations.FileMetadata) {
			defer wg.Done()

			// Create individual request for each file using its metadata
			uploadReq := &services.UploadDocumentRequest{
				Title:       meta.Title,
				Description: meta.Description,
				Tags:        meta.Tags,
				IsPublic:    meta.IsPublic,
			}

			// Upload the document
			document, uploadErr := h.documentService.UploadDocument(ctx, userID, f, uploadReq)

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
	successfulUploads := []*services.DocumentResponse{}
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

	// Determine response status
	if len(successfulUploads) == 0 {
		// All uploads failed
		utils.ErrorResponse(c, http.StatusBadRequest, "ALL_UPLOADS_FAILED", "All file uploads failed")
		return
	} else if len(failedUploads) > 0 {
		// Partial success
		utils.SuccessResponse(c, http.StatusPartialContent, response,
			fmt.Sprintf("Uploaded %d out of %d files successfully", len(successfulUploads), len(req.Files)))
		return
	}

	// All uploads successful
	utils.SuccessResponse(c, http.StatusCreated, response,
		fmt.Sprintf("All %d files uploaded successfully", len(req.Files)))
}

// BulkDeleteDocuments deletes multiple documents concurrently
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

	logrus.Infof("[BULK_DELETE] Starting bulk delete for user %s: %d documents", userID, len(req.DocumentIDs))

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

	// Use WaitGroup to wait for all goroutines
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

			// Delete the document
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

	logrus.Infof("[BULK_DELETE] Completed: %d successful, %d failed", successfulDeletes, failedDeletes)

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
		// All deletes failed
		utils.ErrorResponse(c, http.StatusBadRequest, "ALL_DELETES_FAILED", "All document deletions failed")
		return
	} else if failedDeletes > 0 {
		// Partial success
		utils.SuccessResponse(c, http.StatusPartialContent, response,
			fmt.Sprintf("Deleted %d out of %d documents successfully", successfulDeletes, len(req.DocumentIDs)))
		return
	}

	// All deletes successful
	utils.SuccessResponse(c, http.StatusOK, response,
		fmt.Sprintf("All %d documents deleted successfully", len(req.DocumentIDs)))
}

// BulkDownloadDocuments creates a ZIP file with multiple documents and returns download link
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

	logrus.Infof("[BULK_DOWNLOAD] Starting bulk download for user %s: %d documents", userID, len(req.DocumentIDs))

	// Create context with timeout
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Minute)
	defer cancel()

	// Channel to collect document fetch results
	type documentResult struct {
		document *models.Document
		content  []byte
		error    error
	}

	resultChan := make(chan documentResult, len(req.DocumentIDs))
	semaphore := make(chan struct{}, 5) // Limit concurrent downloads to 5

	// Use WaitGroup to wait for all goroutines
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

			// Get document metadata
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

	// Collect all results and create ZIP
	var zipBuffer bytes.Buffer
	zipWriter := zip.NewWriter(&zipBuffer)

	successfulDownloads := 0
	failedDownloads := 0
	usedFilenames := make(map[string]bool) // Track used filenames to avoid duplicates

	for result := range resultChan {
		if result.error != nil {
			failedDownloads++
			logrus.Errorf("[BULK_DOWNLOAD] Error: %v", result.error)
			continue
		}

		// Add file to ZIP
		// Use original filename, but handle duplicates
		filename := result.document.OriginalFileName
		counter := 1
		baseFilename := strings.TrimSuffix(filename, filepath.Ext(filename))
		extension := filepath.Ext(filename)

		// Check for duplicate filenames and add counter if needed
		originalFilename := filename
		for usedFilenames[filename] {
			filename = fmt.Sprintf("%s_%d%s", baseFilename, counter, extension)
			counter++
		}

		// Mark filename as used
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

		logrus.Infof("[BULK_DOWNLOAD] Added file to ZIP: %s (original: %s, size: %d bytes)",
			filename, originalFilename, len(result.content))
		successfulDownloads++
	}

	// Close ZIP writer
	err = zipWriter.Close()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "ZIP_CREATION_FAILED", "Failed to create ZIP file")
		return
	}

	if successfulDownloads == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, "NO_FILES_DOWNLOADED", "No files could be downloaded")
		return
	}

	// Generate filename for ZIP
	timestamp := time.Now().Format("20060102_150405")
	zipFilename := fmt.Sprintf("documents_%s.zip", timestamp)

	logrus.Infof("[BULK_DOWNLOAD] Created ZIP with %d files, size: %d bytes", successfulDownloads, zipBuffer.Len())

	// Set response headers for ZIP download
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", zipFilename))
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Length", fmt.Sprintf("%d", zipBuffer.Len()))
	c.Header("Cache-Control", "no-cache")

	// Send ZIP file data
	c.Data(http.StatusOK, "application/zip", zipBuffer.Bytes())

	logrus.Infof("[BULK_DOWNLOAD] ZIP download completed: %s (%d files)", zipFilename, successfulDownloads)
}
