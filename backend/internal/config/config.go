package config

import (
	"time"

	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	Environment string `envconfig:"ENVIRONMENT" default:"development"`

	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig

	// Future configurations (commented out for now)
	// Redis    RedisConfig
	// RabbitMQ RabbitMQConfig
	// MinIO    MinIOConfig
	// Qdrant   QdrantConfig
	// Ollama   OllamaConfig
	// Email    EmailConfig
	// CORS     CORSConfig
	// Metrics  MetricsConfig
	// Logging  LoggingConfig
	// Auth     AuthPolicyConfig
}

type ServerConfig struct {
	Port string `envconfig:"PORT" default:"8000"`
	Mode string `envconfig:"GIN_MODE" default:"debug"`
}

type DatabaseConfig struct {
	URL             string        `envconfig:"DATABASE_URL" required:"true"`
	MaxOpenConns    int           `envconfig:"DB_MAX_OPEN_CONNS" default:"100"`
	MaxIdleConns    int           `envconfig:"DB_MAX_IDLE_CONNS" default:"10"`
	ConnMaxLifetime time.Duration `envconfig:"DB_CONN_MAX_LIFETIME" default:"1h"`
	LogLevel        string        `envconfig:"DB_LOG_LEVEL" default:"error"`
}

type JWTConfig struct {
	Secret           string        `envconfig:"JWT_SECRET" required:"true"`
	ExpiresIn        time.Duration `envconfig:"JWT_EXPIRES_IN" default:"24h"`
	RefreshExpiresIn time.Duration `envconfig:"JWT_REFRESH_EXPIRES_IN" default:"168h"`
	Issuer           string        `envconfig:"JWT_ISSUER" default:"noesis-forge"`
	Audience         string        `envconfig:"JWT_AUDIENCE" default:"noesis-forge-api"`
}

// Future configuration structs (for when we implement these features)

type RedisConfig struct {
	URL         string        `envconfig:"REDIS_URL" default:"redis://localhost:6379"`
	Password    string        `envconfig:"REDIS_PASSWORD"`
	DB          int           `envconfig:"REDIS_DB" default:"0"`
	PoolSize    int           `envconfig:"REDIS_POOL_SIZE" default:"10"`
	MinIdle     int           `envconfig:"REDIS_MIN_IDLE_CONNS" default:"5"`
	DialTimeout time.Duration `envconfig:"REDIS_DIAL_TIMEOUT" default:"5s"`
	ReadTimeout time.Duration `envconfig:"REDIS_READ_TIMEOUT" default:"3s"`
}

type RabbitMQConfig struct {
	URL            string        `envconfig:"RABBITMQ_URL" default:"amqp://guest:guest@localhost:5672/"`
	Exchange       string        `envconfig:"RABBITMQ_EXCHANGE" default:"noesis-forge"`
	ExchangeType   string        `envconfig:"RABBITMQ_EXCHANGE_TYPE" default:"topic"`
	QueuePrefix    string        `envconfig:"RABBITMQ_QUEUE_PREFIX" default:"noesis"`
	Durable        bool          `envconfig:"RABBITMQ_DURABLE" default:"true"`
	AutoDelete     bool          `envconfig:"RABBITMQ_AUTO_DELETE" default:"false"`
	ReconnectDelay time.Duration `envconfig:"RABBITMQ_RECONNECT_DELAY" default:"5s"`
	PrefetchCount  int           `envconfig:"RABBITMQ_PREFETCH_COUNT" default:"10"`
}

type MinIOConfig struct {
	Endpoint        string `envconfig:"MINIO_ENDPOINT" default:"localhost:9000"`
	AccessKeyID     string `envconfig:"MINIO_ACCESS_KEY_ID" default:"minioadmin"`
	SecretAccessKey string `envconfig:"MINIO_SECRET_ACCESS_KEY" default:"minioadmin"`
	UseSSL          bool   `envconfig:"MINIO_USE_SSL" default:"false"`
	BucketName      string `envconfig:"MINIO_BUCKET_NAME" default:"noesis-forge"`
	Region          string `envconfig:"MINIO_REGION" default:"us-east-1"`
}

type QdrantConfig struct {
	URL              string        `envconfig:"QDRANT_URL" default:"http://localhost:6333"`
	APIKey           string        `envconfig:"QDRANT_API_KEY"`
	CollectionPrefix string        `envconfig:"QDRANT_COLLECTION_PREFIX" default:"noesis"`
	VectorSize       int           `envconfig:"QDRANT_VECTOR_SIZE" default:"1024"`
	Distance         string        `envconfig:"QDRANT_DISTANCE" default:"Cosine"`
	Timeout          time.Duration `envconfig:"QDRANT_TIMEOUT" default:"30s"`
}

