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
- ✅ PostgreSQL full-text search
- ✅ Backend: Search service basics

**Document Processing Pipeline**
- ✅ RabbitMQ setup
- ✅ Embedding worker (BGE-M3)
- ✅ Multimodal embeddings (SigLIP2 for images)
- ☐ Text extraction service
- ✅ Qdrant vector storage setup
- ☐ Content summarization (Automatic document summaries)
- ☐ GPU support for models (Enable GPU acceleration for model inference)

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

**Custom Model Integration**
- ☐ Custom model upload interface
- ☐ Model validation and testing pipeline
- ☐ Custom model performance evaluation
- ☐ Model comparison dashboard (accuracy vs latency)
- ☐ Smart model selection algorithm
- ☐ Automatic model switching based on document type and performance

### Phase 5: Advanced Search & Document Intelligence

**Advanced Search**
- ☐ Vector similarity search
- ☐ Hybrid search
- ☐ Search filters enhancement
- ☐ Search history

**Intelligent Document Classification**
- ☐ Document type classifier model integration
- ☐ Automatic categorization
- ☐ Category based filtering in document list
- ☐ Manual category override functionality

**Advanced Layout Understanding**
- ☐ Form field extraction and validation
- ☐ Table and invoice processing
- ☐ Key‑value pair extraction
- ☐ Structured data export

**Category‑based Search & Analytics**
- ☐ Document type filters in search
- ☐ Semantic search within specific categories
- ☐ Document similarity matching by category

### Phase 6: Conversational RAG & Chat Experience

**Chat UI (Frontend)**
- ☐ Streaming responses with markdown + code highlighting
- ☐ Source citation chips linking to document pages
- ☐ Follow‑up quick‑reply suggestions
- ☐ Per chat conversation history, rename feature

**Backend Chat Service**
- ☐ Ollama LLM gateway
- ☐ RAG pipeline orchestrator
- ☐ Context window management 
- ☐ Per user conversation memory

**Advanced RAG Features**
- ☐ “Ask‑about‑this‑page/selection” context injection
- ☐ Citations with bounding‑box coordinates for PDF viewer highlights
- ☐ Dynamic tool selection (summarize, translate, extract table) via function calls
- ☐ Caching layer for identical queries
- ☐ Safety / guardrail prompts & profanity filtering

### Phase 7: CI/CD & DevOps

- ☐ Jenkins pipeline setup
- ☐ Automated testing (unit, integration)
- ☐ Automated building (Docker images)
- ☐ Automated deployment (staging/production)
- ☐ Code quality checks (linting, security scans)
- ☐ Environment-specific configurations
- ☐ Rollback strategies

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

- **Docker** & Docker Compose
- **Jenkins** 2.504.3 (for automated tests, builds and deployments)

### Quick Setup

#### Docker Installation

##### 1. Clone the repository
```bash
git clone https://github.com/eyuppastirmaci/noesis-forge.git
cd noesis-forge
```

##### 2. Build and start all services with Docker Compose
```bash
# Build the images first (recommended for first-time setup)
docker compose --profile infra --profile workers --profile app build

# Start all services (database, storage, backend, frontend)
docker compose --profile infra --profile workers --profile app up -d
```

##### 3. Wait for services to be ready
```bash
# Check service status
docker compose ps

# View logs if needed
docker compose logs -f backend
docker compose logs -f frontend
```

## 🚀 Access Your Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin123)
- **Redis**: http://localhost:6379 or (CLI: `redis-cli` | GUI: [RedisInsight](https://redis.io/insight/))
- **Database**: on port 5432 or (PgAdmin or any PostgreSQL client)
- **Qdrant**: http://localhost:6333/dashboard#/welcome
- **Jenkins**: http://localhost:8080 (Future/Planned)

### 📥 Download Models

```bash
# Navigate to the workers directory
cd workers

# Download all required models
npm run download-models
```

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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors & Contributors

- **Eyup Pastirmaci** - [@eyuppastirmaci](https://github.com/eyuppastirmaci)

## 🙏 Acknowledgments

- **[Beijing Academy of Artificial Intelligence (BAAI)](https://huggingface.co/Xenova/bge-m3)** for BGE-M3 multilingual embedding model
- **[Google Research](https://huggingface.co/Xenova/siglip-base-patch16-224)** for SigLIP2 vision-language model
- **[Vidore Research](https://huggingface.co/vidore/colpali-v1.2-hf)** for ColPaLI v1.2-hf multimodal embedding model
- **[Nomic AI](https://huggingface.co/nomic-ai/nomic-embed-multimodal-7b)** for Nomic Embed Multimodal model
- **[Microsoft Research](https://huggingface.co/microsoft)** for DiT document classification and LayoutLM document understanding models
- **[Ollama](https://ollama.com/)** for making local LLM deployment accessible and efficient
- **[Qdrant](https://qdrant.tech/)** team for the excellent vector database with hybrid retrieval support
- **[Hugging Face](https://huggingface.co/)** for providing a platform for AI model sharing
- **The Go community** for excellent tooling and libraries
- **React and Next.js teams** for frontend frameworks
- **All open-source contributors** who make projects like this possible