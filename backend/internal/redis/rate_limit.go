package redis

import (
	"time"
)

// CheckRateLimit checks if the rate limit is exceeded for given key
func (r *Client) CheckRateLimit(key string, limit int64, window time.Duration) (bool, int64, error) {
	count, err := r.Client.Incr(r.ctx, key).Result()
	if err != nil {
		return false, 0, err
	}

	// Set expiry on first increment
	if count == 1 {
		if err := r.Client.Expire(r.ctx, key, window).Err(); err != nil {
			return false, count, err
		}
	}

	return count > limit, count, nil
}
