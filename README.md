![noesis_forge_logo](https://github.com/user-attachments/assets/3b1e5cbb-17e3-43eb-a5f2-3f5bff36ba04)

## 🌟 Overview

**NoesisForge** is a local RAG platform that transforms how you interact with documents. Search intelligently, match similar documents, auto-categorize your files, generate summaries, and chat with your content - all through a self-hosted solution that ensures complete privacy and control over your data.

## 📸 Screenshots

![list](https://github.com/user-attachments/assets/f59d7462-f806-44da-86be-deb5b0251972)

![annotation](https://github.com/user-attachments/assets/f45c3fb3-98c8-4b5b-93d8-2a8f228f5530)

## 🚧 Development Status

**This is a learning-oriented project currently under active development. Not recommended for production use.**

Core document features work, but many AI capabilities are still being built. Contributions and feedback are welcome as we continue developing the platform.

## ✨ Key Features

- **Document Management**: Multi-format support (PDF, DOCX, TXT), intelligent processing, version control
- **Advanced Search**: Semantic search, vector similarity, full-text search with context-aware results
- **AI Models**: Pre-built models (BGE-M3, SigLIP2, ColPaLI), custom model testing, A/B comparison
- **Intelligence**: Document classification, layout analysis, content summarization, local Q&A
- **Security**: Self-hosted, local processing, JWT authentication, role-based access
- **Analytics**: Usage tracking, performance metrics, model comparison dashboards

## 🎯 Perfect For

- **Research Institutions**: Academic paper analysis, domain-specific model testing, retrieval strategy comparison
- **Enterprise Teams**: Self-hosted document intelligence, custom model development, privacy-compliant deployment
- **ML Engineers**: Model performance benchmarking, embedding research, custom pipeline development

## 🗺️ Development Roadmap

### Phase 1: Core Infrastructure & Basic Features

**Create Account, Login, Authentication**
- ✅ User registration system
- ✅ Login functionality
- ✅ JWT authentication
- ✅ Password hashing and security
- ☐ Role-based access control (RBAC)
- ☐ Protected routes middleware
- ☐ Data encryption (End-to-end data protection)

**Sidebar & Layout System**
- ✅ `AuthenticatedLayout` component
- ✅ `PublicLayout` component
- ✅ `Sidebar` component (collapsible, responsive)
- ☐ Route protection (`PrivateRoute` wrapper)
- ✅ Navigation state management

**Dashboard**
- ✅ Basic dashboard layout
- ✅ Stats cards (mock data initially)
- ✅ Recent documents widget
- ✅ Quick actions section

**Profile & Settings**
- ✅ Profile update form
- ✅ Avatar upload
- ✅ Password change
- ✅ Theme preferences (light/dark)

### Phase 2: Document Management Core

**Document Upload**
- ✅ File upload component (drag & drop)
- ✅ MinIO integration
- ✅ Upload progress tracking
- ✅ Basic metadata form
- ✅ Backend: Document service, MinIO setup
- ✅ Batch processing (Handle multiple documents simultaneously)
- ✅ Version control (Track document changes and revisions)

**Documents List**
- ✅ Document grid view
- ✅ Basic filtering & sorting
- ✅ Pagination
- ✅ Document actions (download, delete, preview)
- ✅ Backend: Document CRUD APIs

**Document Viewer**
- ✅ PDF viewer integration
- ✅ Document metadata display
- ✅ Download functionality
- ✅ Basic sharing (generate link)

**Document Detail & Management**
- ✅ Document detail page with full metadata
- ✅ Document favoriting system
- ✅ Favorites page (My Favorite Documents)
- ✅ Shared documents page (Documents Shared with Me)
- ✅ Document comments and annotations
- ✅ Document activity history

### Phase 3: Search Foundation

**Basic Search**
- ✅ Search input component
- ✅ Search results page (integrated in documents list)
- ☐ PostgreSQL full-text search
- ✅ Backend: Search service basics

**Document Processing Pipeline**
- ☐ RabbitMQ setup
- ☐ Embedding worker (BGE-M3)
- ☐ Multimodal embeddings (SigLIP2 for images)
- ☐ Text extraction service
- ☐ Qdrant vector storage setup
- ☐ Content summarization (Automatic document summaries)

### Phase 4: AI Features & Model Comparison

**Advanced Embedding Pipeline**
- ☐ ColPaLI v1.2-hf integration (unified multimodal model)
- ☐ DiT document classification model integration  
- ☐ LayoutLM structured document processing
- ☐ A/B testing framework for model comparison
- ☐ Performance benchmarking dashboard
- ☐ Dynamic model selection based on document type

**Model Performance Analytics**
- ☐ Embedding strategy comparison (dual vs unified models)
- ☐ Classification accuracy metrics
- ☐ Retrieval quality scoring (NDCG, MRR, Precision@K)
- ☐ Latency and resource usage monitoring
- ☐ Model performance alerts and recommendations
- ☐ Custom model integration framework

**Custom Model Integration**
- ☐ Custom model upload interface
- ☐ Model validation and testing pipeline
- ☐ Custom model performance evaluation
- ☐ Model comparison dashboard (accuracy vs latency)
- ☐ Smart model selection algorithm
- ☐ Automatic model switching based on document type and performance

**Advanced Search**
- ☐ Vector similarity search
- ☐ Hybrid search (keyword + semantic)
- ☐ Search filters enhancement
- ☐ Search history
- ☐ Context-aware results (Intelligent ranking and relevance scoring)

**Intelligent Document Classification**
- ☐ Document type classifier model integration (DiT)
- ☐ Automatic categorization (Scientific Paper, Legal Document, Technical Document, Invoice, Form, etc.)
- ☐ Category-based filtering in document list
- ☐ Category-specific search interfaces
- ☐ Confidence scores for classifications
- ☐ Manual category override functionality

**Advanced Layout Understanding**
- ☐ LayoutLM integration for structured documents
- ☐ Form field extraction and validation
- ☐ Table and invoice processing
- ☐ Key-value pair extraction
- ☐ Structured data export (JSON, CSV)

**Category-based Search & Analytics**
- ☐ Document type filters in search
- ☐ Semantic search within specific categories
- ☐ Document similarity matching by category
- ☐ Category-specific search analytics
- ☐ Cross-category similarity insights

**Chat Interface**
- ☐ Basic chat UI
- ☐ Ollama integration
- ☐ Context selection from documents
- ☐ RAG implementation
- ☐ Backend: Chat service

### Phase 5: Collaboration Features

**Collections**
- ☐ Collection CRUD
- ☐ Add/remove documents
- ☐ Collection sharing basics

**Document Sharing**
- ☐ Share modal
- ☐ Permission levels
- ☐ Shared with me page

### Phase 6: Analytics & Monitoring

**Basic Analytics**
- ☐ Usage statistics
- ☐ Document analytics
- ☐ Search analytics
- ☐ Chart components (Recharts)

**Notifications System**
- ☐ Notification center (navbar)
- ☐ Real-time updates (WebSocket/SSE)
- ☐ Email notifications

**Audit & Security Logging**
- ☐ Audit logs (Track all system activities)
- ☐ Security event monitoring

### Phase 7: Admin Features

**User Management**
- ☐ User list with pagination
- ☐ User details page
- ☐ User actions (suspend, delete)

**Role & Permission Management**
- ☐ Role CRUD
- ☐ Permission assignment UI
- ☐ Role assignment to users

### Phase 8: Public Pages

**Landing & Marketing Pages**
- ☐ Landing page
- ☐ Features page
- ☐ Pricing page
- ☐ About/Contact pages

**Documentation**
- ☐ Documentation structure
- ☐ Markdown rendering
- ☐ Search in docs

### Phase 9: CI/CD & DevOps

**CI/CD & DevOps**
- ☐ Jenkins pipeline setup
- ☐ Automated testing (unit, integration)
- ☐ Automated building (Docker images)
- ☐ Automated deployment (staging/production)
- ☐ Code quality checks (linting, security scans)
- ☐ Environment-specific configurations
- ☐ Rollback strategies

### Phase 10: Advanced Features

**Team Features**
- ☐ Team creation
- ☐ Member management
- ☐ Team permissions

**Custom AI Models**
- ☐ Custom text embedding model integration (replacing BGE-M3)
- ☐ Custom image embedding model integration (replacing SigLIP2)
- ☐ Model training pipeline for domain-specific embeddings
- ☐ A/B testing framework for model comparison
- ☐ Model performance monitoring and metrics
- ☐ Fine-tuning capabilities for specialized document types
- ☐ Model ensemble framework (combine multiple models for optimal performance)
- ☐ Domain-specific model training and fine-tuning
- ☐ Edge deployment for lightweight models
- ☐ Federated learning for privacy-preserving collaborative training

**Platform Extensions**
- ☐ API Keys management
- ☐ Integrations (Slack, etc.)
- ☐ System settings
- ☐ Mobile responsive design
- ☐ Text-to-Speech (TTS) support
- ☐ OAuth Authentication (Google, Facebook, LinkedIn)
- ☐ Offline document access
- ☐ Voice search capabilities
- ☐ Multi-language UI support

## 🛠️ Tech Stack

- **Backend**: Go 1.24.2 + Gin, PostgreSQL, Redis, MinIO, JWT authentication
- **Frontend**: Next.js 15 + React 19, Tailwind CSS, TypeScript, Redux Toolkit
- **AI/ML**: BGE-M3, SigLIP2, ColPaLI, Ollama (local LLM), Qdrant vector database
- **Infrastructure**: Docker + Docker Compose, Air (dev), Prometheus + Grafana (monitoring)
- **CI/CD**: Jenkins 2.504.3 (automated testing, building, deployment)

## 🏗️ Architecture

![noesis-forge-architecture](https://github.com/user-attachments/assets/b401c60f-32aa-4f03-9c6c-5bc3b131b6ed)

## 🚀 Getting Started

### Prerequisites

#### For Docker Installation (Recommended)
- **Docker** & Docker Compose

#### For Manual Installation
- **Go** 1.24.2 or higher
- **Node.js** 18+ (for frontend)
- **PostgreSQL** 13+
- **Redis** 8.0.2+ (for caching and rate limiting)
- **ImageMagick** (for PDF thumbnail generation)

#### For CI/CD Pipeline
- **Jenkins** 2.504.3 (for automated tests, builds and deployments)

### Quick Setup

#### Option A: Docker Installation (Recommended) 🐳

This is the easiest way to get started. Docker handles all dependencies including ImageMagick automatically.

##### 1. Clone the repository
```bash
git clone https://github.com/eyuppastirmaci/noesis-forge.git
cd noesis-forge
```

##### 2. Build and start all services with Docker Compose
```bash
# Build the images first (recommended for first-time setup)
docker compose build

# Start all services (database, storage, backend, frontend)
docker compose up -d

# Or build and start in one command
docker compose up -d --build
```

##### 3. Wait for services to be ready
```bash
# Check service status
docker compose ps

# View logs if needed
docker compose logs -f backend
docker compose logs -f frontend
```

---

#### Option B: Manual Installation

If you prefer to run services manually or need more control over the setup. You'll need to manually install and configure PostgreSQL, Redis, and MinIO on your system.

##### 1. Clone the repository
```bash
git clone https://github.com/eyuppastirmaci/noesis-forge.git
cd noesis-forge
```

##### 2. Install ImageMagick (Required for PDF thumbnails)

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

##### 3. Start database and cache services

**Option A: Use Docker (Recommended)**
```bash
# Use Docker for PostgreSQL, Redis, and MinIO (easier than manual installation)
docker-compose up -d postgres redis minio minio-init
```

**Option B: Manual Services**
If you chose manual installation, ensure you have installed and started:
- **PostgreSQL** 13+ running on port 5432
- **Redis** 8.0.2+ running on port 6379  
- **MinIO** running on port 9000 with bucket `noesis-documents`

Configure these services according to your `.env` file settings.

##### 4. Setup Backend
```bash
cd backend

# Copy environment file and configure your settings
cp .env.example .env

# Install Air for hot reload (optional)
go install github.com/air-verse/air@latest

# Start backend with hot reload
air

# Or run directly
go run cmd/api/main.go
```

##### 5. Setup Frontend
```bash
cd frontend

# Install dependencies
npm install

# Copy environment file and configure your settings
cp .env.example .env.local

# Start development server
npm run dev
```



## 🚀 Access Your Application

After completing either installation option above, you can access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin123)
- **Redis**: on port 6379 (CLI: `redis-cli` | GUI: [RedisInsight](https://redis.io/insight/))
- **Database**: PostgreSQL on port 5432 (you can use PgAdmin or any PostgreSQL client)
- **Jenkins** (if configured): http://localhost:8080 (CI/CD pipeline management)

## 🚀 Deployment

### Jenkins CI/CD Setup (Future/Planned)

##### 1. Install and Run Jenkins
```bash
# Run Jenkins with Docker
docker run -d --name jenkins \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts
```

##### 2. Run Jenkinsfile
```bash
# Access Jenkins: http://localhost:8080
# Create Pipeline job → Point to repository → Run Jenkinsfile
# Build, test, and deploy will happen automatically
```

## 🔧 Troubleshooting

### PDF Thumbnail Issues

**Problem**: PDF thumbnails not generating
**Solutions**:
1. **Docker**: Restart the backend container: `docker-compose restart backend`
2. **Manual**: Verify ImageMagick installation: `magick --version` or `convert --version`
3. Check logs for ImageMagick errors: `docker-compose logs backend` or application logs

**Problem**: ImageMagick not found on Windows
**Solutions**:
1. Ensure ImageMagick is added to your PATH environment variable
2. Restart your terminal/IDE after installation
3. Try running `magick --version` in a new Command Prompt

**Problem**: Permission denied errors on Linux
**Solutions**:
```bash
# Fix ImageMagick security policy for PDF processing
sudo nano /etc/ImageMagick-6/policy.xml
# Comment out or modify the PDF policy line:
<!-- <policy domain="coder" rights="none" pattern="PDF" /> -->
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors & Contributors

- **Eyup Pastirmaci** - [@eyuppastirmaci](https://github.com/eyuppastirmaci)

## 🙏 Acknowledgments

- **[Beijing Academy of Artificial Intelligence (BAAI)](https://huggingface.co/BAAI/bge-m3)** for BGE-M3 multilingual embedding model
- **[Google Research](https://huggingface.co/google/siglip2-base-patch16-512)** for SigLIP2 vision-language model
- **[Vidore Research](https://huggingface.co/vidore/colpali-v1.2-hf)** for ColPaLI v1.2-hf multimodal embedding model
- **[Nomic AI](https://huggingface.co/nomic-ai/nomic-embed-multimodal-7b)** for Nomic Embed Multimodal model
- **[Microsoft Research](https://huggingface.co/microsoft)** for DiT document classification and LayoutLM document understanding models
- **[Ollama](https://ollama.com/)** for making local LLM deployment accessible and efficient
- **[Qdrant](https://qdrant.tech/)** team for the excellent vector database with hybrid retrieval support
- **[Hugging Face](https://huggingface.co/)** for providing a platform for AI model sharing
- **The Go community** for excellent tooling and libraries
- **React and Next.js teams** for frontend frameworks
- **All open-source contributors** who make projects like this possible
