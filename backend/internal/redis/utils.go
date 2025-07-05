package redis

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

// BuildRedisURL builds Redis URL from parts
func BuildRedisURL(host, port, password string, db int, useSSL bool) string {
	scheme := "redis"
	if useSSL {
		scheme = "rediss"
	}

	if password != "" {
		return fmt.Sprintf("%s://:%s@%s:%s/%d", scheme, password, host, port, db)
	}

	return fmt.Sprintf("%s://%s:%s/%d", scheme, host, port, db)
}

// ParseRedisURL parses Redis URL into components
func ParseRedisURL(redisURL string) (host, port, password string, db int, useSSL bool, err error) {
	u, err := url.Parse(redisURL)
	if err != nil {
		return "", "", "", 0, false, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	useSSL = strings.ToLower(u.Scheme) == "rediss"

	hostPort := strings.Split(u.Host, ":")
	host = hostPort[0]
	port = "6379" // default
	if len(hostPort) > 1 {
		port = hostPort[1]
	}

	if u.User != nil {
		if pwd, ok := u.User.Password(); ok {
			password = pwd
		}
	}

	// Parse database number from path
	if u.Path != "" && u.Path != "/" {
		dbStr := strings.TrimPrefix(u.Path, "/")
		if dbStr != "" {
			db, err = strconv.Atoi(dbStr)
			if err != nil {
				return "", "", "", 0, false, fmt.Errorf("invalid database number in Redis URL: %w", err)
			}
		}
	}

	return host, port, password, db, useSSL, nil
}
