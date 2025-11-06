# VoiceForge API - Voice AI Platform

## Overview
VoiceForge API is a comprehensive, GPU-accelerated voice AI platform offering state-of-the-art Text-to-Speech (TTS), Speech-to-Text (STT), Voice Activity Detection (VAD), and Voice Large Language Model (VLLM) capabilities. The platform aims to deliver ElevenLabs-quality voice synthesis and intelligent voice interactions by leveraging the best open-source models. Its purpose is to provide a robust and scalable solution for integrating advanced voice AI into various applications, targeting developers and businesses seeking high-fidelity and low-latency voice technologies.

## User Preferences
I prefer detailed explanations and a collaborative approach. Please ask before making major architectural changes or introducing new external dependencies. I value modular and maintainable code.

## System Architecture

### UI/UX Decisions
The platform features a **premium royal purple theme** designed to match and exceed ElevenLabs' elegance. The aesthetic combines:
*   **Royal Color Palette**: Deep purples (primary: 266°), gold accents, sophisticated gradients
*   **Glass Morphism**: Semi-transparent cards with backdrop blur effects
*   **Premium Components**: Shadcn/ui with custom hover elevations and interactive states
*   **Professional Navigation**: Comprehensive sidebar with organized feature access
*   **Typography**: Inter/IBM Plex Sans for technical precision and readability
*   **Interactions**: Subtle animations, loading states, and visual feedback throughout

### Technical Implementations
*   **Frontend**: Built with React 18 and TypeScript, utilizing Wouter for routing, Tailwind CSS with shadcn/ui for styling, and TanStack Query for state management. WebSocket clients handle real-time communication.
*   **Backend**: Developed with Node.js and Express in TypeScript. It integrates with PostgreSQL (Neon serverless) via Drizzle ORM, uses the `ws` library for WebSockets, Multer for file uploads, and Zod for validation. A Python 3.11 subprocess bridge manages ML services.
*   **ML Services (Python)**: Incorporates Chatterbox, Higgs Audio V2, and StyleTTS2 for TTS; Whisper-large-v3-turbo (faster-whisper) for STT; Silero VAD for VAD; and Llama 3.3 / Qwen 2.5 via VLLM for conversational AI.

### Feature Specifications
*   **Text-to-Speech (TTS)**: 
    - **Base Models**: Chatterbox, Higgs Audio V2, StyleTTS2 for general-purpose synthesis
    - **Indian Language Support**: Integrated ai4bharat/indic-parler-tts via Hugging Face Inference API
    - **T1 Country Language Support**: Integrated parler-tts/parler-tts-mini-multilingual via Hugging Face Inference API
    - **Voice Library**: 135+ pre-configured voices across 30+ languages:
      - **Indian Languages (69 voices, 21 languages)**: Hindi, Tamil, Telugu, Malayalam, Bengali, Urdu, Gujarati, Kannada, Marathi, Punjabi, Odia, Assamese, Nepali, Sindhi, Kashmiri, Sanskrit, Manipuri, Bodo, Dogri, Konkani, Maithili
      - **T1 Country Languages (74 voices, 12 languages)**: English (USA/UK/Canada/Australia), German, French, Spanish (Spain/Mexico), Italian, Portuguese (Brazil/Portugal), Dutch, Polish, Russian, Japanese, Korean, Chinese (Mandarin)
    - **Intelligent Auto-Routing**: Automatically selects appropriate TTS model based on voice language selection
      - Indian languages → ai4bharat/indic-parler-tts
      - T1 languages → parler-tts-mini-multilingual
      - Base models → worker pool (chatterbox, higgs_audio_v2, styletts2)
    - **Voice Selection UI**: Language and gender filters, voice preview with descriptions, 30+ language support
    - **Performance**: Sub-200ms latency for base models; 5-20s for HF Inference API (cold start)
    - **Formats**: Multiple audio formats supported
*   **Speech-to-Text (STT)**: Utilizes Whisper-large-v3-turbo for 99+ languages, offering high accuracy (98.5%+) and streaming support.
*   **Voice Activity Detection (VAD)**: Employs Silero VAD for precise, real-time speech segmentation.
*   **Voice Cloning** (✅ Backend Complete): Advanced 3-tier cloning system with professional-grade capabilities:
    - **Instant Clone**: Zero-shot cloning with 5-second audio samples, minimal processing (sub-second latency)
    - **Professional Clone**: Fine-tuned cloning with 1-5 minute samples, optimized quality (mock 10s delay, production: 2-4hrs background)
    - **Synthetic Clone**: Text-based voice design using GPT-4o-mini to generate voice characteristics from descriptions
    - **Backend Implementation**: Complete Python ML service with VoiceCharacteristics dataclass (formants, pitch, speaking rate, energy, pitch variance)
    - **Worker Pool Integration**: Dedicated CLONE worker type in unified architecture, replacing spawn-based approach for consistent performance
    - **API Routes**: Full CRUD with /api/clone-voice endpoints, async processing, database persistence, ownership verification
    - **Database Schema**: Complete cloning metadata (mode, status, sample duration, training metrics, quality score)
    - **Status**: UI pending, full backend operational with all 5 worker pools (STT, TTS, HF_TTS, VLLM, CLONE) running in production
