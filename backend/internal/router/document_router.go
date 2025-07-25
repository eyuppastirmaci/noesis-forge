package router

import (
	"github.com/eyuppastirmaci/noesis-forge/internal/handlers"
	"github.com/eyuppastirmaci/noesis-forge/internal/middleware"
	"github.com/eyuppastirmaci/noesis-forge/internal/queue"
	"github.com/eyuppastirmaci/noesis-forge/internal/services"
	"github.com/eyuppastirmaci/noesis-forge/internal/validations"
	"github.com/gin-gonic/gin"
)

func RegisterDocumentRoutes(
	r *gin.RouterGroup,
	documentService *services.DocumentService,
	minioService *services.MinIOService,
	authService *services.AuthService,
	userShareService *services.UserShareService,
	queuePublisher *queue.Publisher,
) {
	documentHandler := handlers.NewDocumentHandler(documentService, minioService, userShareService, queuePublisher)

	documents := r.Group("/documents")
	documents.Use(middleware.AuthMiddleware(authService))
	{
		// Document CRUD operations with validation middleware
		documents.POST("/upload", validations.ValidateDocumentUpload(), documentHandler.UploadDocument)
		documents.POST("/bulk-upload", validations.ValidateBulkDocumentUpload(), documentHandler.BulkUploadDocuments)
		documents.GET("", validations.ValidateDocumentList(), documentHandler.GetDocuments)
		documents.GET("/stats", documentHandler.GetUserStats)
		documents.GET("/:id", validations.ValidateDocumentID(), documentHandler.GetDocument)
		documents.GET("/:id/title", validations.ValidateDocumentID(), documentHandler.GetDocumentTitle)
		documents.PUT("/:id", validations.ValidateDocumentID(), validations.ValidateDocumentUpdate(), documentHandler.UpdateDocument)
		documents.DELETE("/:id", validations.ValidateDocumentID(), documentHandler.DeleteDocument)

		// Bulk operations
		documents.POST("/bulk-delete", validations.ValidateBulkDelete(), documentHandler.BulkDeleteDocuments)
		documents.POST("/bulk-download", validations.ValidateBulkDownload(), documentHandler.BulkDownloadDocuments)

		// File operations with validation middleware
		documents.GET("/:id/download", validations.ValidateDocumentID(), documentHandler.DownloadDocument)
		documents.GET("/:id/preview", validations.ValidateDocumentID(), documentHandler.GetDocumentPreview)
		documents.GET("/:id/thumbnail", validations.ValidateDocumentID(), documentHandler.GetDocumentThumbnail)
		documents.GET("/:id/revisions", validations.ValidateDocumentID(), documentHandler.GetDocumentRevisions)
	}
}
