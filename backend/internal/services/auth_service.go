package services

import (
	"context"
	"fmt"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/config"
	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type AuthService struct {
	db     *gorm.DB
	config *config.Config
	logger *logrus.Entry
}

func NewAuthService(db *gorm.DB, cfg *config.Config) *AuthService {
	return &AuthService{
		db:     db,
		config: cfg,
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

	// Find user by email or username
	query := s.db.Preload("Role.Permissions")
	if req.Email != "" {
		query = query.Where("email = ?", req.Email)
	} else if req.Username != "" {
		query = query.Where("username = ?", req.Username)
	} else {
		return nil, nil, fmt.Errorf("email or username is required")
	}

	if err := query.First(&user).Error; err != nil {
		return nil, nil, fmt.Errorf("invalid credentials")
	}

	// Check password
	if !utils.CheckPasswordHash(req.Password, user.Password) {
		// Increment failed attempts
		s.db.Model(&user).Update("failed_attempts", gorm.Expr("failed_attempts + 1"))
		return nil, nil, fmt.Errorf("invalid credentials")
	}

	// Check if account is locked
	if user.IsLocked() {
		return nil, nil, fmt.Errorf("account is locked")
	}

	// Check if email is verified (for production, skip for development)
	if s.config.Environment == "production" && !user.EmailVerified {
		return nil, nil, fmt.Errorf("email not verified")
	}

	// Generate tokens
	tokens, err := s.generateTokenPair(&user)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate tokens: %w", err)
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
	// Delete refresh token
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
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(s.config.JWT.Secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		userID, _ := uuid.Parse(claims["sub"].(string))
		roleID, _ := uuid.Parse(claims["roleID"].(string))

		return &models.TokenClaims{
			UserID:   userID,
			Email:    claims["email"].(string),
			Username: claims["username"].(string),
			RoleID:   roleID,
			RoleName: claims["role"].(string),
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
