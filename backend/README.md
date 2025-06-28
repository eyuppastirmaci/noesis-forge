# NoesisForge Backend

NoesisForge is a modern document processing and AI-powered search system built with Go. This backend provides RESTful APIs for document management, user authentication, role-based access control, and AI-powered document search capabilities.

## 📋 Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🛠️ Tech Stack

- **Language:** Go 1.24.2
- **Web Framework:** Gin
- **Database:** PostgreSQL with GORM
- **Authentication:** JWT
- **Cache:** Redis (planned)
- **Message Queue:** RabbitMQ (planned)
- **Vector Database:** Qdrant (planned)
- **Object Storage:** MinIO (planned)
- **Monitoring:** Prometheus & Grafana (planned)

## 📋 Prerequisites

### For Docker Installation (Recommended)
- **Docker** & Docker Compose
- At least 2GB RAM available for containers

### For Manual Installation
- **Go** 1.24.2 or higher
- **PostgreSQL** 13+
- **ImageMagick** (for PDF thumbnail generation)
- **Git**

#### Installing ImageMagick

**Windows:**
1. Download ImageMagick from: https://imagemagick.org/script/download.php#windows
2. Choose the Q16-HDRI version for your architecture (x64 recommended)
3. Run the installer and ensure "Install development headers and libraries for C and C++" is checked
4. Add ImageMagick to your PATH during installation
5. Verify installation: `magick --version`

**macOS:**
```bash
# Using Homebrew
brew install imagemagick

# Using MacPorts
sudo port install ImageMagick
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install imagemagick imagemagick-dev libmagickwand-dev
```

**Linux (CentOS/RHEL/Fedora):**
```bash
# CentOS/RHEL
sudo yum install ImageMagick ImageMagick-devel

# Fedora
sudo dnf install ImageMagick ImageMagick-devel
```

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
   docker-compose up -d postgres minio minio-init backend
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
   Follow the ImageMagick installation instructions above for your operating system.

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
   ```bash
   # Start PostgreSQL and MinIO with Docker
   cd .. # go back to root directory
   docker-compose up -d postgres minio minio-init
   cd backend
   ```

6. **Run database migrations:**
   ```bash
   # Auto-migrate on startup
   go run cmd/api/main.go
   ```

7. **Run the application:**
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
   Edit the `.env` file with your own settings, secrets, and database credentials. Make sure to replace all placeholder values with your actual configuration.

### Adding New Features
1. Create models in `internal/models/`
2. Implement business logic in `internal/services/`
3. Create HTTP handlers in `internal/handlers/`
4. Register routes in `internal/router/router.go`
5. Add middleware if needed in `internal/middleware/`

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

## 🚀 Deployment

### Using Docker (Recommended)
```bash
# Build Docker image
docker build -t noesisforge-backend .

# Run container with environment variables
docker run -d \
  --name noesisforge-backend \
  -p 8080:8080 \
  -e APP_ENV=production \
  -e DB_HOST=your-db-host \
  -e DB_USER=your-db-user \
  -e DB_PASSWORD=your-db-password \
  -e DB_NAME=your-db-name \
  -e MINIO_ENDPOINT=your-minio-endpoint \
  -e MINIO_ACCESS_KEY=your-access-key \
  -e MINIO_SECRET_KEY=your-secret-key \
  -e JWT_SECRET=your-jwt-secret \
  noesisforge-backend

# Or use docker-compose for full stack deployment
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment
```bash
# Install ImageMagick on your server first
# For Ubuntu/Debian:
sudo apt-get install imagemagick imagemagick-dev libmagickwand-dev

# Build for production
CGO_ENABLED=0 GOOS=linux go build -o bin/api cmd/api/main.go

# Set environment variables
export APP_ENV=production
export DB_HOST=your-db-host
# ... other env vars

# Run binary
./bin/api
```

### Environment Variables for Production
Make sure to set these environment variables:
- `APP_ENV=production`
- `APP_PORT=8080`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`
- `JWT_SECRET` (use a strong random string)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` (optional)

## 📝 API Documentation

API documentation is available via:
- REST Client files in `rest-client/` directory
- OpenAPI documentation in `openapi.yaml` file 
