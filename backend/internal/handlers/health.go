package handlers

import (
	"net/http"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type HealthHandler struct {
	db *gorm.DB
}

func NewHealthHandler(db *gorm.DB) *HealthHandler {
	return &HealthHandler{db: db}
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

	data := gin.H{
		"status": status,
		"checks": checks,
	}

	utils.SuccessResponse(c, statusCode, data)
}

// ReadinessCheck checks if the service is ready to serve requests
func (h *HealthHandler) ReadinessCheck(c *gin.Context) {
	// Check if all dependencies are ready
	dbStatus := h.checkDatabase()

	if dbStatus["status"] == "up" {
		data := gin.H{
			"status": "ready",
		}
		utils.SuccessResponse(c, http.StatusOK, data, "Service is ready")
	} else {
		utils.ServiceUnavailableResponse(c, "Service is not ready")
	}
}

// LivenessCheck checks if the service is alive
func (h *HealthHandler) LivenessCheck(c *gin.Context) {
	data := gin.H{
		"status": "alive",
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Service is alive")
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
