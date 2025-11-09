package vectordb

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/qdrant/go-client/qdrant"
)

type QdrantClient struct {
	client *qdrant.Client
}

type SearchResult struct {
	ID      string
	Score   float32
	Payload map[string]interface{}
}

type SimilaritySearchRequest struct {
	Query      []float32
	Collection string
	Limit      uint64
	Threshold  float32
}

func NewQdrantClient(host string, grpcPort int, useTLS bool) (*QdrantClient, error) {
	config := &qdrant.Config{
		Host:   host,
		Port:   grpcPort,
		UseTLS: useTLS,
	}

	client, err := qdrant.NewClient(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create qdrant client: %w", err)
	}

	return &QdrantClient{client: client}, nil
}

func (q *QdrantClient) InitializeCollections(ctx context.Context) error {
	// Text embeddings collection (BGE-M3)
	textCollection := &qdrant.CreateCollection{
		CollectionName: "documents_text",
		VectorsConfig: qdrant.NewVectorsConfig(&qdrant.VectorParams{
			Size:     1024, // BGE-M3 embedding size
			Distance: qdrant.Distance_Cosine,
		}),
	}

	if err := q.client.CreateCollection(ctx, textCollection); err != nil {
		// Collection might already exist
		fmt.Printf("Text collection might already exist: %v\n", err)
	}

	// Image embeddings collection (SigLIP2)
	imageCollection := &qdrant.CreateCollection{
		CollectionName: "documents_images",
		VectorsConfig: qdrant.NewVectorsConfig(&qdrant.VectorParams{
			Size:     768, // SigLIP embedding size
			Distance: qdrant.Distance_Cosine,
		}),
	}

	if err := q.client.CreateCollection(ctx, imageCollection); err != nil {
		fmt.Printf("Image collection might already exist: %v\n", err)
	}

	return nil
}

// SearchSimilar performs a similarity search in the specified collection
func (q *QdrantClient) SearchSimilar(ctx context.Context, req SimilaritySearchRequest) ([]SearchResult, error) {
	// Prepare search request using Query
	searchReq := &qdrant.QueryPoints{
		CollectionName: req.Collection,
		Query:          qdrant.NewQuery(req.Query...),
		Limit:          &req.Limit,
		WithPayload:    qdrant.NewWithPayload(true),
		ScoreThreshold: &req.Threshold,
	}

	// Execute search
	response, err := q.client.Query(ctx, searchReq)
	if err != nil {
		fmt.Printf("Qdrant Search error: %v\n", err)
		return nil, fmt.Errorf("failed to search: %w", err)
	}

	// Convert results
	results := make([]SearchResult, 0, len(response))
	for _, point := range response {
		payload := make(map[string]interface{})
		if point.Payload != nil {
			for key, value := range point.Payload {
				// Extract actual value from protobuf Value type
				switch v := value.Kind.(type) {
				case *qdrant.Value_StringValue:
					payload[key] = v.StringValue
				case *qdrant.Value_IntegerValue:
					payload[key] = v.IntegerValue
				case *qdrant.Value_DoubleValue:
					payload[key] = v.DoubleValue
				case *qdrant.Value_BoolValue:
					payload[key] = v.BoolValue
				default:
					payload[key] = value.GetKind()
				}
			}
		}

		results = append(results, SearchResult{
			ID:      point.Id.GetUuid(),
			Score:   point.Score,
			Payload: payload,
		})
	}

	return results, nil
}

// SearchBoth searches in both text and image collections and merges results
func (q *QdrantClient) SearchBoth(ctx context.Context, textEmbedding, imageEmbedding []float32, limit uint64, threshold float32) ([]SearchResult, error) {
	var allResults []SearchResult

	// Search in text collection
	if len(textEmbedding) > 0 {
		textResults, err := q.SearchSimilar(ctx, SimilaritySearchRequest{
			Query:      textEmbedding,
			Collection: "documents_text",
			Limit:      limit,
			Threshold:  threshold,
		})
		if err != nil {
			fmt.Printf("Error searching text collection: %v\n", err)
		} else {
			allResults = append(allResults, textResults...)
		}
	}

	// Search in image collection
	if len(imageEmbedding) > 0 {
		imageResults, err := q.SearchSimilar(ctx, SimilaritySearchRequest{
			Query:      imageEmbedding,
			Collection: "documents_images",
			Limit:      limit,
			Threshold:  threshold,
		})
		if err != nil {
			fmt.Printf("Error searching image collection: %v\n", err)
		} else {
			allResults = append(allResults, imageResults...)
		}
	}

	// Remove duplicates and sort by score
	return deduplicateAndSort(allResults, limit), nil
}

// deduplicateAndSort removes duplicate results and sorts by score
func deduplicateAndSort(results []SearchResult, limit uint64) []SearchResult {
	seen := make(map[string]bool)
	unique := make([]SearchResult, 0)

	for _, result := range results {
		if !seen[result.ID] {
			seen[result.ID] = true
			unique = append(unique, result)
		}
	}

	// Sort by score (descending)
	for i := 0; i < len(unique)-1; i++ {
		for j := i + 1; j < len(unique); j++ {
			if unique[j].Score > unique[i].Score {
				unique[i], unique[j] = unique[j], unique[i]
			}
		}
	}

	// Limit results
	if uint64(len(unique)) > limit {
		unique = unique[:limit]
	}

	return unique
}

// GetPoint retrieves a point by ID from a collection
func (q *QdrantClient) GetPoint(ctx context.Context, collection string, pointID uuid.UUID) (*qdrant.RetrievedPoint, error) {
	req := &qdrant.GetPoints{
		CollectionName: collection,
		Ids:            []*qdrant.PointId{qdrant.NewIDUUID(pointID.String())},
		WithPayload:    qdrant.NewWithPayload(true),
	}

	response, err := q.client.Get(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("failed to get point: %w", err)
	}

	if len(response) == 0 {
		return nil, fmt.Errorf("point not found")
	}

	return response[0], nil
}

// Close closes the Qdrant client connection
func (q *QdrantClient) Close() error {
	if q.client != nil {
		return q.client.Close()
	}
	return nil
}
