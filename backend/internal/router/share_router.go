package router

import (
	"github.com/eyuppastirmaci/noesis-forge/internal/config"
	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/gin-gonic/gin"
)

func RegisterShareRoutes(api *gin.RouterGroup, shareService *services.ShareService, minioService *services.MinIOService, authService *services.AuthService, cfg *config.Config) {
	h := handlers.NewShareHandler(shareService, minioService, cfg)

	// Authenticated share creation
	docs := api.Group("/documents")
	docs.Use(middleware.AuthMiddleware(authService))
	docs.POST(":id/share", middleware.CSRF(), h.CreateShare)
	docs.GET(":id/shares", h.GetDocumentShares)
	docs.DELETE(":id/shares/:shareId", h.RevokeShare)
}
