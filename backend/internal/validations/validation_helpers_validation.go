package validations

import (
	"regexp"
	"strings"
)

var (
	// Reserved usernames that cannot be used
	reservedUsernames = []string{
		"admin", "administrator", "root", "system", "api",
		"noesis", "forge", "noesisforge", "support", "help",
		"login", "register", "auth", "oauth", "user", "users",
		"profile", "settings", "config", "test", "demo",
		"public", "private", "anonymous", "guest",
	}

	// Blocked email domains (disposable email services)
	blockedEmailDomains = []string{
		"tempmail.com", "throwaway.email", "guerrillamail.com",
		"mailinator.com", "10minutemail.com", "trashmail.com",
	}

	// Password complexity patterns
	hasUpperCase   = regexp.MustCompile(`[A-Z]`)
	hasLowerCase   = regexp.MustCompile(`[a-z]`)
	hasDigit       = regexp.MustCompile(`[0-9]`)
	hasSpecialChar = regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`)
)

// CheckPasswordStrength performs advanced password strength validation
func CheckPasswordStrength(password string) (bool, string) {
	if len(password) < 8 {
		return false, "Password must be at least 8 characters long"
	}

	if len(password) > 128 {
		return false, "Password must be at most 128 characters long"
	}

	// Check for at least 3 out of 4 character types
	characterTypes := 0
	if hasUpperCase.MatchString(password) {
		characterTypes++
	}
	if hasLowerCase.MatchString(password) {
		characterTypes++
	}
	if hasDigit.MatchString(password) {
		characterTypes++
	}
	if hasSpecialChar.MatchString(password) {
		characterTypes++
	}

	if characterTypes < 3 {
		return false, "Password must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, special characters"
	}

	// Check for common patterns
	if containsCommonPatterns(password) {
		return false, "Password contains common patterns. Please choose a more secure password"
	}

	return true, ""
}

// CheckUsername performs advanced username validation
func CheckUsername(username string) (bool, string) {
	// Convert to lowercase for checking
	usernameLower := strings.ToLower(username)

	// Check against reserved usernames
	for _, reserved := range reservedUsernames {
		if usernameLower == reserved {
			return false, "This username is reserved and cannot be used"
		}
	}

	// Check for inappropriate content (you can expand this)
	if containsInappropriateContent(username) {
		return false, "Username contains inappropriate content"
	}

	// Check for confusing characters
	if strings.Contains(username, "..") || strings.HasPrefix(username, ".") || strings.HasSuffix(username, ".") {
		return false, "Username cannot start or end with a dot, or contain consecutive dots"
	}

	return true, ""
}

// CheckEmailDomain checks if email domain is allowed
func CheckEmailDomain(email string) (bool, string) {
	emailLower := strings.ToLower(email)

	// Extract domain
	parts := strings.Split(emailLower, "@")
	if len(parts) != 2 {
		return false, "Invalid email format"
	}

	domain := parts[1]

	// Check against blocked domains
	for _, blocked := range blockedEmailDomains {
		if strings.HasSuffix(domain, blocked) {
			return false, "Disposable email addresses are not allowed"
		}
	}

	return true, ""
}

// containsCommonPatterns checks for common weak password patterns
func containsCommonPatterns(password string) bool {
	commonPatterns := []string{
		"123456", "password", "qwerty", "abc123", "123abc",
		"111111", "000000", "admin", "letmein", "welcome",
		"monkey", "dragon", "baseball", "football", "iloveyou",
	}

	passwordLower := strings.ToLower(password)
	for _, pattern := range commonPatterns {
		if strings.Contains(passwordLower, pattern) {
			return true
		}
	}

	// Check for sequential characters
	if hasSequentialChars(password) {
		return true
	}

	// Check for repeated characters
	if hasExcessiveRepeatedChars(password) {
		return true
	}

	return false
}

// hasSequentialChars checks for sequential characters like "abc" or "123"
func hasSequentialChars(s string) bool {
	if len(s) < 3 {
		return false
	}

	for i := 0; i < len(s)-2; i++ {
		if s[i+1] == s[i]+1 && s[i+2] == s[i]+2 {
			return true
		}
		if s[i+1] == s[i]-1 && s[i+2] == s[i]-2 {
			return true
		}
	}

	return false
}

// hasExcessiveRepeatedChars checks for excessive repeated characters
func hasExcessiveRepeatedChars(s string) bool {
	if len(s) < 3 {
		return false
	}

	count := 1
	for i := 1; i < len(s); i++ {
		if s[i] == s[i-1] {
			count++
			if count >= 3 {
				return true
			}
		} else {
			count = 1
		}
	}

	return false
}

// containsInappropriateContent checks for inappropriate content in usernames
func containsInappropriateContent(username string) bool {
	// Add your inappropriate words list here
	inappropriateWords := []string{
		// Add words as needed
	}

	usernameLower := strings.ToLower(username)
	for _, word := range inappropriateWords {
		if strings.Contains(usernameLower, word) {
			return true
		}
	}

	return false
}

// ValidateProfileBio validates user bio content
func ValidateProfileBio(bio string) (bool, string) {
	if len(bio) > 500 {
		return false, "Bio must be at most 500 characters"
	}

	// Check for spam patterns
	if containsSpamPatterns(bio) {
		return false, "Bio contains spam content"
	}

	return true, ""
}

// containsSpamPatterns checks for common spam patterns
func containsSpamPatterns(text string) bool {
	spamPatterns := []regexp.Regexp{
		*regexp.MustCompile(`(?i)(buy|sell|cheap|discount|offer|deal)\s+(now|today|here)`),
		*regexp.MustCompile(`(?i)click\s+here`),
		*regexp.MustCompile(`(?i)bit\.ly|tinyurl|short\.link`),
		*regexp.MustCompile(`\b[A-Z]{5,}\b`), // All caps words longer than 5 chars
	}

	for _, pattern := range spamPatterns {
		if pattern.MatchString(text) {
			return true
		}
	}

	// Check for excessive URLs
	urlPattern := regexp.MustCompile(`https?://`)
	matches := urlPattern.FindAllString(text, -1)
	if len(matches) > 2 {
		return true
	}

	return false
}
