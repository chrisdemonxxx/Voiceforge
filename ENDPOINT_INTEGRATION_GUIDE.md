# VoiceForge API Integration Guide

## Frontend ↔ Backend Wiring Status

### ✅ FULLY WIRED & WORKING

#### 1. Home Page (`/`)
**Endpoint**: `POST /api/tts`
**Status**: ✅ Working
**Implementation**: `client/src/pages/home.tsx:58-96`
```typescript
const response = await fetch("/api/tts", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer vf_demo_public_key_for_landing_page",
  },
  body: JSON.stringify({
    text: demoText,
    model: selectedModel,
    format: "wav",
    speed: 1.0,
  }),
});
```
**Issues**: None when database is connected, demo key needs to exist

---

#### 2. Dashboard (`/dashboard`)
**Endpoints Used**:
- `GET /api/keys` - ✅ List API keys
- `POST /api/keys` - ✅ Create API key
- `DELETE /api/keys/:id` - ✅ Delete API key
- `POST /api/tts` - ✅ Generate speech
- `GET /api/usage` - ✅ Get usage stats
- `POST /api/clone-voice` - ✅ Clone voice

**Status**: 🟡 Partially working (requires database)
**Implementation**: `client/src/pages/dashboard.tsx`

**Known Issues**:
1. Database disconnected → API key endpoints fail
2. No fallback for development mode
3. Voice cloning requires numpy (ML dependency)

---

### 🟡 PARTIALLY WIRED / NEEDS DATABASE

#### 3. Voice Library (`/voice-library`)
**Endpoints**:
- `GET /api/voice-library` - ✅ Get voice metadata
- `GET /api/cloned-voices` - 🟡 Requires database

**Status**: 🟡 Metadata works, cloned voices need DB
**File**: `client/src/pages/voice-library.tsx`

---

#### 4. Clone Voice (`/clone-voice`)
**Endpoint**: `POST /api/clone-voice`
**Status**: 🟡 API works but requires database + numpy
**File**: `client/src/pages/clone-voice.tsx`

**Requirements**:
- Database connection for persistence
- Python numpy package installed
- Reference audio file (5s minimum)

---

#### 5. Agent Flows (`/agent-flows`, `/agent-flows/create`, `/agent-flows/builder/:id`)
**Endpoints**:
- `GET /api/agent-flows` - 🟡 Requires database
- `POST /api/agent-flows` - 🟡 Requires database
- `POST /api/agent-flows/generate` - ✅ AI generation works
- `GET /api/agent-flows/:id/nodes` - 🟡 Requires database
- `POST /api/agent-flows/:id/nodes` - 🟡 Requires database

**Status**: 🟡 AI generation works, persistence requires DB
**Files**:
- `client/src/pages/agent-flows.tsx`
- `client/src/pages/agent-flows-create.tsx`
- `client/src/pages/agent-flow-builder.tsx`

---

#### 6. Telephony (`/telephony/dialer`, `/telephony/batch`, `/telephony/providers`)
**Endpoints**:
- `GET /api/telephony/providers` - 🟡 Requires database
- `POST /api/telephony/providers` - 🟡 Requires database
- `POST /api/telephony/calls` - 🟡 Requires provider credentials
- `GET /api/telephony/campaigns` - 🟡 Requires database

**Status**: 🟡 All require database + Twilio/Zadarma credentials
**Files**:
- `client/src/pages/telephony-dialer.tsx`
- `client/src/pages/telephony-batch.tsx`
- `client/src/pages/telephony-providers.tsx`

**Requirements**:
- Database connection
- Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
- OR Zadarma credentials (ZADARMA_API_KEY, ZADARMA_API_SECRET)

---

#### 7. API Keys (`/api-keys`)
**Endpoints**:
- `GET /api/keys` - 🟡 Requires database
- `POST /api/keys` - 🟡 Requires database
- `PATCH /api/keys/:id` - 🟡 Requires database
- `DELETE /api/keys/:id` - 🟡 Requires database

**Status**: 🟡 All require database
**File**: `client/src/pages/api-keys.tsx`

---

#### 8. Usage Stats (`/usage`)
**Endpoint**: `GET /api/usage`
**Status**: 🟡 Requires database + active API key
**File**: `client/src/pages/usage.tsx`

---

### ⚠️ NEEDS IMPLEMENTATION

#### 9. Real-Time Lab (`/realtime`)
**Endpoints**:
- WebSocket `/ws` - ✅ Backend implemented
- `GET /api/realtime/metrics` - ✅ Backend implemented

**Status**: ⚠️ Frontend partially implemented
**File**: `client/src/pages/realtime-lab.tsx`

**What's Missing**:
- Microphone input handling
- WebSocket message protocol
- Audio playback for responses
- Session management

---

#### 10. Voice Design (`/voice-design`)
**Status**: ⚠️ UI only, no backend integration
**File**: `client/src/pages/voice-design.tsx`

**What's Needed**:
- Integrate with voice cloning API
- Add synthetic voice generation
- Connect to TTS for preview

---

### 🔴 NOT WIRED

#### 11. Playground Console (`/playground/console`)
**Status**: 🔴 Minimal implementation
**File**: `client/src/pages/playground-console.tsx`

---

## Quick Fix Guide

### Problem: Database Connection Refused

**Error**: `connect ECONNREFUSED 127.0.0.1:443`

**Solution Options**:

1. **Use Remote Database** (Recommended):
```bash
# Get free PostgreSQL from Neon.tech
# Update .env:
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/voiceforge?sslmode=require
```

