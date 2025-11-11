# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VoiceForge is a production-ready GPU-accelerated Voice AI platform providing Text-to-Speech (TTS), Speech-to-Text (STT), Voice Activity Detection (VAD), Voice Cloning, Voice LLM, and Telephony integration. It's designed for deployment on Hugging Face Spaces with 80GB A100 GPU.

## Development Commands

### Local Development
```bash
npm run dev              # Start dev server (Node + Vite HMR) on port 5000
npm run build            # Build frontend (Vite) + backend (esbuild)
npm start                # Run production build
npm run check            # TypeScript type checking
```

### Database Management
```bash
npm run db:push          # Push schema changes to database (uses Drizzle Kit)
# Database config in drizzle.config.ts
# Requires DATABASE_URL environment variable
```

### Environment Setup
- Copy `.env.production.example` to `.env` for local development
- Required: `DATABASE_URL`, `HUGGINGFACE_TOKEN`, `SESSION_SECRET`
- Optional: Twilio and Zadarma credentials for telephony features

## Architecture Overview

### Hybrid Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend API**: Node.js + Express + TypeScript
- **ML Services**: Python 3.11 worker processes
- **Database**: PostgreSQL (Neon serverless) via Drizzle ORM
- **Real-time**: WebSocket gateway for voice/text/hybrid interactions
- **Deployment**: Docker multi-stage build targeting CUDA 12.1 runtime

### Key Architectural Patterns

#### 1. Python-Node.js Bridge (`server/python-bridge.ts`)
Node.js spawns persistent Python worker processes for ML inference. Communication via JSON-RPC over stdin/stdout:
- Minimizes cold start latency by keeping models loaded
- Worker pool management with health checks and failover
- Handles TTS, STT, VAD, VLLM, and voice cloning services
- Each ML service in `server/ml-services/` is a standalone Python module

#### 2. ML Worker Pool (`server/ml-services/worker_pool.py`)
Unified Python worker pool that:
- Loads models on-demand with caching
- Manages GPU memory across multiple models
- Provides priority-based task queuing
- Auto-recovery from worker failures

#### 3. Real-time Gateway (`server/realtime-gateway.ts`)
WebSocket-based conversational pipeline:
- Dual-mode: voice-only, text-only, or hybrid
- STT → VLLM → TTS pipeline orchestration
- Streaming audio chunks with low latency
- Session management with context memory

#### 4. Telephony System
Multi-provider support:
- **Twilio**: WebRTC integration via `server/services/telephony-service.ts`
- **Zadarma**: REST API + SIP protocol via `server/telephony-signaling.ts`
- Audio format conversion (μ-law ↔ PCM, 8kHz ↔ 16kHz)
- Call state management and webhook handling

#### 5. Database Schema (`shared/schema.ts`)
- **api_keys**: Authentication tokens with rate limiting
- **cloned_voices**: Voice cloning jobs (instant/professional/synthetic tiers)
- **agent_flows**: Visual flow builder configurations
- **flow_nodes**: Nodes and edges for agent workflows
- **telephony_providers**: Twilio/Zadarma credential management
- **voice_llm_sessions**: Conversation memory for VLLM

### Directory Structure

```
client/src/
├── pages/           # Route pages (dashboard, playground, telephony, etc.)
├── components/      # Reusable React components + shadcn/ui
├── hooks/          # Custom React hooks
└── lib/            # Client utilities

server/
├── index.ts            # Express server entry point
├── routes.ts           # Main API route definitions
├── routes/             # Modular route handlers
├── python-bridge.ts    # Python worker process manager
├── realtime-gateway.ts # WebSocket server for voice/text
├── telephony-signaling.ts # Zadarma SIP integration
├── services/           # Business logic layer
├── ml-services/        # Python ML inference services
│   ├── worker_pool.py          # ML model orchestrator
│   ├── tts_service.py          # Base TTS service
│   ├── tts_streaming.py        # Streaming TTS
│   ├── stt_service.py          # Whisper STT
│   ├── vad_service.py          # Silero VAD
│   ├── vllm_service.py         # Llama/Qwen LLM
│   ├── voice_cloning_service.py # Voice clone processing
│   └── audio_converter.py      # Audio format conversions
└── storage.ts          # File storage utilities

shared/
├── schema.ts       # Drizzle ORM schema + Zod validation
└── voices.ts       # Voice metadata (135+ voices, 30+ languages)

db/
├── index.ts        # Database connection
└── seed.ts         # Database seeding

migrations/         # Drizzle ORM migrations
```

## Important Technical Details

### Model Loading
- Models are lazy-loaded on first use to optimize startup time
- GPU models cached in VRAM between requests
- Fallback to CPU if CUDA unavailable
- Model configuration in `server/ml-services/production-config.ts`

### Voice Cloning Tiers
1. **Instant**: Zero-shot cloning from 5s audio sample
2. **Professional**: Fine-tuned model with 1-5min reference audio
3. **Synthetic**: AI-generated voice from text description

### API Authentication
All `/api/*` endpoints require `Authorization: Bearer <api-key>` header. API keys managed in database with per-key rate limiting.

### WebSocket Gateway Protocol
Connect to `/ws` with session management:
- Text mode: Send JSON with `{type: "message", content: "..."}`
- Voice mode: Send binary audio chunks
- Hybrid mode: Interleave text and audio
- Responses include metrics (latency, model info)

### Telephony Integration
- Twilio uses WebRTC for audio streaming
- Zadarma uses SIP registration + μ-law audio over RTP
- Both integrate with TTS/STT pipeline for conversational AI
- Call state persisted in database with webhook callbacks

## Development Workflow

### Adding New ML Models
1. Create service in `server/ml-services/<model>_service.py`
2. Register in `server/ml-services/worker_pool.py`
3. Add TypeScript types in `server/python-bridge.ts`
4. Expose via API route in `server/routes.ts`

### Database Schema Changes
1. Modify `shared/schema.ts`
2. Run `npm run db:push` to apply changes
3. Drizzle Kit auto-generates migrations in `migrations/`

### Adding New Pages
1. Create component in `client/src/pages/<name>.tsx`
2. Add route in `client/src/App.tsx` using Wouter
3. Update sidebar in `client/src/components/app-sidebar.tsx`

## Deployment

Built for Hugging Face Spaces with Docker SDK:
- `Dockerfile` uses NVIDIA CUDA 12.1.0 base image
- Multi-stage build: npm install → build → Python setup
- Exposes port 7860 (remapped from internal 5000)
- Secrets configured in HF Space settings
- Auto-sleep to reduce GPU costs (configurable)

See `README-DEPLOYMENT.md` for complete deployment guide.

## Testing

Test files located in:
- `server/__tests__/` - Integration tests for telephony, SIP, Zadarma
- Run tests via Node.js test runner or directly with `tsx`

## Key Dependencies

### Frontend
- React 18, Wouter (routing), TanStack Query (state)
- Tailwind CSS, shadcn/ui (components)
- ReactFlow (visual flow builder)

### Backend (Node.js)
- Express, ws (WebSocket), Drizzle ORM
- Twilio SDK, SIP protocol library
- Multer (file uploads), Zod (validation)

### Backend (Python)
- PyTorch 2.1.2 + CUDA 12.1
- Transformers 4.36.2 (Hugging Face models)
- vLLM 0.2.7 (LLM inference)
- faster-whisper (STT), Silero VAD

## Performance Considerations

- Models stay loaded in GPU memory between requests
- WebSocket connections pooled for real-time features
- Database queries use connection pooling (Neon serverless)
- Audio streaming with chunked responses for low latency
- Rate limiting per API key to prevent abuse
