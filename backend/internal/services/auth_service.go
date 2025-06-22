package services

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/config"
	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type AuthService struct {
	db     *gorm.DB
	config *config.Config
	redis  *redis.Client
	logger *logrus.Entry
}

func NewAuthService(db *gorm.DB, cfg *config.Config, redisClient *redis.Client) *AuthService {
	return &AuthService{
		db:     db,
		config: cfg,
		redis:  redisClient,
		logger: logrus.WithField("service", "auth"),
	}
}

// Request/Response types
type RegisterRequest struct {
	Email           string `json:"email" binding:"required,email" example:"user@example.com"`
	Username        string `json:"username" binding:"required,min=3,max=50,username" example:"johndoe"`
	Name            string `json:"name" binding:"required,min=2,max=100" example:"John Doe"`
	Password        string `json:"password" binding:"required,min=8,password_strength" example:"SecurePass123!"`
	PasswordConfirm string `json:"passwordConfirm" binding:"required,eqfield=Password" example:"SecurePass123!"`
}

type LoginRequest struct {
	Email    string `json:"email,omitempty"`
	Username string `json:"username,omitempty"`
	Password string `json:"password" binding:"required"`
	Remember bool   `json:"remember"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"oldPassword" binding:"required"`
	NewPassword string `json:"newPassword" binding:"required,min=8"`
}

type UpdateProfileRequest struct {
	Name     *string `json:"name,omitempty"`
	Username *string `json:"username,omitempty"`
	Bio      *string `json:"bio,omitempty"`
	Avatar   *string `json:"avatar,omitempty"`
}

// Auth methods
func (s *AuthService) Register(ctx context.Context, req *RegisterRequest) (*models.User, error) {
	// Validate password confirmation
	if req.Password != req.PasswordConfirm {
		return nil, fmt.Errorf("passwords do not match")
	}

	// Check if user exists
	var existingUser models.User
	if err := s.db.Where("email = ? OR username = ?", req.Email, req.Username).First(&existingUser).Error; err == nil {
		if existingUser.Email == req.Email {
			return nil, fmt.Errorf("email already exists")
		}
		return nil, fmt.Errorf("username already exists")
	}

	// Get default role
	var defaultRole models.Role
	if err := s.db.Where("is_default = ?", true).First(&defaultRole).Error; err != nil {
		return nil, fmt.Errorf("default role not found")
	}

	// Create user
	user := &models.User{
		Email:         req.Email,
		Username:      req.Username,
		Name:          req.Name,
		Password:      req.Password, // Will be hashed by BeforeCreate hook
		RoleID:        defaultRole.ID,
		Status:        models.StatusPending,
		EmailVerified: false,
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Load role data for response
	user.Role = defaultRole
	user.Password = "" // Don't return password

	s.logger.Infof("User registered: %s", user.Email)
	return user, nil
}

func (s *AuthService) Login(ctx context.Context, req *LoginRequest) (*models.User, *models.TokenPair, error) {
	var user models.User

	// Define a standard error message for all login failures
	standardError := "Invalid email/username or password"

	// Find user by email or username
	query := s.db.Preload("Role.Permissions")
	if req.Email != "" {
		query = query.Where("email = ?", req.Email)
	} else if req.Username != "" {
		query = query.Where("username = ?", req.Username)
	} else {
		// Don't reveal that fields are missing - return standard error
		return nil, nil, errors.New(standardError)
	}

	userFound := true
	if err := query.First(&user).Error; err != nil {
		userFound = false
	}

	// This ensures constant time response regardless of username validity
	if userFound {
		// Check actual password for existing user
		if !utils.CheckPasswordHash(req.Password, user.Password) {
			// Increment failed attempts (but don't reveal this to user)
			s.db.Model(&user).Update("failed_attempts", gorm.Expr("failed_attempts + 1"))
			// Don't reveal if password is wrong - return standard error
			return nil, nil, errors.New(standardError)
		}
	} else {
		// Use a dummy hash to ensure the same computational cost
		dummyHash := "$2a$14$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj9QQTxRWC4G" // bcrypt cost 14
		utils.CheckPasswordHash(req.Password, dummyHash)
		// Return standard error after constant time delay
		return nil, nil, errors.New(standardError)
	}

	// Additional checks for valid user
	if user.IsLocked() {
		// For security, return standard error instead of revealing account status
		return nil, nil, errors.New(standardError)
	}

	// Check if email is verified (for production, skip for development)
	if s.config.Environment == "production" && !user.EmailVerified {
		// For security, return standard error instead of revealing verification status
		return nil, nil, errors.New(standardError)
	}

	// Generate tokens
	tokens, err := s.generateTokenPair(&user)
	if err != nil {
		// This is a server error, log it but return standard error to user
		s.logger.WithError(err).Error("Failed to generate tokens during login")
		return nil, nil, errors.New(standardError)
	}

	// Update last login
	now := time.Now()
	s.db.Model(&user).Updates(map[string]interface{}{
		"last_login":      &now,
		"failed_attempts": 0,
	})

	user.Password = "" // Don't return password
	s.logger.Infof("User logged in: %s", user.Email)
	return &user, tokens, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*models.TokenPair, error) {
	// Find refresh token in database
	var token models.RefreshToken
	if err := s.db.Preload("User.Role.Permissions").Where("token = ?", refreshToken).First(&token).Error; err != nil {
		return nil, fmt.Errorf("invalid refresh token")
	}

	// Check if token is expired
	if token.IsExpired() {
		s.db.Delete(&token)
		return nil, fmt.Errorf("refresh token expired")
	}

	// Generate new token pair
	newTokens, err := s.generateTokenPair(&token.User)
	if err != nil {
		return nil, fmt.Errorf("failed to generate new tokens: %w", err)
	}

	// Delete old refresh token
	s.db.Delete(&token)

	return newTokens, nil
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	// Add token to blacklist if Redis is available
	if s.redis != nil {
		// Blacklist the refresh token
		err := s.redis.Set(ctx, "blacklist:"+refreshToken, "1", 24*time.Hour).Err()
		if err != nil {
			s.logger.WithError(err).Error("Failed to blacklist refresh token")
		}
	}

	// Delete refresh token from database
	result := s.db.Where("token = ?", refreshToken).Delete(&models.RefreshToken{})
	if result.Error != nil {
		return fmt.Errorf("failed to logout: %w", result.Error)
	}

	s.logger.Info("User logged out")
	return nil
}

func (s *AuthService) GetProfile(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	var user models.User
	if err := s.db.Preload("Role.Permissions").Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, fmt.Errorf("user not found")
	}

	user.Password = ""
	return &user, nil
}

