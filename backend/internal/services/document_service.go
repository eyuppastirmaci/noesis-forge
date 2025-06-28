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

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type DocumentService struct {
	db           *gorm.DB
	minioService *MinIOService
}

type UploadDocumentRequest struct {
	Title       string `json:"title" validate:"required,min=1,max=255"`
	Description string `json:"description" validate:"max=1000"`
	Tags        string `json:"tags" validate:"max=500"`
	IsPublic    bool   `json:"isPublic"`
}

type UpdateDocumentRequest struct {
	Title       string `json:"title" validate:"required,min=1,max=255"`
	Description string `json:"description" validate:"max=1000"`
	Tags        string `json:"tags" validate:"max=500"`
	IsPublic    bool   `json:"isPublic"`
	HasNewFile  bool   `json:"hasNewFile"`
}

type DocumentResponse struct {
	ID               uuid.UUID             `json:"id"`
	Title            string                `json:"title"`
	Description      string                `json:"description"`
	FileName         string                `json:"fileName"`         // UUID-based filename
	OriginalFileName string                `json:"originalFileName"` // Original filename from user
	FileSize         int64                 `json:"fileSize"`
	FileType         models.DocumentType   `json:"fileType"`
	MimeType         string                `json:"mimeType"`
	Status           models.DocumentStatus `json:"status"`
	Version          int                   `json:"version"`
	Tags             string                `json:"tags"`
	IsPublic         bool                  `json:"isPublic"`
	ViewCount        int64                 `json:"viewCount"`
	DownloadCount    int64                 `json:"downloadCount"`
	UserID           uuid.UUID             `json:"userID"`
	ProcessedAt      *time.Time            `json:"processedAt,omitempty"`
	CreatedAt        time.Time             `json:"createdAt"`
	UpdatedAt        time.Time             `json:"updatedAt"`
	HasThumbnail     bool                  `json:"hasThumbnail"`
}

type DocumentListRequest struct {
	Page     int    `json:"page" validate:"min=1"`
	Limit    int    `json:"limit" validate:"min=1,max=100"`
	Search   string `json:"search"`
	FileType string `json:"fileType"`
	Status   string `json:"status"`
	Tags     string `json:"tags"`
	SortBy   string `json:"sortBy"`  // name, date, size, views
	SortDir  string `json:"sortDir"` // asc, desc
}

type DocumentListResponse struct {
	Documents  []DocumentResponse `json:"documents"`
	Total      int64              `json:"total"`
	Page       int                `json:"page"`
	Limit      int                `json:"limit"`
	TotalPages int                `json:"totalPages"`
}

func NewDocumentService(db *gorm.DB, minioService *MinIOService) *DocumentService {
	return &DocumentService{
		db:           db,
		minioService: minioService,
	}
}

func (s *DocumentService) UploadDocument(ctx context.Context, userID uuid.UUID, file *multipart.FileHeader, req *UploadDocumentRequest) (*DocumentResponse, error) {
	// Validate file
	if err := s.validateFile(file); err != nil {
		return nil, err
	}

	// Upload to MinIO
	uploadResult, err := s.minioService.UploadFile(ctx, userID, file)
	if err != nil {
		return nil, fmt.Errorf("failed to upload file to storage: %w", err)
	}

	// Determine file type
	fileType := s.getDocumentType(file.Filename)

	// Create document record
	document := &models.Document{
		Title:            req.Title,
		Description:      req.Description,
		FileName:         uploadResult.FileName, // UUID-based filename
		OriginalFileName: file.Filename,         // Original filename from user
		FileSize:         file.Size,
		FileType:         fileType,
		MimeType:         file.Header.Get("Content-Type"),
		Status:           models.DocumentStatusProcessing,
		StoragePath:      uploadResult.ObjectName,
		StorageBucket:    s.minioService.config.BucketName,
		Tags:             req.Tags,
		IsPublic:         req.IsPublic,
		UserID:           userID,
		Version:          1,
	}

	// Generate thumbnail for PDF files
	if fileType == models.DocumentTypePDF {
		thumbnailPath, err := s.generatePDFThumbnail(ctx, file, uploadResult.ObjectName)
		if err != nil {
			logrus.Warnf("Failed to generate PDF thumbnail for %s: %v", file.Filename, err)
			// Continue without thumbnail - don't fail the upload
			document.HasThumbnail = false
		} else {
			document.ThumbnailPath = thumbnailPath
			document.HasThumbnail = true
		}
	}

	if err := s.db.Create(document).Error; err != nil {
		// If database save fails, clean up uploaded file
		if cleanupErr := s.minioService.DeleteFile(ctx, uploadResult.ObjectName); cleanupErr != nil {
			logrus.Errorf("Failed to cleanup uploaded file after database error: %v", cleanupErr)
		}
		return nil, fmt.Errorf("failed to save document record: %w", err)
	}

	// TODO: Queue document for processing (text extraction, embedding generation)
	// For now, mark as ready immediately
	document.Status = models.DocumentStatusReady
	document.ProcessedAt = &time.Time{}
	now := time.Now()
	document.ProcessedAt = &now

	if err := s.db.Save(document).Error; err != nil {
		logrus.Errorf("Failed to update document status: %v", err)
	}

	logrus.Infof("Document uploaded successfully: %s (ID: %s)", document.FileName, document.ID)

	return s.toDocumentResponse(document), nil
}

