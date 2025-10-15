package handlers

import (
	"net/http"

	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/eyuppastirmaci/noesis-forge/internal/validations"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

func (h *AuthHandler) Register(c *gin.Context) {

	// Get validated request from context
	req, ok := validations.GetValidatedUser(c)
	if !ok {
		// This should never happen if middleware is properly configured
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated data")
		return
	}

	// Call service to register user
	user, err := h.authService.Register(c.Request.Context(), req)
	if err != nil {
		status := http.StatusBadRequest
		code := "REGISTRATION_FAILED"

		// Handle specific database errors as field errors
		if err.Error() == "email already exists" {
			fieldErrors := map[string]string{
				"email": "This email is already registered",
			}
			utils.FieldValidationErrorResponse(c, "Registration failed", fieldErrors)
			return
		}

		if err.Error() == "username already exists" {
			fieldErrors := map[string]string{
				"username": "This username is already taken",
			}
			utils.FieldValidationErrorResponse(c, "Registration failed", fieldErrors)
			return
		}

		utils.ErrorResponse(c, status, code, err.Error())
		return
	}

	data := gin.H{
		"user": user,
	}
	utils.SuccessResponse(c, http.StatusCreated, data, "Registration successful")
}

func (h *AuthHandler) Login(c *gin.Context) {
	// Get validated login request from context
	value, exists := c.Get("validatedLogin")
	if !exists {
		// For validation errors, return the standard security message
		utils.ErrorResponse(c, http.StatusUnauthorized, "LOGIN_FAILED", "Invalid email/username or password")
		return
	}

	req, ok := value.(*services.LoginRequest)
	if !ok {
		// For validation errors, return the standard security message
		utils.ErrorResponse(c, http.StatusUnauthorized, "LOGIN_FAILED", "Invalid email/username or password")
		return
	}

	user, tokens, err := h.authService.Login(c.Request.Context(), req)
	if err != nil {
		// Always return the same error message for all login failures
		// This prevents user enumeration attacks
		utils.ErrorResponse(c, http.StatusUnauthorized, "LOGIN_FAILED", "Invalid email/username or password")
		return
	}

	// Generate avatar URL
	avatarURL, _ := h.authService.GetAvatarURL(c.Request.Context(), user.Avatar)

	data := gin.H{
		"user": gin.H{
			"id":             user.ID,
			"email":          user.Email,
			"username":       user.Username,
			"name":           user.Name,
			"avatar":         user.Avatar,
			"avatarUrl":      avatarURL,
			"emailVerified":  user.EmailVerified,
			"status":         user.Status,
			"encryptionSalt": user.EncryptionSalt, // For client-side key derivation
			"role": gin.H{
				"id":          user.Role.ID,
				"name":        user.Role.Name,
				"displayName": user.Role.DisplayName,
				"permissions": user.Role.Permissions,
			},
			"createdAt": user.CreatedAt,
			"updatedAt": user.UpdatedAt,
		},
		// Return tokens in response body for frontend to set cookies
		"tokens": gin.H{
			"accessToken":  tokens.AccessToken,
			"refreshToken": tokens.RefreshToken,
			"tokenType":    "Bearer",
			"expiresIn":    tokens.ExpiresIn,
		},
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Login successful")
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// Get refresh token from request body
	var req services.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	tokens, err := h.authService.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "SESSION_EXPIRED", "Your session has expired. Please login again.")
		return
	}

	data := gin.H{
		"tokens": gin.H{
			"accessToken":  tokens.AccessToken,
			"refreshToken": tokens.RefreshToken,
			"tokenType":    "Bearer",
			"expiresIn":    tokens.ExpiresIn,
		},
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Token refreshed successfully")
}

func (h *AuthHandler) Logout(c *gin.Context) {
	// Get refresh token from request body (optional)
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}

	// Try to get refresh token from request body
	if err := c.ShouldBindJSON(&req); err == nil && req.RefreshToken != "" {
		if err := h.authService.Logout(c.Request.Context(), req.RefreshToken); err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, "LOGOUT_FAILED", err.Error())
			return
		}
	}

	utils.SuccessResponse(c, http.StatusOK, nil, "Logout successful")
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	user, err := h.authService.GetProfile(c.Request.Context(), userID)
	if err != nil {
		utils.NotFoundResponse(c, "USER_NOT_FOUND", err.Error())
		return
	}

	// Generate avatar URL if avatar path exists
	avatarURL, _ := h.authService.GetAvatarURL(c.Request.Context(), user.Avatar)

	// Add encrypted fields if they exist
	encryptedFields := make(map[string]interface{})
	hasEncryptedData := false

	if user.EncryptedEmail != "" && user.EncryptedEmailIV != "" {
		encryptedFields["primaryEmail"] = gin.H{
			"encrypted": user.EncryptedEmail,
			"iv":        user.EncryptedEmailIV,
		}
		hasEncryptedData = true
	}

	if user.EncryptedAltEmail != "" && user.EncryptedAltEmailIV != "" {
		encryptedFields["alternateEmail"] = gin.H{
			"encrypted": user.EncryptedAltEmail,
			"iv":        user.EncryptedAltEmailIV,
		}
		hasEncryptedData = true
	}

	if user.EncryptedPhone != "" && user.EncryptedPhoneIV != "" {
		encryptedFields["phone"] = gin.H{
			"encrypted": user.EncryptedPhone,
			"iv":        user.EncryptedPhoneIV,
		}
		hasEncryptedData = true
	}

	if user.EncryptedDepartment != "" && user.EncryptedDeptIV != "" {
		encryptedFields["department"] = gin.H{
			"encrypted": user.EncryptedDepartment,
			"iv":        user.EncryptedDeptIV,
		}
		hasEncryptedData = true
	}

	if user.EncryptedBio != "" && user.EncryptedBioIV != "" {
		encryptedFields["bio"] = gin.H{
			"encrypted": user.EncryptedBio,
			"iv":        user.EncryptedBioIV,
		}
		hasEncryptedData = true
	}

	userMap := gin.H{
		"id":             user.ID,
		"email":          user.Email,
		"username":       user.Username,
		"name":           user.Name,
		"avatar":         user.Avatar,
		"avatarUrl":      avatarURL,
		"bio":            user.Bio,
		"alternateEmail": user.AlternateEmail,
		"phone":          user.Phone,
		"department":     user.Department,
		"status":         user.Status,
		"emailVerified":  user.EmailVerified,
		"role": gin.H{
			"id":          user.Role.ID,
			"name":        user.Role.Name,
			"displayName": user.Role.DisplayName,
			"permissions": user.Role.Permissions,
		},
		"createdAt":      user.CreatedAt,
		"updatedAt":      user.UpdatedAt,
		"encryptionSalt": user.EncryptionSalt, // Always include salt
	}

	// Only include encryptedFields if there's encrypted data
	if hasEncryptedData {
		userMap["encryptedFields"] = encryptedFields
	}

	data := gin.H{
		"user": userMap,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Profile retrieved successfully")
}

