package router

import (
	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/validations"
	"github.com/gin-gonic/gin"
)

func RegisterAuthRoutes(r *gin.RouterGroup, authService *services.AuthService) {
	// Initialize handler
	authHandler := handlers.NewAuthHandler(authService)

	auth := r.Group("/auth")
	{
		// Public routes with validation middleware
		auth.POST("/register", validations.ValidateCreateUser(), authHandler.Register)
		auth.POST("/login", validations.ValidateLogin(), authHandler.Login)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/logout", authHandler.Logout)

		// Protected routes
		protected := auth.Group("")
		protected.Use(middleware.AuthMiddleware(authService))
		{
			protected.GET("/profile", authHandler.GetProfile)
			protected.PUT("/profile", validations.ValidateUpdateProfile(), authHandler.UpdateProfile)
			protected.PUT("/change-password", validations.ValidateChangePassword(), authHandler.ChangePassword)
		}
	}
}
