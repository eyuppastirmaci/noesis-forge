package app

import (
	"log"
	"os"

	"github.com/eyuppastirmaci/noesis-forge/internal/config"
	"github.com/eyuppastirmaci/noesis-forge/internal/database"
	"github.com/eyuppastirmaci/noesis-forge/internal/queue"
	"github.com/eyuppastirmaci/noesis-forge/internal/redis"
	"github.com/eyuppastirmaci/noesis-forge/internal/repositories/interfaces"
	"github.com/eyuppastirmaci/noesis-forge/internal/repositories/postgres"
	"github.com/eyuppastirmaci/noesis-forge/internal/router"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	goredis "github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type App struct {
	Config *config.Config
	DB     *gorm.DB
	Router *router.Router
	Redis  *redis.Client

	// Repositories
	DocumentRepo       interfaces.DocumentRepository
	DocumentSearchRepo interfaces.DocumentSearchRepository

	// Services
	AuthService     *services.AuthService
	DocumentService *services.DocumentService
	MinIOService    *services.MinIOService
}

func New() (*App, error) {
	// Load config
	cfg, err := config.Load()
	if err != nil {
		return nil, err
	}

	// Setup logger
	logrus.SetLevel(logrus.InfoLevel)
	if cfg.Environment == "development" {
		logrus.SetLevel(logrus.DebugLevel)
	}

	// Connect database
	db, err := database.NewPostgresDB(cfg.Database)
	if err != nil {
		return nil, err
	}

	// Run migrations
	if err := database.RunMigrations(db, cfg.Database.Database); err != nil {
		return nil, err
	}

	// Seed data
	if err := database.SeedDefaultData(db); err != nil {
		return nil, err
	}

	// Initialize Redis client
	customRedisClient, err := redis.NewClient(cfg.Redis)
	if err != nil {
		logrus.Warnf("Redis connection failed, token blacklisting disabled: %v", err)
		customRedisClient = nil
	}

	// Initialize MinIO service
	minioService, err := services.NewMinIOService(&cfg.MinIO)
	if err != nil {
		logrus.Errorf("Failed to initialize MinIO service: %v", err)
		return nil, err
	}

	// Initialize Repositories
	documentRepo := postgres.NewDocumentRepository(db)
	documentSearchRepo := postgres.NewDocumentSearchRepository(db)

	// Initialize Services
	var rawRedisClient *goredis.Client = nil
	if customRedisClient != nil {
		rawRedisClient = customRedisClient.Client
	}

	authService := services.NewAuthService(db, cfg, rawRedisClient, minioService)
	userShareService := services.NewUserShareService(db, customRedisClient)

	// Initialize Document service with dependencies
	documentService := services.NewDocumentService(
		documentRepo,
		documentSearchRepo,
		minioService,
		userShareService,
		db,
	)

	// Initialize RabbitMQ publisher
	rabbitMQURL := os.Getenv("RABBITMQ_URL")
	if rabbitMQURL == "" {
		rabbitMQURL = "amqp://admin:admin123@localhost:5672"
	}
	queuePublisher, err := queue.NewPublisher(rabbitMQURL)
	if err != nil {
		log.Fatal("Failed to initialize queue publisher:", err)
	}

	// Initialize router with services
	r := router.New(cfg, db, documentService, authService, userShareService, minioService, queuePublisher)
	r.SetupRoutes(db)

	logrus.Info("Application initialized successfully")
	logrus.Infof("MinIO endpoint: %s", cfg.MinIO.Endpoint)
	logrus.Infof("MinIO bucket: %s", cfg.MinIO.BucketName)

	return &App{
		Config:             cfg,
		DB:                 db,
		Router:             r,
		Redis:              customRedisClient,
		DocumentRepo:       documentRepo,
		DocumentSearchRepo: documentSearchRepo,
		AuthService:        authService,
		DocumentService:    documentService,
		MinIOService:       minioService,
	}, nil
}

func (a *App) Close() error {
	logrus.Info("Shutting down application...")

	// Close Redis connection if exists
	if a.Redis != nil {
		if err := a.Redis.Close(); err != nil {
			logrus.Errorf("Failed to close Redis connection: %v", err)
		}
	}

	if sqlDB, err := a.DB.DB(); err == nil {
		return sqlDB.Close()
	}
	return nil
}
