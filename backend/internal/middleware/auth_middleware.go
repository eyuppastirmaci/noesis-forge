package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func AuthMiddleware(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try to get token from cookie first (more secure)
		token, err := c.Cookie("access_token")
		if err != nil || token == "" {
			// Fallback to Authorization header for backward compatibility
			authHeader := c.GetHeader("Authorization")
			if authHeader == "" {
				utils.ErrorResponse(c, http.StatusUnauthorized, "MISSING_TOKEN", "Authentication token is required")
				c.Abort()
				return
			}

			// Extract token from "Bearer <token>" format
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				utils.ErrorResponse(c, http.StatusUnauthorized, "INVALID_TOKEN_FORMAT", "Invalid authorization header format")
				c.Abort()
				return
			}
			token = parts[1]
		}

		// Validate token
		claims, err := authService.ValidateToken(token)
		if err != nil {
			// Try to refresh token if it's expired and we have a refresh token cookie
			if strings.Contains(err.Error(), "token is expired") {
				refreshToken, refreshErr := c.Cookie("refresh_token")
				if refreshErr == nil && refreshToken != "" {
					// Try to refresh the token
					newTokens, refreshErr := authService.RefreshToken(c.Request.Context(), refreshToken)
					if refreshErr == nil {
						// Set new tokens in cookies
						authService.SetAuthCookies(c, newTokens)

						// Validate the new token
						claims, err = authService.ValidateToken(newTokens.AccessToken)
						if err == nil {
							// Set user context and continue
							c.Set("userID", claims.UserID)
							c.Set("userEmail", claims.Email)
							c.Set("username", claims.Username)
							c.Set("roleID", claims.RoleID)
							c.Set("roleName", claims.RoleName)
							c.Next()
							return
						}
					}
				}
			}

			utils.ErrorResponse(c, http.StatusUnauthorized, "INVALID_TOKEN", err.Error())
			c.Abort()
			return
		}

		// Set user context
		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)
		c.Set("username", claims.Username)
		c.Set("roleID", claims.RoleID)
		c.Set("roleName", claims.RoleName)
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
