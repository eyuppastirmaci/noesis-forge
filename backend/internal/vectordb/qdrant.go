package vectordb

import (
	"context"
	"fmt"

	"github.com/qdrant/go-client/qdrant"
)

type QdrantClient struct {
	client *qdrant.Client
}

func NewQdrantClient(url string) (*QdrantClient, error) {
	config := &qdrant.Config{
		Host: url,
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
