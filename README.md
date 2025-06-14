# NoesisForge

**NoesisForge** is a modern, AI-powered document management and intelligent search platform. It combines advanced document processing capabilities with artificial intelligence to provide semantic search, automated content analysis, and conversational interactions with your documents.

## 🌟 Overview

NoesisForge transforms how organizations handle document management by leveraging cutting-edge AI technologies. Upload documents, extract meaningful insights, and interact with your content through natural language queries. Whether you're managing legal documents, research papers, or business reports, NoesisForge makes your information instantly searchable and actionable.

## ✨ Key Features

### 📄 **Document Management**
- **Multi-format Support**: PDF, DOCX, TXT, and more
- **Intelligent Processing**: Automatic text extraction and metadata generation
- **Version Control**: Track document changes and revisions
- **Batch Processing**: Handle multiple documents simultaneously

### 🔍 **Advanced Search Capabilities**
- **Semantic Search**: Find documents by meaning, not just keywords
- **Vector Similarity**: AI-powered document similarity matching
- **Full-text Search**: Traditional keyword-based search
- **Context-aware Results**: Intelligent ranking and relevance scoring

### 🤖 **AI-Powered Features**
- **Multimodal Embeddings**: Text and image vector representations with BGE-M3 and SigLIP2
- **Hybrid Retrieval**: Dense, sparse, and multi-vector retrieval capabilities
- **Content Summarization**: Automatic document summaries via local LLM
- **Question Answering**: Ask questions about your documents with privacy-first local processing
- **Conversational Interface**: Chat with your document collection using Ollama models
- **Multilingual Support**: 100+ languages supported through BGE-M3

### 🔐 **Security & Access Control**
- **Role-based Access Control (RBAC)**: Granular permission management
- **JWT Authentication**: Secure user authentication
- **Data Encryption**: End-to-end data protection
- **Audit Logging**: Track all system activities

### 📊 **Analytics & Monitoring**
- **Usage Analytics**: Understand how your documents are being used
- **Performance Metrics**: Real-time system monitoring
- **Search Analytics**: Insights into search patterns and effectiveness

## 🗺️ Development Roadmap

### Phase 1: Foundation
- ✅ **Core Infrastructure**
  - ✅ Project structure and Clean Architecture setup
  - ✅ Database connection and GORM integration
  - ✅ Environment configuration management
  - ✅ Middleware pipeline (CORS, Rate Limiting, Logging)

- ✅ **Authentication & Authorization System**
  - ✅ JWT token generation and validation
  - ✅ User registration and login endpoints
  - ✅ Role-based access control (RBAC)
  - ✅ Password hashing and security
  - ✅ Protected routes middleware

- ✅ **API Gateway Foundation**
  - ✅ Gin router setup and configuration
  - ✅ Rate limiting implementation
  - ✅ CORS policy configuration
  - ✅ Request/Response middleware
  - ✅ Error handling and logging

- ✅ **Health & Monitoring**
  - ✅ Health check endpoints
  - ✅ Database connectivity monitoring
  - ✅ Basic system status reporting

### Phase 2: Core Services
- ☐ **Document Management Service**
  - ☐ File upload endpoints (PDF, DOCX, TXT)
  - ☐ Document metadata extraction
  - ☐ File validation and sanitization
  - ☐ Document versioning system
  - ☐ Integration with MinIO object storage

- ☐ **Data Layer Expansion**
  - ☐ PostgreSQL optimizations and indexing
  - ☐ Redis cache layer integration
  - ☐ Qdrant vector database setup
  - ☐ MinIO object storage configuration

### Phase 3: AI/ML Pipeline
- ☐ **Embedding Service**
  - ☐ Text chunking algorithms
  - ☐ Integration with embedding models (BGE-M3, SigLIP)
  - ☐ Batch processing for large documents
  - ☐ Vector storage in Qdrant

- ☐ **AI/ML Pipeline**
  - ☐ Async processing with RabbitMQ
  - ☐ Embedding worker implementation
  - ☐ Content preprocessing pipeline
  - ☐ Multi-format document parsing

### Phase 4: Search & Retrieval
- ☐ **Search Service**
  - ☐ Full-text search implementation
  - ☐ Vector similarity search
  - ☐ Hybrid search (keyword + semantic)
  - ☐ Search result ranking and filtering
  - ☐ Advanced query processing

- ☐ **Search Optimization**
  - ☐ Query performance optimization
  - ☐ Result caching strategies
  - ☐ Search analytics and metrics

### Phase 5: Conversational AI
- ☐ **Chat Service**
  - ☐ Conversational AI interface
  - ☐ Context-aware response generation
  - ☐ Chat history management
  - ☐ Integration with LLM providers
  - ☐ Conversation threading

- ☐ **RAG Implementation**
  - ☐ Retrieval-Augmented Generation
  - ☐ Context injection for LLM queries
  - ☐ Response quality optimization
  - ☐ Citation and source tracking

