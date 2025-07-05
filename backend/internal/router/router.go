package router

import (
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/config"
	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/redis"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/gin-gonic/gin"
	goredis "github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type Router struct {
	engine           *gin.Engine
	config           *config.Config
	authService      *services.AuthService
	roleService      *services.RoleService
	documentService  *services.DocumentService
	favoriteService  *services.FavoriteService
	minioService     *services.MinIOService
	redisClient      *redis.Client
	shareService     *services.ShareService
	userShareService *services.UserShareService
}

func New(cfg *config.Config, db *gorm.DB) *Router {
	// Setup Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()

	// Initialize Redis client using our Redis package
	var redisClient *redis.Client
	var err error

	redisClient, err = redis.NewClient(cfg.Redis)
	if err != nil {
		// Log warning but don't fail - Redis is optional
		logrus.Warnf("Redis connection failed in router, some features disabled: %v", err)
		redisClient = nil
	}

	// Initialize MinIO service first as AuthService depends on it
	minioService, err := services.NewMinIOService(&cfg.MinIO)
	if err != nil {
		// Handle MinIO initialization error
		panic("Failed to initialize MinIO service: " + err.Error())
	}

	// Initialize services with proper Redis client types
	var rawRedisClient *goredis.Client = nil
	if redisClient != nil {
		rawRedisClient = redisClient.Client
	}

	authService := services.NewAuthService(db, cfg, rawRedisClient, minioService)
	roleService := services.NewRoleService(db)

	// Initialize Document service
	documentService := services.NewDocumentService(db, minioService)

	// Initialize Favorite service
	favoriteService := services.NewFavoriteService(db)

	// Initialize Share service with our custom Redis client
	shareService := services.NewShareService(db, redisClient)

	// Initialize User Share service
	userShareService := services.NewUserShareService(db, redisClient)

	return &Router{
		engine:           engine,
		config:           cfg,
		authService:      authService,
		roleService:      roleService,
		documentService:  documentService,
		favoriteService:  favoriteService,
		minioService:     minioService,
		redisClient:      redisClient,
		shareService:     shareService,
		userShareService: userShareService,
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

	// Rate limiter using our Redis client
	r.engine.Use(middleware.RateLimitRedis(r.redisClient, 100, time.Minute))

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

	// For auth routes, we pass our custom Redis client
	RegisterAuthRoutes(api, r.authService, r.redisClient)

	RegisterRoleRoutes(api, r.roleService, r.authService)
	RegisterDocumentRoutes(api, r.documentService, r.minioService, r.authService, r.userShareService)
	RegisterFavoriteRoutes(api, r.favoriteService, r.authService)

	// Share routes
	shareHandler := handlers.NewShareHandler(r.shareService, r.minioService)
	// public download
	r.engine.GET("/share/:token", shareHandler.DownloadShared)
	// creation under api group
	RegisterShareRoutes(api, r.shareService, r.minioService, r.authService)

	// User Share routes
	userShareHandler := handlers.NewUserShareHandler(r.userShareService)
	RegisterUserShareRoutes(api, userShareHandler, r.authService)
}

func (r *Router) GetEngine() *gin.Engine {
	return r.engine
}
