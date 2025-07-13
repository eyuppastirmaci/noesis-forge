package migrations

import (
	"fmt"
	"regexp"

	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

// Adds enhanced full-text search capabilities with highlighting
func AddFullTextSearchToDocuments(db *gorm.DB, dbName string) error {
	// Step 1: Add search_vector and highlight columns
	if err := addSearchColumns(db); err != nil {
		return fmt.Errorf("failed to add search columns: %w", err)
	}

	// Step 2: Create custom text search configuration
	if err := createCustomSearchConfig(db); err != nil {
		return fmt.Errorf("failed to create custom search config: %w", err)
	}

	// Step 3: Create search vector update function
	if err := createSearchVectorFunction(db); err != nil {
		return fmt.Errorf("failed to create search function: %w", err)
	}

	// Step 4: Create trigger for auto-updating search vector
	if err := createSearchVectorTrigger(db); err != nil {
		return fmt.Errorf("failed to create search trigger: %w", err)
	}

	// Step 5: Update existing documents
	if err := updateExistingDocuments(db); err != nil {
		return fmt.Errorf("failed to update existing documents: %w", err)
	}

	// Step 6: Create all necessary indexes
	if err := createSearchIndexes(db); err != nil {
		return fmt.Errorf("failed to create search indexes: %w", err)
	}

	// Step 7: Configure trigram settings
	if err := configureTrigramSettings(db, dbName); err != nil {
		return fmt.Errorf("failed to configure trigram settings: %w", err)
	}

	// Step 8: Create additional search helper functions
	if err := createSearchHelperFunctions(db); err != nil {
		return fmt.Errorf("failed to create helper functions: %w", err)
	}

	// Step 9: Verify setup
	if err := verifySetup(db); err != nil {
		logrus.Warnf("Setup verification had issues: %v", err)
	}

	return nil
}

// Adds search_vector and highlight columns
func addSearchColumns(db *gorm.DB) error {
	if err := db.Exec(`
		ALTER TABLE documents 
		ADD COLUMN IF NOT EXISTS search_vector tsvector,
		ADD COLUMN IF NOT EXISTS title_highlight text,
		ADD COLUMN IF NOT EXISTS description_highlight text;
	`).Error; err != nil {
		return fmt.Errorf("failed to add search columns: %w", err)
	}

	logrus.Info("Successfully added search_vector and highlight columns")
	return nil
}

// Creates a custom text search configuration
func createCustomSearchConfig(db *gorm.DB) error {
	// First check if the configuration already exists
	var configExists bool
	if err := db.Raw(`
		SELECT EXISTS(
			SELECT 1 FROM pg_ts_config 
			WHERE cfgname = 'custom_search'
		)
	`).Scan(&configExists).Error; err != nil {
		logrus.Warnf("Could not check for existing search config: %v", err)
	}

	if !configExists {
		// Create custom text search configuration based on English
		if err := db.Exec(`
			CREATE TEXT SEARCH CONFIGURATION custom_search (COPY = english);
		`).Error; err != nil {
			logrus.Warnf("Could not create custom search config: %v", err)
			// Continue with default English config
			return nil
		}

		// Customize the configuration for better results
		if err := db.Exec(`
			ALTER TEXT SEARCH CONFIGURATION custom_search
			ALTER MAPPING FOR word, asciiword 
			WITH english_stem, simple;
		`).Error; err != nil {
			logrus.Warnf("Could not alter custom search config mapping: %v", err)
		}

		logrus.Info("Successfully created custom text search configuration")
	}

	return nil
}

// Creates the enhanced trigger function for updating search vectors
func createSearchVectorFunction(db *gorm.DB) error {
	if err := db.Exec(`
		CREATE OR REPLACE FUNCTION documents_search_vector_update() RETURNS trigger AS $$
		BEGIN
			-- Update tsvector with weighted content using custom configuration
			NEW.search_vector :=
				setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
				setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
				setweight(to_tsvector('english', COALESCE(NEW.tags, '')), 'C') ||
				setweight(to_tsvector('english', COALESCE(NEW.original_file_name, '')), 'D');
			
			-- Clear highlight columns on update (they'll be populated during search)
			NEW.title_highlight := NULL;
			NEW.description_highlight := NULL;
			
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`).Error; err != nil {
		return fmt.Errorf("failed to create search vector function: %w", err)
	}

	logrus.Info("Successfully created search vector update function")
	return nil
}

// Creates the trigger for auto-updating search vectors
func createSearchVectorTrigger(db *gorm.DB) error {
	if err := db.Exec(`
		DROP TRIGGER IF EXISTS documents_search_vector_trigger ON documents;
		CREATE TRIGGER documents_search_vector_trigger
		BEFORE INSERT OR UPDATE OF title, description, tags, original_file_name ON documents
		FOR EACH ROW EXECUTE FUNCTION documents_search_vector_update();
	`).Error; err != nil {
		return fmt.Errorf("failed to create search vector trigger: %w", err)
	}

	logrus.Info("Successfully created search vector trigger")
	return nil
}

// Updates search vectors for existing documents
func updateExistingDocuments(db *gorm.DB) error {
	result := db.Exec(`
		UPDATE documents SET 
		search_vector =
			setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
			setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
			setweight(to_tsvector('english', COALESCE(tags, '')), 'C') ||
			setweight(to_tsvector('english', COALESCE(original_file_name, '')), 'D')
		WHERE search_vector IS NULL;
	`)

	if result.Error != nil {
		return fmt.Errorf("failed to update existing documents: %w", result.Error)
	}

	logrus.Infof("Successfully updated %d existing documents with search vectors", result.RowsAffected)
	return nil
}

// Creates all necessary indexes for fast searching
func createSearchIndexes(db *gorm.DB) error {
	indexes := []struct {
		name        string
		query       string
		description string
		critical    bool
	}{
		{
			name:        "idx_documents_search_vector",
			query:       `CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON documents USING gin(search_vector);`,
			description: "GIN index for full-text search",
			critical:    true,
		},
		{
			name:        "idx_documents_title_trgm",
			query:       `CREATE INDEX IF NOT EXISTS idx_documents_title_trgm ON documents USING gin(title gin_trgm_ops);`,
			description: "Trigram index for title fuzzy search",
			critical:    false,
		},
		{
			name:        "idx_documents_description_trgm",
			query:       `CREATE INDEX IF NOT EXISTS idx_documents_description_trgm ON documents USING gin(description gin_trgm_ops);`,
			description: "Trigram index for description fuzzy search",
			critical:    false,
		},
		{
			name:        "idx_documents_original_file_name_trgm",
			query:       `CREATE INDEX IF NOT EXISTS idx_documents_original_file_name_trgm ON documents USING gin(original_file_name gin_trgm_ops);`,
			description: "Trigram index for filename fuzzy search",
			critical:    false,
		},
		{
			name:        "idx_documents_title_btree",
			query:       `CREATE INDEX IF NOT EXISTS idx_documents_title_btree ON documents USING btree(LOWER(title));`,
			description: "BTREE index for title pattern matching",
			critical:    true,
		},
		{
			name:        "idx_documents_description_btree",
			query:       `CREATE INDEX IF NOT EXISTS idx_documents_description_btree ON documents USING btree(LOWER(description));`,
			description: "BTREE index for description pattern matching",
			critical:    true,
		},
		{
			name:        "idx_documents_user_created",
			query:       `CREATE INDEX IF NOT EXISTS idx_documents_user_created ON documents(user_id, created_at DESC);`,
			description: "Composite index for user document listing",
			critical:    true,
		},
		{
			name:        "idx_documents_status_type",
			query:       `CREATE INDEX IF NOT EXISTS idx_documents_status_type ON documents(status, file_type);`,
			description: "Composite index for filtering",
			critical:    false,
		},
		{
			name:        "idx_documents_tags_btree",
			query:       `CREATE INDEX IF NOT EXISTS idx_documents_tags_btree ON documents USING btree(LOWER(tags));`,
			description: "BTREE index for tag pattern matching",
			critical:    true,
		},
		{
			name:        "idx_documents_filename_btree",
			query:       `CREATE INDEX IF NOT EXISTS idx_documents_filename_btree ON documents USING btree(LOWER(original_file_name));`,
			description: "BTREE index for filename pattern matching",
			critical:    true,
		},
	}

	successCount := 0
	for _, index := range indexes {
		if err := db.Exec(index.query).Error; err != nil {
			if index.critical {
				return fmt.Errorf("failed to create critical index %s: %w", index.name, err)
			} else {
				logrus.Warnf("Failed to create non-critical index %s (%s): %v", index.name, index.description, err)
				continue
			}
		}
		successCount++
		logrus.Debugf("Created index %s: %s", index.name, index.description)
	}

	logrus.Infof("Successfully created %d/%d indexes", successCount, len(indexes))
	return nil
}

// Now accepts dbName.
func configureTrigramSettings(db *gorm.DB, dbName string) error {
	if dbName == "" {
		logrus.Warn("Database name is empty, skipping permanent trigram configuration.")
		return nil
	}

	var isValidIdentifier = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`).MatchString

	if !isValidIdentifier(dbName) {
		return fmt.Errorf("invalid database name provided: %s", dbName)
	}

	quotedDbName := fmt.Sprintf(`"%s"`, dbName)

	setThresholdQuery := fmt.Sprintf(`ALTER DATABASE %s SET pg_trgm.similarity_threshold = 0.2;`, quotedDbName)

	if err := db.Exec(setThresholdQuery).Error; err != nil {
		logrus.Warnf("Could not permanently set trigram similarity threshold for database '%s'. "+
			"This may require manual intervention by a superuser. Error: %v", dbName, err)

		if errFallback := db.Exec(`SELECT set_limit(0.2);`).Error; errFallback != nil {
			logrus.Warnf("Could not even set temporary trigram similarity threshold: %v", errFallback)
		}

		return nil
	}

	logrus.Infof("Successfully and permanently set pg_trgm.similarity_threshold to 0.2 for database '%s'. "+
		"New database connections will use this setting.", dbName)
	return nil
}

// Creates additional helper functions for search
func createSearchHelperFunctions(db *gorm.DB) error {
	// Function to get search suggestions based on partial input
	if err := db.Exec(`
		CREATE OR REPLACE FUNCTION get_search_suggestions(
			user_id_param UUID,
			query_param TEXT,
			limit_param INT DEFAULT 10
		)
		RETURNS TABLE(suggestion TEXT, score REAL) AS $$
		BEGIN
			RETURN QUERY
			SELECT DISTINCT
				title AS suggestion,
				similarity(title, query_param) AS score
			FROM documents
			WHERE user_id = user_id_param
				AND deleted_at IS NULL
				AND similarity(title, query_param) > 0.1
			ORDER BY score DESC, title
			LIMIT limit_param;
		END;
		$$ LANGUAGE plpgsql;
	`).Error; err != nil {
		logrus.Warnf("Could not create search suggestions function: %v", err)
	}

	// Function to analyze search query complexity
	if err := db.Exec(`
		CREATE OR REPLACE FUNCTION analyze_search_query(query_text TEXT)
		RETURNS TABLE(
			tokens INT,
			has_operators BOOLEAN,
			is_phrase BOOLEAN,
			complexity TEXT
		) AS $$
		DECLARE
			token_count INT;
			has_ops BOOLEAN;
			is_phrase_query BOOLEAN;
			query_complexity TEXT;
		BEGIN
			-- Count tokens
			token_count := array_length(string_to_array(query_text, ' '), 1);
			
			-- Check for operators
			has_ops := query_text ~* '\s+(AND|OR|NOT)\s+' OR query_text ~ '[\&\|\!]';
			
			-- Check if phrase query
			is_phrase_query := query_text ~ '^".*"$';
			
			-- Determine complexity
			IF is_phrase_query THEN
				query_complexity := 'phrase';
			ELSIF has_ops THEN
				query_complexity := 'advanced';
			ELSIF token_count > 5 THEN
				query_complexity := 'complex';
			ELSIF token_count > 2 THEN
				query_complexity := 'moderate';
			ELSE
				query_complexity := 'simple';
			END IF;
			
			RETURN QUERY SELECT token_count, has_ops, is_phrase_query, query_complexity;
		END;
		$$ LANGUAGE plpgsql;
	`).Error; err != nil {
		logrus.Warnf("Could not create query analysis function: %v", err)
	}

	logrus.Info("Successfully created search helper functions")
	return nil
}

// Verifies that the full-text search setup is working correctly
func verifySetup(db *gorm.DB) error {
	// Check if pg_trgm extension is loaded
	var extensionExists bool
	if err := db.Raw(`SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm')`).Scan(&extensionExists).Error; err != nil {
		logrus.Warnf("Could not verify pg_trgm extension: %v", err)
	} else if !extensionExists {
		logrus.Warn("pg_trgm extension is not installed - fuzzy search features will be limited")
	}

	// Check document count with search vectors
	var stats struct {
		Total               int64 `json:"total"`
		WithSearchVector    int64 `json:"with_search_vector"`
		WithoutSearchVector int64 `json:"without_search_vector"`
	}

	if err := db.Raw(`
		SELECT 
			COUNT(*) as total,
			COUNT(search_vector) as with_search_vector,
			COUNT(*) - COUNT(search_vector) as without_search_vector
		FROM documents
	`).Scan(&stats).Error; err != nil {
		logrus.Warnf("Could not verify document statistics: %v", err)
	} else {
		logrus.Infof("Document statistics: Total=%d, WithSearchVector=%d, WithoutSearchVector=%d",
			stats.Total, stats.WithSearchVector, stats.WithoutSearchVector)
	}

	// Test a simple FTS query
	var testCount int64
	if err := db.Raw(`
		SELECT COUNT(*) 
		FROM documents 
		WHERE search_vector @@ to_tsquery('english', 'test:*')
	`).Scan(&testCount).Error; err != nil {
		logrus.Warnf("Could not test FTS functionality: %v", err)
	} else {
		logrus.Infof("FTS test query returned %d results", testCount)
	}

	// Test custom search configuration
	var configTest string
	if err := db.Raw(`
		SELECT ts_lexize('english_stem', 'testing')::text
	`).Scan(&configTest).Error; err != nil {
		logrus.Warnf("Could not test text search configuration: %v", err)
	}

	return nil
}

