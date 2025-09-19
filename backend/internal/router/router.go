package router

import (
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/config"
	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/queue"
	"github.com/eyuppastirmaci/noesis-forge/internal/redis"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/websocket"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type Router struct {
	engine                *gin.Engine
	config                *config.Config
	authService           *services.AuthService
	roleService           *services.RoleService
	documentService       *services.DocumentService
	favoriteService       *services.FavoriteService
	minioService          *services.MinIOService
	redisClient           *redis.Client
	shareService          *services.ShareService
	userShareService      *services.UserShareService
	processingTaskService *services.ProcessingTaskService
	queuePublisher        *queue.Publisher
}

func New(
	cfg *config.Config,
	db *gorm.DB,
	documentService *services.DocumentService,
	authService *services.AuthService,
	userShareService *services.UserShareService,
	minioService *services.MinIOService,
	queuePublisher *queue.Publisher,
	processingTaskService *services.ProcessingTaskService,
) *Router {
	// Setup Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()

	// Initialize Redis client
	var redisClient *redis.Client
	var err error

	redisClient, err = redis.NewClient(cfg.Redis)
	if err != nil {
		logrus.Warnf("Redis connection failed in router, some features disabled: %v", err)
		redisClient = nil
	}

	// Initialize other services
	roleService := services.NewRoleService(db)
	shareService := services.NewShareService(db, redisClient)
	favoriteService := services.NewFavoriteService(db)

	return &Router{
		engine:                engine,
		config:                cfg,
		authService:           authService,
		roleService:           roleService,
		documentService:       documentService,
		favoriteService:       favoriteService,
		minioService:          minioService,
		redisClient:           redisClient,
		shareService:          shareService,
		userShareService:      userShareService,
		processingTaskService: processingTaskService,
		queuePublisher:        queuePublisher,
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
	RegisterAuthRoutes(api, r.authService, r.redisClient)
	RegisterRoleRoutes(api, r.roleService, r.authService)
	RegisterDocumentRoutes(api, r.documentService, r.minioService, r.authService, r.userShareService, r.processingTaskService, r.queuePublisher)
	RegisterFavoriteRoutes(api, r.favoriteService, r.authService)
	RegisterCommentRoutes(api, db, r.authService, r.redisClient)
	RegisterActivityRoutes(api, db, r.authService)

	// Share routes
	shareHandler := handlers.NewShareHandler(r.shareService, r.minioService, r.config)
	r.engine.GET("/share/:token", shareHandler.DownloadShared)
	RegisterShareRoutes(api, r.shareService, r.minioService, r.authService, r.config)

	// User Share routes
	userShareHandler := handlers.NewUserShareHandler(r.userShareService, r.config)
	RegisterUserShareRoutes(api, userShareHandler, r.authService)

	// Internal routes for workers (no authentication required)
	internalHandler := handlers.NewInternalHandler(r.documentService, r.processingTaskService, db)
	RegisterInternalRoutes(api, internalHandler)
}

func (r *Router) GetEngine() *gin.Engine {
	return r.engine
}

func (r *Router) SetupWebSocket(wsServer *websocket.Server) {
	// Add WebSocket endpoint
	r.engine.GET("/socket.io/*any", gin.WrapH(wsServer.GetServer()))
	r.engine.POST("/socket.io/*any", gin.WrapH(wsServer.GetServer()))
}
