package handlers

import (
	"fmt"
	"net/http"

	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
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

func (h *AuthHandler) RegisterRoutes(r *gin.RouterGroup) {
	auth := r.Group("/auth")
	{
		// Public routes
		auth.POST("/register", h.Register)
		auth.POST("/login", h.Login)
		auth.POST("/refresh", h.RefreshToken)
		auth.POST("/logout", h.Logout)

		// Protected routes
		protected := auth.Group("")
		protected.Use(middleware.AuthMiddleware(h.authService))
		{
			protected.GET("/profile", h.GetProfile)
			protected.PUT("/profile", h.UpdateProfile)
			protected.PUT("/change-password", h.ChangePassword)
		}
	}
}

func (h *AuthHandler) Register(c *gin.Context) {
	fmt.Println("Register request received")

	var req services.RegisterRequest

	// Try to bind JSON
	if err := c.ShouldBindJSON(&req); err != nil {
		// Parse validation errors into field-specific errors
		fieldErrors := utils.ParseValidationErrors(err)

		// If we have field errors, send them as field-specific
		if len(fieldErrors) > 0 {
			utils.FieldValidationErrorResponse(c, "Validation failed", fieldErrors)
			return
		}

		// Otherwise, send generic validation error
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", err.Error())
		return
	}

	// Additional custom validations can be added here
	fieldErrors := make(map[string]string)

	// Validate password confirmation matches
	if req.Password != req.PasswordConfirm {
		fieldErrors["confirmPassword"] = "Passwords don't match"
	}

	// If there are custom validation errors, return them
	if len(fieldErrors) > 0 {
		utils.FieldValidationErrorResponse(c, "Validation failed", fieldErrors)
		return
	}

	// Call service to register user
	user, err := h.authService.Register(c.Request.Context(), &req)
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
	var req services.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", err.Error())
		return
	}

	user, tokens, err := h.authService.Login(c.Request.Context(), &req)
	if err != nil {
		status := http.StatusUnauthorized
		code := "LOGIN_FAILED"
		if err.Error() == "account is locked" {
			status = http.StatusForbidden
			code = "ACCOUNT_LOCKED"
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

	var req services.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", err.Error())
		return
	}

	user, err := h.authService.UpdateProfile(c.Request.Context(), userID, &req)
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

	var req services.ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", err.Error())
		return
	}

	err = h.authService.ChangePassword(c.Request.Context(), userID, &req)
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
