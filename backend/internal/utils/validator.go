package utils

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

var (
	emailRegex    = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
)

func init() {
	// Register custom validators
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		v.RegisterValidation("username", validateUsername)
		v.RegisterValidation("password_strength", validatePasswordStrength)
	}
}

// Custom validator for username
func validateUsername(fl validator.FieldLevel) bool {
	username := fl.Field().String()
	return usernameRegex.MatchString(username)
}

// Custom validator for password strength
func validatePasswordStrength(fl validator.FieldLevel) bool {
	password := fl.Field().String()

	// At least 8 characters
	if len(password) < 8 {
		return false
	}

	// Could add more rules here (uppercase, lowercase, numbers, special chars)
	return true
}

// ParseValidationErrors converts validator errors to field-specific error map
func ParseValidationErrors(err error) map[string]string {
	fieldErrors := make(map[string]string)

	if validationErrs, ok := err.(validator.ValidationErrors); ok {
		for _, e := range validationErrs {
			field := strings.ToLower(e.Field()[:1]) + e.Field()[1:] // Convert to camelCase

			switch e.Tag() {
			case "required":
				fieldErrors[field] = fmt.Sprintf("%s is required", formatFieldName(e.Field()))
			case "email":
				fieldErrors[field] = "Invalid email address"
			case "min":
				if e.Field() == "Password" {
					fieldErrors[field] = fmt.Sprintf("Password must be at least %s characters", e.Param())
				} else {
					fieldErrors[field] = fmt.Sprintf("%s must be at least %s characters", formatFieldName(e.Field()), e.Param())
				}
			case "max":
				fieldErrors[field] = fmt.Sprintf("%s must be at most %s characters", formatFieldName(e.Field()), e.Param())
			case "username":
				fieldErrors[field] = "Username can only contain letters, numbers, underscores, and hyphens"
			case "password_strength":
				fieldErrors[field] = "Password must be at least 8 characters"
			case "eqfield":
				if e.Field() == "PasswordConfirm" {
					fieldErrors["confirmPassword"] = "Passwords don't match"
				} else {
					fieldErrors[field] = fmt.Sprintf("%s must match %s", formatFieldName(e.Field()), formatFieldName(e.Param()))
				}
			default:
				fieldErrors[field] = fmt.Sprintf("Invalid %s", formatFieldName(e.Field()))
			}
		}
	}

	return fieldErrors
}

// formatFieldName converts struct field names to human-readable format
func formatFieldName(field string) string {
	// Convert PascalCase to space-separated words
	var result strings.Builder
	for i, r := range field {
		if i > 0 && 'A' <= r && r <= 'Z' {
			result.WriteRune(' ')
		}
		result.WriteRune(r)
	}

	formatted := result.String()
	// Special cases
	replacements := map[string]string{
		"Email":            "Email",
		"Username":         "Username",
		"Name":             "Name",
		"Password":         "Password",
		"Password Confirm": "Confirm password",
	}

	for old, new := range replacements {
		if formatted == old {
			return new
		}
	}

	return formatted
}

// ValidateStruct validates a struct and returns field-specific errors
func ValidateStruct(s interface{}) map[string]string {
	if err := binding.Validator.ValidateStruct(s); err != nil {
		return ParseValidationErrors(err)
	}
	return nil
}
