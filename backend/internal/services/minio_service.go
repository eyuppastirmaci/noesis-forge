package services

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

	"github.com/eyuppastirmaci/noesis-forge/internal/config"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/sirupsen/logrus"
)

// MIME type constants for content identification.
const (
	MIMEApplicationPDF         = "application/pdf"
	MIMEApplicationDOCX        = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	MIMEApplicationDOC         = "application/msword"
	MIMEApplicationXLSX        = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	MIMEApplicationXLS         = "application/vnd.ms-excel"
	MIMEApplicationPPTX        = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
	MIMEApplicationPPT         = "application/vnd.ms-powerpoint"
	MIMETextPlain              = "text/plain"
	MIMETextMarkdown           = "text/markdown"
	MIMEApplicationJSON        = "application/json"
	MIMEApplicationXML         = "application/xml"
	MIMEApplicationOctetStream = "application/octet-stream" // Default type.
)

// mimeTypes maps file extensions to their corresponding MIME type constants.
// This map is initialized once at package level for efficient lookups.
var mimeTypes = map[string]string{
	".pdf":  MIMEApplicationPDF,
	".docx": MIMEApplicationDOCX,
	".doc":  MIMEApplicationDOC,
	".xlsx": MIMEApplicationXLSX,
	".xls":  MIMEApplicationXLS,
	".pptx": MIMEApplicationPPTX,
	".ppt":  MIMEApplicationPPT,
	".txt":  MIMETextPlain,
	".md":   MIMETextMarkdown,
	".json": MIMEApplicationJSON,
	".xml":  MIMEApplicationXML,
}

type MinIOService struct {
	client *minio.Client
	config *config.MinIOConfig
}

type UploadResult struct {
	ObjectName string
	FileName   string // UUID-based filename.
	Size       int64
	URL        string
}

func NewMinIOService(cfg *config.MinIOConfig) (*MinIOService, error) {
	// Initialize minio client.
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
		Secure: cfg.UseSSL,
		Region: cfg.Region,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	service := &MinIOService{
		client: client,
		config: cfg,
	}

	// Ensure bucket exists.
	if err := service.ensureBucket(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ensure bucket exists: %w", err)
	}

	logrus.Info("MinIO service initialized successfully")

	return service, nil
}

func (s *MinIOService) ensureBucket(ctx context.Context) error {
	// check if bucket exists.
	exists, err := s.client.BucketExists(ctx, s.config.BucketName)
	if err != nil {
		return fmt.Errorf("failed to check bucket existence: %w", err)
	}

	if !exists {
		err = s.client.MakeBucket(ctx, s.config.BucketName, minio.MakeBucketOptions{
			Region: s.config.Region,
		})
		if err != nil {
			return fmt.Errorf("failed to create bucket: %w", err)
		}
		logrus.Infof("Created MinIO bucket: %s", s.config.BucketName)
	}

	return nil
}

func (s *MinIOService) UploadFile(ctx context.Context, userID uuid.UUID, file *multipart.FileHeader) (*UploadResult, error) {
	// Open the uploaded file.
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Generate unique object name and UUID fileanme.
	objectName, uuidFileName := s.generateObjectName(userID, file.Filename)

	// Get file content type.
	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = s.getContentType(file.Filename)
	}

	// Upload to MinIO.
	uploadInfo, err := s.client.PutObject(ctx, s.config.BucketName, objectName, src, file.Size, minio.PutObjectOptions{
		ContentType: contentType,
		UserMetadata: map[string]string{
			"user-id":       userID.String(),
			"original-name": file.Filename,
			"uploaded-at":   time.Now().UTC().Format(time.RFC3339),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to upload file to MinIO: %w", err)
	}

	logrus.Infof("Uploaded file %s to MinIO, size: %d bytes", objectName, uploadInfo.Size)

	// Generate presigned URL for temporary access.
	var presignedURL string
	url, err := s.client.PresignedGetObject(ctx, s.config.BucketName, objectName, 7*24*time.Hour, nil)
	if err != nil {
		logrus.Warnf("Failed to generate presigned URL for %s: %v", objectName, err)
	} else {
		presignedURL = url.String()
	}

	return &UploadResult{
		ObjectName: objectName,
		FileName:   uuidFileName,
		Size:       uploadInfo.Size,
		URL:        presignedURL,
	}, nil
}

func (s *MinIOService) DownloadFile(ctx context.Context, objectName string) (io.ReadCloser, error) {
	object, err := s.client.GetObject(ctx, s.config.BucketName, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get object from MinIO: %w", err)
	}

	return object, nil
}

func (s *MinIOService) DeleteFile(ctx context.Context, objectName string) error {
	err := s.client.RemoveObject(ctx, s.config.BucketName, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete object from MinIO: %w", err)
	}
	logrus.Infof("Deleted file %s from MinIO", objectName)
	return nil
}

func (s *MinIOService) GeneratePresignedURL(ctx context.Context, objectName string, expiry time.Duration) (string, error) {
	logrus.Infof("[MINIO] Generating presigned URL for object: %s, bucket: %s, expiry: %s", objectName, s.config.BucketName, expiry)
	url, err := s.client.PresignedGetObject(ctx, s.config.BucketName, objectName, expiry, nil)
	if err != nil {
		logrus.Errorf("[MINIO] Failed to generate presigned URL for object %s: %v", objectName, err)
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	logrus.Infof("[MINIO] Successfully generated presigned URL: %s", url.String())
	return url.String(), nil
}

func (s *MinIOService) generateObjectName(userID uuid.UUID, originalFileName string) (string, string) {
	// Generate UUID v4 for filename (different from document ID).
	fileUUID := uuid.New()
	ext := filepath.Ext(originalFileName)

	// Create UUID-based filename.
	uuidFileName := fileUUID.String() + ext

	// Create object poth.
	objectName := fmt.Sprintf("users/%s/documents/%s", userID.String(), uuidFileName)

	return objectName, uuidFileName
}

// getContentType retrieves the MIME type for a given filename.
// It uses the pre-defined mimeTypes map for the lookup.
func (s *MinIOService) getContentType(filename string) string {
	// Get the file extension and convert it to lowercase.
	ext := strings.ToLower(filepath.Ext(filename))

	// Check if the extension exists in the map using the "comma ok" idiom.
	if contentType, ok := mimeTypes[ext]; ok {
		// If the extension is found in the map, return the corresponding MIME type.
		return contentType
	}

	// If the extension is not found, return the default MIME type.
	return MIMEApplicationOctetStream
}
