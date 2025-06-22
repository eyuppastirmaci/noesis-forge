package validations

import (
	"fmt"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"slices"
	"strconv"
	"strings"

	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Context keys for document validations
const (
	ValidatedDocumentUploadKey     = "validatedDocumentUpload"
	ValidatedBulkDocumentUploadKey = "validatedBulkDocumentUpload"
	ValidatedDocumentListKey       = "validatedDocumentList"
	ValidatedDocumentIDKey         = "validatedDocumentID"
)

// FileMetadata represents individual file metadata
type FileMetadata struct {
	Title       string
	Description string
	Tags        string
	IsPublic    bool
}

// BulkUploadDocumentRequest represents the validated bulk upload request
type BulkUploadDocumentRequest struct {
	Files    []*multipart.FileHeader
	Metadata []FileMetadata // Individual metadata for each file
}

// ValidateDocumentUpload validates document upload requests (multipart form)
func ValidateDocumentUpload() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Parse multipart form
		err := c.Request.ParseMultipartForm(100 << 20) // 100MB max
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_FORM", "Failed to parse multipart form")
			c.Abort()
			return
		}

		fieldErrors := make(map[string]string)

		// Get and validate file
		file, err := c.FormFile("file")
		if err != nil {
			fieldErrors["file"] = "File is required"
		} else {
			// Validate file
			if fileErrors := validateUploadedFile(file); len(fileErrors) > 0 {
				for field, message := range fileErrors {
					fieldErrors[field] = message
				}
			}
		}

		// Get and validate form data
		title := strings.TrimSpace(c.PostForm("title"))
		description := strings.TrimSpace(c.PostForm("description"))
		tags := strings.TrimSpace(c.PostForm("tags"))
		isPublicStr := c.PostForm("isPublic")

		// Use filename as title if title is empty
		if title == "" && file != nil {
			title = getFilenameWithoutExtension(file.Filename)
		}

		// Validate title
		if title == "" {
			fieldErrors["title"] = "Title is required"
		} else if len(title) < 1 {
			fieldErrors["title"] = "Title must be at least 1 character"
		} else if len(title) > 255 {
			fieldErrors["title"] = "Title must be at most 255 characters"
		}

		// Validate description
		if len(description) > 1000 {
			fieldErrors["description"] = "Description must be at most 1000 characters"
		}

		// Validate tags
		if len(tags) > 500 {
			fieldErrors["tags"] = "Tags must be at most 500 characters"
		}
		if tags != "" {
			if valid, msg := validateTags(tags); !valid {
				fieldErrors["tags"] = msg
			}
		}

		// Validate isPublic
		isPublic := false
		if isPublicStr != "" {
			isPublic = isPublicStr == "true" || isPublicStr == "1"
		}

		// If there are validation errors, return them
		if len(fieldErrors) > 0 {
			utils.FieldValidationErrorResponse(c, "Validation failed", fieldErrors)
			c.Abort()
			return
		}

		// Create validated request
		req := &services.UploadDocumentRequest{
			Title:       title,
			Description: description,
			Tags:        tags,
			IsPublic:    isPublic,
		}

		// Store validated request in context
		c.Set(ValidatedDocumentUploadKey, req)
		c.Next()
	}
}

