package services

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/fts"
	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/repositories/interfaces"
	"github.com/eyuppastirmaci/noesis-forge/internal/types"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type DocumentService struct {
	documentRepo     interfaces.DocumentRepository
	searchRepo       interfaces.DocumentSearchRepository
	searchStrategies []types.SearchStrategy
	minioService     *MinIOService
	userShareService *UserShareService
	db               *gorm.DB
}

func NewDocumentService(
	documentRepo interfaces.DocumentRepository,
	searchRepo interfaces.DocumentSearchRepository,
	minioService *MinIOService,
	userShareService *UserShareService,
	db *gorm.DB,
) *DocumentService {
	searchStrategies := []types.SearchStrategy{
		fts.NewExactFTSStrategy(db), // Will catch only advanced queries
		fts.NewFuzzyFTSStrategy(db), // Will handle most of the remaining queries
		fts.NewTrigramStrategy(db),  // Fallback
		fts.NewPatternStrategy(db),  // Last-resort fallback
	}

	return &DocumentService{
		documentRepo:     documentRepo,
		searchRepo:       searchRepo,
		searchStrategies: searchStrategies,
		minioService:     minioService,
		userShareService: userShareService,
		db:               db,
	}
}

// Handles document search with multiple strategies
func (s *DocumentService) SearchDocuments(ctx context.Context, req *types.DocumentListRequest, userID uuid.UUID) (*types.SearchResult, error) {
	// Preprocess search query
	cleanSearch, tokens := utils.PreprocessQuery(req.Search)
	useSearch := cleanSearch != ""

	searchReq := &types.SearchRequest{
		UserID:   userID,
		Query:    cleanSearch,
		Tokens:   tokens,
		Page:     req.Page,
		Limit:    req.Limit,
		FileType: req.FileType,
		Status:   req.Status,
		Tags:     req.Tags,
		SortBy:   req.SortBy,
		SortDir:  req.SortDir,
	}

	// Auto-adjust sorting when no search query
	if !useSearch && searchReq.SortBy == "relevance" {
		searchReq.SortBy = "date"
		searchReq.SortDir = "desc"
	}

	// Apply filters function
	addFilters := func(q *gorm.DB) *gorm.DB {
		return s.applyFilters(q, searchReq)
	}

	if useSearch {
		// Try search strategies in order
		for _, strategy := range s.searchStrategies {
			if strategy.CanHandle(searchReq) {
				result, err := strategy.Search(ctx, searchReq, addFilters)
				if err == nil && result.Total > 0 {
					return result, nil
				}
			}
		}
		// No search results found
		logrus.Warnf("No strategy could find results for query: '%s'", searchReq.Query)
		return &types.SearchResult{}, nil
	}

	// Normal listing (no search) - use basic repository
	baseQuery := s.db.WithContext(ctx).Model(&models.Document{}).Where("user_id = ?", userID)
	query := addFilters(baseQuery)

	var total int64
	if err := query.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, err
	}

	orderBy := s.buildOrderBy(searchReq)
	var docs []models.Document
	if err := query.Order(orderBy).
		Offset((searchReq.Page - 1) * searchReq.Limit).
		Limit(searchReq.Limit).
		Find(&docs).Error; err != nil {
		return nil, err
	}

	totalPages := int((total + int64(searchReq.Limit) - 1) / int64(searchReq.Limit))

	return &types.SearchResult{
		Documents:  docs,
		Total:      total,
		Page:       searchReq.Page,
		Limit:      searchReq.Limit,
		TotalPages: totalPages,
	}, nil
}

func (s *DocumentService) applyFilters(q *gorm.DB, req *types.SearchRequest) *gorm.DB {
	if req.FileType != "" && req.FileType != "all" {
		q = q.Where("file_type = ?", req.FileType)
	}
	if req.Status != "" && req.Status != "all" {
		q = q.Where("status = ?", req.Status)
	}
	if req.Tags != "" {
		tags := strings.Split(req.Tags, ",")
		for _, tag := range tags {
			trimmedTag := strings.TrimSpace(tag)
			if trimmedTag != "" {
				q = q.Where("tags ILIKE ?", "%"+trimmedTag+"%")
			}
		}
	}
	return q
}

