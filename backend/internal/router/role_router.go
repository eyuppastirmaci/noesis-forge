package router

import (
	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/gin-gonic/gin"
)

func RegisterRoleRoutes(r *gin.RouterGroup, roleService *services.RoleService, authService *services.AuthService) {
	// Initialize handler
	roleHandler := handlers.NewRoleHandler(roleService, authService)

	roles := r.Group("/roles")
	roles.Use(middleware.AuthMiddleware(authService))
	{
		// Role management (admin only)
		roles.GET("", middleware.RequireAdmin(), roleHandler.GetRoles)
		roles.GET("/:id", middleware.RequireAdmin(), roleHandler.GetRoleByID)
		roles.POST("", middleware.RequireAdmin(), roleHandler.CreateRole)
		roles.PUT("/:id", middleware.RequireAdmin(), roleHandler.UpdateRole)
		roles.DELETE("/:id", middleware.RequireAdmin(), roleHandler.DeleteRole)

		// Permission management
		roles.GET("/permissions", middleware.RequireAdmin(), roleHandler.GetPermissions)
		roles.GET("/permissions/categories/:category", middleware.RequireAdmin(), roleHandler.GetPermissionsByCategory)

		// User role assignment
		roles.POST("/assign", middleware.RequireAdmin(), roleHandler.AssignRole)
	}
}
