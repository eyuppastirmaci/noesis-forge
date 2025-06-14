package handlers

import (
	"net/http"

	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type RoleHandler struct {
	roleService *services.RoleService
	authService *services.AuthService
}

func NewRoleHandler(roleService *services.RoleService, authService *services.AuthService) *RoleHandler {
	return &RoleHandler{
		roleService: roleService,
		authService: authService,
	}
}

func (h *RoleHandler) RegisterRoutes(r *gin.RouterGroup) {
	roles := r.Group("/roles")
	roles.Use(middleware.AuthMiddleware(h.authService))
	{
		// Role management (admin only)
		roles.GET("", middleware.RequireAdmin(), h.GetRoles)
		roles.GET("/:id", middleware.RequireAdmin(), h.GetRoleByID)
		roles.POST("", middleware.RequireAdmin(), h.CreateRole)
		roles.PUT("/:id", middleware.RequireAdmin(), h.UpdateRole)
		roles.DELETE("/:id", middleware.RequireAdmin(), h.DeleteRole)

		// Permission management
		roles.GET("/permissions", middleware.RequireAdmin(), h.GetPermissions)
		roles.GET("/permissions/categories/:category", middleware.RequireAdmin(), h.GetPermissionsByCategory)

		// User role assignment
		roles.POST("/assign", middleware.RequireAdmin(), h.AssignRole)
	}
}

func (h *RoleHandler) GetRoles(c *gin.Context) {
	roles, err := h.roleService.GetRoles(c.Request.Context())
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch roles", err.Error())
		return
	}

	data := gin.H{
		"roles": roles,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Roles retrieved successfully")
}

func (h *RoleHandler) GetRoleByID(c *gin.Context) {
	roleIDStr := c.Param("id")
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "Invalid role ID format")
		return
	}

	role, err := h.roleService.GetRoleByID(c.Request.Context(), roleID)
	if err != nil {
		if err.Error() == "role not found" {
			utils.NotFoundResponse(c, "ROLE_NOT_FOUND", err.Error())
		} else {
			utils.InternalServerErrorResponse(c, "Failed to fetch role", err.Error())
		}
		return
	}

	data := gin.H{
		"role": role,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Role retrieved successfully")
}

func (h *RoleHandler) CreateRole(c *gin.Context) {
	var req services.CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", err.Error())
		return
	}

	role, err := h.roleService.CreateRole(c.Request.Context(), &req)
	if err != nil {
		if err.Error() == "role name already exists" {
			utils.ConflictResponse(c, "ROLE_NAME_EXISTS", err.Error())
		} else {
			utils.ErrorResponse(c, http.StatusBadRequest, "CREATION_FAILED", err.Error())
		}
		return
	}

	data := gin.H{
		"role": role,
	}
	utils.SuccessResponse(c, http.StatusCreated, data, "Role created successfully")
}

func (h *RoleHandler) UpdateRole(c *gin.Context) {
	roleIDStr := c.Param("id")
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "Invalid role ID format")
		return
	}

	var req services.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", err.Error())
		return
	}

	role, err := h.roleService.UpdateRole(c.Request.Context(), roleID, &req)
	if err != nil {
		if err.Error() == "role not found" {
			utils.NotFoundResponse(c, "ROLE_NOT_FOUND", err.Error())
		} else if err.Error() == "cannot modify system role" {
			utils.ForbiddenResponse(c, "SYSTEM_ROLE_IMMUTABLE", err.Error())
		} else {
			utils.ErrorResponse(c, http.StatusBadRequest, "UPDATE_FAILED", err.Error())
		}
		return
	}

	data := gin.H{
		"role": role,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Role updated successfully")
}

func (h *RoleHandler) DeleteRole(c *gin.Context) {
	roleIDStr := c.Param("id")
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "Invalid role ID format")
		return
	}

	err = h.roleService.DeleteRole(c.Request.Context(), roleID)
	if err != nil {
		if err.Error() == "role not found" {
			utils.NotFoundResponse(c, "ROLE_NOT_FOUND", err.Error())
		} else if err.Error() == "cannot delete system role" {
			utils.ForbiddenResponse(c, "SYSTEM_ROLE_IMMUTABLE", err.Error())
		} else {
			utils.ErrorResponse(c, http.StatusBadRequest, "DELETION_FAILED", err.Error())
		}
		return
	}

	utils.SuccessResponse(c, http.StatusOK, nil, "Role deleted successfully")
}

func (h *RoleHandler) GetPermissions(c *gin.Context) {
	permissions, err := h.roleService.GetPermissions(c.Request.Context())
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch permissions", err.Error())
		return
	}

	data := gin.H{
		"permissions": permissions,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Permissions retrieved successfully")
}

func (h *RoleHandler) GetPermissionsByCategory(c *gin.Context) {
	category := c.Param("category")
	if category == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "INVALID_CATEGORY", "Category is required")
		return
	}

	permissions, err := h.roleService.GetPermissionsByCategory(c.Request.Context(), category)
	if err != nil {
		utils.InternalServerErrorResponse(c, "Failed to fetch permissions by category", err.Error())
		return
	}

	data := gin.H{
		"permissions": permissions,
	}
	utils.SuccessResponse(c, http.StatusOK, data, "Permissions retrieved successfully")
}

func (h *RoleHandler) AssignRole(c *gin.Context) {
	var req services.AssignRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", err.Error())
		return
	}

	err := h.roleService.AssignRole(c.Request.Context(), req.UserID, req.RoleID)
	if err != nil {
		if err.Error() == "user not found" || err.Error() == "role not found" {
			utils.NotFoundResponse(c, "RESOURCE_NOT_FOUND", err.Error())
		} else {
			utils.ErrorResponse(c, http.StatusBadRequest, "ASSIGNMENT_FAILED", err.Error())
		}
		return
	}

	utils.SuccessResponse(c, http.StatusOK, nil, "Role assigned successfully")
}
