#!/bin/bash
# VoiceForge - Final Deployment Script for HF Spaces
# Deploys all V6.0 comprehensive fixes in one command

set -e  # Exit on error

echo "🚀 VoiceForge V6.0 - HF Spaces Final Deployment"
echo "================================================"
echo ""

# Configuration
HF_SPACE="chrisdemonxxx/VoiceForgeV1.0"
HF_USERNAME="chrisdemonxxx"
BRANCH="claude/init-project-011CV2JRSjt3bfAw63P4iNSm"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in VoiceForge directory"
    echo "Please run: cd /home/user/Voiceforge"
    exit 1
fi

# Check for HF token
if [ -z "$HF_TOKEN" ]; then
    echo "⚠️  HF_TOKEN environment variable not set"
    echo ""
    echo "📝 Get a write token from: https://huggingface.co/settings/tokens"
    echo "   1. Click 'Create new token'"
    echo "   2. Select 'Write' access"
    echo "   3. Copy the token"
    echo ""
    read -p "Enter your HF write token: " HF_TOKEN

    if [ -z "$HF_TOKEN" ]; then
        echo "❌ No token provided. Exiting."
        exit 1
    fi
fi

echo "✓ Token provided"
echo ""

# Verify all critical files exist
echo "📋 Verifying V6.0 fixes..."
REQUIRED_FILES=(
    "Dockerfile"
    "requirements-deployment.txt"
    "requirements-build.txt"
    "shared/schema.ts"
    "server/routes.ts"
    "server/ml-services/hf_tts_service.py"
    ".gitignore"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done

# Verify critical fixes are present
echo "  ✓ Python 3.11 upgrade in Dockerfile"
grep -q "python3.11" Dockerfile || { echo "❌ Python 3.11 not found in Dockerfile"; exit 1; }

echo "  ✓ STT schema fix in shared/schema.ts"
grep -q "AudioFormat.optional().default" shared/schema.ts || { echo "❌ STT schema fix not found"; exit 1; }

echo "  ✓ Voice cloning validation in server/routes.ts"
grep -q "Validate result from Python worker" server/routes.ts || { echo "❌ Voice cloning validation not found"; exit 1; }

echo "  ✓ TTS model normalization in hf_tts_service.py"
grep -q "model_normalized = model.replace" server/ml-services/hf_tts_service.py || { echo "❌ TTS normalization not found"; exit 1; }

echo "  ✓ Binary files prevention in .gitignore"
grep -q "*.bin" .gitignore || { echo "❌ Binary file prevention not found"; exit 1; }

echo ""
echo "✅ All V6.0 fixes verified!"
echo ""

# Show what will be deployed
echo "📦 Deployment summary:"
echo "  • Python 3.11 (resolves numpy dependency conflict)"
echo "  • optimum 1.23.3 + transformers 4.46.1"
echo "  • TTS 0.22.0 + librosa 0.10.2"
echo "  • STT schema fix (.optional().default())"
echo "  • Voice cloning result validation"
echo "  • TTS model name normalization (hyphens/underscores)"
echo "  • Binary files excluded from git"
echo ""

# Show changed files
echo "📝 Modified files:"
git status --short
echo ""

# Confirm deployment
read -p "🚀 Deploy V6.0 to HF Space $HF_SPACE? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "🔄 Deploying to Hugging Face Space..."
echo ""

# Configure git remote for HF Space
if git remote get-url space &>/dev/null; then
    git remote set-url space "https://${HF_USERNAME}:${HF_TOKEN}@huggingface.co/spaces/${HF_SPACE}"
else
    git remote add space "https://${HF_USERNAME}:${HF_TOKEN}@huggingface.co/spaces/${HF_SPACE}"
fi

# Push to HF Space
echo "📤 Pushing to HF Space main branch..."
if git push space ${BRANCH}:main --force; then
    echo ""
    echo "✅ Successfully pushed to HF Space!"
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    🎉 DEPLOYMENT SUCCESSFUL!                   ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📊 What happens next:"
    echo "  1. HF Space will rebuild (~10-15 minutes)"
    echo "  2. Python 3.11 will be installed"
    echo "  3. All dependencies will resolve without conflicts"
    echo "  4. TypeScript will build successfully"
    echo "  5. Express server will start on port 7860"
    echo "  6. GPU detection and ML model loading"
    echo ""
    echo "🔍 Monitor build progress:"
    echo "  https://huggingface.co/spaces/${HF_SPACE}/logs"
    echo ""
    echo "⏱️  Estimated build time: 10-15 minutes"
    echo ""
    echo "🧪 Test after build completes:"
    SPACE_URL="https://$(echo $HF_SPACE | tr '/' '-' | tr '[:upper:]' '[:lower:]').hf.space"
    echo ""
    echo "  # Health check"
    echo "  curl ${SPACE_URL}/api/health"
    echo ""
    echo "  # Expected output:"
    echo '  {"status":"healthy","gpu":{"available":true,"device":"NVIDIA A100-SXM4-80GB"}}'
    echo ""
    echo "  # Test TTS endpoint"
    echo "  curl -X POST ${SPACE_URL}/api/tts \\"
    echo '    -H "Content-Type: application/json" \'
    echo '    -d "{\"text\":\"Hello from VoiceForge\",\"model\":\"parler-tts-multilingual\"}"'
    echo ""
    echo "📚 Full documentation: README-DEPLOYMENT.md"
    echo ""
else
    echo ""
    echo "❌ Push failed!"
    echo ""
    echo "Common issues:"
    echo "  1. Token doesn't have write permissions"
    echo "     → Create new token: https://huggingface.co/settings/tokens"
    echo "  2. Space doesn't exist"
    echo "     → Create at: https://huggingface.co/new-space"
    echo "  3. Network issues"
    echo "     → Try again in a few moments"
    echo ""
    exit 1
fi

# Clean up - remove token from git config
git remote set-url space "https://huggingface.co/spaces/${HF_SPACE}"

echo "🔒 Token cleaned from git config"
echo ""
echo "🎉 Deployment complete! Monitor the build logs above."
echo ""
