package router

import (
	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/redis"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/validations"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterCommentRoutes(router *gin.RouterGroup, db *gorm.DB, authService *services.AuthService, redisClient *redis.Client) {
	commentHandler := handlers.NewCommentHandler(db, authService)

	// Middleware to inject Redis client into context
	redisMiddleware := func(c *gin.Context) {
		if redisClient != nil {
			c.Set("redisClient", redisClient)
		}
		c.Next()
	}

	// Document comment routes
	documents := router.Group("/documents/:id/comments")
	documents.Use(middleware.AuthMiddleware(authService))
	documents.Use(redisMiddleware)
	{
		documents.GET("", validations.ValidateCommentList(), commentHandler.GetDocumentComments)
		documents.POST("", validations.ValidateCommentCreate(), commentHandler.CreateComment)
	}

	// Comment management routes
	comments := router.Group("/comments")
	comments.Use(middleware.AuthMiddleware(authService))
	comments.Use(redisMiddleware)
	{
		comments.PUT("/:id", validations.ValidateCommentID(), validations.ValidateCommentUpdate(), commentHandler.UpdateComment)
		comments.DELETE("/:id", validations.ValidateCommentID(), commentHandler.DeleteComment)
		comments.POST("/:id/resolve", validations.ValidateCommentID(), commentHandler.ResolveComment)
		comments.POST("/:id/unresolve", validations.ValidateCommentID(), commentHandler.UnresolveComment)
	}
}
