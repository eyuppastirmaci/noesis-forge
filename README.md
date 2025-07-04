![noesis_forge_logo](https://github.com/user-attachments/assets/3b1e5cbb-17e3-43eb-a5f2-3f5bff36ba04)

## 🌟 Overview

**NoesisForge** is a local RAG platform that transforms how you interact with documents. Search intelligently, match similar documents, auto-categorize your files, generate summaries, and chat with your content - all through a self-hosted solution that ensures complete privacy and control over your data.

## 📸 Screenshots

### Upload Document

![upload](https://github.com/user-attachments/assets/56b2179d-cf3b-4c54-8caf-b25e1e9e65d6)

### Documents

![list](https://github.com/user-attachments/assets/f59d7462-f806-44da-86be-deb5b0251972)

### Preview Document

![preview](https://github.com/user-attachments/assets/29d2f39b-b01d-411b-862f-c7594f2cfe84)

## 🚧 Development Status

**This is a learning-oriented project currently under active development. Not recommended for production use.**

Core document features work, but many AI capabilities are still being built. Contributions and feedback are welcome as we continue developing the platform.

## ✨ Key Features

### 📄 **Document Management**
- **📁 Multi-format Support**: PDF, DOCX, TXT, and more
- **🧠 Intelligent Processing**: Automatic text extraction and metadata generation
- **📝 Version Control**: Track document changes and revisions
- **⚡ Batch Processing**: Handle multiple documents simultaneously

### 🔍 **Advanced Search Capabilities**
- **🎯 Semantic Search**: Find documents by meaning, not just keywords
- **🔗 Vector Similarity**: Document similarity matching
- **📝 Full-text Search**: Traditional keyword-based search
- **🧩 Context-aware Results**: Intelligent ranking and relevance scoring

### 🧠 **Model Options & Testing**
- **🔄 Pre-built Models**: BGE-M3 + SigLIP2 or ColPaLI v1.2-hf
- **📤 Custom Upload**: Test your domain-specific models
- **⚖️ A/B Testing**: Compare accuracy, speed, and resource usage
- **🏆 Leaderboards**: See which models perform best for your data
- **📊 Real-time Analytics**: Live performance dashboards
- **🎯 Auto-Selection**: AI chooses the best model for each document

### 🤖 **Intelligent Processing**
- **🏷️ Document Classification**: Automatic categorization (16 types)
- **📐 Layout Analysis**: Form and structured document understanding
- **📝 Content Summarization**: Local LLM-powered summaries
- **💬 Question Answering**: Chat with your documents locally
- **🌍 Multilingual Support**: 100+ languages supported

### 🔐 **Security & Privacy**
- **🏠 Self-hosted**: Complete data control
- **🔒 Local Processing**: Privacy-first approach
- **🔑 JWT Authentication**: Secure user access
- **👥 Role-based Access**: Granular permission management
- **📋 Audit Logging**: Track all system activities

### 📊 **Analytics & Monitoring**
- **📈 Usage Analytics**: Document access patterns
- **⚡ Performance Metrics**: Real-time system monitoring
- **🔍 Model Comparison**: Accuracy and latency dashboards
- **🎯 Search Analytics**: Query effectiveness insights

## 🎯 **Perfect For**

### **Research Institutions**
- Compare embedding models for academic papers
- Test domain-specific models (medical, legal, technical)
- A/B test retrieval strategies

### **Enterprise Teams**
- Self-hosted document intelligence
- Custom model development and testing
- Privacy-compliant AI deployment

### **ML Engineers**
- Model performance benchmarking
- Embedding model research and development
- Custom ML pipeline development

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
- ☐ Document comments and annotations
- ☐ Document activity history

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

### Phase 9: Advanced Features

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

**Advanced Features**
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

### Backend
- **Language**: Go 1.24.2
- **Framework**: Gin (HTTP router)
- **Database**: PostgreSQL (metadata & relational data)
- **Vector Database**: Qdrant (document embeddings)
- **Object Storage**: MinIO (document files)
- **Cache**: Redis (rate limiting, session & query caching)
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
- **Embedding Models**: BGE-M3 + SigLIP2 (dual) or ColPaLI (unified)
- **Custom Models**: Upload and test your own embedding models
- **Document Processing**: DiT (classification), LayoutLM (layout analysis)
- **Local LLM**: Ollama runtime (Llama, Mistral, CodeLlama)
- **Vector Database**: Qdrant with hybrid retrieval
- **Model Testing**: A/B framework with performance metrics
- **Auto Selection**: Intelligent model switching based on document type

### DevOps & Infrastructure
- **Containerization**: Docker & Docker Compose
- **Process Management**: Air (development hot reload)
- **Environment Management**: godotenv
- **Logging**: Logrus with structured logging
- **Configuration**: Environment variables + YAML

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
- **Redis** 6+ (for caching and rate limiting)
- **ImageMagick** (for PDF thumbnail generation)

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
- **Redis** 6+ running on port 6379  
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
