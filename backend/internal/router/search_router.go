package router

import (
	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/gin-gonic/gin"
)

func RegisterSearchRoutes(api *gin.RouterGroup, searchService *services.SearchService, authService *services.AuthService) {
	searchHandler := handlers.NewSearchHandler(searchService)

	search := api.Group("/search")
	search.Use(middleware.AuthMiddleware(authService))
	{
		// Similarity search
		search.GET("/similarity", searchHandler.SimilaritySearch)

		// Hybrid search
		search.POST("/hybrid", searchHandler.HybridSearch)
	}
}
