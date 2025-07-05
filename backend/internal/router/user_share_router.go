package router

import (
	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/gin-gonic/gin"
)

func RegisterUserShareRoutes(api *gin.RouterGroup, userShareHandler *handlers.UserShareHandler, authService *services.AuthService) {
	// User share routes - all protected
	shareRoutes := api.Group("/shares")
	shareRoutes.Use(middleware.AuthMiddleware(authService))
	{
		shareRoutes.GET("/with-me", userShareHandler.GetSharedWithMe)
		shareRoutes.GET("/by-me", userShareHandler.GetSharedByMe)
		shareRoutes.GET("/public-links", userShareHandler.GetPublicLinks)
		shareRoutes.DELETE("/:shareId", userShareHandler.RevokeUserShare)
		shareRoutes.PUT("/:shareId/access", userShareHandler.UpdateUserShareAccess)
		shareRoutes.GET("/notifications", userShareHandler.GetShareNotifications)
		shareRoutes.PUT("/notifications/:id/read", userShareHandler.MarkNotificationAsRead)
	}

	// Document-specific user share routes
	documentRoutes := api.Group("/documents")
	documentRoutes.Use(middleware.AuthMiddleware(authService))
	{
		documentRoutes.POST("/:id/share/users", userShareHandler.CreateUserShare)
		documentRoutes.GET("/:id/access", userShareHandler.ValidateAccess)
		documentRoutes.POST("/:id/access", userShareHandler.RecordAccess)
	}
}