func (s *AuthService) UpdateProfile(ctx context.Context, userID uuid.UUID, req *UpdateProfileRequest) (*models.User, error) {
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, fmt.Errorf("user not found")
	}

	// Update fields
	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Username != nil {
		// Check if username is unique
		var existingUser models.User
		if err := s.db.Where("username = ? AND id != ?", *req.Username, userID).First(&existingUser).Error; err == nil {
			return nil, fmt.Errorf("username already exists")
		}
		updates["username"] = *req.Username
	}
	if req.Bio != nil {
		updates["bio"] = *req.Bio
	}
	if req.Avatar != nil {
		updates["avatar"] = *req.Avatar
	}

	if len(updates) > 0 {
		if err := s.db.Model(&user).Updates(updates).Error; err != nil {
			return nil, fmt.Errorf("failed to update profile: %w", err)
		}
	}

	// Return updated user
	if err := s.db.Preload("Role.Permissions").Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch updated user")
	}

	user.Password = ""
	return &user, nil
}

func (s *AuthService) ChangePassword(ctx context.Context, userID uuid.UUID, req *ChangePasswordRequest) error {
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return fmt.Errorf("user not found")
	}

	// Verify old password
	if !utils.CheckPasswordHash(req.OldPassword, user.Password) {
		return fmt.Errorf("invalid old password")
	}

	// Hash new password
	hashedPassword, err := utils.HashPassword(req.NewPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password
	if err := s.db.Model(&user).Update("password", hashedPassword).Error; err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	s.logger.Infof("Password changed for user: %s", user.Email)
	return nil
}

