package services

import (
	"context"
	"fmt"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

type RoleService struct {
	db     *gorm.DB
	logger *logrus.Entry
}

func NewRoleService(db *gorm.DB) *RoleService {
	return &RoleService{
		db:     db,
		logger: logrus.WithField("service", "role"),
	}
}

// Request/Response types
type CreateRoleRequest struct {
	Name          string      `json:"name" binding:"required,min=2,max=50"`
	DisplayName   string      `json:"displayName" binding:"required,min=2,max=100"`
	Description   string      `json:"description"`
	PermissionIDs []uuid.UUID `json:"permissionIDs"`
}

type UpdateRoleRequest struct {
	DisplayName   *string     `json:"displayName,omitempty"`
	Description   *string     `json:"description,omitempty"`
	PermissionIDs []uuid.UUID `json:"permissionIDs,omitempty"`
}

type AssignRoleRequest struct {
	UserID uuid.UUID `json:"userID" binding:"required"`
	RoleID uuid.UUID `json:"roleID" binding:"required"`
}

// Role methods
func (s *RoleService) GetRoles(ctx context.Context) ([]models.Role, error) {
	var roles []models.Role
	if err := s.db.Preload("Permissions").Find(&roles).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch roles: %w", err)
	}

	return roles, nil
}

func (s *RoleService) GetRoleByID(ctx context.Context, roleID uuid.UUID) (*models.Role, error) {
	var role models.Role
	if err := s.db.Preload("Permissions").Where("id = ?", roleID).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("role not found")
		}
		return nil, fmt.Errorf("failed to fetch role: %w", err)
	}

	return &role, nil
}

func (s *RoleService) CreateRole(ctx context.Context, req *CreateRoleRequest) (*models.Role, error) {
	// Check if role name already exists
	var existingRole models.Role
	if err := s.db.Where("name = ?", req.Name).First(&existingRole).Error; err == nil {
		return nil, fmt.Errorf("role name already exists")
	}

	// Create role
	role := &models.Role{
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Description: req.Description,
		IsDefault:   false,
		IsSystem:    false,
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Create(role).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("failed to create role: %w", err)
	}

	// Assign permissions if provided
	if len(req.PermissionIDs) > 0 {
		var permissions []models.Permission
		if err := tx.Where("id IN ?", req.PermissionIDs).Find(&permissions).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to fetch permissions: %w", err)
		}

		if len(permissions) != len(req.PermissionIDs) {
			tx.Rollback()
			return nil, fmt.Errorf("some permissions not found")
		}

		if err := tx.Model(role).Association("Permissions").Append(&permissions); err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to assign permissions: %w", err)
		}
	}

	tx.Commit()

	// Return role with permissions
	if err := s.db.Preload("Permissions").Where("id = ?", role.ID).First(role).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch created role: %w", err)
	}

	s.logger.Infof("Role created: %s", role.Name)
	return role, nil
}

func (s *RoleService) UpdateRole(ctx context.Context, roleID uuid.UUID, req *UpdateRoleRequest) (*models.Role, error) {
	var role models.Role
	if err := s.db.Where("id = ?", roleID).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("role not found")
		}
		return nil, fmt.Errorf("failed to fetch role: %w", err)
	}

	// Check if it's a system role
	if role.IsSystem {
		return nil, fmt.Errorf("cannot modify system role")
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update basic fields
	updates := make(map[string]interface{})
	if req.DisplayName != nil {
		updates["display_name"] = *req.DisplayName
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}

	if len(updates) > 0 {
		if err := tx.Model(&role).Updates(updates).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to update role: %w", err)
		}
	}

	// Update permissions if provided
	if req.PermissionIDs != nil {
		var permissions []models.Permission
		if len(req.PermissionIDs) > 0 {
			if err := tx.Where("id IN ?", req.PermissionIDs).Find(&permissions).Error; err != nil {
				tx.Rollback()
				return nil, fmt.Errorf("failed to fetch permissions: %w", err)
			}

			if len(permissions) != len(req.PermissionIDs) {
				tx.Rollback()
				return nil, fmt.Errorf("some permissions not found")
			}
		}

		// Clear existing permissions and assign new ones
		if err := tx.Model(&role).Association("Permissions").Clear(); err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("failed to clear permissions: %w", err)
		}

		if len(permissions) > 0 {
			if err := tx.Model(&role).Association("Permissions").Append(&permissions); err != nil {
				tx.Rollback()
				return nil, fmt.Errorf("failed to assign permissions: %w", err)
			}
		}
	}

	tx.Commit()

	// Return updated role with permissions
	if err := s.db.Preload("Permissions").Where("id = ?", role.ID).First(&role).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch updated role: %w", err)
	}

	s.logger.Infof("Role updated: %s", role.Name)
	return &role, nil
}

func (s *RoleService) DeleteRole(ctx context.Context, roleID uuid.UUID) error {
	var role models.Role
	if err := s.db.Where("id = ?", roleID).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("role not found")
		}
		return fmt.Errorf("failed to fetch role: %w", err)
	}

	// Check if it's a system role
	if role.IsSystem {
		return fmt.Errorf("cannot delete system role")
	}

	// Check if role is assigned to any users
	var userCount int64
	if err := s.db.Model(&models.User{}).Where("role_id = ?", roleID).Count(&userCount).Error; err != nil {
		return fmt.Errorf("failed to check role usage: %w", err)
	}

	if userCount > 0 {
		return fmt.Errorf("cannot delete role: %d users are assigned to this role", userCount)
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Clear permissions
	if err := tx.Model(&role).Association("Permissions").Clear(); err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to clear permissions: %w", err)
	}

	// Delete role
	if err := tx.Delete(&role).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("failed to delete role: %w", err)
	}

	tx.Commit()

	s.logger.Infof("Role deleted: %s", role.Name)
	return nil
}

func (s *RoleService) AssignRole(ctx context.Context, userID, roleID uuid.UUID) error {
	// Check if user exists
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to fetch user: %w", err)
	}

	// Check if role exists
	var role models.Role
	if err := s.db.Where("id = ?", roleID).First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("role not found")
		}
		return fmt.Errorf("failed to fetch role: %w", err)
	}

	// Update user role
	if err := s.db.Model(&user).Update("role_id", roleID).Error; err != nil {
		return fmt.Errorf("failed to assign role: %w", err)
	}

	s.logger.Infof("Role %s assigned to user %s", role.Name, user.Email)
	return nil
}

// Permission methods
func (s *RoleService) GetPermissions(ctx context.Context) ([]models.Permission, error) {
	var permissions []models.Permission
	if err := s.db.Find(&permissions).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch permissions: %w", err)
	}

	return permissions, nil
}

func (s *RoleService) GetPermissionsByCategory(ctx context.Context, category string) ([]models.Permission, error) {
	var permissions []models.Permission
	if err := s.db.Where("category = ?", category).Find(&permissions).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch permissions: %w", err)
	}

	return permissions, nil
}
