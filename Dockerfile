# VoiceForge API - Production Dockerfile for 80GB A100 GPU Deployment
# Multi-stage build for optimal image size and performance

# ============================================================================
# Stage 1: Node.js Build (Frontend + Backend TypeScript)
# ============================================================================
FROM node:20-slim AS node-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production + dev for build)
RUN npm ci

# Copy source code
COPY . .

# Build frontend and backend (Vite + TypeScript)
RUN npm run build

# ============================================================================
# Stage 2: Python ML Dependencies
# ============================================================================
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04 AS python-base

# Install system dependencies (Ubuntu 22.04 ships with Python 3.10)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    git \
    wget \
    curl \
    ffmpeg \
    libsndfile1 \
    pkg-config \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libswscale-dev \
    libswresample-dev \
    libavfilter-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.10 as default (already the system default)
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 1

WORKDIR /app

# Copy Python requirements (staged installation for vLLM compatibility)
COPY requirements-build.txt requirements-deployment.txt ./

# Stage 1: Install PyTorch with CUDA support (using pip3 directly)
RUN pip3 install --no-cache-dir torch==2.1.2+cu121 torchaudio==2.1.2+cu121 --index-url https://download.pytorch.org/whl/cu121

# Stage 2: Install build prerequisites (required for vLLM CUDA kernel compilation)
RUN pip3 install --no-cache-dir -r requirements-build.txt

# Stage 3: Install ML stack (vLLM will now compile successfully with build deps present)
RUN pip3 install --no-cache-dir -r requirements-deployment.txt

# Verify pip package installation paths (for Docker build debugging)
RUN python -c "import site; print('Site packages:', site.getsitepackages())" && \
    ls -la /usr/local/lib/python3.10/ && \
    echo "Verification: pip packages installed successfully"

# Note: Package verification moved to runtime (app.py) since CUDA libs require GPU presence

# ============================================================================
# Stage 3: Final Production Image
# ============================================================================
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# Install runtime dependencies (including Node.js 20 from NodeSource)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y \
    nodejs \
    python3 \
    python3-pip \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.10 as default (already the system default)
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 1

WORKDIR /app

# Copy Node.js production dependencies
COPY --from=node-builder /app/node_modules ./node_modules
COPY --from=node-builder /app/package*.json ./

# Copy built frontend and backend (dist contains both)
COPY --from=node-builder /app/dist ./dist

# Copy Python dependencies (pip packages installed to /usr/local)
# Ubuntu's system Python uses /usr/local/lib for pip-installed packages
# Copying both dist-packages and site-packages for future-proofing
COPY --from=python-base /usr/local/lib/python3.10/dist-packages /usr/local/lib/python3.10/dist-packages
COPY --from=python-base /usr/local/bin /usr/local/bin
# Future-proof: also copy site-packages if it exists (some pip versions use this)
RUN mkdir -p /usr/local/lib/python3.10/site-packages

# Copy source files needed at runtime
COPY server ./server
COPY shared ./shared
COPY db ./db
COPY requirements-deployment.txt ./
COPY app.py ./
COPY drizzle.config.ts ./
COPY tsconfig.json ./

# Create directories for runtime data
RUN mkdir -p /app/uploads /app/ml-cache /app/logs

# Set environment variables
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV CUDA_VISIBLE_DEVICES=0
ENV HF_HOME=/app/ml-cache
ENV TRANSFORMERS_CACHE=/app/ml-cache
ENV TORCH_HOME=/app/ml-cache

# Expose port 7860 (Hugging Face Spaces standard)
EXPOSE 7860

# Health check (disabled for initial debugging - HF may be killing container on failed health check)
# HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
#     CMD curl -f http://localhost:7860/api/health || exit 1

# Start the application (via app.py which handles database initialization)
CMD ["python", "app.py"]
