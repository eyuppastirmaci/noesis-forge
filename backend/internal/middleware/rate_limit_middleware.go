package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimitRedis returns a Gin middleware that enforces a simple
func RateLimitRedis(client *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	const keyPrefix = "rate_limit:ip:"
	return func(c *gin.Context) {
		// If no Redis client (nil) fall back to no-limit behaviour.
		if client == nil {
			c.Next()
			return
		}

		ip := c.ClientIP()
		key := fmt.Sprintf("%s%s", keyPrefix, ip)

		ctx := c.Request.Context()

		// Increment the counter atomically.
		count, err := client.Incr(ctx, key).Result()
		if err != nil {
			// Fail-open: on Redis error allow request but log if desired.
			c.Next()
			return
		}

		// First time we see the key – set expiry to the window length.
		if count == 1 {
			_ = client.Expire(ctx, key, window).Err()
		}

		if count > int64(limit) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"code":    "RATE_LIMIT_EXCEEDED",
				"message": "Too many requests. Please try again later.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
