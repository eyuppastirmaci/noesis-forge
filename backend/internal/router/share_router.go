package router

import (
	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/gin-gonic/gin"
)

func RegisterShareRoutes(api *gin.RouterGroup, shareService *services.ShareService, minioService *services.MinIOService, authService *services.AuthService) {
	h := handlers.NewShareHandler(shareService, minioService)

	// Authenticated share creation inside /documents
	docs := api.Group("/documents")
	docs.Use(middleware.AuthMiddleware(authService))
	docs.POST(":id/share", handlers.CSRF(), h.CreateShare)
	docs.GET(":id/shares", h.GetDocumentShares)
	docs.DELETE(":id/shares/:shareId", h.RevokeShare)
}
