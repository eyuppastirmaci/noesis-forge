package router

import (
	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterActivityRoutes(router *gin.RouterGroup, db *gorm.DB, authService *services.AuthService) {
	activityHandler := handlers.NewActivityHandler(db)

	// Document activity routes
	documents := router.Group("/documents/:id/activities")
	documents.Use(middleware.AuthMiddleware(authService))
	{
		documents.GET("", activityHandler.GetDocumentActivities)
	}

	// User activity routes
	activities := router.Group("/activities")
	activities.Use(middleware.AuthMiddleware(authService))
	{
		activities.GET("", activityHandler.GetUserActivities)
		activities.GET("/stats", activityHandler.GetActivityStats)
	}
}