func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get validated request from context
	value, exists := c.Get("validatedProfileUpdate")
	if !exists {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated data")
		return
	}

	req, ok := value.(*services.UpdateProfileRequest)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Invalid validated data type")
		return
	}

	user, err := h.authService.UpdateProfile(c.Request.Context(), userID, req)
	if err != nil {
		status := http.StatusBadRequest
		code := "UPDATE_FAILED"
		if err.Error() == "username already exists" {
			status = http.StatusConflict
			code = "USERNAME_ALREADY_EXISTS"
		}
		utils.ErrorResponse(c, status, code, err.Error())
		return
	}

	data := gin.H{
		"user": user,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Profile updated successfully")
}

func (h *AuthHandler) UploadAvatar(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	file, header, err := c.Request.FormFile("avatar")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_FILE", "Could not get avatar file from request")
		return
	}
	defer file.Close()

	avatarPath, avatarURL, err := h.authService.UploadAvatar(c.Request.Context(), userID, file, header)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "UPLOAD_FAILED", err.Error())
		return
	}

	data := gin.H{
		"avatar":    avatarPath,
		"avatarUrl": avatarURL,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Avatar updated successfully")
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	// Get validated request from context
	value, exists := c.Get("validatedPasswordChange")
	if !exists {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated data")
		return
	}

	req, ok := value.(*services.ChangePasswordRequest)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Invalid validated data type")
		return
	}

	err = h.authService.ChangePassword(c.Request.Context(), userID, req)
	if err != nil {
		status := http.StatusBadRequest
		code := "PASSWORD_CHANGE_FAILED"
		if err.Error() == "invalid old password" {
			status = http.StatusUnauthorized
			code = "INVALID_OLD_PASSWORD"
		}
		utils.ErrorResponse(c, status, code, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, nil, "Password changed successfully")
}

func (h *AuthHandler) ValidateToken(c *gin.Context) {
	// Get refresh token from request body
	var req struct {
		RefreshToken string `json:"refreshToken" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	// Validate refresh token without consuming it
	isValid, err := h.authService.IsRefreshTokenValid(c.Request.Context(), req.RefreshToken)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "VALIDATION_ERROR", "Failed to validate token")
		return
	}

	if !isValid {
		utils.ErrorResponse(c, http.StatusUnauthorized, "INVALID_TOKEN", "Token is invalid or expired")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"valid": true}, "Token is valid")
}

func (h *AuthHandler) DeleteAvatar(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	if err := h.authService.DeleteAvatar(c.Request.Context(), userID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"avatar": ""}, "Avatar removed successfully")
}

// GetFullNameByID returns only the full name of a user by their ID.
func (h *AuthHandler) GetFullNameByID(c *gin.Context) {
	idParam := c.Param("id")
	userID, err := uuid.Parse(idParam)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "Invalid user ID")
		return
	}

	name, err := h.authService.GetFullNameByID(c.Request.Context(), userID)
	if err != nil {
		utils.NotFoundResponse(c, "USER_NOT_FOUND", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"fullName": name}, "User full name retrieved successfully")
}

// GetMyFullName returns the full name of the currently authenticated user.
func (h *AuthHandler) GetMyFullName(c *gin.Context) {
	userID, err := middleware.GetUserIDFromContext(c)
	if err != nil {
		utils.UnauthorizedResponse(c, "UNAUTHORIZED", err.Error())
		return
	}

	name, err := h.authService.GetFullNameByID(c.Request.Context(), userID)
	if err != nil {
		utils.NotFoundResponse(c, "USER_NOT_FOUND", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, gin.H{"fullName": name}, "User full name retrieved successfully")
}
