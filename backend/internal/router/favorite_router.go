package router

import (
	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/validations"
	"github.com/gin-gonic/gin"
)

func RegisterFavoriteRoutes(r *gin.RouterGroup, favoriteService *services.FavoriteService, authService *services.AuthService) {
	favoriteHandler := handlers.NewFavoriteHandler(favoriteService)

	favorites := r.Group("/favorites")
	favorites.Use(middleware.AuthMiddleware(authService))
	{
		// User favorites management
		favorites.GET("", favoriteHandler.GetUserFavorites)

		// Document favorite operations
		favorites.POST("/:id", validations.ValidateDocumentID(), favoriteHandler.AddToFavorites)
		favorites.DELETE("/:id", validations.ValidateDocumentID(), favoriteHandler.RemoveFromFavorites)
		favorites.GET("/:id/status", validations.ValidateDocumentID(), favoriteHandler.IsFavorited)
		favorites.GET("/:id/count", validations.ValidateDocumentID(), favoriteHandler.GetFavoriteCount)
	}
}
