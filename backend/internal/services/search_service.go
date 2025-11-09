package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/queue"
	"github.com/eyuppastirmaci/noesis-forge/internal/repositories/interfaces"
	"github.com/eyuppastirmaci/noesis-forge/internal/vectordb"
	"github.com/google/uuid"
)

type SearchService struct {
	qdrantClient *vectordb.QdrantClient
	publisher    *queue.Publisher
	documentRepo interfaces.DocumentRepository
}

func NewSearchService(
	qdrantClient *vectordb.QdrantClient,
	publisher *queue.Publisher,
	documentRepo interfaces.DocumentRepository,
) *SearchService {
	return &SearchService{
		qdrantClient: qdrantClient,
		publisher:    publisher,
		documentRepo: documentRepo,
	}
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

// SimilaritySearch performs a similarity search using vector embeddings
func (s *SearchService) SimilaritySearch(
	ctx context.Context,
	query string,
	threshold float32,
	limit int,
	collection string,
	userID string,
) ([]DocumentSearchResult, error) {

	// Generate embedding for the query
	embedding, err := s.generateQueryEmbedding(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to generate embedding: %w", err)
	}

	var results []vectordb.SearchResult

	switch collection {
	case "text":
		// Search in text collection only
		results, err = s.qdrantClient.SearchSimilar(ctx, vectordb.SimilaritySearchRequest{
			Query:      embedding,
			Collection: "documents_text",
			Limit:      uint64(limit),
			Threshold:  threshold,
		})
	case "image":
		// For image search, we would need image embedding
		// This is a placeholder - implement image embedding generation
		return nil, fmt.Errorf("image search not implemented yet")
	case "both":
		// Search in both collections
		results, err = s.qdrantClient.SearchBoth(ctx, embedding, nil, uint64(limit), threshold)
	default:
		return nil, fmt.Errorf("invalid collection: %s", collection)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to search: %w", err)
	}

	// Convert Qdrant results to DocumentSearchResult
	docResults, err := s.convertToDocumentResults(ctx, results, userID)
	if err != nil {
		return nil, err
	}

	return docResults, nil
}

// HybridSearch performs hybrid search (text + vector)
func (s *SearchService) HybridSearch(
	ctx context.Context,
	query string,
	textWeight float32,
	vectorWeight float32,
	threshold float32,
	limit int,
	userID string,
) ([]DocumentSearchResult, error) {
	// TODO: Implement hybrid search
	// This would combine PostgreSQL full-text search with vector search
	// For now, just use similarity search
	return s.SimilaritySearch(ctx, query, threshold, limit, "text", userID)
}

// generateQueryEmbedding generates an embedding for the search query using RabbitMQ workers
func (s *SearchService) generateQueryEmbedding(ctx context.Context, query string) ([]float32, error) {
	// Generate unique request ID
	requestID := uuid.New().String()

	// Publish embedding request to RabbitMQ
	err := s.publisher.PublishQueryEmbedding(requestID, query, "text")
	if err != nil {
		return nil, fmt.Errorf("failed to publish query embedding request: %w", err)
	}

	// Wait for response from worker (30 second timeout)
	response, err := s.publisher.ConsumeQueryEmbeddingResponse(requestID, 30*time.Second)
	if err != nil {
		return nil, fmt.Errorf("failed to get query embedding response: %w", err)
	}

	return response.Embedding, nil
} // convertToDocumentResults converts Qdrant results to DocumentSearchResult
func (s *SearchService) convertToDocumentResults(
	ctx context.Context,
	qdrantResults []vectordb.SearchResult,
	userID string,
) ([]DocumentSearchResult, error) {
	if len(qdrantResults) == 0 {
		return []DocumentSearchResult{}, nil
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	// Group results by document ID and keep the highest score for each document
	documentScores := make(map[string]float32)                // highest score
	documentResults := make(map[string]vectordb.SearchResult) // result with highest score

	for _, result := range qdrantResults {
		// Extract document_id from payload
		documentIDStr, ok := result.Payload["document_id"].(string)
		if !ok {
			continue
		}

		// Keep only the highest scoring chunk for each document
		if existingScore, exists := documentScores[documentIDStr]; !exists || result.Score > existingScore {
			documentScores[documentIDStr] = result.Score
			documentResults[documentIDStr] = result
		}
	}

	// Fetch documents and build results
	searchResults := make([]DocumentSearchResult, 0, len(documentResults))

	for documentIDStr, result := range documentResults {
		// Parse document UUID from payload
		docID, err := uuid.Parse(documentIDStr)
		if err != nil {
			continue
		}

		// Fetch document from database
		doc, err := s.documentRepo.GetByIDAndUserID(ctx, docID, userUUID)
		if err != nil {
			continue
		}

		var description *string
		// Use Summary if available, fallback to Description
		if doc.Summary != "" {
			description = &doc.Summary
		} else if doc.Description != "" {
			description = &doc.Description
		}

		var fileSize *int64
		if doc.FileSize > 0 {
			fileSize = &doc.FileSize
		}

		// Generate thumbnail URL if document has thumbnail
		var thumbnailURL *string
		if doc.HasThumbnail && doc.ThumbnailPath != "" {
			// Generate thumbnail URL path (just the document ID path, API prefix will be added by frontend)
			thumbURL := fmt.Sprintf("/documents/%s/thumbnail", doc.ID.String())
			thumbnailURL = &thumbURL
		}

		// Parse tags from string if needed (assuming tags are stored as comma-separated)
		var tags []string
		if doc.Tags != "" {
			// Split comma-separated tags
			tagList := make([]string, 0)
			for _, tag := range strings.Split(doc.Tags, ",") {
				trimmed := strings.TrimSpace(tag)
				if trimmed != "" {
					tagList = append(tagList, trimmed)
				}
			}
			tags = tagList
		}

		searchResults = append(searchResults, DocumentSearchResult{
			ID:           uuid.New().String(), // Generate a unique ID for the search result
			DocumentID:   doc.ID.String(),
			Title:        doc.Title,
			Description:  description,
			FilePath:     nil, // Document model doesn't have FilePath
			ThumbnailURL: thumbnailURL,
			Score:        result.Score,
			CreatedAt:    doc.CreatedAt.Format("2006-01-02T15:04:05Z"),
			UpdatedAt:    doc.UpdatedAt.Format("2006-01-02T15:04:05Z"),
			FileSize:     fileSize,
			Tags:         tags,
			UserID:       doc.UserID.String(),
		})
	}

	// Sort results by score (descending)
	for i := 0; i < len(searchResults)-1; i++ {
		for j := i + 1; j < len(searchResults); j++ {
			if searchResults[j].Score > searchResults[i].Score {
				searchResults[i], searchResults[j] = searchResults[j], searchResults[i]
			}
		}
	}

	return searchResults, nil
}
