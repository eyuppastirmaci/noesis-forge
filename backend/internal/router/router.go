package router

import (
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/config"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Router struct {
	engine      *gin.Engine
	config      *config.Config
	authService *services.AuthService
	roleService *services.RoleService
}

func New(cfg *config.Config, db *gorm.DB) *Router {
	// Setup Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()

	// Initialize services
	authService := services.NewAuthService(db, cfg)
	roleService := services.NewRoleService(db)

	return &Router{
		engine:      engine,
		config:      cfg,
		authService: authService,
		roleService: roleService,
	}
}

func (r *Router) SetupRoutes(db *gorm.DB) {
	// Global middleware
	r.engine.Use(gin.Logger())
	r.engine.Use(gin.Recovery())
	r.engine.Use(middleware.CORS())
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

	// API routes
	api := r.engine.Group("/api/v1")

	// Register routes
	RegisterHealthRoutes(api, db)
	RegisterAuthRoutes(api, r.authService)
	RegisterRoleRoutes(api, r.roleService, r.authService)
}

func (r *Router) GetEngine() *gin.Engine {
	return r.engine
}