func (s *AuthService) ValidateToken(tokenString string) (*models.TokenClaims, error) {
	// Check if token is blacklisted
	if s.redis != nil {
		exists, err := s.redis.Exists(context.Background(), "blacklist:"+tokenString).Result()
		if err != nil {
			s.logger.WithError(err).Error("Failed to check token blacklist")
		} else if exists > 0 {
			return nil, fmt.Errorf("token is blacklisted")
		}
	}

	token, err := jwt.ParseWithClaims(tokenString, jwt.MapClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.JWT.Secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	if mapClaims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// Convert MapClaims to TokenClaims
		userIDStr, ok := mapClaims["sub"].(string)
		if !ok {
			return nil, fmt.Errorf("invalid user ID in token")
		}

		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			return nil, fmt.Errorf("invalid user ID format in token")
		}

		roleIDStr, ok := mapClaims["roleID"].(string)
		if !ok {
			return nil, fmt.Errorf("invalid role ID in token")
		}

		roleID, err := uuid.Parse(roleIDStr)
		if err != nil {
			return nil, fmt.Errorf("invalid role ID format in token")
		}

		email, _ := mapClaims["email"].(string)
		username, _ := mapClaims["username"].(string)
		roleName, _ := mapClaims["role"].(string)

		return &models.TokenClaims{
			UserID:   userID,
			Email:    email,
			Username: username,
			RoleID:   roleID,
			RoleName: roleName,
		}, nil
	}

	return nil, fmt.Errorf("invalid token claims")
}

// Helper methods
func (s *AuthService) generateTokenPair(user *models.User) (*models.TokenPair, error) {
	// Access token claims
	claims := jwt.MapClaims{
		"sub":      user.ID.String(),
		"email":    user.Email,
		"username": user.Username,
		"roleID":   user.RoleID.String(),
		"role":     user.Role.Name,
		"exp":      time.Now().Add(s.config.JWT.ExpiresIn).Unix(),
		"iat":      time.Now().Unix(),
	}

	// Create access token
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessTokenString, err := accessToken.SignedString([]byte(s.config.JWT.Secret))
	if err != nil {
		return nil, err
	}

	// Create refresh token
	refreshTokenString := utils.GenerateSecureToken(32)

	// Save refresh token to database
	refreshToken := &models.RefreshToken{
		UserID:    user.ID,
		Token:     refreshTokenString,
		ExpiresAt: time.Now().Add(s.config.JWT.RefreshExpiresIn),
	}

	if err := s.db.Create(refreshToken).Error; err != nil {
		return nil, err
	}

	return &models.TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		TokenType:    "Bearer",
		ExpiresIn:    int(s.config.JWT.ExpiresIn.Seconds()),
	}, nil
}

// Add cookie helper methods after the existing methods
func (s *AuthService) SetAuthCookies(c *gin.Context, tokens *models.TokenPair) {
	s.logger.Infof("Setting auth cookies - Access token length: %d, Refresh token length: %d", len(tokens.AccessToken), len(tokens.RefreshToken))

	// For development, use None to allow cross-origin cookies
	if s.config.Environment != "production" {
		c.SetSameSite(http.SameSiteNoneMode)
	} else {
		c.SetSameSite(http.SameSiteStrictMode)
	}

	// Set access token in HTTP-only cookie
	c.SetCookie(
		"access_token",
		tokens.AccessToken,
		int(tokens.ExpiresIn),
		"/",
		"",    // Empty domain - will use current origin
		false, // secure = false for development (required for SameSite=None in dev)
		true,  // httpOnly
	)

	// Set refresh token in HTTP-only cookie
	c.SetCookie(
		"refresh_token",
		tokens.RefreshToken,
		7*24*3600, // 7 days
		"/",
		"",    // Empty domain - will use current origin
		false, // secure = false for development
		true,  // httpOnly
	)

	s.logger.Infof("Auth cookies set successfully with SameSite=None, Secure=false for development")
}

func (s *AuthService) ClearAuthCookies(c *gin.Context) {
	c.SetCookie("access_token", "", -1, "/", "", false, true)
	c.SetCookie("refresh_token", "", -1, "/", "", false, true)
}

// BlacklistToken adds a token to the blacklist
func (s *AuthService) BlacklistToken(ctx context.Context, token string, expiration time.Duration) error {
	if s.redis == nil {
		return fmt.Errorf("Redis not available for token blacklisting")
	}

	err := s.redis.Set(ctx, "blacklist:"+token, "1", expiration).Err()
	if err != nil {
		return fmt.Errorf("failed to blacklist token: %w", err)
	}

	return nil
}

// IsTokenBlacklisted checks if a token is blacklisted
func (s *AuthService) IsTokenBlacklisted(ctx context.Context, token string) (bool, error) {
	if s.redis == nil {
		return false, nil // If Redis is not available, assume token is not blacklisted
	}

	exists, err := s.redis.Exists(ctx, "blacklist:"+token).Result()
	if err != nil {
		return false, fmt.Errorf("failed to check token blacklist: %w", err)
	}

	return exists > 0, nil
}