func (s *DocumentService) buildOrderBy(req *types.SearchRequest) string {
	sortableCols := map[string]string{
		"date":      "created_at",
		"title":     "LOWER(title)",
		"size":      "file_size",
		"views":     "view_count",
		"downloads": "download_count",
	}

	col, ok := sortableCols[req.SortBy]
	if !ok {
		col = "created_at"
	}

	dir := "DESC"
	if strings.ToLower(req.SortDir) == "asc" {
		dir = "ASC"
	}

	return col + " " + dir
}

// Handles document upload with business logic
func (s *DocumentService) UploadDocument(ctx context.Context, userID uuid.UUID, file *multipart.FileHeader, req *types.UploadDocumentRequest) (*types.DocumentResponse, error) {
	// Business rule: Validate file
	if err := s.validateFile(file); err != nil {
		return nil, err
	}

	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Generate storage path
	fileUUID := uuid.New()
	ext := filepath.Ext(file.Filename)
	uuidFileName := fileUUID.String() + ext
	objectName := fmt.Sprintf("users/%s/documents/%s", userID.String(), uuidFileName)

	// Get file content type
	contentType := file.Header.Get("Content-Type")

	// Upload to MinIO (external service)
	bucketName := s.minioService.config.BucketName
	if err := s.minioService.UploadFile(ctx, bucketName, objectName, src, file.Size, contentType); err != nil {
		return nil, fmt.Errorf("failed to upload file to storage: %w", err)
	}

	// Determine file type (business logic)
	fileType := s.getDocumentType(file.Filename)

	// Create document model
	document := &models.Document{
		Title:            req.Title,
		Description:      req.Description,
		FileName:         uuidFileName,
		OriginalFileName: file.Filename,
		FileSize:         file.Size,
		FileType:         fileType,
		MimeType:         contentType,
		Status:           models.DocumentStatusProcessing,
		StoragePath:      objectName,
		StorageBucket:    bucketName,
		Tags:             req.Tags,
		IsPublic:         req.IsPublic,
		UserID:           userID,
		Version:          1,
	}

	// Handle PDF-specific processing
	if fileType == models.DocumentTypePDF {
		// Extract page count (business logic)
		pageCount, err := s.extractPDFPageCount(ctx, file)
		if err != nil {
			logrus.Warnf("Failed to extract PDF page count for %s: %v", file.Filename, err)
		} else {
			document.PageCount = pageCount
		}

		// Generate thumbnail (business logic)
		thumbnailPath, err := s.generatePDFThumbnail(ctx, file, objectName)
		if err != nil {
			logrus.Warnf("Failed to generate PDF thumbnail for %s: %v", file.Filename, err)
			document.HasThumbnail = false
		} else {
			document.ThumbnailPath = thumbnailPath
			document.HasThumbnail = true
		}
	}

	// Save to database via repository
	if err := s.documentRepo.Create(ctx, document); err != nil {
		// Cleanup uploaded file if database save fails
		if cleanupErr := s.minioService.DeleteFile(ctx, objectName); cleanupErr != nil {
			logrus.Errorf("Failed to cleanup uploaded file after database error: %v", cleanupErr)
		}
		return nil, fmt.Errorf("failed to save document record: %w", err)
	}

	// Update status to ready (business rule)
	document.Status = models.DocumentStatusReady
	now := time.Now()
	document.ProcessedAt = &now

	if err := s.documentRepo.Update(ctx, document); err != nil {
		logrus.Errorf("Failed to update document status: %v", err)
	}

	return s.toDocumentResponse(document), nil
}

