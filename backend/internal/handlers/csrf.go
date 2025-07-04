package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Returns a middleware that checks for X-CSRF-Token header.
func CSRF() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodPost ||
			c.Request.Method == http.MethodPut ||
			c.Request.Method == http.MethodPatch ||
			c.Request.Method == http.MethodDelete {
			token := c.GetHeader("X-CSRF-Token")
			if token == "" {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "CSRF token missing"})
				return
			}
		}
		c.Next()
	}
}
