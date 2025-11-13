#!/bin/bash
# Script to push HF Space permission fixes to Hugging Face Space
# Run this script after setting your HF_TOKEN environment variable

set -e  # Exit on error

echo "=================================="
echo "HF Space Deployment Script"
echo "=================================="
echo ""

# Check if HF_TOKEN is set
if [ -z "$HF_TOKEN" ]; then
    echo "❌ Error: HF_TOKEN environment variable not set"
    echo ""
    echo "Please set your Hugging Face token:"
    echo "  export HF_TOKEN=hf_your_token_here"
    echo ""
    echo "Get your token from: https://huggingface.co/settings/tokens"
    exit 1
fi

echo "✅ HF_TOKEN found"
echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# Confirm deployment
echo "This will deploy the following fixes to HF Space:"
echo "  - Fixed cache permissions in app.py files"
echo "  - Updated HF Spaces client API integration"
echo "  - Added comprehensive test script"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "🚀 Pushing to HF Space..."
echo ""

# Push to HF Space using token authentication
git push https://oauth2:$HF_TOKEN@huggingface.co/spaces/chrisdemonxxx/voiceforge-v1-0 $CURRENT_BRANCH:main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to HF Space!"
    echo ""
    echo "Next steps:"
    echo "  1. Go to https://huggingface.co/spaces/chrisdemonxxx/voiceforge-v1-0"
    echo "  2. Click 'Settings' → 'Factory Reboot'"
    echo "  3. Wait 2-3 minutes for restart"
    echo "  4. Run test: npx tsx test-hf-spaces-api.ts"
    echo ""
else
    echo ""
    echo "❌ Push failed. Please check:"
    echo "  - Token has write access to the Space"
    echo "  - Space URL is correct"
    echo "  - Network connectivity"
    echo ""
    exit 1
fi
