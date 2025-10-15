package models

import (
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserStatus string

const (
	StatusActive    UserStatus = "active"
	StatusPending   UserStatus = "pending"
	StatusSuspended UserStatus = "suspended"
)

type User struct {
	ID              uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Email           string         `json:"email" gorm:"uniqueIndex;not null"`
	Username        string         `json:"username" gorm:"uniqueIndex;not null"`
	Name            string         `json:"name" gorm:"not null"`
	Password        string         `json:"-" gorm:"not null"`
	Avatar          string         `json:"avatar,omitempty"`
	Bio             string         `json:"bio,omitempty"`
	AlternateEmail  string         `json:"alternateEmail,omitempty"`
	Phone           string         `json:"phone,omitempty"`
	Department      string         `json:"department,omitempty"`
	Status          UserStatus     `json:"status" gorm:"default:'pending'"`
	EmailVerified   bool           `json:"emailVerified" gorm:"default:false"`
	EmailVerifiedAt *time.Time     `json:"emailVerifiedAt,omitempty"`
	LastLogin       *time.Time     `json:"lastLogin,omitempty"`
	FailedAttempts  int            `json:"-" gorm:"default:0"`
	LockedUntil     *time.Time     `json:"-"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`

	// E2EE Fields
	EncryptionSalt      string `json:"-" gorm:"type:text"`
	EncryptedEmail      string `json:"-" gorm:"type:text"`
	EncryptedEmailIV    string `json:"-" gorm:"type:text"`
	EncryptedAltEmail   string `json:"-" gorm:"type:text"`
	EncryptedAltEmailIV string `json:"-" gorm:"type:text"`
	EncryptedPhone      string `json:"-" gorm:"type:text"`
	EncryptedPhoneIV    string `json:"-" gorm:"type:text"`
	EncryptedDepartment string `json:"-" gorm:"type:text"`
	EncryptedDeptIV     string `json:"-" gorm:"type:text"`
	EncryptedBio        string `json:"-" gorm:"type:text"`
	EncryptedBioIV      string `json:"-" gorm:"type:text"`

	// Relations
	RoleID uuid.UUID `json:"roleID" gorm:"type:uuid;not null"`
	Role   Role      `json:"role,omitempty" gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}

	// Hash password if not already hashed
	if u.Password != "" && len(u.Password) < 60 {
		hashedPassword, err := utils.HashPassword(u.Password)
		if err != nil {
			return err
		}
		u.Password = hashedPassword
	}

	return nil
}

func (u *User) IsLocked() bool {
	return u.LockedUntil != nil && u.LockedUntil.After(time.Now())
}