// Gandles document updates with business logic
func (s *DocumentService) UpdateDocument(ctx context.Context, userID, documentID uuid.UUID, file *multipart.FileHeader, req *types.UpdateDocumentRequest) (*types.DocumentResponse, error) {
	// First, get the existing document and verify access
	existingDocument, err := s.getDocumentWithAccess(ctx, userID, documentID, models.AccessLevelEdit)
	if err != nil {
		return nil, err
	}

	// Backup old storage paths for cleanup
	oldStoragePath := existingDocument.StoragePath
	oldThumbnailPath := existingDocument.ThumbnailPath

	// Keep original for change detection
	origDocument := *existingDocument
	var newStoragePath, newThumbnailPath string

	// Handle file update if provided
	if req.HasNewFile && file != nil {
		// Validate new file
		if err := s.validateFile(file); err != nil {
			return nil, err
		}

		// Process new file upload
		newStoragePath, newThumbnailPath, err = s.processFileUpdate(ctx, userID, file, existingDocument)
		if err != nil {
			return nil, err
		}
	}

	// Update metadata fields
	existingDocument.Title = req.Title
	existingDocument.Description = req.Description
	existingDocument.Tags = req.Tags
	existingDocument.IsPublic = req.IsPublic

	// Update processing status if new file
	if req.HasNewFile {
		existingDocument.Status = models.DocumentStatusReady
		now := time.Now()
		existingDocument.ProcessedAt = &now
	}

	// Detect changes and handle versioning
	changes := s.detectChanges(&origDocument, existingDocument, req.HasNewFile)
	if len(changes) > 0 {
		existingDocument.Version = existingDocument.Version + 1
	}

	// Save via repository
	if err := s.documentRepo.Update(ctx, existingDocument); err != nil {
		// Cleanup new files if database update fails
		s.cleanupFailedUpdate(ctx, newStoragePath, newThumbnailPath)
		return nil, fmt.Errorf("failed to update document record: %w", err)
	}

	// Cleanup old files after successful update
	if req.HasNewFile {
		s.cleanupOldFiles(ctx, oldStoragePath, oldThumbnailPath)
	}

	return s.toDocumentResponse(existingDocument), nil
}

// Delegates to search service
func (s *DocumentService) GetDocuments(ctx context.Context, userID uuid.UUID, req *types.DocumentListRequest) (*types.DocumentListResponse, error) {
	// Convert to search request format
	searchReq := &types.DocumentListRequest{
		Page:     req.Page,
		Limit:    req.Limit,
		Search:   req.Search,
		FileType: req.FileType,
		Status:   req.Status,
		Tags:     req.Tags,
		SortBy:   req.SortBy,
		SortDir:  req.SortDir,
	}

	// Delegate to search service
	result, err := s.SearchDocuments(ctx, searchReq, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to search documents: %w", err)
	}

	// Convert to response format
	return s.convertSearchResultToDocumentList(result), nil
}

// Retrieves single document with access control
func (s *DocumentService) GetDocument(ctx context.Context, userID, documentID uuid.UUID) (*types.DocumentResponse, error) {
	// Try to get document with access control
	document, userAccessLevel, err := s.getDocumentWithAccessLevel(ctx, userID, documentID, models.AccessLevelView)
	if err != nil {
		return nil, err
	}

	// Increment view count via repository
	if err := s.documentRepo.IncrementViewCount(ctx, documentID); err != nil {
		logrus.Warnf("Failed to increment view count for document %s: %v", documentID, err)
	}

	return s.toDocumentResponseWithAccess(document, userAccessLevel), nil
}

// Retrieves only document title
func (s *DocumentService) GetDocumentTitle(ctx context.Context, userID, documentID uuid.UUID) (string, error) {
	// Verify access first
	document, err := s.getDocumentWithAccess(ctx, userID, documentID, models.AccessLevelView)
	if err != nil {
		return "", err
	}

	return document.Title, nil
}

