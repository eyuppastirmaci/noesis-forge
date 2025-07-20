# Base stage: Set up the foundation with Node.js and system dependencies
FROM node:20-slim AS base

# Install system dependencies required for PDF processing and image manipulation
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    fontconfig \
    fonts-liberation \
    fonts-dejavu-core \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Set up the font environment for PDF.js by creating cache directories with proper permissions and 
# refreshing the font cache so applications can use the fonts.
RUN mkdir -p /var/cache/fontconfig \
    && chmod 755 /var/cache/fontconfig \
    && mkdir -p /tmp/.fontconfig \
    && chmod 777 /tmp/.fontconfig \
    && fc-cache -fv

# Set font configuration environment variables for consistent font rendering
ENV FONTCONFIG_PATH=/etc/fonts
ENV FONTCONFIG_FILE=/etc/fonts/fonts.conf

# Set working directory for the application
WORKDIR /app

# Dependencies stage: Handle npm package installation separately for better caching
FROM base AS dependencies
WORKDIR /app

# Configure npm for reliability and performance
# Set official registry, retry settings for network resilience
RUN npm config set registry https://registry.npmjs.org/ \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-factor 2

# Copy package files for dependency resolution
COPY package*.json ./

# Install all dependencies (including dev dependencies for build process)
RUN npm install

# Clean npm cache to reduce image size
RUN npm cache clean --force

# Runtime stage: Create the final production image
FROM base AS runtime
WORKDIR /app

# Copy installed dependencies from dependencies stage (layer caching optimization)
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source code
COPY src ./src

# Copy package.json for runtime metadata
COPY package.json ./

# Create models directory for ML model storage
RUN mkdir -p /app/models

# Set environment variables for production runtime
ENV MODELS_PATH=/app/models
ENV NODE_ENV=production

# Create a non‑root user, ensure application files have proper ownership and permissions and 
# configure a font cache directory for that user.
RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser \
    && chown -R nodeuser:nodeuser /app \
    && mkdir -p /home/nodeuser/.cache/fontconfig \
    && chown -R nodeuser:nodeuser /home/nodeuser/.cache/fontconfig \
    && chmod 755 /home/nodeuser/.cache/fontconfig

# Switch to non-root user for security
USER nodeuser

# Set Node.js as the entrypoint for container execution
ENTRYPOINT ["node"]

# Default command to run the text extraction service
CMD ["src/text-extraction/index.js"]