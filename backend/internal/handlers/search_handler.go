package handlers

import (
	"net/http"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

type SearchHandler struct {
	searchService *services.SearchService
}

func NewSearchHandler(searchService *services.SearchService) *SearchHandler {
	return &SearchHandler{
		searchService: searchService,
	}
}

// SimilaritySearchRequest represents the request for similarity search
type SimilaritySearchRequest struct {
	Query      string `form:"query" binding:"required"`
	Threshold  int    `form:"threshold"` // 0-100
	Limit      int    `form:"limit"`
	Collection string `form:"collection"` // "text", "image", "both"
}

// SimilaritySearchResponse represents the response for similarity search
type SimilaritySearchResponse struct {
	Results       []DocumentSearchResult `json:"results"`
	Query         string                 `json:"query"`
	TotalResults  int                    `json:"totalResults"`
	Threshold     float32                `json:"threshold"`
	ExecutionTime int64                  `json:"executionTime"` // milliseconds
}

// DocumentSearchResult represents a single search result
type DocumentSearchResult struct {
	ID           string   `json:"id"`
	DocumentID   string   `json:"documentId"`
	Title        string   `json:"title"`
	Description  *string  `json:"description,omitempty"`
	FilePath     *string  `json:"filePath,omitempty"`
	ThumbnailURL *string  `json:"thumbnailUrl,omitempty"`
	Score        float32  `json:"score"`
	CreatedAt    string   `json:"createdAt"`
	UpdatedAt    string   `json:"updatedAt"`
	FileSize     *int64   `json:"fileSize,omitempty"`
	Tags         []string `json:"tags,omitempty"`
	UserID       string   `json:"userId"`
}

// SimilaritySearch handles similarity search requests
func (h *SearchHandler) SimilaritySearch(c *gin.Context) {
	startTime := time.Now()

	var req SimilaritySearchRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request parameters", "details": err.Error()})
		return
	}

	// Set defaults
	if req.Threshold == 0 {
		req.Threshold = 70
	}
	if req.Limit == 0 {
		req.Limit = 20
	}
	if req.Collection == "" {
		req.Collection = "both"
	}

	// Validate threshold
	if req.Threshold < 0 || req.Threshold > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Threshold must be between 0 and 100"})
		return
	}

	// Validate collection
	if req.Collection != "text" && req.Collection != "image" && req.Collection != "both" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Collection must be 'text', 'image', or 'both'"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	userUUID, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Convert threshold from 0-100 to 0-1
	thresholdFloat := float32(req.Threshold) / 100.0

	// Perform search
	results, err := h.searchService.SimilaritySearch(c.Request.Context(), req.Query, thresholdFloat, req.Limit, req.Collection, userUUID.String())
	if err != nil {
		logrus.Errorf("[SimilaritySearch] Search failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to perform search", "details": err.Error()})
		return
	}

	// Calculate execution time
	executionTime := time.Since(startTime).Milliseconds()

	// Build response
	documentResults := make([]DocumentSearchResult, len(results))
	for i, r := range results {
		documentResults[i] = DocumentSearchResult{
			ID:           r.ID,
			DocumentID:   r.DocumentID,
			Title:        r.Title,
			Description:  r.Description,
			FilePath:     r.FilePath,
			ThumbnailURL: r.ThumbnailURL,
			Score:        r.Score,
			CreatedAt:    r.CreatedAt,
			UpdatedAt:    r.UpdatedAt,
			FileSize:     r.FileSize,
			Tags:         r.Tags,
			UserID:       r.UserID,
		}
	}

	response := SimilaritySearchResponse{
		Results:       documentResults,
		Query:         req.Query,
		TotalResults:  len(results),
		Threshold:     thresholdFloat,
		ExecutionTime: executionTime,
	}

	c.JSON(http.StatusOK, response)
}

// HybridSearchRequest represents the request for hybrid search
type HybridSearchRequest struct {
	Query        string  `json:"query" binding:"required"`
	TextWeight   float32 `json:"textWeight"`   // 0-1, default 0.5
	VectorWeight float32 `json:"vectorWeight"` // 0-1, default 0.5
	Threshold    int     `json:"threshold"`    // 0-100
	Limit        int     `json:"limit"`
}

// HybridSearch handles hybrid search requests (text + vector)
func (h *SearchHandler) HybridSearch(c *gin.Context) {
	startTime := time.Now()

	var req HybridSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Set defaults
	if req.TextWeight == 0 {
		req.TextWeight = 0.5
	}
	if req.VectorWeight == 0 {
		req.VectorWeight = 0.5
	}
	if req.Threshold == 0 {
		req.Threshold = 70
	}
	if req.Limit == 0 {
		req.Limit = 20
	}

	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	userUUID, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Convert threshold from 0-100 to 0-1
	thresholdFloat := float32(req.Threshold) / 100.0

	// Perform hybrid search
	results, err := h.searchService.HybridSearch(c.Request.Context(), req.Query, req.TextWeight, req.VectorWeight, thresholdFloat, req.Limit, userUUID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to perform hybrid search", "details": err.Error()})
		return
	}

	// Calculate execution time
	executionTime := time.Since(startTime).Milliseconds()

	// Build response
	documentResults := make([]DocumentSearchResult, len(results))
	for i, r := range results {
		documentResults[i] = DocumentSearchResult{
			ID:           r.ID,
			DocumentID:   r.DocumentID,
			Title:        r.Title,
			Description:  r.Description,
			FilePath:     r.FilePath,
			ThumbnailURL: r.ThumbnailURL,
			Score:        r.Score,
			CreatedAt:    r.CreatedAt,
			UpdatedAt:    r.UpdatedAt,
			FileSize:     r.FileSize,
			Tags:         r.Tags,
			UserID:       r.UserID,
		}
	}

	response := SimilaritySearchResponse{
		Results:       documentResults,
		Query:         req.Query,
		TotalResults:  len(results),
		Threshold:     thresholdFloat,
		ExecutionTime: executionTime,
	}

	c.JSON(http.StatusOK, response)
}
