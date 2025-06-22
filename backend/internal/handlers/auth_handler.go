package handlers

import (
	"fmt"
	"net/http"

	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/eyuppastirmaci/noesis-forge/internal/validations"
	"github.com/gin-gonic/gin"
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
	fmt.Println("Register request received")

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
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get validated data")
		return
	}

	req, ok := value.(*services.LoginRequest)
	if !ok {
		utils.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Invalid validated data type")
		return
	}

	user, tokens, err := h.authService.Login(c.Request.Context(), req)
	if err != nil {
		status := http.StatusUnauthorized
		code := "LOGIN_FAILED"

		// Handle specific login errors as field errors
		if err.Error() == "invalid credentials" {
			fieldErrors := map[string]string{
				"password": "Invalid email/username or password",
			}
			utils.FieldValidationErrorResponse(c, "Login failed", fieldErrors)
			return
		}

		if err.Error() == "account is locked" {
			status = http.StatusForbidden
			code = "ACCOUNT_LOCKED"
			fieldErrors := map[string]string{
				"password": "Account is temporarily locked due to multiple failed attempts",
			}
			utils.FieldValidationErrorResponse(c, "Account locked", fieldErrors)
			return
		}

		if err.Error() == "email not verified" {
			fieldErrors := map[string]string{
				"email": "Please verify your email address before logging in",
			}
			utils.FieldValidationErrorResponse(c, "Email verification required", fieldErrors)
			return
		}

		utils.ErrorResponse(c, status, code, err.Error())
		return
	}

	data := gin.H{
		"user":   user,
		"tokens": tokens,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Login successful")
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req services.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", err.Error())
		return
	}

	tokens, err := h.authService.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		utils.UnauthorizedResponse(c, "REFRESH_FAILED", err.Error())
		return
	}

	data := gin.H{
		"tokens": tokens,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Token refreshed successfully")
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req services.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", err.Error())
		return
	}

	err := h.authService.Logout(c.Request.Context(), req.RefreshToken)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "LOGOUT_FAILED", err.Error())
		return
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

	data := gin.H{
		"user": user,
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
