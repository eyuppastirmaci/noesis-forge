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

- Go 1.24.2 or higher
- PostgreSQL 13+
- Git

## 🚀 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/eyuppastirmaci/noesis-forge.git
   cd noesis-forge/backend
   ```

2. **Install dependencies:**
   ```bash
   go mod download
   ```

3. **Set up environment variables:**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your own configuration settings and secrets
   # Make sure to update all the placeholder values with your actual configuration
   ```

4. **Set up the database:**
   ```bash
   # Create PostgreSQL database
   createdb noesisforge
   
   # Run migrations (auto-migrate on startup)
   go run cmd/api/main.go
   ```

5. **Run the application:**
   ```bash
   # Development mode with hot reload
   # Note: If you're using Air, make sure to update the .air.toml file with your project settings
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

### Using Docker (Coming Soon)
```bash
# Build Docker image
docker build -t noesisforge-backend .

# Run container
docker run -p 8080:8080 --env-file .env noesisforge-backend
```

### Manual Deployment
```bash
# Build for production
CGO_ENABLED=0 GOOS=linux go build -o bin/api cmd/api/main.go

# Run binary
./bin/api
```

## 📝 API Documentation

API documentation is available via:
- REST Client files in `rest-client/` directory
- OpenAPI documentation in `openapi.yaml` file 
