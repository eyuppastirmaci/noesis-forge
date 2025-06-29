package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// Temp in-memory rate limiter; will switch to Redis.

type RateLimiter struct {
	visitors map[string]*Visitor
	mu       sync.RWMutex
	rate     time.Duration
	burst    int
}

type Visitor struct {
	limiter  *TokenBucket
	lastSeen time.Time
}

type TokenBucket struct {
	tokens     int
	capacity   int
	refillRate time.Duration
	lastRefill time.Time
	mu         sync.Mutex
}

func NewTokenBucket(capacity int, refillRate time.Duration) *TokenBucket {
	return &TokenBucket{
		tokens:     capacity,
		capacity:   capacity,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

func (tb *TokenBucket) Allow() bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(tb.lastRefill)
	tokensToAdd := int(elapsed / tb.refillRate)

	if tokensToAdd > 0 {
		tb.tokens += tokensToAdd
		if tb.tokens > tb.capacity {
			tb.tokens = tb.capacity
		}
		tb.lastRefill = now
	}

	if tb.tokens > 0 {
		tb.tokens--
		return true
	}

	return false
}

func NewRateLimiter(rate time.Duration, burst int) *RateLimiter {
	return &RateLimiter{
		visitors: make(map[string]*Visitor),
		rate:     rate,
		burst:    burst,
	}
}

func (rl *RateLimiter) getVisitor(ip string) *TokenBucket {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	visitor, exists := rl.visitors[ip]
	if !exists {
		visitor = &Visitor{
			limiter:  NewTokenBucket(rl.burst, rl.rate),
			lastSeen: time.Now(),
		}
		rl.visitors[ip] = visitor
	}

	visitor.lastSeen = time.Now()
	return visitor.limiter
}

func (rl *RateLimiter) cleanupVisitors() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	for ip, visitor := range rl.visitors {
		if time.Since(visitor.lastSeen) > 3*time.Minute {
			delete(rl.visitors, ip)
		}
	}
}

func RateLimit(requestsPerMinute int) gin.HandlerFunc {
	rateLimiter := NewRateLimiter(time.Minute/time.Duration(requestsPerMinute), requestsPerMinute)

	// Cleanup goroutine
	go func() {
		for {
			time.Sleep(time.Minute)
			rateLimiter.cleanupVisitors()
		}
	}()

	return func(c *gin.Context) {
		ip := c.ClientIP()
		limiter := rateLimiter.getVisitor(ip)

		if !limiter.Allow() {
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

// Strict rate limiting for sensitive endpoints like auth
func StrictRateLimit(requestsPerMinute int) gin.HandlerFunc {
	return RateLimit(requestsPerMinute)
}