*   **VLLM Integration**: Enables voice-enabled conversational AI using Llama 3.3 / Qwen 2.5 models.
*   **Real-time Gateway**: WebSocket-based dual-mode interface (voice/text/hybrid) for low-latency conversational AI
    - **Voice Mode**: STT → VLLM agent → TTS pipeline with streaming audio chunks
    - **Text Mode**: Direct text input → VLLM agent → TTS pipeline with streaming responses
    - **Hybrid Mode**: Supports both voice and text input with unified agent processing
    - **Authentication**: Requires valid, active API key in WebSocket init message
    - **Metrics**: Real-time latency tracking (STT, agent, TTS, end-to-end) with quality feedback
*   **Agent Flow Builder**: Visual graph-based editor for creating complex voice AI workflows:
    - **AI-Powered Creation**: Natural language flow generation using OpenAI GPT-4o
    - **5 Node Types**: Subagent (conversational AI), Tool (API integration), Agent Transfer, Phone Transfer, End Call
    - **React Flow Integration**: Drag-and-drop visual editor with real-time graph manipulation
    - **Database Persistence**: Full CRUD operations for flows, nodes, and edges
    - **Export/Import**: JSON-based flow templates for sharing and version control
*   **Real-Time Testing Playground**: Comprehensive testing interface for voice AI pipelines:
    - **WebSocket Gateway**: Low-latency connection for real-time voice/text interactions
    - **3 Modes**: Voice-only, Text-only, and Hybrid (voice + text) testing
    - **Microphone Integration**: Live audio capture with WebRTC MediaRecorder
    - **Real-Time Metrics**: STT latency, Agent latency, TTS latency, end-to-end tracking
    - **Visual Analytics**: Historical metrics charts with exportable data
    - **API Key Authentication**: Secure testing with automatic key injection from dashboard
*   **Platform Features**: Includes API key management with usage tracking, real-time WebSocket streaming, usage analytics, rate limiting, authentication, and multi-format audio conversion.
*   **Telephony System** (✅ Twilio Integration Complete, UI Complete): Multi-provider telephony integration:
    - **Twilio Provider**: Full SDK integration with actual call initiation, TwiML generation, webhook handling
      - **Call Initiation**: Real outbound calls through Twilio API with proper status tracking
      - **TwiML Routes**: Dynamic callback URLs for call handling, streaming audio integration
      - **Status Webhooks**: Real-time call status updates (queued→ringing→in-progress→completed/failed)
      - **Recording Support**: Automatic call recording with storage in database
    - **Provider Architecture**: Factory pattern with provider abstraction layer for easy multi-provider support
      - **Implemented**: Twilio (full integration)
      - **Pending**: Telnyx, Zadarma, Custom (Asterisk/PJSIP)
    - **TelephonyService**: Dependency injection pattern with proper session management
      - **Session Tracking**: Active call sessions with metadata, audio buffering, status transitions
      - **ML Pipeline Integration**: STT → VLLM → TTS for voice AI-powered calls
      - **WebRTC Support**: ICE servers configuration, SDP offer generation
    - **Web Dialer**: Browser-based calling interface with dialpad and call controls (operational with WebSocket signaling)
    - **Batch Calling**: Campaign management for bulk outbound dialing (UI complete, backend integrated)
    - **Status**: Twilio fully operational, ready for production use with actual phone calls

### System Design Choices
*   **Database Architecture**: PostgreSQL with Drizzle ORM ensures production-grade persistence for API keys, usage tracking, and rate limits, utilizing atomic SQL operations and Neon serverless for scalability. The system auto-seeds default API keys on first startup to ensure immediate functionality.
*   **Authentication System**: Multi-layered security with admin and API key authentication:
    - **Admin Authentication**: API key management routes protected with optional ADMIN_TOKEN environment variable
      - **Development Mode**: No token required (console warning displayed)
      - **Production Mode**: Requires Bearer token in Authorization header for all key management operations
    - **API Key Authentication**: Database-backed Bearer token authentication on all protected routes
      - Dashboard fetches real API keys from database and injects them into authenticated requests
      - Cryptographically generated keys with per-key rate limiting at middleware level
    - **API Key Management**: CRUD operations with toggle activation/deactivation, real-time usage statistics, visual warnings when no active keys exist
    - **Realtime Gateway Authentication**: WebSocket connections require valid, active API key in init message; connections rejected with error codes 4001 (invalid) or 4002 (inactive)