// ValidateDocumentList validates document list query parameters
func ValidateDocumentList() gin.HandlerFunc {
	return func(c *gin.Context) {
		fieldErrors := make(map[string]string)

		// Parse and validate page
		pageStr := c.DefaultQuery("page", "1")
		page, err := strconv.Atoi(pageStr)
		if err != nil || page < 1 {
			fieldErrors["page"] = "Page must be a positive integer"
			page = 1
		}

		// Parse and validate limit
		limitStr := c.DefaultQuery("limit", "20")
		limit, err := strconv.Atoi(limitStr)
		if err != nil || limit < 1 {
			fieldErrors["limit"] = "Limit must be a positive integer"
			limit = 20
		} else if limit > 100 {
			fieldErrors["limit"] = "Limit must be at most 100"
			limit = 100
		}

		// Validate search
		search := strings.TrimSpace(c.Query("search"))
		if len(search) > 255 {
			fieldErrors["search"] = "Search query must be at most 255 characters"
			search = search[:255]
		}

		// Validate fileType
		fileType := c.Query("fileType")
		if fileType != "" {
			validFileTypes := []string{"pdf", "docx", "txt", "xlsx", "pptx", "other"}
			if !slices.Contains(validFileTypes, fileType) {
				fieldErrors["fileType"] = "Invalid file type"
				fileType = ""
			}
		}

		// Validate status
		status := c.Query("status")
		if status != "" {
			validStatuses := []string{"processing", "ready", "failed", "deleted"}
			if !slices.Contains(validStatuses, status) {
				fieldErrors["status"] = "Invalid status"
				status = ""
			}
		}

		// Validate tags
		tags := strings.TrimSpace(c.Query("tags"))
		if len(tags) > 255 {
			fieldErrors["tags"] = "Tags filter must be at most 255 characters"
			tags = tags[:255]
		}

		// Validate sortBy
		sortBy := c.DefaultQuery("sortBy", "date")
		validSortFields := []string{"name", "date", "size", "views", "downloads", "title"}
		if !slices.Contains(validSortFields, sortBy) {
			fieldErrors["sortBy"] = "Invalid sort field"
			sortBy = "date"
		}

		// Validate sortDir
		sortDir := c.DefaultQuery("sortDir", "desc")
		if sortDir != "asc" && sortDir != "desc" {
			fieldErrors["sortDir"] = "Sort direction must be 'asc' or 'desc'"
			sortDir = "desc"
		}

		// If there are validation errors, return them (but don't abort for query params)
		if len(fieldErrors) > 0 {
			utils.FieldValidationErrorResponse(c, "Invalid query parameters", fieldErrors)
			c.Abort()
			return
		}

		// Create validated request
		req := &services.DocumentListRequest{
			Page:     page,
			Limit:    limit,
			Search:   search,
			FileType: fileType,
			Status:   status,
			Tags:     tags,
			SortBy:   sortBy,
			SortDir:  sortDir,
		}

		// Store validated request in context
		c.Set(ValidatedDocumentListKey, req)
		c.Next()
	}
}

// ValidateDocumentID validates document ID from URL parameter
func ValidateDocumentID() gin.HandlerFunc {
	return func(c *gin.Context) {
		documentIDStr := c.Param("id")

		if documentIDStr == "" {
			utils.ErrorResponse(c, http.StatusBadRequest, "MISSING_DOCUMENT_ID", "Document ID is required")
			c.Abort()
			return
		}

		documentID, err := uuid.Parse(documentIDStr)
		if err != nil {
			fieldErrors := map[string]string{
				"id": "Invalid document ID format",
			}
			utils.FieldValidationErrorResponse(c, "Invalid document ID", fieldErrors)
			c.Abort()
			return
		}

		// Store validated ID in context
		c.Set(ValidatedDocumentIDKey, documentID)
		c.Next()
	}
}

// ValidateBulkDocumentUpload validates bulk document upload requests
func ValidateBulkDocumentUpload() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Parse multipart form
		err := c.Request.ParseMultipartForm(500 << 20) // 500MB max total
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_FORM", "Failed to parse multipart form")
			c.Abort()
			return
		}

		form := c.Request.MultipartForm
		files := form.File["files"] // Note: "files" instead of "file"

		if len(files) == 0 {
			utils.ErrorResponse(c, http.StatusBadRequest, "NO_FILES", "No files provided")
			c.Abort()
			return
		}

		fieldErrors := make(map[string]string)

		// Validate each file
		for i, file := range files {
			if fileErrors := validateUploadedFile(file); len(fileErrors) > 0 {
				for field, message := range fileErrors {
					fieldErrors[fmt.Sprintf("files[%d].%s", i, field)] = message
				}
			}
		}

		// Parse individual metadata for each file
		metadata := make([]FileMetadata, len(files))

		for i := range files {
			// Get individual file metadata
			title := strings.TrimSpace(c.PostForm(fmt.Sprintf("files[%d].title", i)))
			description := strings.TrimSpace(c.PostForm(fmt.Sprintf("files[%d].description", i)))
			tags := strings.TrimSpace(c.PostForm(fmt.Sprintf("files[%d].tags", i)))
			isPublicStr := c.PostForm(fmt.Sprintf("files[%d].isPublic", i))
			isPublic := isPublicStr == "true" || isPublicStr == "1"

			// Use filename as title if title is empty
			if title == "" {
				title = getFilenameWithoutExtension(files[i].Filename)
			}

			// Validate individual file metadata
			if title == "" {
				fieldErrors[fmt.Sprintf("files[%d].title", i)] = "Title is required"
			} else if len(title) > 255 {
				fieldErrors[fmt.Sprintf("files[%d].title", i)] = "Title must be at most 255 characters"
			}

			if len(description) > 1000 {
				fieldErrors[fmt.Sprintf("files[%d].description", i)] = "Description must be at most 1000 characters"
			}

			if len(tags) > 500 {
				fieldErrors[fmt.Sprintf("files[%d].tags", i)] = "Tags must be at most 500 characters"
			}
			if tags != "" {
				if valid, msg := validateTags(tags); !valid {
					fieldErrors[fmt.Sprintf("files[%d].tags", i)] = msg
				}
			}

			metadata[i] = FileMetadata{
				Title:       title,
				Description: description,
				Tags:        tags,
				IsPublic:    isPublic,
			}
		}

		// If there are validation errors, return them
		if len(fieldErrors) > 0 {
			utils.FieldValidationErrorResponse(c, "Validation failed", fieldErrors)
			c.Abort()
			return
		}

		// Create validated request
		req := &BulkUploadDocumentRequest{
			Files:    files,
			Metadata: metadata,
		}

		// Store validated request in context
		c.Set(ValidatedBulkDocumentUploadKey, req)
		c.Next()
	}
}