type OllamaConfig struct {
	URL           string        `envconfig:"OLLAMA_URL" default:"http://localhost:11434"`
	Model         string        `envconfig:"OLLAMA_MODEL" default:"llama3"`
	Temperature   float64       `envconfig:"OLLAMA_TEMPERATURE" default:"0.7"`
	MaxTokens     int           `envconfig:"OLLAMA_MAX_TOKENS" default:"2048"`
	Timeout       time.Duration `envconfig:"OLLAMA_TIMEOUT" default:"120s"`
	StreamTimeout time.Duration `envconfig:"OLLAMA_STREAM_TIMEOUT" default:"300s"`
}

type EmailConfig struct {
	Provider string `envconfig:"EMAIL_PROVIDER" default:"smtp"`
	From     string `envconfig:"EMAIL_FROM" default:"noreply@yourdomain.com"`
	FromName string `envconfig:"EMAIL_FROM_NAME" default:"NoesisForge"`

	// SMTP settings
	SMTPHost       string `envconfig:"SMTP_HOST"`
	SMTPPort       int    `envconfig:"SMTP_PORT" default:"587"`
	SMTPUsername   string `envconfig:"SMTP_USERNAME"`
	SMTPPassword   string `envconfig:"SMTP_PASSWORD"`
	SMTPEncryption string `envconfig:"SMTP_ENCRYPTION" default:"tls"`

	// Provider API keys
	SendGridAPIKey string `envconfig:"SENDGRID_API_KEY"`
	AWSRegion      string `envconfig:"AWS_REGION" default:"us-east-1"`
}

type CORSConfig struct {
	AllowedOrigins   []string      `envconfig:"CORS_ALLOWED_ORIGINS" default:"http://localhost:3000,http://127.0.0.1:3000"`
	AllowedMethods   []string      `envconfig:"CORS_ALLOWED_METHODS" default:"GET,POST,PUT,DELETE,OPTIONS"`
	AllowedHeaders   []string      `envconfig:"CORS_ALLOWED_HEADERS" default:"Origin,Content-Type,Accept,Authorization"`
	ExposedHeaders   []string      `envconfig:"CORS_EXPOSED_HEADERS" default:"Content-Length"`
	AllowCredentials bool          `envconfig:"CORS_ALLOW_CREDENTIALS" default:"true"`
	MaxAge           time.Duration `envconfig:"CORS_MAX_AGE" default:"12h"`
}

type MetricsConfig struct {
	Enabled   bool   `envconfig:"METRICS_ENABLED" default:"true"`
	Port      string `envconfig:"METRICS_PORT" default:"9090"`
	Path      string `envconfig:"METRICS_PATH" default:"/metrics"`
	Namespace string `envconfig:"METRICS_NAMESPACE" default:"noesis_forge"`
}

type LoggingConfig struct {
	Level            string `envconfig:"LOG_LEVEL" default:"info"`
	Format           string `envconfig:"LOG_FORMAT" default:"json"`
	OutputPath       string `envconfig:"LOG_OUTPUT_PATH" default:"stdout"`
	ErrorOutputPath  string `envconfig:"LOG_ERROR_OUTPUT_PATH" default:"stderr"`
	EnableCaller     bool   `envconfig:"LOG_ENABLE_CALLER" default:"false"`
	EnableStacktrace bool   `envconfig:"LOG_ENABLE_STACKTRACE" default:"false"`
}

type AuthPolicyConfig struct {
	DefaultRoleName        string        `envconfig:"DEFAULT_ROLE_NAME" default:"user"`
	PasswordMinLength      int           `envconfig:"PASSWORD_MIN_LENGTH" default:"8"`
	PasswordRequireSpecial bool          `envconfig:"PASSWORD_REQUIRE_SPECIAL" default:"true"`
	PasswordRequireNumber  bool          `envconfig:"PASSWORD_REQUIRE_NUMBER" default:"true"`
	PasswordRequireUpper   bool          `envconfig:"PASSWORD_REQUIRE_UPPER" default:"true"`
	PasswordRequireLower   bool          `envconfig:"PASSWORD_REQUIRE_LOWER" default:"true"`
	MaxLoginAttempts       int           `envconfig:"MAX_LOGIN_ATTEMPTS" default:"5"`
	LoginAttemptWindow     time.Duration `envconfig:"LOGIN_ATTEMPT_WINDOW" default:"15m"`
	AccountLockDuration    time.Duration `envconfig:"ACCOUNT_LOCK_DURATION" default:"30m"`
}

func Load() (*Config, error) {
	// Load .env file if it exists (ignore error if it doesn't exist)
	_ = godotenv.Load()

	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}
