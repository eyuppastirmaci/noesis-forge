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
		// Public routes with rate limiting and validation middleware

		// Login endpoint - strict rate limiting (5 requests per minute)
		auth.POST("/login",
			middleware.StrictRateLimit(5),
			validations.ValidateLogin(),
			authHandler.Login)

		// Register endpoint - moderate rate limiting (3 requests per minute)
		auth.POST("/register",
			middleware.StrictRateLimit(3),
			validations.ValidateCreateUser(),
			authHandler.Register)

		// Refresh and logout - moderate rate limiting (10 requests per minute)
		auth.POST("/refresh",
			middleware.RateLimit(10),
			authHandler.RefreshToken)

		auth.POST("/logout",
			middleware.RateLimit(10),
			authHandler.Logout)

		// Protected routes
		protected := auth.Group("")
		protected.Use(middleware.AuthMiddleware(authService))
		{
			protected.GET("/profile", authHandler.GetProfile)
			protected.PUT("/profile",
				middleware.RateLimit(30),
				validations.ValidateUpdateProfile(),
				authHandler.UpdateProfile)
			protected.PUT("/change-password",
				middleware.StrictRateLimit(3),
				validations.ValidateChangePassword(),
				authHandler.ChangePassword)
		}
	}
}
