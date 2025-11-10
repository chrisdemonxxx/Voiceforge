#!/bin/bash
# HuggingFace Space Deployment Script
# This script deploys VoiceForgeAI with all 18 critical fixes to HuggingFace Space

set -e

echo "🚀 VoiceForgeAI Deployment to HuggingFace Space"
echo "================================================"
echo ""

# Check if huggingface-cli is installed
if ! command -v huggingface-cli &> /dev/null; then
    echo "📦 Installing huggingface-cli..."
    pip install -q huggingface_hub
fi

# Check if logged in
if ! huggingface-cli whoami &> /dev/null; then
    echo "🔐 Please login to HuggingFace:"
    echo "   Run: huggingface-cli login"
    echo "   Then run this script again."
    exit 1
fi

echo "✓ Logged in to HuggingFace"
echo ""

# Variables
SPACE_NAME="Chrisdemonxxx/VoiceForgeAI"
TEMP_DIR="/tmp/voiceforge-deploy-$$"

echo "📥 Cloning HuggingFace Space..."
git clone https://huggingface.co/spaces/$SPACE_NAME $TEMP_DIR
cd $TEMP_DIR

echo "📋 Copying files..."
cp -r /home/user/Voiceforge/* ./ 

echo "✓ Files copied"
echo ""

echo "📝 Creating commit..."
git add -A
git commit -m "V6.0: Apply all 18 comprehensive deployment fixes" || echo "No changes to commit"

echo "🚀 Pushing to HuggingFace Space..."
git push origin main

echo ""
echo "✅ Deployment Complete!"
echo "Monitor: https://huggingface.co/spaces/$SPACE_NAME"

cd - > /dev/null
rm -rf $TEMP_DIR
