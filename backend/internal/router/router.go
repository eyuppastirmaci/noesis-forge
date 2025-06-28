package router

import (
	"context"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/config"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type Router struct {
	engine          *gin.Engine
	config          *config.Config
	authService     *services.AuthService
	roleService     *services.RoleService
	documentService *services.DocumentService
	favoriteService *services.FavoriteService
	minioService    *services.MinIOService
	redisClient     *redis.Client
}

func New(cfg *config.Config, db *gorm.DB) *Router {
	// Setup Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()

	// Initialize Redis client (optional for token blacklisting)
	var redisClient *redis.Client
	if cfg.Redis.URL != "" || cfg.Redis.URL == "redis://localhost:6379" {
		redisClient = redis.NewClient(&redis.Options{
			Addr:     "localhost:6379", // Default Redis address
			Password: cfg.Redis.Password,
			DB:       cfg.Redis.DB,
		})

		// Test Redis connection (don't fail if Redis is not available)
		ctx := context.Background()
		_, err := redisClient.Ping(ctx).Result()
		if err != nil {
			// Log warning but don't fail - Redis is optional
			gin.DefaultWriter.Write([]byte("Warning: Redis connection failed, token blacklisting disabled\n"))
			redisClient = nil
		}
	}

	// Initialize services
	authService := services.NewAuthService(db, cfg, redisClient)
	roleService := services.NewRoleService(db)

	// Initialize MinIO service
	minioService, err := services.NewMinIOService(&cfg.MinIO)
	if err != nil {
		// Handle MinIO initialization error
		panic("Failed to initialize MinIO service: " + err.Error())
	}

	// Initialize Document service
	documentService := services.NewDocumentService(db, minioService)

	// Initialize Favorite service
	favoriteService := services.NewFavoriteService(db)

	return &Router{
		engine:          engine,
		config:          cfg,
		authService:     authService,
		roleService:     roleService,
		documentService: documentService,
		favoriteService: favoriteService,
		minioService:    minioService,
		redisClient:     redisClient,
	}
}

func (r *Router) SetupRoutes(db *gorm.DB) {
	// Global middleware
	r.engine.Use(gin.Logger())
	r.engine.Use(gin.Recovery())

	// Security headers
	r.engine.Use(middleware.SecurityHeaders(r.config.Environment))

	// CORS with environment-specific settings
	var allowedOrigins []string
	if r.config.Environment == "production" {
		// Production domain will be added here in the future.
		allowedOrigins = []string{"https://yourdomain.com"}
	}
	r.engine.Use(middleware.CORS(r.config.Environment, allowedOrigins))

	// Global rate limiting
	r.engine.Use(middleware.RateLimit(100)) // 100 requests per minute per IP

	// Root endpoint
	r.engine.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "NoesisForge API",
			"version": "v1.0.0",
			"status":  "running",
			"time":    time.Now().UTC(),
		})
	})

	// API routes with security headers
	api := r.engine.Group("/api/v1")
	api.Use(middleware.APISecurityHeaders())

	// Register routes
	RegisterHealthRoutes(api, db)
	RegisterAuthRoutes(api, r.authService)
	RegisterRoleRoutes(api, r.roleService, r.authService)
	RegisterDocumentRoutes(api, r.documentService, r.minioService, r.authService)
	RegisterFavoriteRoutes(api, r.favoriteService, r.authService)
}

func (r *Router) GetEngine() *gin.Engine {
	return r.engine
}
