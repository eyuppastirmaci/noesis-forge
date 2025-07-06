# NoesisForge Backend

NoesisForge is a modern document processing and AI-powered search system built with Go. This backend provides RESTful APIs for document management, user authentication, role-based access control, and AI-powered document search capabilities.

## 🛠️ Tech Stack

- **Language:** Go 1.24.2
- **Web Framework:** Gin
- **Database:** PostgreSQL with GORM
- **Authentication:** JWT
- **Cache:** Redis 8.0.2 (rate limiting, session & query caching)
- **Message Queue:** RabbitMQ (planned)
- **Vector Database:** Qdrant (planned)
- **Object Storage:** MinIO
- **Monitoring:** Prometheus & Grafana (planned)

## 📋 Prerequisites

### For Docker Installation (Recommended)
- **Docker** & Docker Compose
- At least 2GB RAM available for containers

### For Manual Installation
- **Go** 1.24.2 or higher
- **PostgreSQL** 13+
- **Redis** 8.0.2+ (for caching and rate limiting)
- **ImageMagick** (for PDF thumbnail generation)
- **Git**

## 🚀 Installation

### Option A: Docker Installation (Recommended) 🐳

Docker automatically handles all dependencies including ImageMagick.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/eyuppastirmaci/noesis-forge.git
   cd noesis-forge
   ```

2. **Start with Docker Compose:**
   ```bash
   # Start all services including backend
   docker-compose up -d
   
   # Or start only backend and its dependencies
   docker-compose up -d postgres redis minio minio-init backend
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f backend
   ```

4. **Access the API:**
   - Backend API: http://localhost:8080
   - API Health: http://localhost:8080/api/v1/health

### Option B: Manual Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/eyuppastirmaci/noesis-forge.git
   cd noesis-forge/backend
   ```

2. **Install ImageMagick:**
   Install ImageMagick for PDF thumbnail generation (see main README.md for detailed installation instructions).

3. **Install Go dependencies:**
   ```bash
   go mod download
   ```

4. **Set up environment variables:**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your own configuration settings and secrets
   # Make sure to update all the placeholder values with your actual configuration
   ```

5. **Start external services:**
   - **Option A (Recommended)**: Use Docker: `docker-compose up -d postgres redis minio minio-init`
   - **Option B**: Install and start PostgreSQL, Redis, and MinIO manually (see main README.md)

6. **Run the application:**
   ```bash
   # Development mode with hot reload (recommended)
   # Install Air first: go install github.com/air-verse/air@latest
   air
   
   # Or run directly
   go run cmd/api/main.go
   ```

## ⚙️ Configuration

The project includes a `.env.example` file with all required environment variables. To configure your environment:

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Update the configuration:**
   Edit the `.env` file with your own settings, secrets, and database credentials.

## 🧪 Testing

```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run tests with detailed coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## 🔧 Troubleshooting

### PDF Thumbnail Issues

**Problem**: PDF thumbnails not generating
**Solutions**:
1. **Verify ImageMagick installation**: `magick --version` or `convert --version`
2. **Restart backend service**: Check logs for ImageMagick errors
3. **Linux permission issues**:
   ```bash
   # Fix ImageMagick security policy for PDF processing
   sudo nano /etc/ImageMagick-6/policy.xml
   # Comment out the PDF policy line:
   <!-- <policy domain="coder" rights="none" pattern="PDF" /> -->
   ```

## 📝 API Documentation

API documentation is available via:
- REST Client files in `rest-client/` directory
- OpenAPI documentation in `openapi.yaml` file 
