package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type HealthHandler struct {
	db *gorm.DB
}

func NewHealthHandler(db *gorm.DB) *HealthHandler {
	return &HealthHandler{db: db}
}

func (h *HealthHandler) RegisterRoutes(r *gin.RouterGroup) {
	health := r.Group("/health")
	{
		health.GET("", h.HealthCheck)
		health.GET("/ready", h.ReadinessCheck)
		health.GET("/live", h.LivenessCheck)
	}
}

// HealthCheck performs a comprehensive health check
func (h *HealthHandler) HealthCheck(c *gin.Context) {
	status := "healthy"
	statusCode := http.StatusOK
	checks := make(map[string]interface{})

	// Database health check
	dbStatus := h.checkDatabase()
	checks["database"] = dbStatus

	if dbStatus["status"] != "up" {
		status = "unhealthy"
		statusCode = http.StatusServiceUnavailable
	}

	response := gin.H{
		"status":    status,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"checks":    checks,
	}

	c.JSON(statusCode, response)
}

// ReadinessCheck checks if the service is ready to serve requests
func (h *HealthHandler) ReadinessCheck(c *gin.Context) {
	// Check if all dependencies are ready
	dbStatus := h.checkDatabase()

	if dbStatus["status"] == "up" {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ready",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	} else {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":    "not ready",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"reason":    "database not available",
		})
	}
}

// LivenessCheck checks if the service is alive
func (h *HealthHandler) LivenessCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "alive",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func (h *HealthHandler) checkDatabase() map[string]interface{} {
	start := time.Now()

	sqlDB, err := h.db.DB()
	if err != nil {
		return map[string]interface{}{
			"status":        "down",
			"error":         "failed to get database instance",
			"response_time": time.Since(start).Milliseconds(),
		}
	}

	if err := sqlDB.Ping(); err != nil {
		return map[string]interface{}{
			"status":        "down",
			"error":         "database ping failed",
			"response_time": time.Since(start).Milliseconds(),
		}
	}

	// Get database stats
	stats := sqlDB.Stats()

	return map[string]interface{}{
		"status":        "up",
		"response_time": time.Since(start).Milliseconds(),
		"connections": map[string]interface{}{
			"open":     stats.OpenConnections,
			"in_use":   stats.InUse,
			"idle":     stats.Idle,
			"max_open": stats.MaxOpenConnections,
		},
	}
}
