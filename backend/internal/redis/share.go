package redis

import (
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// SetShareAttempt sets share attempt count with expiry
func (r *Client) SetShareAttempt(clientIP string, attempts int64, window time.Duration) error {
	key := fmt.Sprintf("share_attempt:%s", clientIP)
	return r.Client.SetEx(r.ctx, key, attempts, window).Err()
}

// GetShareAttempt gets share attempt count
func (r *Client) GetShareAttempt(clientIP string) (int64, error) {
	key := fmt.Sprintf("share_attempt:%s", clientIP)
	val, err := r.Client.Get(r.ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return 0, nil
		}
		return 0, err
	}
	return strconv.ParseInt(val, 10, 64)
}

// IncrementShareAttempt increments share attempt count
func (r *Client) IncrementShareAttempt(clientIP string, window time.Duration) (int64, error) {
	key := fmt.Sprintf("share_attempt:%s", clientIP)
	return r.IncrementWithExpiry(key, window)
}
