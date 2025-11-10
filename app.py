"""
VoiceForge API - Hugging Face Spaces Entry Point
Production deployment for 80GB A100 GPU

This file serves as the main entry point for Hugging Face Spaces.
It starts the Express server and exposes the API endpoints.
"""

import os
import sys
import subprocess
import signal
import time
from pathlib import Path

# Dynamic path resolution for different environments
APP_DIR = Path(__file__).parent.absolute()

# Set environment variables for production
os.environ['NODE_ENV'] = 'production'
os.environ['PORT'] = '7860'  # Hugging Face Spaces standard port
os.environ['PYTHONUNBUFFERED'] = '1'

# GPU optimization settings for 80GB A100
os.environ['CUDA_VISIBLE_DEVICES'] = '0'
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:512'
os.environ['OMP_NUM_THREADS'] = '8'

# Model caching (dynamic paths)
os.environ['HF_HOME'] = str(APP_DIR / 'ml-cache')
os.environ['TRANSFORMERS_CACHE'] = str(APP_DIR / 'ml-cache')
os.environ['TORCH_HOME'] = str(APP_DIR / 'ml-cache')

print("=" * 80)
print("🚀 VoiceForge API - Starting Production Server")
print("=" * 80)
print(f"✓ Environment: {os.environ.get('NODE_ENV')}")
print(f"✓ Port: {os.environ.get('PORT')}")
print(f"✓ GPU: CUDA Device 0 (80GB A100)")
print(f"✓ Model Cache: {os.environ.get('HF_HOME')}")
print("=" * 80)

# Verify ML packages and GPU availability
print("\n🔍 Verifying ML Environment...")
print("=" * 80)

try:
    import torch
    print(f"✓ PyTorch {torch.__version__} loaded")
    print(f"✓ CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"✓ GPU Detected: {gpu_name}")
        print(f"✓ GPU Memory: {gpu_memory:.2f} GB")
        print(f"✓ CUDA Version: {torch.version.cuda}")
    else:
        print("⚠️  WARNING: CUDA not available, running on CPU")
except ImportError as e:
    print(f"❌ ERROR: PyTorch not installed: {e}")
    sys.exit(1)

try:
    import vllm
    print(f"✓ vLLM {vllm.__version__} loaded successfully")
except ImportError as e:
    print(f"⚠️  INFO: vLLM temporarily disabled due to PyTorch version conflicts")
    print("   vLLM endpoints will return 503 Service Unavailable")

print("=" * 80)

# Change to app directory
os.chdir(APP_DIR)

# Skip npm ci in production (node_modules already in container)
if not (APP_DIR / 'node_modules').exists():
    print("📦 node_modules not found - installing dependencies...")
    subprocess.run(['npm', 'ci'], check=True)
    print("✓ Node.js dependencies installed")
else:
    print("✓ Node.js dependencies already available (production container)")

# CRITICAL: Always rebuild TypeScript to prevent stale dist/ cache on HF Spaces
# Even if dist/ exists, force rebuild to ensure latest TypeScript changes apply
print("\n⚙️  Building TypeScript...")
print("=" * 80)
result = subprocess.run(['npm', 'run', 'build'], check=True, capture_output=True, text=True)
print(result.stdout)
print("✓ TypeScript build successful")

# Copy Python ML services to dist/ (required for runtime)
import shutil
ml_services_src = APP_DIR / 'server' / 'ml-services'
ml_services_dist = APP_DIR / 'dist' / 'ml-services'

if ml_services_src.exists():
    print("\n📂 Copying Python ML services to dist/...")
    if ml_services_dist.exists():
        shutil.rmtree(ml_services_dist)
    shutil.copytree(ml_services_src, ml_services_dist)
    py_files_count = len(list(ml_services_src.glob('*.py')))
    print(f"✓ Copied {py_files_count} Python service files")
else:
    print(f"⚠️  WARNING: ml-services directory not found at {ml_services_src}")

# Initialize database tables (only if DATABASE_URL is available)
database_url = os.environ.get('DATABASE_URL')
if database_url:
    print("\n🗄️  Initializing database...")
    print("=" * 80)
    try:
        result = subprocess.run(
            ['npm', 'run', 'db:push'],
            check=True,
            capture_output=True,
            text=True,
            timeout=60
        )
        print("✓ Database tables created/updated successfully")
    except subprocess.CalledProcessError as e:
        print(f"⚠️  Database initialization warning: {e.stderr}")
        print("Continuing with server startup (tables may already exist)...")
    except subprocess.TimeoutExpired:
        print("⚠️  Database initialization timed out")
        print("Continuing with server startup...")
else:
    print("\n📝 DATABASE_URL not set - running without persistent database")
    print("   (Using in-memory storage for demo purposes)")
    print("=" * 80)

# Start the Express server
print("\n🌐 Starting Express server...")
print("=" * 80)

# Start server process
print(f"Working directory: {os.getcwd()}")
print(f"node_modules exists: {(APP_DIR / 'node_modules').exists()}")
print(f"dist exists: {(APP_DIR / 'dist').exists()}")
print(f"dist/index.js exists: {(APP_DIR / 'dist' / 'index.js').exists()}")
print("=" * 80)

try:
    server_process = subprocess.Popen(
        ['npm', 'start'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
except Exception as e:
    print(f"❌ Failed to start server: {e}")
    print(f"Trying direct node execution...")
    server_process = subprocess.Popen(
        ['node', 'dist/index.js'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        env={**os.environ, 'NODE_ENV': 'production', 'PORT': '7860'}
    )

# Handle graceful shutdown
def signal_handler(sig, frame):
    print("\n🛑 Shutting down gracefully...")
    server_process.terminate()
    server_process.wait(timeout=10)
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Stream server output
try:
    for line in server_process.stdout:
        print(line, end='')
except KeyboardInterrupt:
    signal_handler(None, None)

# Wait for server process
server_process.wait()