func (s *DocumentService) UpdateDocument(ctx context.Context, userID, documentID uuid.UUID, file *multipart.FileHeader, req *UpdateDocumentRequest) (*DocumentResponse, error) {
	// First, get the existing document and verify ownership
	var existingDocument models.Document
	if err := s.db.Where("id = ? AND user_id = ?", documentID, userID).First(&existingDocument).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("document not found or access denied")
		}
		return nil, fmt.Errorf("failed to fetch document: %w", err)
	}

	// Start a transaction for atomic updates
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Backup old storage paths for cleanup if update fails
	oldStoragePath := existingDocument.StoragePath
	oldThumbnailPath := existingDocument.ThumbnailPath

	var newStoragePath, newThumbnailPath string

	// Handle file update if provided
	if req.HasNewFile && file != nil {
		// Validate file
		if err := s.validateFile(file); err != nil {
			tx.Rollback()
			return nil, err
		}

		// Upload new file to MinIO
		uploadResult, err := s.minioService.UploadFile(ctx, userID, file)
		if err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to upload new file to storage: %w", err)
		}

		newStoragePath = uploadResult.ObjectName

		// Determine file type
		fileType := s.getDocumentType(file.Filename)

		// Generate new thumbnail for PDF files
		if fileType == models.DocumentTypePDF {
			thumbnailPath, err := s.generatePDFThumbnail(ctx, file, uploadResult.ObjectName)
			if err != nil {
				logrus.Warnf("Failed to generate PDF thumbnail for %s: %v", file.Filename, err)
				existingDocument.HasThumbnail = false
				existingDocument.ThumbnailPath = ""
			} else {
				newThumbnailPath = thumbnailPath
				existingDocument.ThumbnailPath = thumbnailPath
				existingDocument.HasThumbnail = true
			}
		} else {
			// Non-PDF files don't have thumbnails
			existingDocument.HasThumbnail = false
			existingDocument.ThumbnailPath = ""
		}

		// Update file-related fields
		existingDocument.FileName = uploadResult.FileName
		existingDocument.OriginalFileName = file.Filename
		existingDocument.FileSize = file.Size
		existingDocument.FileType = fileType
		existingDocument.MimeType = file.Header.Get("Content-Type")
		existingDocument.StoragePath = newStoragePath
		existingDocument.StorageBucket = s.minioService.config.BucketName
		existingDocument.Status = models.DocumentStatusProcessing

		// Increment version number
		existingDocument.Version = existingDocument.Version + 1
	}

	// Update metadata fields
	existingDocument.Title = req.Title
	existingDocument.Description = req.Description
	existingDocument.Tags = req.Tags
	existingDocument.IsPublic = req.IsPublic

	// Update processing status
	if req.HasNewFile {
		existingDocument.Status = models.DocumentStatusReady
		now := time.Now()
		existingDocument.ProcessedAt = &now
	}

	// Save the updated document
	if err := tx.Save(&existingDocument).Error; err != nil {
		tx.Rollback()

		// If database save fails and we uploaded new files, clean them up
		if newStoragePath != "" {
			if cleanupErr := s.minioService.DeleteFile(ctx, newStoragePath); cleanupErr != nil {
				logrus.Errorf("Failed to cleanup new uploaded file after database error: %v", cleanupErr)
			}
		}
		if newThumbnailPath != "" {
			if cleanupErr := s.minioService.DeleteFile(ctx, newThumbnailPath); cleanupErr != nil {
				logrus.Errorf("Failed to cleanup new thumbnail after database error: %v", cleanupErr)
			}
		}

		return nil, fmt.Errorf("failed to update document record: %w", err)
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("failed to commit document update: %w", err)
	}

	// Only delete old files AFTER successful database update
	if req.HasNewFile && oldStoragePath != "" {
		// Delete old file from storage
		if err := s.minioService.DeleteFile(ctx, oldStoragePath); err != nil {
			logrus.Errorf("Failed to delete old file from storage: %v", err)
			// Don't fail the request - the update was successful
		}

		// Delete old thumbnail if it existed
		if oldThumbnailPath != "" {
			if err := s.minioService.DeleteFile(ctx, oldThumbnailPath); err != nil {
				logrus.Errorf("Failed to delete old thumbnail from storage: %v", err)
				// Don't fail the request - the update was successful
			}
		}
	}

	logrus.Infof("Document updated successfully: %s (ID: %s, Version: %d)", existingDocument.FileName, existingDocument.ID, existingDocument.Version)

	return s.toDocumentResponse(&existingDocument), nil
}

