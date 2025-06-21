package config

type MinIOConfig struct {
	Endpoint        string `envconfig:"MINIO_ENDPOINT" default:"localhost:9000"`
	AccessKeyID     string `envconfig:"MINIO_ACCESS_KEY_ID" default:"minioadmin"`
	SecretAccessKey string `envconfig:"MINIO_SECRET_ACCESS_KEY" default:"minioadmin123"`
	UseSSL          bool   `envconfig:"MINIO_USE_SSL" default:"false"`
	BucketName      string `envconfig:"MINIO_BUCKET_NAME" default:"noesis-documents"`
	Region          string `envconfig:"MINIO_REGION" default:"us-east-1"`
}