// Removes all full-text search components
func RollbackCompleteFullTextSearch(db *gorm.DB) error {
	logrus.Info("Starting full-text search rollback")

	// Drop helper functions
	functions := []string{
		"get_search_suggestions(UUID, TEXT, INT)",
		"analyze_search_query(TEXT)",
	}
	for _, fn := range functions {
		if err := db.Exec(fmt.Sprintf(`DROP FUNCTION IF EXISTS %s;`, fn)).Error; err != nil {
			logrus.Warnf("Failed to drop function %s: %v", fn, err)
		}
	}

	// Drop trigger
	if err := db.Exec(`DROP TRIGGER IF EXISTS documents_search_vector_trigger ON documents;`).Error; err != nil {
		logrus.Errorf("Failed to drop trigger: %v", err)
		return err
	}

	// Drop function
	if err := db.Exec(`DROP FUNCTION IF EXISTS documents_search_vector_update();`).Error; err != nil {
		logrus.Errorf("Failed to drop function: %v", err)
		return err
	}

	// Drop indexes
	indexes := []string{
		"idx_documents_search_vector",
		"idx_documents_title_trgm",
		"idx_documents_description_trgm",
		"idx_documents_original_file_name_trgm",
		"idx_documents_title_btree",
		"idx_documents_description_btree",
		"idx_documents_user_created",
		"idx_documents_status_type",
	}

	for _, index := range indexes {
		if err := db.Exec(fmt.Sprintf(`DROP INDEX IF EXISTS %s;`, index)).Error; err != nil {
			logrus.Warnf("Failed to drop index %s: %v", index, err)
		}
	}

	// Drop custom text search configuration
	if err := db.Exec(`DROP TEXT SEARCH CONFIGURATION IF EXISTS custom_search;`).Error; err != nil {
		logrus.Warnf("Failed to drop custom search configuration: %v", err)
	}

	// Drop columns
	if err := db.Exec(`
		ALTER TABLE documents 
		DROP COLUMN IF EXISTS search_vector,
		DROP COLUMN IF EXISTS title_highlight,
		DROP COLUMN IF EXISTS description_highlight;
	`).Error; err != nil {
		logrus.Errorf("Failed to drop search columns: %v", err)
		return err
	}

	logrus.Info("Successfully completed full-text search rollback")
	return nil
}
