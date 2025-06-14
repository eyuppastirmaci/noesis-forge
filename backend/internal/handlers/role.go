package handlers

import (
	"net/http"

	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
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
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "FETCH_FAILED",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"roles": roles,
	})
}

func (h *RoleHandler) GetRoleByID(c *gin.Context) {
	roleIDStr := c.Param("id")
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_ID",
			"message": "Invalid role ID format",
		})
		return
	}

	role, err := h.roleService.GetRoleByID(c.Request.Context(), roleID)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "role not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{
			"code":    "FETCH_FAILED",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"role": role,
	})
}

func (h *RoleHandler) CreateRole(c *gin.Context) {
	var req services.CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	role, err := h.roleService.CreateRole(c.Request.Context(), &req)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "role name already exists" {
			status = http.StatusConflict
		}
		c.JSON(status, gin.H{
			"code":    "CREATION_FAILED",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Role created successfully",
		"role":    role,
	})
}

func (h *RoleHandler) UpdateRole(c *gin.Context) {
	roleIDStr := c.Param("id")
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_ID",
			"message": "Invalid role ID format",
		})
		return
	}

	var req services.UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	role, err := h.roleService.UpdateRole(c.Request.Context(), roleID, &req)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "role not found" {
			status = http.StatusNotFound
		} else if err.Error() == "cannot modify system role" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{
			"code":    "UPDATE_FAILED",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Role updated successfully",
		"role":    role,
	})
}

func (h *RoleHandler) DeleteRole(c *gin.Context) {
	roleIDStr := c.Param("id")
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_ID",
			"message": "Invalid role ID format",
		})
		return
	}

	err = h.roleService.DeleteRole(c.Request.Context(), roleID)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "role not found" {
			status = http.StatusNotFound
		} else if err.Error() == "cannot delete system role" {
			status = http.StatusForbidden
		}
		c.JSON(status, gin.H{
			"code":    "DELETION_FAILED",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Role deleted successfully",
	})
}

func (h *RoleHandler) GetPermissions(c *gin.Context) {
	permissions, err := h.roleService.GetPermissions(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "FETCH_FAILED",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"permissions": permissions,
	})
}

func (h *RoleHandler) GetPermissionsByCategory(c *gin.Context) {
	category := c.Param("category")
	if category == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "INVALID_CATEGORY",
			"message": "Category is required",
		})
		return
	}

	permissions, err := h.roleService.GetPermissionsByCategory(c.Request.Context(), category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code":    "FETCH_FAILED",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"permissions": permissions,
	})
}

func (h *RoleHandler) AssignRole(c *gin.Context) {
	var req services.AssignRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code":    "VALIDATION_ERROR",
			"message": "Invalid request data",
			"error":   err.Error(),
		})
		return
	}

	err := h.roleService.AssignRole(c.Request.Context(), req.UserID, req.RoleID)
	if err != nil {
		status := http.StatusBadRequest
		if err.Error() == "user not found" || err.Error() == "role not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{
			"code":    "ASSIGNMENT_FAILED",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Role assigned successfully",
	})
}
