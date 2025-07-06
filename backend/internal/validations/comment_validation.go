package validations

import (
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/redis"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Context keys for comment validations
const (
	ValidatedCommentCreateKey = "validatedCommentCreate"
	ValidatedCommentUpdateKey = "validatedCommentUpdate"
	ValidatedCommentIDKey     = "validatedCommentID"
	ValidatedCommentListKey   = "validatedCommentList"
)

// Comment validation constants
const (
	CommentMinLength         = 1
	CommentMaxLength         = 5000
	CommentRateLimit         = 10 // comments per minute
	CommentUpdateRateLimit   = 30 // updates per minute (more lenient)
	CommentSpamCheckInterval = 60 // seconds
)

// Profanity filter - basic word list (can be extended)
var profanityWords = []string{
	"spam", "fake", "scam", // Add more words as needed
}

// Comment request structures
type CreateCommentRequest struct {
	Content         string                  `json:"content" binding:"required"`
	CommentType     models.CommentType      `json:"commentType"`
	Position        *models.CommentPosition `json:"position,omitempty"`
	ParentCommentID *uuid.UUID              `json:"parentCommentID,omitempty"`
}

type UpdateCommentRequest struct {
	Content string `json:"content" binding:"required"`
}

type CommentListRequest struct {
	Page     int   `json:"page"`
	Limit    int   `json:"limit"`
	Resolved *bool `json:"resolved,omitempty"`
}

// ValidateCommentCreate validates comment creation requests
func ValidateCommentCreate() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CreateCommentRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", err.Error())
			c.Abort()
			return
		}

		fieldErrors := make(map[string]string)

		// Validate content
		if contentErrors := validateCommentContent(req.Content); len(contentErrors) > 0 {
			for field, message := range contentErrors {
				fieldErrors[field] = message
			}
		}

		// Validate comment type
		if !isValidCommentType(req.CommentType) {
			fieldErrors["commentType"] = "Invalid comment type"
		}

		// Validate position for annotation comments
		if req.CommentType == models.CommentTypeAnnotation && req.Position == nil {
			fieldErrors["position"] = "Position is required for annotation comments"
		}

		// Validate position data if provided
		if req.Position != nil {
			if positionErrors := validateCommentPosition(req.Position); len(positionErrors) > 0 {
				for field, message := range positionErrors {
					fieldErrors["position."+field] = message
				}
			}
		}

		// Validate parent comment ID format
		if req.ParentCommentID != nil {
			if *req.ParentCommentID == uuid.Nil {
				fieldErrors["parentCommentID"] = "Invalid parent comment ID"
			}
		}

		// Rate limiting check
		if err := checkCommentRateLimit(c); err != nil {
			fieldErrors["rateLimit"] = err.Error()
		}

		// If there are validation errors, return them
		if len(fieldErrors) > 0 {
			utils.FieldValidationErrorResponse(c, "Comment validation failed", fieldErrors)
			c.Abort()
			return
		}

		// Store validated request in context
		c.Set(ValidatedCommentCreateKey, &req)
		c.Next()
	}
}

// ValidateCommentUpdate validates comment update requests
func ValidateCommentUpdate() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req UpdateCommentRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body", err.Error())
			c.Abort()
			return
		}

		fieldErrors := make(map[string]string)

		// Validate content
		if contentErrors := validateCommentContent(req.Content); len(contentErrors) > 0 {
			for field, message := range contentErrors {
				fieldErrors[field] = message
			}
		}

		// Rate limiting check (more lenient for updates)
		if err := checkCommentUpdateRateLimit(c); err != nil {
			fieldErrors["rateLimit"] = err.Error()
		}

		// If there are validation errors, return them
		if len(fieldErrors) > 0 {
			utils.FieldValidationErrorResponse(c, "Comment validation failed", fieldErrors)
			c.Abort()
			return
		}

		// Store validated request in context
		c.Set(ValidatedCommentUpdateKey, &req)
		c.Next()
	}
}

// ValidateCommentList validates comment list requests
func ValidateCommentList() gin.HandlerFunc {
	return func(c *gin.Context) {
		req := &CommentListRequest{
			Page:  1,
			Limit: 20,
		}

		// Parse and validate page
		if pageStr := c.Query("page"); pageStr != "" {
			if page, err := parsePositiveInt(pageStr); err == nil && page > 0 {
				req.Page = page
			}
		}

		// Parse and validate limit
		if limitStr := c.Query("limit"); limitStr != "" {
			if limit, err := parsePositiveInt(limitStr); err == nil && limit > 0 && limit <= 100 {
				req.Limit = limit
			}
		}

		// Parse resolved filter
		if resolvedStr := c.Query("resolved"); resolvedStr != "" {
			if resolved, err := parseBool(resolvedStr); err == nil {
				req.Resolved = &resolved
			}
		}

		// Store validated request in context
		c.Set(ValidatedCommentListKey, req)
		c.Next()
	}
}

