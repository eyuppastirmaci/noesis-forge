package router

import (
	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/gin-gonic/gin"
)

// RegisterInternalRoutes registers internal API routes used by workers
func RegisterInternalRoutes(api *gin.RouterGroup, internalHandler *handlers.InternalHandler) {
	internal := api.Group("/internal")

	// Internal worker endpoints (no authentication required for workers)
	internal.PATCH("/documents/:id/extracted-text", internalHandler.UpdateExtractedText)
	internal.PATCH("/documents/:id/summary", internalHandler.UpdateSummary)
	internal.PATCH("/documents/:id/status", internalHandler.UpdateStatus)
}
