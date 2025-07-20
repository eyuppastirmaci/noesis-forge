# Multi-stage build for better caching and smaller images
FROM node:20-slim AS base

# Install system dependencies only once
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Dependencies stage
FROM base AS dependencies
COPY package*.json ./
# Use npm install instead of npm ci since lock file might be out of sync
RUN npm install --only=production && npm cache clean --force

# Runtime stage
FROM base AS runtime
WORKDIR /app

# Copy installed dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code (only necessary files)
COPY src ./src
COPY package*.json ./

# Create models directory
RUN mkdir -p models

# Set environment variable for models
ENV MODELS_PATH=/app/models
ENV NODE_ENV=production

# Create non-root user for security
RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser
RUN chown -R nodeuser:nodeuser /app
USER nodeuser

# Use node directly as entrypoint
ENTRYPOINT ["node"]
CMD ["src/text-extraction/index.js"]