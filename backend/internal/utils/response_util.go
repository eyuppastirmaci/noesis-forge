package utils

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type ApiResponse struct {
	Success    bool        `json:"success"`
	StatusCode int         `json:"statusCode"`
	Timestamp  string      `json:"timestamp"`
	Data       interface{} `json:"data,omitempty"`
	Message    string      `json:"message,omitempty"`
	Error      *ApiError   `json:"error,omitempty"`
}

type ApiError struct {
	Code             string            `json:"code"`
	Message          string            `json:"message"`
	Details          string            `json:"details,omitempty"`
	Field            string            `json:"field,omitempty"`
	ValidationErrors []ValidationError `json:"validationErrors,omitempty"`
}

type ValidationError struct {
	Field   string      `json:"field"`
	Message string      `json:"message"`
	Value   interface{} `json:"value,omitempty"`
}

// httpStatusToCode maps HTTP status codes to generic error codes used in the JSON response body.
func httpStatusToCode(status int) string {
	switch status {
	case http.StatusBadRequest:
		return "BAD_REQUEST"
	case http.StatusUnauthorized:
		return "UNAUTHORIZED"
	case http.StatusForbidden:
		return "FORBIDDEN"
	case http.StatusNotFound:
		return "NOT_FOUND"
	case http.StatusConflict:
		return "CONFLICT"
	case http.StatusTooManyRequests:
		return "TOO_MANY_REQUESTS"
	default:
		return "INTERNAL_ERROR"
	}
}

func SuccessResponse(c *gin.Context, statusCode int, data interface{}, message ...string) {
	msg := ""
	if len(message) > 0 {
		msg = message[0]
	}

	response := ApiResponse{
		Success:    true,
		StatusCode: statusCode,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		Data:       data,
		Message:    msg,
	}

	c.JSON(statusCode, response)
}

func ErrorResponse(c *gin.Context, statusCode int, code string, message string, details ...string) {
	// Derive a generic code from HTTP status if none (or empty string) provided.
	if code == "" {
		code = httpStatusToCode(statusCode)
	}

	detail := ""
	if len(details) > 0 {
		detail = details[0]
	}

	response := ApiResponse{
		Success:    false,
		StatusCode: statusCode,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		Error: &ApiError{
			Code:    code,
			Message: message,
			Details: detail,
		},
	}

	c.JSON(statusCode, response)
}

func ValidationErrorResponse(c *gin.Context, message string, validationErrors []ValidationError) {
	response := ApiResponse{
		Success:    false,
		StatusCode: http.StatusBadRequest,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		Error: &ApiError{
			Code:             "VALIDATION_ERROR",
			Message:          message,
			ValidationErrors: validationErrors,
		},
	}

	c.JSON(http.StatusBadRequest, response)
}

// UnauthorizedResponse sends an unauthorized response
func UnauthorizedResponse(c *gin.Context, code string, message string) {
	ErrorResponse(c, http.StatusUnauthorized, code, message)
}

// ForbiddenResponse sends a forbidden response
func ForbiddenResponse(c *gin.Context, code string, message string) {
	ErrorResponse(c, http.StatusForbidden, code, message)
}

// NotFoundResponse sends a not found response
func NotFoundResponse(c *gin.Context, code string, message string) {
	ErrorResponse(c, http.StatusNotFound, code, message)
}

// ConflictResponse sends a conflict response
func ConflictResponse(c *gin.Context, code string, message string) {
	ErrorResponse(c, http.StatusConflict, code, message)
}

// InternalServerErrorResponse sends an internal server error response
func InternalServerErrorResponse(c *gin.Context, message string, details ...string) {
	ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", message, details...)
}

// ServiceUnavailableResponse sends a service unavailable response
func ServiceUnavailableResponse(c *gin.Context, message string) {
	ErrorResponse(c, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", message)
}

// TooManyRequestsResponse sends a rate limit response
func TooManyRequestsResponse(c *gin.Context, message string) {
	ErrorResponse(c, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", message)
}

// Legacy response functions for backward compatibility with existing code
// These wrap the data in the old format but use the new response structure

// LegacySuccessResponse maintains backward compatibility
func LegacySuccessResponse(c *gin.Context, statusCode int, data gin.H) {
	// Extract message if exists
	message, hasMessage := data["message"].(string)
	if hasMessage {
		delete(data, "message")
	}

	SuccessResponse(c, statusCode, data, message)
}

// LegacyErrorResponse maintains backward compatibility
func LegacyErrorResponse(c *gin.Context, statusCode int, data gin.H) {
	code, hasCode := data["code"].(string)
	if !hasCode {
		code = "UNKNOWN_ERROR"
	}

	message, hasMessage := data["message"].(string)
	if !hasMessage {
		message = "An error occurred"
	}

	details, _ := data["error"].(string)

	ErrorResponse(c, statusCode, code, message, details)
}

func FieldValidationErrorResponse(c *gin.Context, message string, fieldErrors map[string]string) {
	// Convert fieldErrors to ValidationError slice for consistency
	var validationErrors []ValidationError
	for field, msg := range fieldErrors {
		validationErrors = append(validationErrors, ValidationError{
			Field:   field,
			Message: msg,
		})
	}

	response := ApiResponse{
		Success:    false,
		StatusCode: http.StatusBadRequest,
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		Error: &ApiError{
			Code:             "VALIDATION_ERROR",
			Message:          message,
			ValidationErrors: validationErrors,
		},
	}

	// Also include fieldErrors in data for easier frontend parsing
	response.Data = gin.H{
		"fieldErrors": fieldErrors,
	}

	c.JSON(http.StatusBadRequest, response)
}
