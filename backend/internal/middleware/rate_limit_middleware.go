package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/redis"
	"github.com/gin-gonic/gin"
)

// RateLimitRedis returns a Gin middleware that enforces rate limiting using Redis
func RateLimitRedis(client *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	const keyPrefix = "rate_limit:ip:"
	return func(c *gin.Context) {
		// If no Redis client (nil) fall back to no-limit behaviour.
		if client == nil {
			c.Next()
			return
		}

		ip := c.ClientIP()
		// Include request path so limits apply per-endpoint rather than globally per IP
		key := fmt.Sprintf("%s%s:%s", keyPrefix, ip, c.FullPath())

		// Check rate limit using our Redis client
		exceeded, count, err := client.CheckRateLimit(key, int64(limit), window)
		if err != nil {
			// Fail-open: on Redis error allow request but log if desired.
			c.Next()
			return
		}

		if exceeded {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"code":    "RATE_LIMIT_EXCEEDED",
				"message": "Too many requests. Please try again later.",
				"details": fmt.Sprintf("Rate limit exceeded. %d requests in the last %v", count, window),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
