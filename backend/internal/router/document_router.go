package router

import (
	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/validations"
	"github.com/gin-gonic/gin"
)

func RegisterDocumentRoutes(r *gin.RouterGroup, documentService *services.DocumentService, minioService *services.MinIOService, authService *services.AuthService) {
	documentHandler := handlers.NewDocumentHandler(documentService, minioService)

	documents := r.Group("/documents")

	documents.Use(middleware.AuthMiddleware(authService))
	{
		// Document CRUD operations with validation middleware
		documents.POST("/upload", validations.ValidateDocumentUpload(), documentHandler.UploadDocument)
		documents.POST("/bulk-upload", validations.ValidateBulkDocumentUpload(), documentHandler.BulkUploadDocuments)
		documents.GET("", validations.ValidateDocumentList(), documentHandler.GetDocuments)
		documents.GET("/:id", validations.ValidateDocumentID(), documentHandler.GetDocument)
		documents.DELETE("/:id", validations.ValidateDocumentID(), documentHandler.DeleteDocument)

		// File operations with validation middleware
		documents.GET("/:id/download", validations.ValidateDocumentID(), documentHandler.DownloadDocument)
		documents.GET("/:id/preview", validations.ValidateDocumentID(), documentHandler.GetDocumentPreview)
	}
}