// Handles document deletion
func (s *DocumentService) DeleteDocument(ctx context.Context, userID, documentID uuid.UUID) error {
	// Verify ownership (only owners can delete)
	document, err := s.documentRepo.GetByIDAndUserID(ctx, documentID, userID)
	if err != nil {
		return fmt.Errorf("document not found or access denied")
	}

	// Delete from storage first
	if err := s.minioService.DeleteFile(ctx, document.StoragePath); err != nil {
		logrus.Errorf("Failed to delete file from storage: %v", err)
		// Continue with database deletion even if storage deletion fails
	}

	// Delete thumbnail if exists
	if document.HasThumbnail && document.ThumbnailPath != "" {
		if err := s.minioService.DeleteFile(ctx, document.ThumbnailPath); err != nil {
			logrus.Errorf("Failed to delete thumbnail from storage: %v", err)
		}
	}

	// Delete from database via repository
	if err := s.documentRepo.Delete(ctx, documentID); err != nil {
		return fmt.Errorf("failed to delete document from database: %w", err)
	}

	return nil
}

// Prepares document for download
func (s *DocumentService) DownloadDocument(ctx context.Context, userID, documentID uuid.UUID) (*models.Document, error) {
	// Get document with download access
	document, err := s.getDocumentWithAccess(ctx, userID, documentID, models.AccessLevelDownload)
	if err != nil {
		return nil, err
	}

	// Increment download count via repository
	if err := s.documentRepo.IncrementDownloadCount(ctx, documentID); err != nil {
		logrus.Warnf("Failed to increment download count for document %s: %v", documentID, err)
	}

	return document, nil
}

// Retrieves document version history
func (s *DocumentService) GetDocumentRevisions(ctx context.Context, userID, documentID uuid.UUID) ([]models.DocumentRevision, error) {
	// Verify access first
	_, err := s.getDocumentWithAccess(ctx, userID, documentID, models.AccessLevelView)
	if err != nil {
		return nil, err
	}

	// Get revisions via repository
	revisions, err := s.documentRepo.GetRevisions(ctx, documentID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch revisions: %w", err)
	}

	return revisions, nil
}

