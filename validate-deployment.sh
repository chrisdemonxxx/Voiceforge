#!/bin/bash
# VoiceForgeAI Deployment Validation Script

echo "🔍 VoiceForgeAI Deployment Validation"
echo "======================================"

PASS_COUNT=0
FAIL_COUNT=0

# 1. Python version
echo ""
echo "✓ Checking Python Version:"
if python3 --version 2>&1 | grep -q "3.11"; then
    echo "   ✓ PASS: Python 3.11 detected"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: Python 3.11 required"
    python3 --version
    ((FAIL_COUNT++))
fi

# 2. README.md Python version metadata
echo ""
echo "✓ Checking README.md Python version metadata:"
if grep -q "python_version: 3.11" README.md; then
    echo "   ✓ PASS: Python 3.11 in README.md"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: Python version not set in README.md"
    ((FAIL_COUNT++))
fi

# 3. README.md SDK setting
echo ""
echo "✓ Checking README.md SDK configuration:"
if grep -q "sdk: gradio" README.md; then
    echo "   ✓ PASS: Gradio SDK configured"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: Gradio SDK not configured"
    ((FAIL_COUNT++))
fi

# 4. Numpy version
echo ""
echo "✓ Checking numpy version in requirements-build.txt:"
if grep -q "numpy==1.24.3" requirements-build.txt; then
    echo "   ✓ PASS: numpy 1.24.3 configured"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: numpy version incorrect"
    grep numpy requirements-build.txt
    ((FAIL_COUNT++))
fi

# 5. Optimum version
echo ""
echo "✓ Checking optimum version in requirements-deployment.txt:"
if grep -q "optimum==1.23.3" requirements-deployment.txt; then
    echo "   ✓ PASS: optimum 1.23.3 configured"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: optimum version incorrect"
    grep optimum requirements-deployment.txt
    ((FAIL_COUNT++))
fi

# 6. vLLM disabled
echo ""
echo "✓ Checking vLLM is disabled:"
if grep -q "^# vllm==" requirements-deployment.txt; then
    echo "   ✓ PASS: vLLM commented out"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: vLLM not disabled"
    grep "vllm==" requirements-deployment.txt
    ((FAIL_COUNT++))
fi

# 7. Binary files check
echo ""
echo "✓ Checking for binary files in git:"
BINARY_FILES=$(git ls-files | grep -E '\.(bin|pth|pt|safetensors)$' || true)
if [ -z "$BINARY_FILES" ]; then
    echo "   ✓ PASS: No binary files in git"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: Binary files found in git:"
    echo "$BINARY_FILES"
    ((FAIL_COUNT++))
fi

# 8. .gitignore has binary patterns
echo ""
echo "✓ Checking .gitignore for binary file patterns:"
if grep -q "*.bin" .gitignore && grep -q "*.pth" .gitignore; then
    echo "   ✓ PASS: Binary file patterns in .gitignore"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: Missing binary file patterns in .gitignore"
    ((FAIL_COUNT++))
fi

# 9. Python ML services exist
echo ""
echo "✓ Checking Python ML services:"
if [ -f "server/ml-services/hf_tts_service.py" ]; then
    echo "   ✓ PASS: Python ML services found"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: Missing ML services"
    ((FAIL_COUNT++))
fi

# 10. STT schema fix
echo ""
echo "✓ Checking STT schema format field:"
if grep -q "format: AudioFormat.optional().default(\"wav\")" shared/schema.ts; then
    echo "   ✓ PASS: STT schema format field fixed"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: STT schema format field not fixed"
    ((FAIL_COUNT++))
fi

# 11. Force rebuild in app.py
echo ""
echo "✓ Checking force rebuild in app.py:"
if grep -q "CRITICAL: Always rebuild TypeScript" app.py; then
    echo "   ✓ PASS: Force rebuild configured"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: Force rebuild not configured"
    ((FAIL_COUNT++))
fi

# 12. Copy Python ML services in app.py
echo ""
echo "✓ Checking Python ML services copy in app.py:"
if grep -q "Copy Python ML services to dist" app.py; then
    echo "   ✓ PASS: ML services copy configured"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: ML services copy not configured"
    ((FAIL_COUNT++))
fi

# 13. Dynamic APP_DIR in app.py
echo ""
echo "✓ Checking dynamic APP_DIR in app.py:"
if grep -q "APP_DIR = Path(__file__).parent.absolute()" app.py; then
    echo "   ✓ PASS: Dynamic APP_DIR configured"
    ((PASS_COUNT++))
else
    echo "   ❌ FAIL: Dynamic APP_DIR not configured"
    ((FAIL_COUNT++))
fi

# Summary
echo ""
echo "======================================"
echo "Validation Summary:"
echo "  ✓ Passed: $PASS_COUNT"
echo "  ❌ Failed: $FAIL_COUNT"
echo "======================================"

if [ $FAIL_COUNT -eq 0 ]; then
    echo "✓ All validations passed! Ready to deploy."
    exit 0
else
    echo "❌ Some validations failed. Please fix before deploying."
    exit 1
fi
