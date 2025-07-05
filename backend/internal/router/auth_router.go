package router

import (
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/redis"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/validations"
	"github.com/gin-gonic/gin"
)

// Temp in-memory rate limiter; will switch to Redis.

func RegisterAuthRoutes(r *gin.RouterGroup, authService *services.AuthService, redisClient *redis.Client) {
	// Initialize handler
	authHandler := handlers.NewAuthHandler(authService)

	auth := r.Group("/auth")
	{
		// Public routes with rate limiting and validation middleware

		// Login endpoint - strict rate limiting (5 requests per minute)
		auth.POST("/login",
			middleware.RateLimitRedis(redisClient, 5, time.Minute),
			validations.ValidateLogin(),
			authHandler.Login)

		// Register endpoint - moderate rate limiting (3 requests per minute)
		auth.POST("/register",
			middleware.RateLimitRedis(redisClient, 3, time.Minute),
			validations.ValidateCreateUser(),
			authHandler.Register)

		// Refresh and logout - moderate rate limiting (10 requests per minute)
		auth.POST("/refresh",
			middleware.RateLimitRedis(redisClient, 10, time.Minute),
			authHandler.RefreshToken)

		auth.POST("/validate",
			middleware.RateLimitRedis(redisClient, 20, time.Minute),
			authHandler.ValidateToken)

		auth.POST("/logout",
			middleware.RateLimitRedis(redisClient, 10, time.Minute),
			authHandler.Logout)

		// Protected routes
		protected := auth.Group("")
		protected.Use(middleware.AuthMiddleware(authService))
		{
			protected.GET("/profile", authHandler.GetProfile)
			protected.GET("/profile/full-name", authHandler.GetMyFullName)
			protected.GET("/users/:id/full-name", authHandler.GetFullNameByID)
			protected.POST("/profile/avatar", authHandler.UploadAvatar)
			protected.DELETE("/profile/avatar", authHandler.DeleteAvatar)
			protected.PUT("/profile",
				middleware.RateLimitRedis(redisClient, 30, time.Minute),
				validations.ValidateUpdateProfile(),
				authHandler.UpdateProfile)
			protected.PUT("/change-password",
				middleware.RateLimitRedis(redisClient, 3, time.Minute),
				validations.ValidateChangePassword(),
				authHandler.ChangePassword)
		}
	}
}