// Retrieves user document statistics
func (s *DocumentService) GetUserStats(ctx context.Context, userID uuid.UUID) (*types.UserStatsResponse, error) {
	stats, err := s.documentRepo.GetUserStats(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Convert from fts.UserStatsResponse to services.UserStatsResponse
	return &types.UserStatsResponse{
		DocumentsThisMonth: stats.DocumentsThisMonth,
		TotalStorageUsage:  stats.TotalStorageUsage,
	}, nil
}

// Retrieves document model for internal use
func (s *DocumentService) GetDocumentModel(ctx context.Context, userID, documentID uuid.UUID, document *models.Document) error {
	doc, err := s.documentRepo.GetByIDAndUserID(ctx, documentID, userID)
	if err != nil {
		return err
	}
	*document = *doc
	return nil
}

// Retrieves document with access control
func (s *DocumentService) getDocumentWithAccess(ctx context.Context, userID, documentID uuid.UUID, requiredAccess models.AccessLevel) (*models.Document, error) {
	// Try to get as owner first
	document, err := s.documentRepo.GetByIDAndUserID(ctx, documentID, userID)
	if err == nil {
		return document, nil
	}

	// Check if document exists at all
	document, err = s.documentRepo.GetByID(ctx, documentID)
	if err != nil {
		return nil, fmt.Errorf("document not found")
	}

	// Check shared access if UserShareService is available
	if s.userShareService != nil {
		hasAccess, err := s.userShareService.ValidateUserAccess(ctx, userID, documentID, requiredAccess)
		if err != nil {
			logrus.Errorf("Error checking shared access for user %s to document %s: %v", userID, documentID, err)
			return nil, fmt.Errorf("document not found or access denied")
		}
		if !hasAccess {
			return nil, fmt.Errorf("document not found or access denied")
		}
		return document, nil
	}

	return nil, fmt.Errorf("document not found or access denied")
}

// Retrieves document with access level information
func (s *DocumentService) getDocumentWithAccessLevel(ctx context.Context, userID, documentID uuid.UUID, requiredAccess models.AccessLevel) (*models.Document, string, error) {
	// Try to get as owner first
	document, err := s.documentRepo.GetByIDAndUserID(ctx, documentID, userID)
	if err == nil {
		return document, "owner", nil
	}

	// Check shared access
	document, err = s.documentRepo.GetByID(ctx, documentID)
	if err != nil {
		return nil, "", fmt.Errorf("document not found")
	}

	if s.userShareService != nil {
		accessLevel, err := s.userShareService.GetUserAccessLevel(ctx, userID, documentID)
		if err != nil || accessLevel == "" {
			return nil, "", fmt.Errorf("document not found or access denied")
		}

		// Validate required access level
		if !s.hasRequiredAccess(accessLevel, requiredAccess) {
			return nil, "", fmt.Errorf("insufficient access level")
		}

		return document, accessLevel, nil
	}

	return nil, "", fmt.Errorf("document not found or access denied")
}

// Checks if user access level meets requirement
func (s *DocumentService) hasRequiredAccess(userAccess string, required models.AccessLevel) bool {
	accessLevels := map[string]int{
		"download": 1,
		"view":     2,
		"edit":     3,
		"owner":    4,
	}

	requiredLevels := map[models.AccessLevel]int{
		models.AccessLevelDownload: 1,
		models.AccessLevelView:     2,
		models.AccessLevelEdit:     3,
	}

	userLevel := accessLevels[userAccess]
	requiredLevel := requiredLevels[required]

	return userLevel >= requiredLevel
}

// Handles new file upload during update
func (s *DocumentService) processFileUpdate(ctx context.Context, userID uuid.UUID, file *multipart.FileHeader, document *models.Document) (string, string, error) {
	// Open file
	src, err := file.Open()
	if err != nil {
		return "", "", fmt.Errorf("failed to open new file: %w", err)
	}
	defer src.Close()

	// Generate new file path
	fileUUID := uuid.New()
	ext := filepath.Ext(file.Filename)
	uuidFileName := fileUUID.String() + ext
	objectName := fmt.Sprintf("users/%s/documents/%s", userID.String(), uuidFileName)

	// Upload to MinIO
	contentType := file.Header.Get("Content-Type")
	bucketName := s.minioService.config.BucketName
	if err := s.minioService.UploadFile(ctx, bucketName, objectName, src, file.Size, contentType); err != nil {
		return "", "", fmt.Errorf("failed to upload new file to storage: %w", err)
	}

	// Update document fields
	fileType := s.getDocumentType(file.Filename)
	document.FileName = uuidFileName
	document.OriginalFileName = file.Filename
	document.FileSize = file.Size
	document.FileType = fileType
	document.MimeType = contentType
	document.StoragePath = objectName
	document.StorageBucket = bucketName
	document.Status = models.DocumentStatusProcessing
	document.Version = document.Version + 1

	var thumbnailPath string
	// Generate thumbnail for PDF
	if fileType == models.DocumentTypePDF {
		thumbnailPath, err = s.generatePDFThumbnail(ctx, file, objectName)
		if err != nil {
			logrus.Warnf("Failed to generate PDF thumbnail for %s: %v", file.Filename, err)
			document.HasThumbnail = false
			document.ThumbnailPath = ""
		} else {
			document.ThumbnailPath = thumbnailPath
			document.HasThumbnail = true
		}
	} else {
		document.HasThumbnail = false
		document.ThumbnailPath = ""
	}

	return objectName, thumbnailPath, nil
}

// Compares old and new document state
func (s *DocumentService) detectChanges(orig, updated *models.Document, hasNewFile bool) map[string]interface{} {
	changes := make(map[string]interface{})

	if orig.Title != updated.Title {
		changes["title"] = map[string]interface{}{"old": orig.Title, "new": updated.Title}
	}
	if orig.Description != updated.Description {
		changes["description"] = map[string]interface{}{"old": orig.Description, "new": updated.Description}
	}
	if orig.Tags != updated.Tags {
		changes["tags"] = map[string]interface{}{"old": orig.Tags, "new": updated.Tags}
	}
	if orig.IsPublic != updated.IsPublic {
		changes["isPublic"] = map[string]interface{}{"old": orig.IsPublic, "new": updated.IsPublic}
	}
	if hasNewFile {
		changes["file"] = "updated"
	}

	return changes
}

// Removes files if update fails
func (s *DocumentService) cleanupFailedUpdate(ctx context.Context, storagePath, thumbnailPath string) {
	if storagePath != "" {
		if err := s.minioService.DeleteFile(ctx, storagePath); err != nil {
			logrus.Errorf("Failed to cleanup new uploaded file: %v", err)
		}
	}
	if thumbnailPath != "" {
		if err := s.minioService.DeleteFile(ctx, thumbnailPath); err != nil {
			logrus.Errorf("Failed to cleanup new thumbnail: %v", err)
		}
	}
}

// Removes old files after successful update
func (s *DocumentService) cleanupOldFiles(ctx context.Context, oldStoragePath, oldThumbnailPath string) {
	if oldStoragePath != "" {
		if err := s.minioService.DeleteFile(ctx, oldStoragePath); err != nil {
			logrus.Errorf("Failed to delete old file from storage: %v", err)
		}
	}
	if oldThumbnailPath != "" {
		if err := s.minioService.DeleteFile(ctx, oldThumbnailPath); err != nil {
			logrus.Errorf("Failed to delete old thumbnail from storage: %v", err)
		}
	}
}

// Converts search result to document list response
func (s *DocumentService) convertSearchResultToDocumentList(result *types.SearchResult) *types.DocumentListResponse {
	documents := make([]types.DocumentResponse, len(result.Documents))
	for i, doc := range result.Documents {
		responseDoc := s.toDocumentResponse(&doc)
		documents[i] = *responseDoc
	}

	return &types.DocumentListResponse{
		Documents:  documents,
		Total:      result.Total,
		Page:       result.Page,
		Limit:      result.Limit,
		TotalPages: result.TotalPages,
	}
}

// Validation and utility methods

// Validates uploaded file
func (s *DocumentService) validateFile(file *multipart.FileHeader) error {
	// Check file size (max 100MB)
	maxSize := int64(100 * 1024 * 1024) // 100MB
	if file.Size > maxSize {
		return fmt.Errorf("file size too large: maximum allowed is 100MB")
	}

	// Check file extension
	allowedExtensions := map[string]bool{
		".pdf":  true,
		".docx": true,
		".doc":  true,
		".txt":  true,
		".xlsx": true,
		".xls":  true,
		".pptx": true,
		".ppt":  true,
		".md":   true,
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedExtensions[ext] {
		return fmt.Errorf("file type not supported: %s", ext)
	}

	return nil
}

// Determines document type from filename
func (s *DocumentService) getDocumentType(filename string) models.DocumentType {
	ext := strings.ToLower(filepath.Ext(filename))

	switch ext {
	case ".pdf":
		return models.DocumentTypePDF
	case ".docx", ".doc":
		return models.DocumentTypeDOCX
	case ".txt", ".md":
		return models.DocumentTypeTXT
	case ".xlsx", ".xls":
		return models.DocumentTypeXLSX
	case ".pptx", ".ppt":
		return models.DocumentTypePPTX
	default:
		return models.DocumentTypeOther
	}
}

// Response conversion methods

// Converts model to response
func (s *DocumentService) toDocumentResponse(doc *models.Document) *types.DocumentResponse {
	return &types.DocumentResponse{
		ID:               doc.ID,
		Title:            doc.Title,
		Description:      doc.Description,
		FileName:         doc.FileName,
		OriginalFileName: doc.OriginalFileName,
		FileSize:         doc.FileSize,
		FileType:         doc.FileType,
		MimeType:         doc.MimeType,
		Status:           doc.Status,
		Version:          doc.Version,
		Tags:             doc.Tags,
		IsPublic:         doc.IsPublic,
		ViewCount:        doc.ViewCount,
		DownloadCount:    doc.DownloadCount,
		PageCount:        doc.PageCount,
		UserID:           doc.UserID,
		ProcessedAt:      doc.ProcessedAt,
		CreatedAt:        doc.CreatedAt,
		UpdatedAt:        doc.UpdatedAt,
		HasThumbnail:     doc.HasThumbnail,
		UserAccessLevel:  "owner",
		StoragePath:      doc.StoragePath,
	}
}

// Converts model to response with access level
func (s *DocumentService) toDocumentResponseWithAccess(doc *models.Document, userAccessLevel string) *types.DocumentResponse {
	response := s.toDocumentResponse(doc)
	response.UserAccessLevel = userAccessLevel
	return response
}

// PDF processing methods

// Extracts page count from PDF using ImageMagick
func (s *DocumentService) extractPDFPageCount(ctx context.Context, file *multipart.FileHeader) (*int, error) {
	// Create temp directory
	os.MkdirAll("temp", 0755)

	// Save file temporarily
	tempFile := filepath.Join("temp", fmt.Sprintf("%s.pdf", uuid.New().String()))
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	dst, err := os.Create(tempFile)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file: %w", err)
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	if err != nil {
		return nil, fmt.Errorf("failed to copy file content: %w", err)
	}
	dst.Close()

	defer os.Remove(tempFile)

	// Get ImageMagick command
	var magickCmd string
	if _, err := exec.LookPath("magick"); err == nil {
		magickCmd = "magick"
	} else if _, err := exec.LookPath("convert"); err == nil {
		magickCmd = "convert"
	} else {
		magickCmd = "C:\\ImageMagick\\magick.exe"
	}

	// Extract page count
	cmd := exec.Command(magickCmd, "identify", "-format", "%n", tempFile)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("ImageMagick identify failed: %s, error: %w", string(output), err)
	}

	pageCountStr := strings.TrimSpace(string(output))
	if pageCountStr == "" {
		return nil, fmt.Errorf("empty page count output from ImageMagick")
	}

	pageCount := 0
	if _, err := fmt.Sscanf(pageCountStr, "%d", &pageCount); err != nil {
		return nil, fmt.Errorf("failed to parse page count: %w", err)
	}

	return &pageCount, nil
}

// Creates thumbnail from PDF first page
func (s *DocumentService) generatePDFThumbnail(ctx context.Context, file *multipart.FileHeader, pdfObjectName string) (string, error) {
	// Create temp directory
	os.MkdirAll("temp", 0755)

	// Save uploaded file temporarily
	tempFile := filepath.Join("temp", fmt.Sprintf("%s.pdf", uuid.New().String()))
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	dst, err := os.Create(tempFile)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	if err != nil {
		return "", fmt.Errorf("failed to copy file content: %w", err)
	}
	dst.Close()

	thumbnailFile := strings.TrimSuffix(tempFile, ".pdf") + ".jpg"

	// Get ImageMagick command
	var magickCmd string
	if _, err := exec.LookPath("magick"); err == nil {
		magickCmd = "magick"
	} else if _, err := exec.LookPath("convert"); err == nil {
		magickCmd = "convert"
	} else {
		magickCmd = "C:\\ImageMagick\\magick.exe"
	}

	// Generate thumbnail
	cmd := exec.Command(
		magickCmd,
		"-density", "150",
		tempFile+"[0]",
		"-flatten",
		"-background", "white",
		"-alpha", "remove",
		"-resize", "300x400^",
		"-quality", "85",
		thumbnailFile,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		os.Remove(tempFile)
		return "", fmt.Errorf("ImageMagick failed: %s, error: %w", string(output), err)
	}

	// Read generated thumbnail
	thumbnailBytes, err := os.ReadFile(thumbnailFile)
	if err != nil {
		os.Remove(tempFile)
		os.Remove(thumbnailFile)
		return "", fmt.Errorf("failed to read thumbnail: %w", err)
	}

	// Upload thumbnail to MinIO
	thumbnailName := fmt.Sprintf("thumbnails/%s.jpg", strings.TrimSuffix(pdfObjectName, filepath.Ext(pdfObjectName)))
	_, err = s.minioService.UploadThumbnail(ctx, thumbnailName, thumbnailBytes, "image/jpeg")
	if err != nil {
		os.Remove(tempFile)
		os.Remove(thumbnailFile)
		return "", fmt.Errorf("failed to upload thumbnail to MinIO: %w", err)
	}

	// Cleanup temp files
	os.Remove(tempFile)
	os.Remove(thumbnailFile)

	return thumbnailName, nil
}
