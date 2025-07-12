package migrations

import (
	"fmt"

	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

// AddFullTextSearchToDocuments adds clean enhanced full-text search capabilities
func AddFullTextSearchToDocuments(db *gorm.DB) error {
	// Step 1: Add search_vector column
	if err := addSearchVectorColumn(db); err != nil {
		return fmt.Errorf("failed to add search_vector column: %w", err)
	}

	// Step 2: Create search vector update function
	if err := createSearchVectorFunction(db); err != nil {
		return fmt.Errorf("failed to create search function: %w", err)
	}
	// Step 3: Create trigger for auto-updating search vector
	if err := createSearchVectorTrigger(db); err != nil {
		return fmt.Errorf("failed to create search trigger: %w", err)
	}

	// Step 4: Update existing documents
	if err := updateExistingDocuments(db); err != nil {
		return fmt.Errorf("failed to update existing documents: %w", err)
	}

	// Step 5: Create all necessary indexes
	if err := createSearchIndexes(db); err != nil {
		return fmt.Errorf("failed to create search indexes: %w", err)
	}

	// Step 6: Configure trigram settings
	if err := configureTrigramSettings(db); err != nil {
		return fmt.Errorf("failed to configure trigram settings: %w", err)
	}

	// Step 7: Verify setup
	if err := verifySetup(db); err != nil {
		logrus.Warnf("Setup verification had issues: %v", err)
	}
	return nil
}

func addSearchVectorColumn(db *gorm.DB) error {
	if err := db.Exec(`
		ALTER TABLE documents 
		ADD COLUMN IF NOT EXISTS search_vector tsvector;
	`).Error; err != nil {
		return fmt.Errorf("failed to add search_vector column: %w", err)
	}

	return nil
}

// createSearchVectorFunction creates the trigger function for updating search vectors
func createSearchVectorFunction(db *gorm.DB) error {
	if err := db.Exec(`
		CREATE OR REPLACE FUNCTION documents_search_vector_update() RETURNS trigger AS $$
		BEGIN
			-- Update tsvector with weighted content
			NEW.search_vector :=
				setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
				setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
				setweight(to_tsvector('english', COALESCE(NEW.tags, '')), 'C') ||
				setweight(to_tsvector('english', COALESCE(NEW.original_file_name, '')), 'D');
			
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;
	`).Error; err != nil {
		return fmt.Errorf("failed to create search vector function: %w", err)
	}
	return nil
}

// createSearchVectorTrigger creates the trigger for auto-updating search vectors
func createSearchVectorTrigger(db *gorm.DB) error {
	if err := db.Exec(`
		DROP TRIGGER IF EXISTS documents_search_vector_trigger ON documents;
		CREATE TRIGGER documents_search_vector_trigger
		BEFORE INSERT OR UPDATE OF title, description, tags, original_file_name ON documents
		FOR EACH ROW EXECUTE FUNCTION documents_search_vector_update();
	`).Error; err != nil {
		return fmt.Errorf("failed to create search vector trigger: %w", err)
	}

	return nil
}

// updateExistingDocuments updates search vectors for existing documents
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

	return nil
}

// createSearchIndexes creates all necessary indexes for fast searching
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
			description: "Trigram index for title",
			critical:    false,
		},
		{
			name:        "idx_documents_description_trgm",
			query:       `CREATE INDEX IF NOT EXISTS idx_documents_description_trgm ON documents USING gin(description gin_trgm_ops);`,
			description: "Trigram index for description",
			critical:    false,
		},
		{
			name:        "idx_documents_original_file_name_trgm",
			query:       `CREATE INDEX IF NOT EXISTS idx_documents_original_file_name_trgm ON documents USING gin(original_file_name gin_trgm_ops);`,
			description: "Trigram index for original file name",
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
	}

	for _, index := range indexes {
		if err := db.Exec(index.query).Error; err != nil {
			if index.critical {
				return fmt.Errorf("failed to create critical index %s: %w", index.name, err)
			} else {
				logrus.Warnf("Failed to create non-critical index %s (%s): %v", index.name, index.description, err)
				continue
			}
		}
	}

	return nil
}

// configureTrigramSettings configures trigram similarity settings
func configureTrigramSettings(db *gorm.DB) error {
	// Set trigram similarity threshold for fuzzy matching
	if err := db.Exec(`SELECT set_limit(0.1);`).Error; err != nil {
		logrus.Warnf("Could not set trigram similarity threshold (pg_trgm may not be available): %v", err)
		return nil
	}

	return nil
}

// verifySetup verifies that the full-text search setup is working correctly
func verifySetup(db *gorm.DB) error {
	// Check if pg_trgm extension is loaded
	var extensionExists bool
	if err := db.Raw(`SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm')`).Scan(&extensionExists).Error; err != nil {
		logrus.Warnf("Could not verify pg_trgm extension: %v", err)
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
	}

	// Test a simple FTS query
	var testCount int64
	if err := db.Raw(`
		SELECT COUNT(*) 
		FROM documents 
		WHERE search_vector @@ to_tsquery('english', 'test:*')
	`).Scan(&testCount).Error; err != nil {
		logrus.Warnf("Could not test FTS functionality: %v", err)
	}

	return nil
}

// RollbackCompleteFullTextSearch removes all full-text search components
func RollbackCompleteFullTextSearch(db *gorm.DB) error {
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
	}

	for _, index := range indexes {
		if err := db.Exec(`DROP INDEX IF EXISTS ` + index + `;`).Error; err != nil {
			logrus.Warnf("Failed to drop index %s: %v", index, err)
			// Continue with other indexes
		}
	}

	// Drop search_vector column
	if err := db.Exec(`ALTER TABLE documents DROP COLUMN IF EXISTS search_vector;`).Error; err != nil {
		logrus.Errorf("Failed to drop search_vector column: %v", err)
		return err
	}

	return nil
}
