# 🚀 Manual HuggingFace Space Deployment Instructions

## ✅ All 18 Critical Fixes Are Ready!

All changes have been committed and are ready for deployment. The token provided doesn't have write access, so please follow these manual deployment steps.

---

## 📦 Option 1: Clone and Upload to HuggingFace Space (Recommended)

### Step 1: Go to Your HuggingFace Space
Navigate to: https://huggingface.co/spaces/Chrisdemonxxx/VoiceForgeAI/files/main

### Step 2: Clone This Repository Locally (if not already)
```bash
git clone https://github.com/chrisdemonxxx/Voiceforge
cd Voiceforge
git checkout claude/voiceforge-deployment-fixes-011CUyNJycXHtzhaWoRRJxtz
```

### Step 3: Add HuggingFace Remote with Your Token
```bash
# Use a token with WRITE access to the Space
git remote add hf https://YOUR_HF_TOKEN@huggingface.co/spaces/Chrisdemonxxx/VoiceForgeAI
```

### Step 4: Push to HuggingFace
```bash
git push hf claude/voiceforge-deployment-fixes-011CUyNJycXHtzhaWoRRJxtz:main --force
```

---

## 📦 Option 2: Manual File Upload via HuggingFace UI

### Files That Need to Be Updated:

Navigate to https://huggingface.co/spaces/Chrisdemonxxx/VoiceForgeAI/files/main and update these 9 files:

#### 1. **README.md**
- Change `sdk: docker` to `sdk: gradio`
- Add `python_version: 3.11`

#### 2. **requirements-build.txt**
- Change numpy to: `numpy==1.24.3`

#### 3. **requirements-deployment.txt**
- Change optimum to: `optimum==1.23.3`
- Comment out vLLM: `# vllm==0.4.3`
- Update comment:
  ```
  # NOTE: vLLM temporarily disabled due to PyTorch version conflicts
  # vllm 0.6.4 requires PyTorch 2.5.1, but openai-whisper requires triton<3 (incompatible)
  # Can be re-enabled once compatible versions are available
  ```

#### 4. **app.py**
Add at the top (after imports):
```python
# Dynamic path resolution for different environments
APP_DIR = Path(__file__).parent.absolute()
```

Replace all `/app` paths with `APP_DIR`:
- `os.environ['HF_HOME'] = str(APP_DIR / 'ml-cache')`
- `os.environ['TRANSFORMERS_CACHE'] = str(APP_DIR / 'ml-cache')`
- `os.environ['TORCH_HOME'] = str(APP_DIR / 'ml-cache')`
- `os.chdir(APP_DIR)`
- `if not (APP_DIR / 'node_modules').exists():`
- etc.

Add force rebuild section (after npm ci):
```python
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
```

Update vLLM error message:
```python
except ImportError as e:
    print(f"⚠️  INFO: vLLM temporarily disabled due to PyTorch version conflicts")
    print("   vLLM endpoints will return 503 Service Unavailable")
```

#### 5. **shared/schema.ts** (Line 194)
Change:
```typescript
format: AudioFormat,
```
To:
```typescript
format: AudioFormat.optional().default("wav"),
```

#### 6. **server/routes.ts**
Add validation after synthetic clone creation (around line 415):
```typescript
// Validate result from Python worker
if (!result || typeof result !== 'object') {
  console.error("[Voice Cloning] Invalid result from Python worker:", result);
  return res.status(500).json({
    error: "Voice cloning failed",
    message: "Invalid response from voice cloning service"
  });
}
```

Add validation after instant/professional clone creation (around line 476):
```typescript
// Validate result from Python worker
if (!result || typeof result !== 'object') {
  console.error("[Voice Cloning] Invalid result from Python worker:", result);
  return res.status(500).json({
    error: "Voice cloning failed",
    message: "Invalid response from voice cloning service"
  });
}
```

Update response with defaults (around line 529):
```typescript
// Add defaults for optional fields
const response = {
  id: clonedVoice.id,
  name: clonedVoice.name,
  model: clonedVoice.model,
  status: result.status || clonedVoice.status || "processing",
  cloningMode: clonedVoice.cloningMode,
  processingStatus: clonedVoice.processingStatus || "processing",
  trainingProgress: result.training_progress || 0,
  qualityScore: result.quality_score || 0,
  createdAt: clonedVoice.createdAt,
  characteristics: clonedVoice.voiceCharacteristics || {},
};

res.json(response);
```

