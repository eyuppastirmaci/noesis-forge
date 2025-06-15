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

### Phase 1: Core Infrastructure & Basic Features
**Create Account, Login, Authentication**
- [x] User registration system
- [x] Login functionality
- [x] JWT authentication
- [x] Password hashing and security
- [ ] Role-based access control (RBAC)
- [ ] Protected routes middleware
- [ ] Data encryption (End-to-end data protection)

**Sidebar & Layout System**
- [ ] `AuthenticatedLayout` component
- [ ] `PublicLayout` component
- [ ] `Sidebar` component (collapsible, responsive)
- [ ] Route protection (`PrivateRoute` wrapper)
- [ ] Navigation state management

**Dashboard**
- [ ] Basic dashboard layout
- [ ] Stats cards (mock data initially)
- [ ] Recent documents widget
- [ ] Quick actions section

**Profile & Settings**
- [ ] Profile update form
- [ ] Avatar upload
- [ ] Password change
- [ ] Basic preferences (theme, language)

### Phase 2: Document Management Core
**Document Upload**
- [ ] File upload component (drag & drop)
- [ ] MinIO integration
- [ ] Upload progress tracking
- [ ] Basic metadata form
- [ ] Backend: Document service, MinIO setup
- [ ] Batch processing (Handle multiple documents simultaneously)
- [ ] Version control (Track document changes and revisions)

**Documents List**
- [ ] Document grid/list view
- [ ] Basic filtering & sorting
- [ ] Pagination
- [ ] Document actions (download, delete)
- [ ] Backend: Document CRUD APIs

**Document Viewer**
- [ ] PDF viewer integration
- [ ] Document metadata display
- [ ] Download functionality
- [ ] Basic sharing (generate link)

### Phase 3: Search Foundation
**Basic Search**
- [ ] Search input component
- [ ] Search results page
- [ ] PostgreSQL full-text search
- [ ] Backend: Search service basics

**Document Processing Pipeline**
- [ ] RabbitMQ setup
- [ ] Embedding worker (BGE-M3)
- [ ] Multimodal embeddings (SigLIP2 for images)
- [ ] Text extraction service
- [ ] Qdrant vector storage setup
- [ ] Content summarization (Automatic document summaries)

### Phase 4: AI Features
**Advanced Search**
- [ ] Vector similarity search
- [ ] Hybrid search (keyword + semantic)
- [ ] Search filters enhancement
- [ ] Search history
- [ ] Context-aware results (Intelligent ranking and relevance scoring)

**Chat Interface**
- [ ] Basic chat UI
- [ ] Ollama integration
- [ ] Context selection from documents
- [ ] RAG implementation
- [ ] Backend: Chat service

### Phase 5: Collaboration Features
**Collections**
- [ ] Collection CRUD
- [ ] Add/remove documents
- [ ] Collection sharing basics

**Document Sharing**
- [ ] Share modal
- [ ] Permission levels
- [ ] Shared with me page

### Phase 6: Analytics & Monitoring
**Basic Analytics**
- [ ] Usage statistics
- [ ] Document analytics
- [ ] Search analytics
- [ ] Chart components (Recharts)

**Notifications System**
- [ ] Notification center (navbar)
- [ ] Real-time updates (WebSocket/SSE)
- [ ] Email notifications

**Audit & Security Logging**
- [ ] Audit logs (Track all system activities)
- [ ] Security event monitoring

### Phase 7: Admin Features
**User Management**
- [ ] User list with pagination
- [ ] User details page
- [ ] User actions (suspend, delete)

**Role & Permission Management**
- [ ] Role CRUD
- [ ] Permission assignment UI
- [ ] Role assignment to users

### Phase 8: Public Pages
**Landing & Marketing Pages**
- [ ] Landing page
- [ ] Features page
- [ ] Pricing page
- [ ] About/Contact pages

**Documentation**
- [ ] Documentation structure
- [ ] Markdown rendering
- [ ] Search in docs

### Phase 9: Advanced Features
**Team Features**
- [ ] Team creation
- [ ] Member management
- [ ] Team permissions

**Advanced Features**
- [ ] API Keys management
- [ ] Integrations (Slack, etc.)
- [ ] System settings
- [ ] Mobile responsive design
- [ ] Text-to-Speech (TTS) support
- [ ] OAuth Authentication
  - [ ] Google Sign-in
  - [ ] Facebook Login
  - [ ] LinkedIn Authentication
- [ ] Mobile Application (React Native/Flutter)
- [ ] Progressive Web App (PWA) support
- [ ] Offline document access
- [ ] Voice search capabilities
- [ ] Multi-language UI support


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

### Frontend
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **HTTP Client**: Axios
- **UI Components**: Custom components
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


