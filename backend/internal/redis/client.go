package redis

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"net/url"
	"strings"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/config"
	"github.com/redis/go-redis/v9"
)

// Client holds the Redis client instance
type Client struct {
	Client *redis.Client
	ctx    context.Context
}

// NewClient creates a new Redis client from RedisConfig
func NewClient(cfg config.RedisConfig) (*Client, error) {
	ctx := context.Background()

	// Parse Redis URL
	redisURL, err := url.Parse(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	// Extract connection details
	addr := redisURL.Host
	password := cfg.Password
	db := cfg.DB

	// Override password if provided in URL
	if redisURL.User != nil {
		if pwd, ok := redisURL.User.Password(); ok {
			password = pwd
		}
	}

	// Create Redis client options
	opts := &redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           db,
		PoolSize:     cfg.PoolSize,
		MinIdleConns: cfg.MinIdle,
		DialTimeout:  cfg.DialTimeout,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		PoolTimeout:  30 * time.Second,
	}

	// Configure TLS if Redis URL uses rediss:// scheme
	if strings.ToLower(redisURL.Scheme) == "rediss" {
		opts.TLSConfig = &tls.Config{
			ServerName: strings.Split(addr, ":")[0],
		}
	}

	// Create Redis client
	client := redis.NewClient(opts)

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Printf("Connected to Redis at %s (DB: %d)", addr, db)

	return &Client{
		Client: client,
		ctx:    ctx,
	}, nil
}

// GetContext returns the context for Redis operations
func (r *Client) GetContext() context.Context {
	return r.ctx
}

// Close closes the Redis connection
func (r *Client) Close() error {
	return r.Client.Close()
}

// Ping tests the Redis connection
func (r *Client) Ping() error {
	return r.Client.Ping(r.ctx).Err()
}

// GetStats returns Redis connection stats
func (r *Client) GetStats() *redis.PoolStats {
	return r.Client.PoolStats()
}

// HealthCheck performs a comprehensive health check for Redis
func (r *Client) HealthCheck() error {
	// Test basic operations
	testKey := "health_check_test"
	testValue := "ok"

	// Set a test key
	if err := r.Client.Set(r.ctx, testKey, testValue, 10*time.Second).Err(); err != nil {
		return fmt.Errorf("redis health check failed (SET): %w", err)
	}

	// Get the test key
	val, err := r.Client.Get(r.ctx, testKey).Result()
	if err != nil {
		return fmt.Errorf("redis health check failed (GET): %w", err)
	}

	if val != testValue {
		return fmt.Errorf("redis health check failed: expected %s, got %s", testValue, val)
	}

	// Delete the test key
	if err := r.Client.Del(r.ctx, testKey).Err(); err != nil {
		return fmt.Errorf("redis health check failed (DEL): %w", err)
	}

	return nil
}