func (s *DocumentService) GetDocuments(ctx context.Context, userID uuid.UUID, req *DocumentListRequest) (*DocumentListResponse, error) {
	query := s.db.Where("user_id = ?", userID)

	// Apply filters
	if req.Search != "" {
		query = query.Where("title ILIKE ? OR description ILIKE ? OR original_file_name ILIKE ?",
			"%"+req.Search+"%", "%"+req.Search+"%", "%"+req.Search+"%")
	}

	if req.FileType != "" {
		query = query.Where("file_type = ?", req.FileType)
	}

	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	if req.Tags != "" {
		query = query.Where("tags ILIKE ?", "%"+req.Tags+"%")
	}

	// Count total
	var total int64
	if err := query.Model(&models.Document{}).Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count documents: %w", err)
	}

	// Apply sorting
	orderBy := "created_at DESC" // default
	switch req.SortBy {
	case "name":
		orderBy = "title"
	case "date":
		orderBy = "created_at"
	case "size":
		orderBy = "file_size"
	case "views":
		orderBy = "view_count"
	case "downloads":
		orderBy = "download_count"
	}

	if req.SortDir == "asc" {
		orderBy += " ASC"
	} else {
		orderBy += " DESC"
	}

	// Apply pagination
	offset := (req.Page - 1) * req.Limit
	var documents []models.Document

	if err := query.Order(orderBy).Offset(offset).Limit(req.Limit).Find(&documents).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch documents: %w", err)
	}

	// Convert to response
	documentResponses := make([]DocumentResponse, len(documents))
	for i, doc := range documents {
		documentResponses[i] = *s.toDocumentResponse(&doc)
	}

	totalPages := int((total + int64(req.Limit) - 1) / int64(req.Limit))

	return &DocumentListResponse{
		Documents:  documentResponses,
		Total:      total,
		Page:       req.Page,
		Limit:      req.Limit,
		TotalPages: totalPages,
	}, nil
}

func (s *DocumentService) GetDocumentModel(ctx context.Context, userID, documentID uuid.UUID, document *models.Document) error {
	if err := s.db.Where("id = ? AND user_id = ?", documentID, userID).First(document).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("document not found")
		}
		return fmt.Errorf("failed to fetch document: %w", err)
	}
	return nil
}

func (s *DocumentService) GetDocument(ctx context.Context, userID, documentID uuid.UUID) (*DocumentResponse, error) {
	var document models.Document
	if err := s.db.Where("id = ? AND user_id = ?", documentID, userID).First(&document).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("document not found")
		}
		return nil, fmt.Errorf("failed to fetch document: %w", err)
	}

	// Increment view count
	if err := s.db.Model(&document).UpdateColumn("view_count", gorm.Expr("view_count + 1")).Error; err != nil {
		logrus.Warnf("Failed to increment view count for document %s: %v", documentID, err)
	}

	return s.toDocumentResponse(&document), nil
}

func (s *DocumentService) GetDocumentTitle(ctx context.Context, userID, documentID uuid.UUID) (string, error) {
	var document models.Document
	if err := s.db.Select("title").Where("id = ? AND user_id = ?", documentID, userID).First(&document).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", fmt.Errorf("document not found")
		}
		return "", fmt.Errorf("failed to fetch document title: %w", err)
	}

	return document.Title, nil
}

