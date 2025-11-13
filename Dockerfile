# VoiceForge API - Simplified Dockerfile for HF Spaces
# Single-stage build optimized for Hugging Face Spaces

FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    build-essential \
    git \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy source code
COPY . .

# Build frontend and backend
RUN npm run build

# Install Python build prerequisites
COPY requirements-build.txt ./
RUN pip install --no-cache-dir -r requirements-build.txt

# Install PyTorch (CPU version for HF Spaces - GPU will be available at runtime)
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install Python ML dependencies
COPY requirements-deployment.txt ./
RUN pip install --no-cache-dir -r requirements-deployment.txt || \
    pip install --no-cache-dir \
    transformers==4.46.1 \
    accelerate==0.27.2 \
    faster-whisper==1.2.1 \
    silero-vad==6.2.0 \
    librosa==0.10.1 \
    soundfile==0.12.1 \
    huggingface-hub==0.23.2 \
    fastapi==0.109.0 \
    uvicorn[standard]==0.27.0

# Create runtime directories
RUN mkdir -p /app/uploads /app/ml-cache /app/logs && \
    chmod -R 777 /app/uploads /app/ml-cache /app/logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=7860
ENV PYTHONUNBUFFERED=1
ENV HF_HOME=/app/ml-cache
ENV TRANSFORMERS_CACHE=/app/ml-cache
ENV TORCH_HOME=/app/ml-cache

# Expose port 7860 (HF Spaces standard)
EXPOSE 7860

# Start application
CMD ["python3", "app.py"]
