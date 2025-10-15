package migrations

import (
	"fmt"

	"gorm.io/gorm"
)

// MigrateE2EEFields adds encrypted columns to users table for E2EE support
func MigrateE2EEFields(db *gorm.DB) error {
	// Add encryption salt and encrypted field columns
	migrations := []string{
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS encryption_salt TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_email TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_email_iv TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_alt_email TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_alt_email_iv TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_phone TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_phone_iv TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_department TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_dept_iv TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_bio TEXT`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_bio_iv TEXT`,
	}

	for _, sql := range migrations {
		if err := db.Exec(sql).Error; err != nil {
			return fmt.Errorf("failed to execute migration: %w", err)
		}
	}

	return nil
}