// ValidateCommentID validates comment ID parameter
func ValidateCommentID() gin.HandlerFunc {
	return func(c *gin.Context) {
		idParam := c.Param("id")
		if idParam == "" {
			utils.ErrorResponse(c, http.StatusBadRequest, "MISSING_COMMENT_ID", "Comment ID is required")
			c.Abort()
			return
		}

		commentID, err := uuid.Parse(idParam)
		if err != nil {
			utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_COMMENT_ID", "Invalid comment ID format")
			c.Abort()
			return
		}

		// Store validated ID in context
		c.Set(ValidatedCommentIDKey, commentID)
		c.Next()
	}
}

// Helper functions

// validateCommentContent validates comment content
func validateCommentContent(content string) map[string]string {
	errors := make(map[string]string)

	// Trim whitespace
	content = strings.TrimSpace(content)

	// Check length
	if len(content) < CommentMinLength {
		errors["content"] = "Comment must be at least 1 character"
		return errors
	}

	if len(content) > CommentMaxLength {
		errors["content"] = "Comment must not exceed 5000 characters"
		return errors
	}

	// Check for spam patterns
	if isSpamContent(content) {
		errors["content"] = "Comment contains inappropriate content"
		return errors
	}

	// Check for profanity
	if containsProfanity(content) {
		errors["content"] = "Comment contains inappropriate language"
		return errors
	}

	// Check for excessive repetition
	if hasExcessiveRepetition(content) {
		errors["content"] = "Comment contains excessive repetition"
		return errors
	}

	return errors
}

// validateCommentPosition validates comment position data
func validateCommentPosition(position *models.CommentPosition) map[string]string {
	errors := make(map[string]string)

	// Validate page (if provided)
	if position.Page != nil {
		if *position.Page < 1 {
			errors["page"] = "Page must be greater than 0"
		}
	}

	// Validate coordinates (if provided)
	if position.X != nil && *position.X < 0 {
		errors["coordinates"] = "X coordinate must be non-negative"
	}
	if position.Y != nil && *position.Y < 0 {
		errors["coordinates"] = "Y coordinate must be non-negative"
	}

	// Validate dimensions (if provided)
	if position.Width != nil && *position.Width < 0 {
		errors["dimensions"] = "Width must be non-negative"
	}
	if position.Height != nil && *position.Height < 0 {
		errors["dimensions"] = "Height must be non-negative"
	}

	// Validate text positions (if provided)
	if position.TextStart != nil && *position.TextStart < 0 {
		errors["textStart"] = "Text start position must be non-negative"
	}
	if position.TextEnd != nil && *position.TextEnd < 0 {
		errors["textEnd"] = "Text end position must be non-negative"
	}

	// Validate text range consistency
	if position.TextStart != nil && position.TextEnd != nil {
		if *position.TextStart >= *position.TextEnd {
			errors["textRange"] = "Text start must be less than text end"
		}
	}

	// Validate quoted text (if provided)
	if position.QuotedText != nil && len(*position.QuotedText) > 1000 {
		errors["quotedText"] = "Quoted text must not exceed 1000 characters"
	}

	return errors
}

// isValidCommentType checks if comment type is valid
func isValidCommentType(commentType models.CommentType) bool {
	validTypes := []models.CommentType{
		models.CommentTypeGeneral,
		models.CommentTypeAnnotation,
		models.CommentTypeReply,
	}

	for _, validType := range validTypes {
		if commentType == validType {
			return true
		}
	}
	return false
}

// Spam detection functions
func isSpamContent(content string) bool {
	content = strings.ToLower(content)

	// Check for repeated characters
	if hasRepeatedCharacters(content, 10) {
		return true
	}

	// Check for URLs (basic check)
	if hasURLs(content) {
		return true
	}

	// Check for email addresses
	if hasEmailAddresses(content) {
		return true
	}

	// Check for promotional keywords
	promotionalKeywords := []string{
		"buy now", "click here", "free", "winner", "congratulations",
		"offer", "discount", "sale", "limited time", "act now",
	}

	for _, keyword := range promotionalKeywords {
		if strings.Contains(content, keyword) {
			return true
		}
	}

	return false
}

func containsProfanity(content string) bool {
	content = strings.ToLower(content)
	for _, word := range profanityWords {
		if strings.Contains(content, word) {
			return true
		}
	}
	return false
}

