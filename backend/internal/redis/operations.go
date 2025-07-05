package redis

import (
	"time"
)

// SetWithExpiry sets a key with expiration
func (r *Client) SetWithExpiry(key string, value interface{}, expiry time.Duration) error {
	return r.Client.Set(r.ctx, key, value, expiry).Err()
}

// Get gets a value by key
func (r *Client) Get(key string) (string, error) {
	return r.Client.Get(r.ctx, key).Result()
}

// Delete deletes a key
func (r *Client) Delete(key string) error {
	return r.Client.Del(r.ctx, key).Err()
}

// Increment increments a key's value
func (r *Client) Increment(key string) (int64, error) {
	return r.Client.Incr(r.ctx, key).Result()
}

// IncrementWithExpiry increments a key's value and sets expiration
func (r *Client) IncrementWithExpiry(key string, expiry time.Duration) (int64, error) {
	pipe := r.Client.Pipeline()
	incrCmd := pipe.Incr(r.ctx, key)
	pipe.Expire(r.ctx, key, expiry)

	if _, err := pipe.Exec(r.ctx); err != nil {
		return 0, err
	}

	return incrCmd.Val(), nil
}

// Exists checks if a key exists
func (r *Client) Exists(key string) (bool, error) {
	result, err := r.Client.Exists(r.ctx, key).Result()
	return result > 0, err
}

// GetTTL gets the TTL of a key
func (r *Client) GetTTL(key string) (time.Duration, error) {
	return r.Client.TTL(r.ctx, key).Result()
}