### Phase 6: Advanced Features
- ☐ **Message Queue Integration**
  - ☐ RabbitMQ setup and configuration
  - ☐ Async job processing
  - ☐ Event-driven architecture
  - ☐ Job status tracking and monitoring

- ☐ **Advanced Monitoring**
  - ☐ Prometheus metrics integration
  - ☐ Grafana dashboards
  - ☐ Loki log aggregation
  - ☐ Performance monitoring
  - ☐ Alert management

- ☐ **Cache Layer Optimization**
  - ☐ Redis session management
  - ☐ Search result caching
  - ☐ API response caching
  - ☐ Cache invalidation strategies

### Phase 7: Production Readiness
- ☐ **Security Enhancements**
  - ☐ API security hardening
  - ☐ Input validation and sanitization
  - ☐ Rate limiting improvements
  - ☐ Security audit and testing

- ☐ **Performance & Scalability**
  - ☐ Database query optimization
  - ☐ Connection pooling
  - ☐ Horizontal scaling preparation
  - ☐ Load testing and optimization

- ☐ **DevOps & Deployment**
  - ☐ Docker containerization
  - ☐ CI/CD pipeline setup
  - ☐ Environment-specific configurations
  - ☐ Backup and recovery strategies


## 🛠️ Tech Stack

### Backend
- **Language**: Go 1.24.2
- **Framework**: Gin (HTTP router)
- **Database**: PostgreSQL (metadata & relational data)
- **Vector Database**: Qdrant (document embeddings)
- **Object Storage**: MinIO (document files)
- **Cache**: Redis (session & query caching)
- **Message Queue**: RabbitMQ (async processing)
- **Authentication**: JWT tokens
- **Monitoring**: Prometheus + Grafana

### Frontend (Planned)
- **Framework**: Next.js 14 with React 18
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **UI Components**: Headless UI + Custom components
- **Type Safety**: TypeScript

### AI/ML Pipeline
- **Text Embedding**: [BGE-M3](https://huggingface.co/BAAI/bge-m3) - Multilingual embedding model (1024D, 8192 tokens, 100+ languages)
- **Image Embedding**: [SigLIP2](https://huggingface.co/google/siglip2-base-patch16-512) - Vision-language model for image understanding
- **Local LLM**: Ollama - Local language model runtime (supports Llama, Mistral, CodeLlama, etc.)
- **Vector Operations**: Qdrant native operations with hybrid retrieval support

### DevOps & Infrastructure
- **Containerization**: Docker & Docker Compose
- **Process Management**: Air (development hot reload)
- **Environment Management**: godotenv
- **Logging**: Logrus with structured logging
- **Configuration**: Environment variables + YAML

## 🚀 Getting Started

### Prerequisites
- **Go** 1.24.2 or higher
- **Node.js** 18+ (for frontend)
- **PostgreSQL** 13+
- **Redis** 6+
- **Ollama** (for local LLM)
- **Docker** & Docker Compose (recommended)

### Quick Start with Docker
```bash
# Clone the repository
git clone https://github.com/eyuppastirmaci/noesis-forge.git
cd noesis-forge

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
```

### Manual Installation

#### Backend Setup
```bash
# Navigate to backend
cd backend

# Install dependencies
go mod download

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run the application
go run cmd/api/main.go
```

#### Frontend Setup
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

## 🧪 Development

### Backend Development
```bash
cd backend

# Install Air for hot reload
go install github.com/cosmtrek/air@latest

# Run with hot reload
air

# Run tests
go test ./...

# Code formatting
go fmt ./...
```

### Frontend Development
```bash
cd frontend

# Start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## 📦 Deployment

### Production Build
```bash
# Backend
cd backend
CGO_ENABLED=0 GOOS=linux go build -o bin/api cmd/api/main.go

# Frontend
cd frontend
npm run build
```

### Docker Deployment
```bash
# Build and run all services
docker-compose -f docker-compose.prod.yml up -d

# Scale specific services
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors & Contributors

- **Eyup Pastirmaci** - [@eyuppastirmaci](https://github.com/eyuppastirmaci)

## 🙏 Acknowledgments

- **[Beijing Academy of Artificial Intelligence (BAAI)](https://huggingface.co/BAAI/bge-m3)** for BGE-M3 multilingual embedding model
- **[Google Research](https://huggingface.co/google/siglip2-base-patch16-512)** for SigLIP2 vision-language model
- **[Ollama](https://ollama.com/)** for making local LLM deployment accessible and efficient
- **[Qdrant](https://qdrant.tech/)** team for the excellent vector database with hybrid retrieval support
- **[Hugging Face](https://huggingface.co/)** for providing a platform for AI model sharing
- **The Go community** for excellent tooling and libraries
- **React and Next.js teams** for frontend frameworks
- **All open-source contributors** who make projects like this possible