func hasExcessiveRepetition(content string) bool {
	words := strings.Fields(content)
	if len(words) < 3 {
		return false
	}

	// Check for repeated words
	wordCount := make(map[string]int)
	for _, word := range words {
		wordCount[strings.ToLower(word)]++
	}

	for _, count := range wordCount {
		if count > len(words)/2 {
			return true
		}
	}

	return false
}

func hasRepeatedCharacters(content string, threshold int) bool {
	if len(content) < threshold {
		return false
	}

	count := 1
	for i := 1; i < len(content); i++ {
		if content[i] == content[i-1] {
			count++
			if count >= threshold {
				return true
			}
		} else {
			count = 1
		}
	}

	return false
}

func hasURLs(content string) bool {
	// Basic URL detection regex
	urlRegex := regexp.MustCompile(`https?://[^\s]+`)
	return urlRegex.MatchString(content)
}

func hasEmailAddresses(content string) bool {
	// Basic email detection regex
	emailRegex := regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)
	return emailRegex.MatchString(content)
}

// Rate limiting functions
func checkCommentRateLimit(c *gin.Context) error {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		return nil // Skip rate limiting if user is not authenticated
	}

	// Get Redis client from context
	redisClient, exists := c.Get("redisClient")
	if !exists {
		// If Redis is not available, skip rate limiting
		return nil
	}

	client, ok := redisClient.(*redis.Client)
	if !ok || client == nil {
		// If Redis client is not properly typed or is nil, skip rate limiting
		return nil
	}

	// Create rate limit key
	key := fmt.Sprintf("comment_rate_limit:%s", userID.(uuid.UUID).String())

	// Check rate limit: 10 comments per minute
	exceeded, count, err := client.CheckRateLimit(key, CommentRateLimit, time.Minute)
	if err != nil {
		// Log error but don't fail the request
		// In production, you might want to log this error
		return nil
	}

	if exceeded {
		return fmt.Errorf("rate limit exceeded: %d comments per minute allowed, current count: %d", CommentRateLimit, count)
	}

	return nil
}

func checkCommentUpdateRateLimit(c *gin.Context) error {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		return nil // Skip rate limiting if user is not authenticated
	}

	// Get Redis client from context
	redisClient, exists := c.Get("redisClient")
	if !exists {
		// If Redis is not available, skip rate limiting
		return nil
	}

	client, ok := redisClient.(*redis.Client)
	if !ok || client == nil {
		// If Redis client is not properly typed or is nil, skip rate limiting
		return nil
	}

	// Create rate limit key for updates (more lenient)
	key := fmt.Sprintf("comment_update_rate_limit:%s", userID.(uuid.UUID).String())

	// Check rate limit: 30 updates per minute (more lenient than create)
	exceeded, count, err := client.CheckRateLimit(key, CommentUpdateRateLimit, time.Minute)
	if err != nil {
		// Log error but don't fail the request
		return nil
	}

	if exceeded {
		return fmt.Errorf("update rate limit exceeded: %d updates per minute allowed, current count: %d", CommentUpdateRateLimit, count)
	}

	return nil
}

// Utility functions
func parsePositiveInt(s string) (int, error) {
	// Parse string to integer
	if s == "" {
		return 0, fmt.Errorf("empty string")
	}

	// Try to parse as integer
	value := 0
	for _, char := range s {
		if char < '0' || char > '9' {
			return 0, fmt.Errorf("invalid integer: %s", s)
		}
		value = value*10 + int(char-'0')
	}

	if value <= 0 {
		return 0, fmt.Errorf("must be positive: %d", value)
	}

	return value, nil
}

func parseBool(s string) (bool, error) {
	return s == "true" || s == "1", nil
}

// Getter functions for validated requests
func GetValidatedCommentCreate(c *gin.Context) (*CreateCommentRequest, bool) {
	value, exists := c.Get(ValidatedCommentCreateKey)
	if !exists {
		return nil, false
	}

	req, ok := value.(*CreateCommentRequest)
	return req, ok
}

func GetValidatedCommentUpdate(c *gin.Context) (*UpdateCommentRequest, bool) {
	value, exists := c.Get(ValidatedCommentUpdateKey)
	if !exists {
		return nil, false
	}

	req, ok := value.(*UpdateCommentRequest)
	return req, ok
}

func GetValidatedCommentList(c *gin.Context) (*CommentListRequest, bool) {
	value, exists := c.Get(ValidatedCommentListKey)
	if !exists {
		return nil, false
	}

	req, ok := value.(*CommentListRequest)
	return req, ok
}

func GetValidatedCommentID(c *gin.Context) (uuid.UUID, bool) {
	value, exists := c.Get(ValidatedCommentIDKey)
	if !exists {
		return uuid.Nil, false
	}

	id, ok := value.(uuid.UUID)
	return id, ok
}
