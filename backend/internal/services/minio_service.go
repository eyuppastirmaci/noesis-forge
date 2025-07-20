// backend/internal/services/minio_service.go
package services

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"path/filepath"
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

	if err := service.ensureBucket(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ensure bucket exists: %w", err)
	}

	logrus.Info("MinIO service initialized successfully")

	return service, nil
}

func (s *MinIOService) ensureBucket(ctx context.Context) error {
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

func (s *MinIOService) UploadFile(ctx context.Context, bucketName, objectName string, reader io.Reader, size int64, contentType string) error {
	_, err := s.client.PutObject(ctx, bucketName, objectName, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return fmt.Errorf("failed to upload file to MinIO: %w", err)
	}
	logrus.Infof("Uploaded file %s to bucket %s", objectName, bucketName)
	return nil
}

func (s *MinIOService) GetFileUrl(bucketName, objectName string) string {
	return fmt.Sprintf("%s/%s/%s", s.client.EndpointURL(), bucketName, objectName)
}

func (s *MinIOService) DownloadFile(ctx context.Context, objectName string) (io.ReadCloser, error) {
	return s.client.GetObject(ctx, s.config.BucketName, objectName, minio.GetObjectOptions{})
}

func (s *MinIOService) DeleteFile(ctx context.Context, objectName string) error {
	err := s.client.RemoveObject(ctx, s.config.BucketName, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete object from MinIO: %w", err)
	}
	logrus.Infof("Deleted file %s from MinIO", objectName)
	return nil
}

// GeneratePresignedURL, dışarıdan erişim için bir URL üretir (örn. kullanıcı arayüzü).
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
	fileUUID := uuid.New()
	ext := filepath.Ext(originalFileName)
	uuidFileName := fileUUID.String() + ext
	objectName := fmt.Sprintf("users/%s/documents/%s", userID.String(), uuidFileName)
	return objectName, uuidFileName
}

func (s *MinIOService) UploadThumbnail(ctx context.Context, objectName string, data []byte, contentType string) (*UploadResult, error) {
	reader := bytes.NewReader(data)
	uploadInfo, err := s.client.PutObject(ctx, s.config.BucketName, objectName, reader, int64(len(data)), minio.PutObjectOptions{
		ContentType: contentType,
		UserMetadata: map[string]string{
			"file-type":   "thumbnail",
			"uploaded-at": time.Now().UTC().Format(time.RFC3339),
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to upload thumbnail to MinIO: %w", err)
	}

	logrus.Infof("Uploaded thumbnail %s to MinIO, size: %d bytes", objectName, uploadInfo.Size)

	var presignedURL string
	url, err := s.client.PresignedGetObject(ctx, s.config.BucketName, objectName, 7*24*time.Hour, nil)
	if err != nil {
		logrus.Warnf("Failed to generate presigned URL for thumbnail %s: %v", objectName, err)
	} else {
		presignedURL = url.String()
	}

	return &UploadResult{
		ObjectName: objectName,
		FileName:   filepath.Base(objectName),
		Size:       uploadInfo.Size,
		URL:        presignedURL,
	}, nil
}