// Helper functions

func validateUploadedFile(file *multipart.FileHeader) map[string]string {
	errors := make(map[string]string)

	// Check file size (100MB max)
	maxSize := int64(100 * 1024 * 1024) // 100MB
	if file.Size > maxSize {
		errors["file"] = "File size must be less than 100MB"
	}

	// Check if file is empty
	if file.Size == 0 {
		errors["file"] = "File cannot be empty"
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
		errors["file"] = "File type not supported. Supported types: PDF, DOCX, DOC, TXT, XLSX, XLS, PPTX, PPT, MD"
	}

	// Check filename length
	if len(file.Filename) > 255 {
		errors["file"] = "Filename is too long (max 255 characters)"
	}

	// Check for malicious filenames
	if containsMaliciousCharacters(file.Filename) {
		errors["file"] = "Filename contains invalid characters"
	}

	return errors
}

func validateTags(tags string) (bool, string) {
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
		if !isValidTagName(tag) {
			return false, "Tags can only contain letters, numbers, hyphens, and underscores"
		}
	}

	return true, ""
}

func getFilenameWithoutExtension(filename string) string {
	ext := filepath.Ext(filename)
	return strings.TrimSuffix(filename, ext)
}

func containsMaliciousCharacters(filename string) bool {
	maliciousChars := []string{"..", "\\", "/", ":", "*", "?", "\"", "<", ">", "|"}
	for _, char := range maliciousChars {
		if strings.Contains(filename, char) {
			return true
		}
	}
	return false
}

func isValidTagName(tag string) bool {
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

// GetValidatedDocumentUpload retrieves the validated upload request from context
func GetValidatedDocumentUpload(c *gin.Context) (*services.UploadDocumentRequest, bool) {
	value, exists := c.Get(ValidatedDocumentUploadKey)
	if !exists {
		return nil, false
	}

	req, ok := value.(*services.UploadDocumentRequest)
	return req, ok
}

// GetValidatedBulkDocumentUpload retrieves the validated bulk upload request from context
func GetValidatedBulkDocumentUpload(c *gin.Context) (*BulkUploadDocumentRequest, bool) {
	value, exists := c.Get(ValidatedBulkDocumentUploadKey)
	if !exists {
		return nil, false
	}

	req, ok := value.(*BulkUploadDocumentRequest)
	return req, ok
}

// GetValidatedDocumentList retrieves the validated list request from context
func GetValidatedDocumentList(c *gin.Context) (*services.DocumentListRequest, bool) {
	value, exists := c.Get(ValidatedDocumentListKey)
	if !exists {
		return nil, false
	}

	req, ok := value.(*services.DocumentListRequest)
	return req, ok
}

// GetValidatedDocumentID retrieves the validated document ID from context
func GetValidatedDocumentID(c *gin.Context) (uuid.UUID, bool) {
	value, exists := c.Get(ValidatedDocumentIDKey)
	if !exists {
		return uuid.Nil, false
	}

	id, ok := value.(uuid.UUID)
	return id, ok
}
