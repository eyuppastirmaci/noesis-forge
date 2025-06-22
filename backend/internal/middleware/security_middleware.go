package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeaders adds various security headers to responses
func SecurityHeaders(environment string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Content Security Policy
		if environment == "production" {
			c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'")
		} else {
			// More lenient CSP for development
			c.Header("Content-Security-Policy", "default-src 'self' 'unsafe-eval' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws: wss:")
		}

		// Prevent clickjacking
		c.Header("X-Frame-Options", "DENY")

		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")

		// XSS protection
		c.Header("X-XSS-Protection", "1; mode=block")

		// Referrer policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions policy (formerly Feature Policy)
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		// Strict Transport Security (only for HTTPS)
		if environment == "production" {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}

		// Remove server information
		c.Header("Server", "")

		c.Next()
	}
}

// NoCache adds cache control headers to prevent caching of sensitive endpoints
func NoCache() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		c.Next()
	}
}

// APISecurityHeaders adds specific security headers for API endpoints
func APISecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Ensure JSON content type for API responses
		c.Header("Content-Type", "application/json; charset=utf-8")

		// Prevent caching of API responses
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")

		// Add security headers
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-XSS-Protection", "1; mode=block")

		c.Next()
	}
}
