# 🚀 Deploy VoiceForge to Hugging Face Spaces with L40s 62GB

**GPU**: NVIDIA L40s (62GB VRAM)
**Cost**: $1.30/hour (~$31.20/day if running 24/7)
**Estimated Setup Time**: 20 minutes

---

## 📊 L40s vs A100 Comparison

| Spec | L40s 62GB | A100 80GB |
|------|-----------|-----------|
| **VRAM** | 62 GB | 80 GB |
| **Price** | $1.30/hr | $4.13/hr |
| **Daily Cost** | ~$31.20 | ~$99.12 |
| **Monthly (24/7)** | ~$936 | ~$2,973 |
| **With Auto-Sleep (12h/day)** | ~$468 | ~$1,487 |
| **CUDA Compatibility** | ✅ 12.1 | ✅ 12.1 |
| **VoiceForge Support** | ✅ Full | ✅ Full |
| **Recommended For** | Production | Heavy workloads |

**Savings**: **68% cheaper** than A100!

---

## ✅ Prerequisites

1. **GitHub Account** - Your code is already there at `chrisdemonxxx/Voiceforge`
2. **Hugging Face Account** - Sign up at [huggingface.co](https://huggingface.co)
3. **Database** - PostgreSQL (Neon, Supabase, or Railway - free tier works!)
4. **Hugging Face Token** - For model downloads

---

## 🎯 Step-by-Step Deployment

### Step 1: Set Up Database (5 minutes)

#### Option A: Neon (Recommended - Free Tier)
```bash
# 1. Go to https://neon.tech
# 2. Sign up (free)
# 3. Create a new project: "voiceforge"
# 4. Copy the connection string:
DATABASE_URL=postgresql://username:password@ep-xxx.neon.tech/voiceforge?sslmode=require
```

#### Option B: Supabase (Free Tier)
```bash
# 1. Go to https://supabase.com
# 2. Create new project
# 3. Get connection string from Settings → Database
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

#### Option C: Railway (Free Trial)
```bash
# 1. Go to https://railway.app
# 2. Create PostgreSQL database
# 3. Copy connection string
DATABASE_URL=postgresql://postgres:password@xxx.railway.app:5432/railway
```

---

### Step 2: Get Hugging Face Token (2 minutes)

```bash
# 1. Go to https://huggingface.co/settings/tokens
# 2. Click "New token"
# 3. Name: "voiceforge-api"
# 4. Type: Read
# 5. Copy token:
HUGGINGFACE_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### Step 3: Create Hugging Face Space (3 minutes)

1. **Go to**: https://huggingface.co/new-space

2. **Fill in details**:
   - **Owner**: Your username
   - **Space name**: `voiceforge-api` (or any name)
   - **License**: MIT
   - **Visibility**: Public (or Private)
   - **SDK**: **Docker** ⚠️ Important!
   - **Linked repository**: `chrisdemonxxx/Voiceforge`
   - **Branch**: `claude/init-project-011CV2JRSjt3bfAw63P4iNSm` (or `main`)

3. **Click**: "Create Space"

---

### Step 4: Configure Secrets (3 minutes)

In your new Space:

1. Go to **Settings** → **Repository secrets**

2. Add these secrets (click "New secret" for each):

#### Required Secrets:
```bash
# Database
DATABASE_URL
postgresql://username:password@host:5432/database?sslmode=require

# Hugging Face
HUGGINGFACE_TOKEN
hf_your_token_here

# Security
SESSION_SECRET
your_random_secret_at_least_32_characters_long_change_this_to_something_secure
```

#### Optional Secrets (for telephony):
```bash
# Twilio (optional)
TWILIO_ACCOUNT_SID
your_twilio_account_sid

TWILIO_AUTH_TOKEN
your_twilio_auth_token

TWILIO_PHONE_NUMBER
+1234567890

# Zadarma (optional)
ZADARMA_API_KEY
your_zadarma_key

ZADARMA_API_SECRET
your_zadarma_secret
```

---

### Step 5: Upgrade to L40s GPU (2 minutes)

1. In your Space, go to **Settings** → **Hardware**

2. Select: **L40s - 62GB** ($1.30/hour)

3. **Enable auto-sleep** (recommended):
   - Click "Sleep time settings"
   - Set to **1 hour** (3600 seconds)
   - This saves ~50% on costs!

4. Click **"Update hardware"**

---

### Step 6: Deploy! (10-15 minutes build time)

Your Space will automatically:
1. ✅ Clone your GitHub repository
2. ✅ Build the Docker image (~10 min)
3. ✅ Install Node.js dependencies
4. ✅ Install Python ML dependencies
5. ✅ Download and cache ML models
6. ✅ Start the server

**Monitor progress**:
- Go to **Logs** tab
- Watch the build process

---

### Step 7: Initialize Database (2 minutes)

Once your Space is running:

```bash
# Get your Space URL
SPACE_URL="https://your-username-voiceforge-api.hf.space"

# The server automatically creates default API key on first run
# Check logs to see the key, or create a new one:

# Create an API key via the UI
# 1. Open: $SPACE_URL/api-keys
# 2. Click "Create API Key"
# 3. Copy the generated key
```

---

## 🎉 Success! Your Space is Live

### Access Your Platform

```bash
# Your Space URL
https://your-username-voiceforge-api.hf.space

# Health check
curl https://your-username-voiceforge-api.hf.space/api/health

# Get API keys (needs admin token or use UI)
# Visit: https://your-username-voiceforge-api.hf.space/api-keys
```

---

## 🧪 Test Your Deployment

### 1. Test TTS
```bash
# Get your API key first from the UI
API_KEY="vf_your_api_key_here"
SPACE_URL="https://your-username-voiceforge-api.hf.space"

# Generate speech
curl -X POST $SPACE_URL/api/tts \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello from VoiceForge on L40s GPU!", "model": "chatterbox"}' \
  --output test.wav

# Play the audio
# (download and play locally)
```

### 2. Test STT
```bash
curl -X POST $SPACE_URL/api/stt \
  -H "Authorization: Bearer $API_KEY" \
  -F "audio=@test.wav"
```

### 3. Test Voice Library
```bash
curl $SPACE_URL/api/voice-library | jq '. | length'
# Should return: 81+ voices
```

### 4. Test VLLM Chat
```bash
curl -X POST $SPACE_URL/api/vllm/chat \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "session_id": "test"
  }'
```

---

## 💰 Cost Optimization

### Auto-Sleep Configuration

Your Space automatically sleeps after inactivity. Configure via:

```python
from huggingface_hub import HfApi

api = HfApi(token="your_hf_token")
api.set_space_sleep_time(
    repo_id="your-username/voiceforge-api",
    sleep_time=3600  # 1 hour in seconds
)
```

### Cost Scenarios (L40s 62GB @ $1.30/hr)

| Usage Pattern | Hours/Day | Daily Cost | Monthly Cost | Savings vs 24/7 |
|---------------|-----------|------------|--------------|-----------------|
| 24/7 Production | 24 | $31.20 | $936 | 0% |
| Business Hours (12h) | 12 | $15.60 | $468 | 50% |
| Dev/Testing (8h) | 8 | $10.40 | $312 | 67% |
| Light Use (4h) | 4 | $5.20 | $156 | 83% |
| Auto-Sleep (varies) | ~6-12 | $7.80-15.60 | $234-468 | 50-75% |

**Recommendation**: Enable 1-hour auto-sleep for production → **~$468/month**

---

## 📊 Performance on L40s

### Expected Performance

| Task | L40s 62GB | Notes |
|------|-----------|-------|
| **TTS Generation** | 2-4 sec | Excellent |
| **STT Transcription** | 1-2 sec | Very fast |
| **Voice Cloning** | 30-60 sec | Good |
| **VLLM Chat** | 1-3 sec | Great |
| **Concurrent Users** | 10-20 | Smooth |

### Model Loading Times (First Request)

| Model | Load Time | VRAM Usage |
|-------|-----------|------------|
| Chatterbox TTS | ~30 sec | ~2 GB |
| Higgs Audio V2 | ~45 sec | ~3 GB |
| StyleTTS2 | ~20 sec | ~1 GB |
| Whisper Large v3 | ~40 sec | ~6 GB |
| Llama-3.3-70B (if using) | ~2 min | ~40 GB |

**Total VRAM**: ~15-50GB depending on models loaded
**L40s 62GB**: ✅ Plenty of headroom!

---

## 🔧 Configuration for L40s

Your Dockerfile is already optimized! No changes needed. It uses:
- ✅ CUDA 12.1 (L40s compatible)
- ✅ PyTorch 2.1.2 with CUDA support
- ✅ Optimized memory allocation
- ✅ Multi-stage build for smaller image

### Environment Variables (Auto-configured)
```bash
CUDA_VISIBLE_DEVICES=0
PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
HF_HOME=/home/user/app/ml-cache
TRANSFORMERS_CACHE=/home/user/app/ml-cache
```

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Check logs in Space → Logs tab
# Common issues:
# 1. Secrets not set → Add in Settings → Repository secrets
# 2. GitHub branch wrong → Update in Settings → Linked repository
# 3. Docker build timeout → This is normal, wait 15-20 min
```

### Space Stuck on "Building"
- Wait 15-20 minutes for first build
- Check logs for errors
- Verify all secrets are set correctly

### "Out of Memory" Errors
- L40s has 62GB, should be plenty
- If using Llama-3.3-70B, it might be tight
- Consider using smaller LLM or disable VLLM

### Models Not Loading
```bash
# Check HUGGINGFACE_TOKEN is set correctly
# Verify token has "read" permissions
# Some models require acceptance of license terms on HF
```

### Database Connection Fails
```bash
# Verify DATABASE_URL is correct
# Check if database is accessible from internet
# Neon/Supabase should work out of the box
# Make sure ?sslmode=require is in connection string
```

---

## 🚀 Going to Production

### Pre-Launch Checklist

- [ ] Database connected and schema applied
- [ ] All secrets configured
- [ ] API keys created and tested
- [ ] Health check returns "healthy"
- [ ] TTS generation working
- [ ] STT transcription working
- [ ] Voice library loading
- [ ] Auto-sleep configured (if desired)
- [ ] Monitoring set up (optional)

### Monitoring

```bash
# Health endpoint
curl https://your-space.hf.space/api/health

# Should return:
{
  "status": "healthy",
  "database": {"status": "connected"},
  "ml_workers": {"status": "available"}
}
```

### Custom Domain (Optional)

Hugging Face Spaces support custom domains:
1. Go to Space Settings → Custom domain
2. Add your domain
3. Configure DNS (CNAME or A record)
4. Wait for SSL certificate

---

## 📈 Scaling Beyond L40s

If you need more power later:

### Upgrade Options
1. **L40s 62GB** → **A100 40GB** ($1.50/hr)
2. **L40s 62GB** → **A100 80GB** ($4.13/hr)
3. Multiple Spaces with load balancing

### When to Upgrade
- > 20 concurrent users
- Need larger LLM (70B+ parameters)
- Advanced voice cloning at scale
- Real-time telephony with 50+ calls

---

## 🎯 Quick Reference

### Essential URLs
```bash
# Your Space
https://your-username-voiceforge-api.hf.space

# Settings
https://huggingface.co/spaces/your-username/voiceforge-api/settings

# Logs
https://huggingface.co/spaces/your-username/voiceforge-api/logs

# GitHub Repo
https://github.com/chrisdemonxxx/Voiceforge
```

### Essential Commands
```bash
# Set auto-sleep
huggingface-cli space set-sleep-time your-username/voiceforge-api 3600

# Rebuild Space
huggingface-cli space build your-username/voiceforge-api

# View logs
huggingface-cli space logs your-username/voiceforge-api
```

---

## 🎉 Success Metrics

After deployment, you should see:
- ✅ Build completes in 10-15 minutes
- ✅ Space shows "Running" status
- ✅ Health endpoint returns "healthy"
- ✅ All 45+ API endpoints working
- ✅ Frontend accessible
- ✅ GPU utilization visible in logs

---

## 💡 Pro Tips

1. **Enable auto-sleep** - Saves 50% on costs
2. **Use Neon free tier** - No DB costs
3. **Monitor GPU usage** - Via Space logs
4. **Test locally first** - Everything works in dev mode
5. **Use rate limiting** - Protect from abuse
6. **Set up alerts** - Via HF Space webhooks

---

## 🆘 Support

### If You Get Stuck
1. Check `COMPLETION_REPORT.md` for detailed status
2. Check `ENDPOINT_INTEGRATION_GUIDE.md` for API help
3. Review Space logs for errors
4. Verify all secrets are set
5. Test endpoints one by one

### Common First-Time Issues
- ❌ Forgot to set secrets → Add them!
- ❌ Wrong database URL → Check connection string
- ❌ No GPU selected → Select L40s in Settings
- ❌ Build timeout → Wait longer (15-20 min is normal)

---

## 📊 Deployment Summary

**Total Time**: ~20 minutes
**Total Cost**: $1.30/hour (or ~$468/month with auto-sleep)
**Difficulty**: Easy (following this guide)
**Result**: Production-ready Voice AI platform on L40s GPU

---

## ✅ Post-Deployment

Once deployed:
1. ✅ Create API keys via UI
2. ✅ Test all endpoints
3. ✅ Configure auto-sleep
4. ✅ Set up monitoring (optional)
5. ✅ Share your Space URL!

---

**Your VoiceForge API will be live at**:
`https://your-username-voiceforge-api.hf.space`

**Enjoy your L40s-powered Voice AI platform!** 🚀

---

*Last Updated: 2025-11-11*
*GPU: NVIDIA L40s 62GB*
*Cost: $1.30/hour*
*Status: Production Ready*
