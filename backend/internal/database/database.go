package database

import (
	"fmt"

	"github.com/eyuppastirmaci/noesis-forge/internal/config"
	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/sirupsen/logrus"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func NewPostgresDB(dbConfig config.DatabaseConfig) (*gorm.DB, error) {
	// Parse log level
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

	config := &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	}

	db, err := gorm.Open(postgres.Open(dbConfig.DSN()), config)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	sqlDB.SetMaxIdleConns(dbConfig.MaxIdleConns)
	sqlDB.SetMaxOpenConns(dbConfig.MaxOpenConns)
	sqlDB.SetConnMaxLifetime(dbConfig.ConnMaxLifetime)

	logrus.Info("Database connection established")
	return db, nil
}

func RunMigrations(db *gorm.DB) error {
	logrus.Info("Running database migrations...")

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

	logrus.Info("Database migrations completed successfully")
	return nil
}

func SeedDefaultData(db *gorm.DB) error {
	logrus.Info("Seeding default data...")

	// Seed permissions
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

	// Seed roles
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

	// Assign permissions to roles
	if err := seedRolePermissions(db); err != nil {
		return err
	}

	// Create default admin user
	if err := seedDefaultAdmin(db); err != nil {
		return err
	}

	logrus.Info("Default data seeding completed successfully")
	return nil
}

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
		var role models.Role
		if err := db.Where("name = ?", roleName).First(&role).Error; err != nil {
			continue
		}

		var permissions []models.Permission
		if err := db.Where("name IN ?", permissionNames).Find(&permissions).Error; err != nil {
			continue
		}

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

func seedDefaultAdmin(db *gorm.DB) error {
	var existingAdmin models.User
	if err := db.Where("email = ?", "admin@example.com").First(&existingAdmin).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			var adminRole models.Role
			if err := db.Where("name = ?", "admin").First(&adminRole).Error; err != nil {
				return err
			}

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