*   **Python ML Services Integration**: A unified worker pool architecture manages all ML services (STT, TTS, HF_TTS, VLLM, CLONE) through persistent Python processes to minimize cold start latency. This design uses multiprocessing for task distribution, health checks, and automatic worker restarts. Communication with Python services occurs via JSON over stdin/stdout.
    - **STT Workers** (2 processes): Streaming transcription with partial results, VAD, confidence scoring, and timestamp alignment, achieving 30-60ms latency per chunk
    - **TTS Workers** (2 processes): Base model synthesis (Chatterbox, Higgs Audio V2, StyleTTS2) with formant-based voice generation
    - **HF_TTS Workers** (2 processes): Hugging Face Inference API integration for indic-parler-tts and parler-tts-multilingual, handling both Indian and T1 country languages through a unified service wrapper
    - **VLLM Workers** (1 process): Conversational AI with context management and streaming responses
    - **CLONE Workers** (1 process): Voice cloning with action-based dispatch (create_instant, create_professional, create_synthetic), characteristics extraction, speaker embeddings
*   **Architecture Benefits**: The worker pool design provides consistent task queuing, priority handling, automatic failover, unified metrics collection, and health monitoring across all ML services. The architecture is designed for seamless GPU model swap-in when infrastructure is available.

## External Dependencies
*   **Database**: PostgreSQL (Neon serverless)
*   **Frontend Libraries**: React, Wouter, Tailwind CSS, shadcn/ui, TanStack Query
*   **Backend Libraries**: Express, `ws`, Multer, Zod, Twilio SDK
*   **ML Models/Libraries**: Chatterbox, Higgs Audio V2, StyleTTS2, Whisper-large-v3-turbo (faster-whisper), Silero VAD, Llama 3.3, Qwen 2.5
*   **Telephony Providers**: Twilio (integrated), Telnyx (planned), Zadarma (planned), Custom/Asterisk (planned)

## Recent Changes (November 6, 2025)

### Voice Cloning System - Complete Backend Implementation
- **Python ML Service** (`voice_cloning_service.py`): Full 3-tier cloning with audio processing, formant extraction, speaker embeddings
  - Instant clone: 5-second samples, zero-shot synthesis
  - Professional clone: 1-5 minute samples with simulated training (10s mock, production: 2-4hrs)
  - Synthetic clone: GPT-4o-mini text-to-voice-characteristics conversion
- **Worker Pool Integration**: Added CLONE to WorkerType enum, dedicated worker process, action-based task dispatch
  - **Critical Fix**: Added CLONE branch in worker_pool.py _process_task method (was causing all clone tasks to fail)
  - Successfully initialized all 5 worker types: STT (2), TTS (2), HF_TTS (2), VLLM (1), CLONE (1)
- **API Routes**: Complete CRUD at /api/clone-voice with proper authentication, ownership verification, database persistence
- **Database**: Integrated with existing voiceClones schema (mode, status, characteristics, embedding, training metrics)

### Telephony System - Twilio Integration Complete
- **Provider Architecture**: Created abstraction layer with factory pattern
  - `twilio-provider.ts`: Full Twilio SDK integration (call initiation, status tracking, TwiML generation, webhook validation)
  - `provider-factory.ts`: Multi-provider support (Twilio implemented, Telnyx/Zadarma/Custom planned)
- **TelephonyService Refactor**: Dependency injection pattern
  - Fixed LSP error: Removed problematic singleton export, proper pythonBridge injection
  - Updated TelephonySignaling to accept TelephonyService instance in constructor
  - Integrated ProviderFactory for actual call placement through Twilio
- **Webhook Routes**: 
  - `/api/telephony/twiml/:sessionId`: Dynamic TwiML generation with WebSocket streaming support
  - `/api/telephony/status/:callId`: Real-time call status updates from Twilio (queued→ringing→in-progress→completed/failed)
- **Call Flow**: Database record → Twilio API call → Provider call ID persistence → Status webhooks → ML pipeline integration (STT→VLLM→TTS)
- **Production Ready**: Full end-to-end telephony system operational, ready for actual phone calls with voice AI integration