2. **Use Local Docker PostgreSQL**:
```bash
docker run --name voiceforge-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=voiceforge \
  -p 5432:5432 \
  -d postgres:15

# Update .env:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/voiceforge
```

3. **Add Development Mode Bypass**:
Create mock storage layer that returns empty data when DB unavailable.

---

### Problem: Voice Cloning Fails

**Error**: `No module named 'numpy'`

**Solution**:
```bash
# Install Python ML dependencies
pip install numpy torch transformers faster-whisper silero-vad

# Or use pyproject.toml
pip install -e .
```

---

### Problem: No API Keys Available

**Error**: Dashboard shows "No active API key found"

**Solution**:
1. Ensure database is connected
2. Server automatically creates default key on startup
3. Manually create via `/api-keys` page
4. Or use API:
```bash
curl -X POST http://localhost:5000/api/keys \
  -H "Content-Type: application/json" \
  -d '{"name": "My API Key", "rateLimit": 1000}'
```

---

## Testing Each Feature

### 1. Test TTS
```bash
# Get an API key first
API_KEY="your_api_key_here"

# Generate speech
curl -X POST http://localhost:5000/api/tts \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello from VoiceForge",
    "model": "chatterbox",
    "format": "wav"
  }' \
  --output test.wav
```

### 2. Test STT
```bash
curl -X POST http://localhost:5000/api/stt \
  -H "Authorization: Bearer $API_KEY" \
  -F "audio=@test.wav"
```

### 3. Test Voice Cloning
```bash
curl -X POST http://localhost:5000/api/clone-voice \
  -H "Authorization: Bearer $API_KEY" \
  -F "reference=@reference.wav" \
  -F "name=My Clone" \
  -F "model=chatterbox" \
  -F "tier=instant"
```

### 4. Test VLLM Chat
```bash
curl -X POST http://localhost:5000/api/vllm/chat \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "session_id": "test-session"
  }'
```

---

## Frontend Component Status

### Shared Components

| Component | Location | Status | Usage |
|-----------|----------|--------|-------|
| AppSidebar | `client/src/components/app-sidebar.tsx` | ✅ Working | All pages |
| AudioPlayer | `client/src/components/audio-player.tsx` | ✅ Working | TTS demos |
| ModelCard | `client/src/components/model-card.tsx` | ✅ Working | Model selection |
| VoiceSelector | `client/src/components/voice-selector.tsx` | ✅ Working | Voice selection |
| CodeBlock | `client/src/components/code-block.tsx` | ✅ Working | API examples |
| Navbar | `client/src/components/navbar.tsx` | ✅ Working | Home page |

### UI Components (shadcn/ui)

All UI components from shadcn/ui are properly installed and working:
- ✅ Button, Card, Input, Textarea, Select
- ✅ Dialog, Dropdown, Tabs, Badge
- ✅ Toast, Tooltip, Accordion
- ✅ And 30+ more...

---

## Development Workflow

### Starting the App

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.production.example .env
# Edit .env with your settings

# 3. Start dev server
npm run dev

# 4. Open browser
open http://localhost:5000
```

### With Database

```bash
# 1. Start PostgreSQL (Docker)
docker-compose up -d postgres  # if you have docker-compose.yml

# 2. Push schema
npm run db:push

# 3. Start dev server
npm run dev
```

---

## Production Deployment

### Environment Variables Required

**Essential**:
- `DATABASE_URL` - PostgreSQL connection string
- `HUGGINGFACE_TOKEN` - For TTS models
- `SESSION_SECRET` - For sessions

**Optional**:
- `ADMIN_TOKEN` - Protect API key management
- `OPENAI_API_KEY` - VLLM fallback
- `TWILIO_ACCOUNT_SID` - Telephony
- `TWILIO_AUTH_TOKEN` - Telephony
- `ZADARMA_API_KEY` - Alternative telephony
- `ZADARMA_API_SECRET` - Alternative telephony

---

## Common Issues & Solutions

### 1. Vite HMR Not Working
**Symptom**: Changes don't reflect in browser
**Solution**: Check Vite dev server logs, restart if needed

### 2. API Returns 401 Unauthorized
**Symptom**: All API calls fail with 401
**Solution**: Ensure you're sending `Authorization: Bearer <api-key>` header

### 3. Rate Limit Exceeded
**Symptom**: API returns 429
**Solution**: Wait for rate limit reset or increase limit in database

### 4. CORS Errors
**Symptom**: Browser blocks requests
**Solution**: Should not happen in development (same origin), check production setup

### 5. WebSocket Connection Fails
**Symptom**: Real-time features don't work
**Solution**: Check WebSocket server initialization in logs

---

## Performance Optimization

### Frontend
- ✅ React Query for caching
- ✅ Code splitting with dynamic imports
- ✅ Image optimization
- ⚠️ Add service worker for offline support

### Backend
- ✅ Python worker pools for ML services
- ✅ Connection pooling for database
- ✅ Rate limiting per API key
- ⚠️ Add Redis for caching

---

## Security Checklist

- ✅ API key authentication on all endpoints
- ✅ Rate limiting implemented
- ✅ SQL injection protection (Drizzle ORM)
- ✅ XSS protection (React default)
- ⚠️ Add CSRF protection for mutations
- ⚠️ Add request size limits
- ⚠️ Add API key rotation
- ⚠️ Add audit logging

---

## Next Steps

1. **Immediate**: Fix database connection for local dev
2. **Short-term**: Add development mode with mock data
3. **Medium-term**: Complete WebSocket integration
4. **Long-term**: Add comprehensive error handling
5. **Polish**: Enhance UI with animations and transitions

---

**Last Updated**: 2025-11-11
**Status**: Development Environment Analysis Complete
