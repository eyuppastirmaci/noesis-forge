package database

import (
	"fmt"

	"github.com/eyuppastirmaci/noesis-forge/internal/config"
	"github.com/eyuppastirmaci/noesis-forge/internal/migrations"
	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/sirupsen/logrus"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Opens a PostgreSQL connection with configurable logging.
func NewPostgresDB(dbConfig config.DatabaseConfig) (*gorm.DB, error) {
	// Translate custom log level string to GORM’s logger level.
	var logLevel logger.LogLevel
	switch dbConfig.LogLevel {
	case "silent":
		logLevel = logger.Silent
	case "error":
		logLevel = logger.Error
	case "warn":
		logLevel = logger.Warn
	case "info":
		logLevel = logger.Info
	default:
		logLevel = logger.Error
	}

	// Configure GORM with the chosen log level.
	config := &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	}

	// Open the database connection using the DSN.
	db, err := gorm.Open(postgres.Open(dbConfig.DSN()), config)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Retrieve generic *sql.DB to fine-tune the connection pool.
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	// Apply connection-pool limits for optimal resource usage.
	sqlDB.SetMaxIdleConns(dbConfig.MaxIdleConns)
	sqlDB.SetMaxOpenConns(dbConfig.MaxOpenConns)
	sqlDB.SetConnMaxLifetime(dbConfig.ConnMaxLifetime)

	logrus.Info("Database connection established")
	return db, nil
}

// Performs schema migrations and full-text-search setup.
func RunMigrations(db *gorm.DB, dbName string) error {
	logrus.Info("Running database migrations...")

	// Auto-migrate all model structs to keep the schema up-to-date.
	err := db.AutoMigrate(
		&models.Permission{},
		&models.Role{},
		&models.User{},
		&models.RefreshToken{},
		&models.EmailVerificationToken{},
		&models.PasswordResetToken{},
		&models.Document{},
		&models.Favorite{},
		&models.DocumentRevision{},
		&models.SharedLink{},
		&models.ShareAuditLog{},
		&models.UserShare{},
		&models.ShareNotification{},
		&models.UserShareAuditLog{},
		&models.ShareInvitation{},
		&models.DocumentComment{},
		&models.DocumentActivity{},
	)
	if err != nil {
		logrus.WithError(err).Error("Failed to run migrations")
		return err
	}

	// Add tsvector column and trigger for full-text search if needed.
	if err := migrations.AddFullTextSearchToDocuments(db, dbName); err != nil {
		logrus.WithError(err).Error("Failed to add full-text search support")
		return err
	}

	logrus.Info("Database migrations completed successfully")
	return nil
}

// Ensures baseline permissions, roles, and an admin user exist.
func SeedDefaultData(db *gorm.DB) error {
	logrus.Info("Seeding default data...")

	// Create missing default permissions.
	for _, permission := range models.DefaultPermissions {
		var existingPermission models.Permission
		if err := db.Where("name = ?", permission.Name).First(&existingPermission).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				if err := db.Create(&permission).Error; err != nil {
					return err
				}
				logrus.Infof("Created permission: %s", permission.Name)
			} else {
				return err
			}
		}
	}

	// Create missing default roles.
	for _, role := range models.DefaultRoles {
		var existingRole models.Role
		if err := db.Where("name = ?", role.Name).First(&existingRole).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				if err := db.Create(&role).Error; err != nil {
					return err
				}
				logrus.Infof("Created role: %s", role.Name)
			} else {
				return err
			}
		}
	}

	// Attach predefined permissions to each role.
	if err := seedRolePermissions(db); err != nil {
		return err
	}

	// Insert an initial admin account with a hashed default password.
	if err := seedDefaultAdmin(db); err != nil {
		return err
	}

	logrus.Info("Default data seeding completed successfully")
	return nil
}

// Links roles and permissions according to the spec.
func seedRolePermissions(db *gorm.DB) error {
	rolePermissions := map[string][]string{
		"admin": {
			"document:create", "document:read", "document:update", "document:delete",
			"search:basic", "search:advanced", "chat:access",
			"user:manage", "role:manage", "admin:access",
		},
		"user": {
			"document:create", "document:read", "document:update", "document:delete",
			"search:basic", "chat:access",
		},
		"guest": {
			"document:read", "search:basic",
		},
	}

	for roleName, permissionNames := range rolePermissions {
		// Fetch role by name; skip silently if not found.
		var role models.Role
		if err := db.Where("name = ?", roleName).First(&role).Error; err != nil {
			continue
		}

		// Retrieve all permissions matching the given names.
		var permissions []models.Permission
		if err := db.Where("name IN ?", permissionNames).Find(&permissions).Error; err != nil {
			continue
		}

		// Replace any existing role-permission associations.
		if err := db.Model(&role).Association("Permissions").Clear(); err != nil {
			continue
		}
		if err := db.Model(&role).Association("Permissions").Append(&permissions); err != nil {
			continue
		}

		logrus.Infof("Assigned %d permissions to role: %s", len(permissions), roleName)
	}

	return nil
}

// Inserts a fallback admin user if none exists yet.
func seedDefaultAdmin(db *gorm.DB) error {
	var existingAdmin models.User
	if err := db.Where("email = ?", "admin@example.com").First(&existingAdmin).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Locate admin role to bind to the new user.
			var adminRole models.Role
			if err := db.Where("name = ?", "admin").First(&adminRole).Error; err != nil {
				return err
			}

			// Securely hash the default admin password.
			hashedPassword, err := utils.HashPassword("admin123")
			if err != nil {
				return err
			}

			admin := models.User{
				Email:         "admin@example.com",
				Username:      "admin",
				Name:          "System Administrator",
				Password:      hashedPassword,
				RoleID:        adminRole.ID,
				Status:        models.StatusActive,
				EmailVerified: true,
			}

			if err := db.Create(&admin).Error; err != nil {
				return err
			}

			logrus.Info("Created default admin user (admin@example.com / admin123)")
		} else {
			return err
		}
	}

	return nil
}
