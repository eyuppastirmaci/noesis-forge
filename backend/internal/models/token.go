package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RefreshToken struct {
	ID        uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Token     string         `json:"-" gorm:"uniqueIndex;not null"`
	UserID    uuid.UUID      `json:"userID" gorm:"type:uuid;not null"`
	ExpiresAt time.Time      `json:"expiresAt" gorm:"not null"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	User User `json:"-" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

func (rt *RefreshToken) BeforeCreate(tx *gorm.DB) error {
	if rt.ID == uuid.Nil {
		rt.ID = uuid.New()
	}
	return nil
}

func (rt *RefreshToken) IsExpired() bool {
	return time.Now().After(rt.ExpiresAt)
}

type EmailVerificationToken struct {
	ID        uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Token     string         `json:"-" gorm:"uniqueIndex;not null"`
	UserID    uuid.UUID      `json:"userID" gorm:"type:uuid;not null"`
	ExpiresAt time.Time      `json:"expiresAt" gorm:"not null"`
	UsedAt    *time.Time     `json:"usedAt,omitempty"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	User User `json:"-" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

func (evt *EmailVerificationToken) BeforeCreate(tx *gorm.DB) error {
	if evt.ID == uuid.Nil {
		evt.ID = uuid.New()
	}
	return nil
}

func (evt *EmailVerificationToken) IsExpired() bool {
	return time.Now().After(evt.ExpiresAt)
}

func (evt *EmailVerificationToken) IsUsed() bool {
	return evt.UsedAt != nil
}

type PasswordResetToken struct {
	ID        uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Token     string         `json:"-" gorm:"uniqueIndex;not null"`
	UserID    uuid.UUID      `json:"userID" gorm:"type:uuid;not null"`
	ExpiresAt time.Time      `json:"expiresAt" gorm:"not null"`
	UsedAt    *time.Time     `json:"usedAt,omitempty"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	User User `json:"-" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

func (prt *PasswordResetToken) BeforeCreate(tx *gorm.DB) error {
	if prt.ID == uuid.Nil {
		prt.ID = uuid.New()
	}
	return nil
}

func (prt *PasswordResetToken) IsExpired() bool {
	return time.Now().After(prt.ExpiresAt)
}

func (prt *PasswordResetToken) IsUsed() bool {
	return prt.UsedAt != nil
}

// Token pair for API responses
type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	TokenType    string `json:"tokenType"`
	ExpiresIn    int    `json:"expiresIn"`
}

// Token claims for JWT validation
type TokenClaims struct {
	UserID   uuid.UUID `json:"userID"`
	Email    string    `json:"email"`
	Username string    `json:"username"`
	RoleID   uuid.UUID `json:"roleID"`
	RoleName string    `json:"roleName"`
}