func (s *DocumentService) DeleteDocument(ctx context.Context, userID, documentID uuid.UUID) error {
	var document models.Document
	if err := s.db.Where("id = ? AND user_id = ?", documentID, userID).First(&document).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("document not found")
		}
		return fmt.Errorf("failed to fetch document: %w", err)
	}

	// Delete from storage
	if err := s.minioService.DeleteFile(ctx, document.StoragePath); err != nil {
		logrus.Errorf("Failed to delete file from storage: %v", err)
		// Continue with database deletion even if storage deletion fails
	}

	// Delete from database
	if err := s.db.Delete(&document).Error; err != nil {
		return fmt.Errorf("failed to delete document from database: %w", err)
	}

	logrus.Infof("Document deleted successfully: %s (ID: %s)", document.FileName, document.ID)
	return nil
}

func (s *DocumentService) DownloadDocument(ctx context.Context, userID, documentID uuid.UUID) (*models.Document, error) {
	var document models.Document
	if err := s.db.Where("id = ? AND user_id = ?", documentID, userID).First(&document).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("document not found")
		}
		return nil, fmt.Errorf("failed to fetch document: %w", err)
	}

	// Increment download count
	if err := s.db.Model(&document).UpdateColumn("download_count", gorm.Expr("download_count + 1")).Error; err != nil {
		logrus.Warnf("Failed to increment download count for document %s: %v", documentID, err)
	}

	return &document, nil
}

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

func (s *DocumentService) toDocumentResponse(doc *models.Document) *DocumentResponse {
	return &DocumentResponse{
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
		UserID:           doc.UserID,
		ProcessedAt:      doc.ProcessedAt,
		CreatedAt:        doc.CreatedAt,
		UpdatedAt:        doc.UpdatedAt,
		HasThumbnail:     doc.HasThumbnail,
	}
}

// generatePDFThumbnail creates a JPG thumbnail from PDF's first page using ImageMagick
func (s *DocumentService) generatePDFThumbnail(ctx context.Context, file *multipart.FileHeader, pdfObjectName string) (string, error) {
	logrus.Infof("Generating PDF thumbnail using ImageMagick for: %s", file.Filename)

	// Create temp directory if it doesn't exist
	os.MkdirAll("temp", 0755)

	// Save uploaded file temporarily
	tempFile := filepath.Join("temp", fmt.Sprintf("%s.pdf", uuid.New().String()))
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Create temp file and copy content
	dst, err := os.Create(tempFile)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	if err != nil {
		return "", fmt.Errorf("failed to copy file content: %w", err)
	}
	dst.Close() // Close before ImageMagick uses it

	// Generate thumbnail using ImageMagick
	thumbnailFile := strings.TrimSuffix(tempFile, ".pdf") + ".jpg"

	// ImageMagick command: convert first page to JPG thumbnail
	// Use 'magick' command (works on both Windows and Linux containers)
	var magickCmd string
	if _, err := exec.LookPath("magick"); err == nil {
		magickCmd = "magick"
	} else if _, err := exec.LookPath("convert"); err == nil {
		magickCmd = "convert"
	} else {
		// Fallback to Windows path if running on Windows
		magickCmd = "C:\\ImageMagick\\magick.exe"
	}

	cmd := exec.Command(
		magickCmd,
		"-density", "150", // Set DPI for better quality
		tempFile+"[0]",         // First page only
		"-flatten",             // Flatten layers
		"-background", "white", // White background
		"-alpha", "remove", // Remove transparency
		"-resize", "300x400^", // Resize to thumbnail
		"-quality", "85", // JPEG quality
		thumbnailFile,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		// Cleanup temp file
		os.Remove(tempFile)
		return "", fmt.Errorf("ImageMagick failed: %s, error: %w", string(output), err)
	}

	// Read generated thumbnail
	thumbnailBytes, err := os.ReadFile(thumbnailFile)
	if err != nil {
		// Cleanup temp files
		os.Remove(tempFile)
		os.Remove(thumbnailFile)
		return "", fmt.Errorf("failed to read thumbnail: %w", err)
	}

	// Upload thumbnail to MinIO - use same path structure as documents
	thumbnailName := fmt.Sprintf("thumbnails/%s.jpg", strings.TrimSuffix(pdfObjectName, filepath.Ext(pdfObjectName)))
	_, err = s.minioService.UploadThumbnail(ctx, thumbnailName, thumbnailBytes, "image/jpeg")
	if err != nil {
		// Cleanup temp files
		os.Remove(tempFile)
		os.Remove(thumbnailFile)
		return "", fmt.Errorf("failed to upload thumbnail to MinIO: %w", err)
	}

	// Cleanup temp files
	os.Remove(tempFile)
	os.Remove(thumbnailFile)

	logrus.Infof("Successfully generated PDF thumbnail: %s", thumbnailName)

	// Return only the thumbnail path, not the full URL
	return thumbnailName, nil
}
