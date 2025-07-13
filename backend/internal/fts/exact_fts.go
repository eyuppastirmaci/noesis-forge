package fts

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/types"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type ExactFTSStrategy struct {
	db *gorm.DB
	// Configuration options
	minTokenLength int
	maxTokens      int
}

func NewExactFTSStrategy(db *gorm.DB) types.SearchStrategy {
	return &ExactFTSStrategy{
		db:             db,
		minTokenLength: 2,  // Minimum token length
		maxTokens:      10, // Maximum tokens to prevent query explosion
	}
}

func (s *ExactFTSStrategy) Name() string {
	return "exact_fts"
}

// Decides if this strategy should handle the request.
// This strategy is now more specific and only handles queries that are explicitly "exact",
// such as phrase searches (in quotes) or queries with boolean operators.
func (s *ExactFTSStrategy) CanHandle(req *types.SearchRequest) bool {
	query := strings.TrimSpace(req.Query)

	// 1. Check for phrase search
	isPhraseSearch := strings.HasPrefix(query, `"`) && strings.HasSuffix(query, `"`)

	// 2. Check for advanced FTS operators
	hasOperators := s.hasSpecialOperators(query)

	// This strategy should only run if the user has provided an rxact query.
	return isPhraseSearch || hasOperators
}

// Search executes the PostgreSQL full-text search with enhanced features
func (s *ExactFTSStrategy) Search(
	ctx context.Context,
	req *types.SearchRequest,
	filters func(*gorm.DB) *gorm.DB,
) (*types.SearchResult, error) {
	// Build base query
	baseQuery := s.db.WithContext(ctx).
		Model(&models.Document{}).
		Where("user_id = ?", req.UserID)
	baseQuery = filters(baseQuery)

	// Enhanced query building
	ftsQuery, usePhrase := s.buildFTSQuery(req)
	if ftsQuery == "" {
		return &types.SearchResult{}, nil
	}

	// Build the search query with different strategies based on input
	var searchQuery *gorm.DB
	if usePhrase {
		// For phrase searches, use phraseto_tsquery for exact phrase matching
		searchQuery = baseQuery.Session(&gorm.Session{}).
			Where("search_vector @@ phraseto_tsquery('english', ?)", ftsQuery)
	} else {
		// For regular searches with operators, use websearch_to_tsquery
		searchQuery = baseQuery.Session(&gorm.Session{}).
			Where("search_vector @@ websearch_to_tsquery('english', ?)", ftsQuery)
	}

	// Count total matches
	var total int64
	if err := searchQuery.Count(&total).Error; err != nil {
		logrus.WithError(err).Error("Failed to count FTS results")
		return &types.SearchResult{}, err
	}

	if total == 0 {
		return &types.SearchResult{
			Documents:  []models.Document{},
			Total:      0,
			Page:       req.Page,
			Limit:      req.Limit,
			TotalPages: 0,
		}, nil
	}

	// Build the final query with ranking and highlights
	finalQuery := s.buildFinalQuery(searchQuery, req, ftsQuery, usePhrase)

	// Create a struct to scan all results including highlights
	type documentWithHighlights struct {
		models.Document
		SearchScore float64 `gorm:"column:search_score"`
	}

	// Execute the query
	var results []documentWithHighlights
	if err := finalQuery.
		Offset((req.Page - 1) * req.Limit).
		Limit(req.Limit).
		Scan(&results).Error; err != nil {
		logrus.WithError(err).Error("Failed to execute FTS query")
		return &types.SearchResult{}, err
	}

	// Convert results to documents with highlights populated
	docs := make([]models.Document, len(results))
	for i, result := range results {
		docs[i] = result.Document
	}

	totalPages := int((total + int64(req.Limit) - 1) / int64(req.Limit))

	return &types.SearchResult{
		Documents:  docs,
		Total:      total,
		Page:       req.Page,
		Limit:      req.Limit,
		TotalPages: totalPages,
	}, nil
}

