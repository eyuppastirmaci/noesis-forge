package redis

// HSet sets a hash field
func (r *Client) HSet(key string, values ...interface{}) error {
	return r.Client.HSet(r.ctx, key, values...).Err()
}

// HGet gets a hash field
func (r *Client) HGet(key, field string) (string, error) {
	return r.Client.HGet(r.ctx, key, field).Result()
}

// HGetAll gets all hash fields
func (r *Client) HGetAll(key string) (map[string]string, error) {
	return r.Client.HGetAll(r.ctx, key).Result()
}

// HDel deletes hash fields
func (r *Client) HDel(key string, fields ...string) error {
	return r.Client.HDel(r.ctx, key, fields...).Err()
}
