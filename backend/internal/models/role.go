package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Role struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Name        string         `json:"name" gorm:"uniqueIndex;not null"`
	DisplayName string         `json:"displayName" gorm:"not null"`
	Description string         `json:"description"`
	IsDefault   bool           `json:"isDefault" gorm:"default:false"`
	IsSystem    bool           `json:"isSystem" gorm:"default:false"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Permissions []Permission `json:"permissions,omitempty" gorm:"many2many:role_permissions;"`
	Users       []User       `json:"-" gorm:"foreignKey:RoleID"`
}

func (r *Role) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

type Permission struct {
	ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key"`
	Name        string         `json:"name" gorm:"uniqueIndex;not null"`
	DisplayName string         `json:"displayName" gorm:"not null"`
	Description string         `json:"description"`
	Category    string         `json:"category" gorm:"not null"`
	IsSystem    bool           `json:"isSystem" gorm:"default:false"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	// Relations
	Roles []Role `json:"-" gorm:"many2many:role_permissions;"`
}

func (p *Permission) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

// Default permissions
var DefaultPermissions = []Permission{
	{Name: "document:create", DisplayName: "Create Documents", Description: "Create new documents", Category: "document", IsSystem: true},
	{Name: "document:read", DisplayName: "Read Documents", Description: "View documents", Category: "document", IsSystem: true},
	{Name: "document:update", DisplayName: "Update Documents", Description: "Edit documents", Category: "document", IsSystem: true},
	{Name: "document:delete", DisplayName: "Delete Documents", Description: "Delete documents", Category: "document", IsSystem: true},
	{Name: "search:basic", DisplayName: "Basic Search", Description: "Perform basic searches", Category: "search", IsSystem: true},
	{Name: "search:advanced", DisplayName: "Advanced Search", Description: "Perform advanced searches", Category: "search", IsSystem: true},
	{Name: "chat:access", DisplayName: "Chat Access", Description: "Access chat interface", Category: "chat", IsSystem: true},
	{Name: "user:manage", DisplayName: "Manage Users", Description: "Manage user accounts", Category: "admin", IsSystem: true},
	{Name: "role:manage", DisplayName: "Manage Roles", Description: "Manage roles and permissions", Category: "admin", IsSystem: true},
	{Name: "admin:access", DisplayName: "Admin Access", Description: "Access admin panel", Category: "admin", IsSystem: true},
}

// Default roles
var DefaultRoles = []Role{
	{Name: "admin", DisplayName: "Administrator", Description: "Full system access", IsSystem: true, IsDefault: false},
	{Name: "user", DisplayName: "User", Description: "Standard user access", IsSystem: true, IsDefault: true},
	{Name: "guest", DisplayName: "Guest", Description: "Limited access", IsSystem: true, IsDefault: false},
}