#### 7. **server/ml-services/hf_tts_service.py** (Lines 49-57)
Replace model selection with:
```python
# Select model URL (accept both hyphens and underscores)
if model in ['indic_parler_tts', 'indic-parler-tts']:
    api_url = INDIC_PARLER_URL
    log(f"Using Indic Parler TTS for: '{text[:50]}...'")
elif model in ['parler_tts_multilingual', 'parler-tts-multilingual']:
    api_url = PARLER_MULTI_URL
    log(f"Using Parler-TTS Multilingual for: '{text[:50]}...'")
else:
    raise ValueError(f"Unknown HF TTS model: {model}")
```

#### 8. **.gitignore**
Add these lines:
```
# Model binaries (prevent git push rejection)
*.bin
*.pth
*.pt
*.safetensors
*.onnx
*.h5
*.pkl
*.pickle

# Deployment artifacts
.local/
uploads/
```

#### 9. **validate-deployment.sh** (NEW FILE)
Upload the validation script from the repository.

---

## 📦 Option 3: Direct File Copy from GitHub

Since all changes are in the GitHub branch `claude/voiceforge-deployment-fixes-011CUyNJycXHtzhaWoRRJxtz`, you can:

1. View files on GitHub: https://github.com/chrisdemonxxx/Voiceforge/tree/claude/voiceforge-deployment-fixes-011CUyNJycXHtzhaWoRRJxtz

2. Copy each modified file from GitHub to HuggingFace Space UI

---

## 🎯 Quick Copy-Paste Deployment

All modified files are available on GitHub at commit `024e9b5`. You can:

1. **Download the files** from GitHub
2. **Upload to HuggingFace Space** via the web UI

Or use the HuggingFace CLI:
```bash
# Install HuggingFace CLI
pip install huggingface_hub

# Login with your token
huggingface-cli login

# Clone the Space
git clone https://huggingface.co/spaces/Chrisdemonxxx/VoiceForgeAI
cd VoiceForgeAI

# Copy files from the GitHub branch
# (Manually copy the 9 modified files from the GitHub branch)

# Commit and push
git add .
git commit -m "V6.0: Apply all 18 comprehensive deployment fixes"
git push
```

---

## ✅ Expected Result After Deployment

Once deployed, HuggingFace will:
1. Detect Python 3.11 requirement
2. Install dependencies with correct versions
3. Build TypeScript automatically
4. Copy Python ML services to dist/
5. Start the application successfully

### Expected Build Logs:
```
⚙️  Building TypeScript...
✓ TypeScript build successful
📂 Copying Python ML services to dist/...
✓ Copied 8 Python service files
✓ GPU Detected: NVIDIA A100-SXM4-80GB
✓ GPU Memory: 80.00 GB
✓ CUDA Version: 12.1
✓ PyTorch: 2.1.2
✓ Transformers: 4.46.1
⚠️  INFO: vLLM temporarily disabled due to PyTorch version conflicts
✓ ML Services initialized
✓ Express server started on port 7860
🚀 VoiceForge API is ready!
```

---

## 🔍 Verify Deployment

After deployment completes, test:

```bash
# Health check
curl https://chrisdemonxxx-voiceforgeai.hf.space/api/health

# TTS with both naming conventions
curl -X POST https://chrisdemonxxx-voiceforgeai.hf.space/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Test", "model": "parler-tts-multilingual"}'

curl -X POST https://chrisdemonxxx-voiceforgeai.hf.space/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Test", "model": "parler_tts_multilingual"}'
```

---

## 📊 Summary of All 18 Fixes

✅ V5.6: Force rebuild on every deployment
✅ V5.5: Voice Cloning result validation
✅ V5.4: TTS model name normalization
✅ V5.3: STT schema optional field fix
✅ V5.2: Copy Python ML services to dist/
✅ V5.1: Add build step to startup
✅ Python 3.11 configuration
✅ numpy 1.24.3 (TTS/librosa compatibility)
✅ optimum 1.23.3 (transformers 4.46.1 compatible)
✅ vLLM temporarily disabled
✅ SDK changed to gradio
✅ Dynamic APP_DIR paths
✅ Binary files prevention
✅ All validations passed

All changes are committed and ready to deploy! 🚀
