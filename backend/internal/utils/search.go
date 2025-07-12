package utils

import (
	"regexp"
	"strings"
	"unicode"
)

var camel = regexp.MustCompile(`([a-z])([A-Z])`)

// Clean PreprocessQuery - no hardcoded patterns
func PreprocessQuery(q string) (clean string, tokens []string) {
	// 1. Insert a space between lowercase–uppercase boundaries to split camelCase words.
	q = camel.ReplaceAllString(q, "$1 $2")
	// 2. Replace separators with spaces
	q = strings.ReplaceAll(q, "_", " ")
	q = strings.ReplaceAll(q, "-", " ")
	q = strings.ReplaceAll(q, ".", " ")

	// 3. Clean and normalize
	f := func(r rune) rune {
		if unicode.IsPunct(r) && r != '\'' {
			return ' '
		}
		return unicode.ToLower(r)
	}
	q = strings.Map(f, q)

	// 4. Split into tokens and filter short ones
	fields := strings.Fields(q)
	cleanTokens := []string{}

	for _, field := range fields {
		if len(field) >= 2 { // Only keep tokens with 2+ characters
			cleanTokens = append(cleanTokens, field)
		}
	}

	clean = strings.Join(cleanTokens, " ")

	return clean, cleanTokens
}
