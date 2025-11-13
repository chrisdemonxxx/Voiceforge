#!/bin/bash
# VoiceForge - Push to Hugging Face Space
# Quick deployment script for HF Spaces

set -e

# Configuration
SPACE_REPO="chrisdemonxxx/voiceforge_v1.0"
HF_SPACE_URL="https://chrisdemonxxx-voiceforge-v1-0.hf.space"

# Check for HF token
if [ -z "$HF_TOKEN" ]; then
    echo "❌ ERROR: HF_TOKEN environment variable not set"
    echo ""
    echo "To get your HF token:"
    echo "1. Visit: https://huggingface.co/settings/tokens"
    echo "2. Create a new token with 'write' permissions"
    echo "3. Export it: export HF_TOKEN=hf_your_token_here"
    echo ""
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     VoiceForge - Push to Hugging Face Space                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Space: $SPACE_REPO"
echo "URL: $HF_SPACE_URL"
echo ""

# Get project root (script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Use Python upload script (more reliable than git clone)
echo "📦 Using Python upload method..."
python3 << EOF
from huggingface_hub import HfApi, login
import os
import sys

token = os.environ.get('HF_TOKEN')
if not token:
    print('❌ HF_TOKEN not set')
    sys.exit(1)

login(token=token)
api = HfApi()

print('📦 Uploading essential files...')
files_to_upload = [
    'Dockerfile', 'app.py', 'requirements-deployment.txt', 'requirements-build.txt',
    'package.json', 'package-lock.json', 'tsconfig.json', 'drizzle.config.ts',
    'vite.config.ts', 'README.md', 'postcss.config.js', 'tailwind.config.ts',
    'components.json', 'SPACE_CONFIG.yaml'
]

for file in files_to_upload:
    if os.path.exists(file):
        try:
            api.upload_file(
                path_or_fileobj=file,
                path_in_repo=file,
                repo_id='$SPACE_REPO',
                repo_type='space',
                commit_message=f'Deploy {file}'
            )
            print(f'  ✓ {file}')
        except Exception as e:
            if 'No files have been modified' not in str(e):
                print(f'  ⚠️  {file}: {str(e)[:80]}')

print('')
print('📂 Uploading directories...')
dirs_to_upload = ['server', 'client', 'shared', 'db', 'migrations']

for dir_name in dirs_to_upload:
    if os.path.exists(dir_name):
        try:
            api.upload_folder(
                folder_path=dir_name,
                repo_id='$SPACE_REPO',
                repo_type='space',
                path_in_repo=dir_name,
                commit_message=f'Deploy {dir_name}/ directory'
            )
            print(f'  ✓ {dir_name}/')
        except Exception as e:
            if 'No files have been modified' not in str(e):
                print(f'  ⚠️  {dir_name}/: {str(e)[:80]}')

print('')
print('✅ Deployment complete!')
print('🚀 Space: https://huggingface.co/spaces/$SPACE_REPO')
print('⏱️  Build will start automatically (~10-15 minutes)')
EOF

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ DEPLOYMENT COMPLETE!                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Monitor build: $HF_SPACE_URL"
echo "⏱️  Build time: ~10-15 minutes"
echo ""
echo "🧪 Test after deployment:"
echo "   npx tsx test-hf-spaces-api.ts"
echo ""
