package validations

import (
	"net/http"

	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/gin-gonic/gin"
)

// ContextKey type for context values
type ContextKey string

const (
	// ValidatedUserKey is the key for storing validated user data in context
	ValidatedUserKey ContextKey = "validatedUser"
)

// A middleware that validates user creation request
func ValidateCreateUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.RegisterRequest

		// Try to bind JSON
		if err := c.ShouldBindJSON(&req); err != nil {
			// Parse validation errors into field-specific errors
			fieldErrors := ParseValidationErrors(err)

			// If we have field errors, send them as field-specific
			if len(fieldErrors) > 0 {
				utils.FieldValidationErrorResponse(c, "Validation failed", fieldErrors)
				c.Abort()
				return
			}

			// Otherwise, send generic validation error
			utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", err.Error())
			c.Abort()
			return
		}

		// Additional custom validations
		fieldErrors := make(map[string]string)

		// Validate password confirmation matches
		if req.Password != req.PasswordConfirm {
			fieldErrors["confirmPassword"] = "Passwords don't match"
		}

		// Advanced password strength check
		if valid, msg := CheckPasswordStrength(req.Password); !valid {
			fieldErrors["password"] = msg
		}

		// Advanced username validation
		if valid, msg := CheckUsername(req.Username); !valid {
			fieldErrors["username"] = msg
		}

		// Check email domain
		if valid, msg := CheckEmailDomain(req.Email); !valid {
			fieldErrors["email"] = msg
		}

		// If there are custom validation errors, return them
		if len(fieldErrors) > 0 {
			utils.FieldValidationErrorResponse(c, "Validation failed", fieldErrors)
			c.Abort()
			return
		}

		// Store validated request in context
		c.Set(string(ValidatedUserKey), &req)

		// Continue to next handler
		c.Next()
	}
}

// Retrieves the validated user data from context
func GetValidatedUser(c *gin.Context) (*services.RegisterRequest, bool) {
	value, exists := c.Get(string(ValidatedUserKey))
	if !exists {
		return nil, false
	}

	req, ok := value.(*services.RegisterRequest)
	return req, ok
}

// Validates profile update requests
func ValidateUpdateProfile() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.UpdateProfileRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			fieldErrors := ParseValidationErrors(err)
			if len(fieldErrors) > 0 {
				utils.FieldValidationErrorResponse(c, "Validation failed", fieldErrors)
				c.Abort()
				return
			}
			utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", err.Error())
			c.Abort()
			return
		}

		// Custom validations for profile update
		fieldErrors := make(map[string]string)

		// Validate username if provided
		if req.Username != nil && len(*req.Username) > 0 {
			if len(*req.Username) < 3 {
				fieldErrors["username"] = "Username must be at least 3 characters"
			} else if len(*req.Username) > 50 {
				fieldErrors["username"] = "Username must be at most 50 characters"
			}
		}

		// Validate name if provided
		if req.Name != nil && len(*req.Name) > 0 {
			if len(*req.Name) < 2 {
				fieldErrors["name"] = "Name must be at least 2 characters"
			} else if len(*req.Name) > 100 {
				fieldErrors["name"] = "Name must be at most 100 characters"
			}
		}

		// Validate bio if provided
		if req.Bio != nil && len(*req.Bio) > 0 {
			if valid, msg := ValidateProfileBio(*req.Bio); !valid {
				fieldErrors["bio"] = msg
			}
		}

		if len(fieldErrors) > 0 {
			utils.FieldValidationErrorResponse(c, "Validation failed", fieldErrors)
			c.Abort()
			return
		}

		c.Set("validatedProfileUpdate", &req)
		c.Next()
	}
}

// Validates password change requests
func ValidateChangePassword() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.ChangePasswordRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			fieldErrors := ParseValidationErrors(err)
			if len(fieldErrors) > 0 {
				utils.FieldValidationErrorResponse(c, "Validation failed", fieldErrors)
				c.Abort()
				return
			}
			utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", err.Error())
			c.Abort()
			return
		}

		// Custom validations
		fieldErrors := make(map[string]string)

		// Check if old and new passwords are different
		if req.OldPassword == req.NewPassword {
			fieldErrors["newPassword"] = "New password must be different from old password"
		}

		// Check new password strength
		if valid, msg := CheckPasswordStrength(req.NewPassword); !valid {
			fieldErrors["newPassword"] = msg
		}

		if len(fieldErrors) > 0 {
			utils.FieldValidationErrorResponse(c, "Validation failed", fieldErrors)
			c.Abort()
			return
		}

		c.Set("validatedPasswordChange", &req)
		c.Next()
	}
}

// Validates login requests
func ValidateLogin() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req services.LoginRequest

		if err := c.ShouldBindJSON(&req); err != nil {
			// For security, don't reveal detailed validation errors in login
			// Return generic error message to prevent information disclosure
			utils.ErrorResponse(c, http.StatusUnauthorized, "LOGIN_FAILED", "Invalid email/username or password")
			c.Abort()
			return
		}

		// Basic validations - but don't reveal specific field errors
		hasError := false

		// Check if either email or username is provided
		if req.Email == "" && req.Username == "" {
			hasError = true
		}

		// Check if password is provided
		if req.Password == "" {
			hasError = true
		}

		// Basic format validation (but don't reveal which field is wrong)
		if req.Email != "" {
			if valid, _ := CheckEmailDomain(req.Email); !valid {
				hasError = true
			}
		}

		// Note: We don't check reserved usernames during login
		// because admin user is seeded and should be able to login

		// If any validation fails, return generic error
		if hasError {
			utils.ErrorResponse(c, http.StatusUnauthorized, "LOGIN_FAILED", "Invalid email/username or password")
			c.Abort()
			return
		}

		c.Set("validatedLogin", &req)
		c.Next()
	}
}