// Creates an optimized FTS query from the search request
func (s *ExactFTSStrategy) buildFTSQuery(req *types.SearchRequest) (string, bool) {
	query := strings.TrimSpace(req.Query)

	// Check if this is a phrase search (enclosed in quotes)
	if strings.HasPrefix(query, `"`) && strings.HasSuffix(query, `"`) {
		// Remove quotes and return as phrase
		phrase := strings.Trim(query, `"`)
		return phrase, true
	}

	// Check for special operators in the query
	if s.hasSpecialOperators(query) {
		// If user is using advanced syntax, pass it through
		return query, false
	}

	// Build query from tokens with smart filtering
	var queryParts []string
	tokenCount := 0

	for _, token := range req.Tokens {
		// Skip if we've hit max tokens
		if tokenCount >= s.maxTokens {
			break
		}

		// More sophisticated token filtering
		if s.isValidToken(token) {
			// Escape special characters for safety
			escapedToken := s.escapeToken(token)
			queryParts = append(queryParts, escapedToken)
			tokenCount++
		}
	}

	if len(queryParts) == 0 {
		return "", false
	}

	// Join with AND operator for exact matching
	return strings.Join(queryParts, " & "), false
}

// Constructs the final query with all features including highlights
func (s *ExactFTSStrategy) buildFinalQuery(
	baseQuery *gorm.DB,
	req *types.SearchRequest,
	ftsQuery string,
	usePhrase bool,
) *gorm.DB {
	queryFunc := "websearch_to_tsquery"
	if usePhrase {
		queryFunc = "phraseto_tsquery"
	}

	// Build comprehensive select
	selectStatement := fmt.Sprintf(`
		documents.*,
		ts_rank_cd(search_vector, %s('english', ?), 32) as search_score,
	`, queryFunc)

	query := baseQuery.Select(selectStatement, ftsQuery, ftsQuery, ftsQuery)

	// Apply sorting based on request
	switch req.SortBy {
	case "relevance":
		// Primary sort by relevance, secondary by recency
		query = query.Order("search_score DESC, created_at DESC")
	case "date":
		// Sort by date but boost recent relevant results
		query = query.Order("created_at DESC, search_score DESC")
	case "title":
		query = query.Order("LOWER(title) ASC, search_score DESC")
	default:
		// Default to relevance with recency boost
		query = query.Order("search_score DESC, created_at DESC")
	}

	return query
}

// Checks if a token should be included in the search
func (s *ExactFTSStrategy) isValidToken(token string) bool {
	// Check minimum length
	if len(token) < s.minTokenLength {
		return false
	}

	// Skip common stop words that PostgreSQL FTS doesn't handle well
	stopWords := map[string]bool{
		"the": true, "and": true, "or": true, "but": true,
		"in": true, "on": true, "at": true, "to": true,
		"a": true, "an": true, "is": true, "it": true,
	}

	if stopWords[strings.ToLower(token)] {
		return false
	}

	// Check if token is not just numbers or special characters
	if matched, _ := regexp.MatchString(`^[\d\W]+$`, token); matched {
		return false
	}

	return true
}

// Escapes special characters in tokens
func (s *ExactFTSStrategy) escapeToken(token string) string {
	// Escape special characters that have meaning in tsquery
	specialChars := []string{"&", "|", "!", "(", ")", ":", "*"}
	escaped := token
	for _, char := range specialChars {
		escaped = strings.ReplaceAll(escaped, char, "\\"+char)
	}
	return escaped
}

// Checks if query contains FTS operators
func (s *ExactFTSStrategy) hasSpecialOperators(query string) bool {
	// Regex is more reliable for catching operators
	return regexp.MustCompile(`(&|\||!|:\*|\s(AND|OR|NOT)\s)`).MatchString(strings.ToUpper(query))
}

// Provides additional configuration for searches
type SearchOptions struct {
	Filters        func(*gorm.DB) *gorm.DB
	FuzzyThreshold float64
	CustomWeights  map[string]string
	Language       string
	ExpandSynonyms bool
}

// For fine-tuning result ranking
type RankingOptions struct {
	TitleWeight       float64
	DescriptionWeight float64
	TagsWeight        float64
	RecencyBoost      float64
	ViewCountBoost    float64
}
