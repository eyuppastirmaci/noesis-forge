package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func AuthMiddleware(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "AUTHORIZATION_REQUIRED",
				"message": "Authorization header is required",
			})
			c.Abort()
			return
		}

		// Check if the header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "INVALID_TOKEN_FORMAT",
				"message": "Authorization header must start with 'Bearer '",
			})
			c.Abort()
			return
		}

		// Extract token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "EMPTY_TOKEN",
				"message": "Token cannot be empty",
			})
			c.Abort()
			return
		}

		// Validate token
		tokenClaims, err := authService.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "INVALID_TOKEN",
				"message": "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("userID", tokenClaims.UserID)
		c.Set("userEmail", tokenClaims.Email)
		c.Set("username", tokenClaims.Username)
		c.Set("roleID", tokenClaims.RoleID)
		c.Set("roleName", tokenClaims.RoleName)
		c.Next()
	}
}

// RequireRole middleware that checks if user has specific role
func RequireRole(roleName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("roleName")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    "UNAUTHORIZED",
				"message": "User role not found",
			})
			c.Abort()
			return
		}

		if userRole.(string) != roleName {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    "FORBIDDEN",
				"message": "Insufficient permissions",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireAdmin middleware that checks if user is admin
func RequireAdmin() gin.HandlerFunc {
	return RequireRole("admin")
}

// GetUserIDFromContext extracts user ID from gin context
func GetUserIDFromContext(c *gin.Context) (uuid.UUID, error) {
	userIDInterface, exists := c.Get("userID")
	if !exists {
		return uuid.Nil, fmt.Errorf("user ID not found in context")
	}

	userID, ok := userIDInterface.(uuid.UUID)
	if !ok {
		return uuid.Nil, fmt.Errorf("invalid user ID format in context")
	}

	return userID, nil
}

// GetUserEmailFromContext extracts user email from gin context
func GetUserEmailFromContext(c *gin.Context) (string, error) {
	emailInterface, exists := c.Get("userEmail")
	if !exists {
		return "", fmt.Errorf("user email not found in context")
	}

	email, ok := emailInterface.(string)
	if !ok {
		return "", fmt.Errorf("invalid user email format in context")
	}

	return email, nil
}
