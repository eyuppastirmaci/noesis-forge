package router

import (
	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterHealthRoutes(r *gin.RouterGroup, db *gorm.DB) {
	// Initialize handler
	healthHandler := handlers.NewHealthHandler(db)

	health := r.Group("/health")
	{
		health.GET("", healthHandler.HealthCheck)
		health.GET("/ready", healthHandler.ReadinessCheck)
		health.GET("/live", healthHandler.LivenessCheck)
	}
}
