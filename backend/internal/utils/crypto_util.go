package utils

import (
	"crypto/rand"
	"encoding/base64"
)

// GenerateEncryptionSalt generates a random salt for E2EE key derivation
func GenerateEncryptionSalt() (string, error) {
	salt := make([]byte, 16) // 128-bit salt
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(salt), nil
}
