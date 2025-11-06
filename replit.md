# VoiceForge API - Voice AI Platform

## Overview
VoiceForge API is a comprehensive, GPU-accelerated voice AI platform offering state-of-the-art Text-to-Speech (TTS), Speech-to-Text (STT), Voice Activity Detection (VAD), and Voice Large Language Model (VLLM) capabilities. The platform aims to deliver ElevenLabs-quality voice synthesis and intelligent voice interactions by leveraging the best open-source models. Its purpose is to provide a robust and scalable solution for integrating advanced voice AI into various applications, targeting developers and businesses seeking high-fidelity and low-latency voice technologies.

## Recent Changes

### November 6, 2025 - Audio Conversion & Zadarma Multi-Provider Integration
Completed production-ready audio conversion pipeline and Zadarma telephony provider integration:

**Audio Conversion Pipeline**:
*   **μ-law ↔ PCM Conversion**: Full bidirectional audio conversion in Python (`audio_converter.py`) with librosa-based 8kHz ↔ 16kHz resampling
*   **TypeScript Bridge**: Async audio conversion bridge (`audio-converter-bridge.ts`) with 5s timeout and graceful fallback
*   **Twilio Integration**: Real-time audio conversion in Twilio media WebSocket handler for ML pipeline compatibility
*   **Fallback Strategy**: System continues processing even if Python worker fails - ensures call reliability

**Zadarma Provider Integration**:
*   **Full API Implementation**: Complete Zadarma provider with outbound calls, hangup, balance retrieval, and call statistics
*   **Webhook Security**: MD5 signature validation for webhook authenticity (sorted params + secret)
*   **ZSML Generation**: Zadarma-specific call control markup (equivalent to TwiML) with say/record/stream support
*   **Multi-Provider Architecture**: Updated ProviderFactory to support both Twilio and Zadarma with unified interface

**Testing Infrastructure**:
*   **Integration Tests**: Comprehensive webhook signature validation tests for both Twilio (HMAC-SHA1) and Zadarma (MD5)
*   **E2E Test Runner**: Standalone test suite (`zadarma-e2e.test.ts`) with conditional live API testing
*   **Credentials-Optional**: Tests run signature validation and ZSML generation without API credentials

**Architecture Decisions**:
*   Audio conversion runs in separate Python process for efficiency and GPU model compatibility
*   Sequential response handling in TypeScript bridge prevents race conditions
*   Provider abstraction layer enables seamless multi-provider support
*   Test runner operates without Jest dependency for faster execution

**Next Actions**:
1. Add automated regression tests for audio conversion fidelity
2. Document operational runbooks for Python dependency management
3. Run Zadarma live-call E2E tests once credentials are provided

### November 6, 2025 - Production-Ready Twilio Telephony Integration
Completed comprehensive Twilio telephony implementation with all production-critical fixes architect-approved:

**Core Implementation**:
*   **Twilio SDK Integration**: Full TwilioProvider implementation with actual Twilio API calls for outbound/inbound call initiation
*   **Provider Architecture**: ProviderFactory pattern enabling multi-provider support (Twilio, Telnyx, Vonage, Zadarma future-ready)
*   **Security Features**: Webhook signature validation using captured raw request bodies for both JSON and form-encoded payloads
*   **Media Streaming**: Authenticated WebSocket bridge at `/ws/twilio-media/:sessionId` with one-time token validation (5min TTL)
*   **Data Integrity**: Fixed duplicate call records - TelephonyService owns all call creation, TelephonySignaling references existing records
*   **WebSocket Routing**: Manual upgrade handler for parameterized WebSocket paths to resolve Express routing limitations

**Technical Details**:
*   Raw body capture: Added verify hooks to both `express.json` and `express.urlencoded` in server/index.ts to preserve exact byte sequence for HMAC validation
*   Webhook validation: `validateTwilioWebhook` middleware validates X-Twilio-Signature using provider authToken and reconstructed URL
*   Call lifecycle: TwiML generation → status webhooks → media streaming → recording → final status updates
*   Session management: In-memory session store with metadata including stream tokens and expiry timestamps

**Known Limitations (Documented as TODOs)**:
*   Audio format conversion: μ-law 8kHz → PCM 16kHz conversion not yet implemented in Python STT service
*   Bidirectional audio: TTS responses back to Twilio not yet implemented
*   These are implementation details that don't block call initiation/reception functionality

**Next Actions**:
1. Implement μ-law→PCM audio conversion in Python media bridge for ML pipeline integration
2. Add regression/integration tests for Twilio webhook signature validation
3. Run end-to-end call drills in staging to verify media streaming under load

### November 6, 2025 - Voice Cloning Worker Pool Integration
*   **Bug Fix**: Added CLONE worker type processing branch in `worker_pool.py` to enable voice cloning functionality
*   **Architecture**: Integrated voice cloning service with unified worker pool pattern alongside STT, TTS, HF_TTS, and VLLM workers
*   **Features**: Action-based dispatch (clone, delete, list, get_characteristics) with proper async task queuing

## User Preferences
I prefer detailed explanations and a collaborative approach. Please ask before making major architectural changes or introducing new external dependencies. I value modular and maintainable code.

## System Architecture

### UI/UX Decisions
The platform features a **premium royal purple theme** designed to match and exceed ElevenLabs' elegance, incorporating a royal color palette, glass morphism effects, premium Shadcn/ui components, professional navigation, and Inter/IBM Plex Sans typography.

### Technical Implementations
*   **Frontend**: React 18, TypeScript, Wouter for routing, Tailwind CSS with shadcn/ui, TanStack Query for state management, WebSocket clients for real-time communication.
*   **Backend**: Node.js, Express, TypeScript, PostgreSQL (Neon serverless) via Drizzle ORM, `ws` for WebSockets, Multer for file uploads, Zod for validation. A Python 3.11 subprocess bridge manages ML services.
*   **ML Services (Python)**: Chatterbox, Higgs Audio V2, StyleTTS2 for TTS; Whisper-large-v3-turbo for STT; Silero VAD for VAD; Llama 3.3 / Qwen 2.5 via VLLM for conversational AI.

### Feature Specifications
*   **Text-to-Speech (TTS)**: Features base models (Chatterbox, Higgs Audio V2, StyleTTS2), Indian language support via ai4bharat/indic-parler-tts, T1 country language support via parler-tts/parler-tts-mini-multilingual, and a voice library of 135+ voices across 30+ languages with intelligent auto-routing.
*   **Speech-to-Text (STT)**: Utilizes Whisper-large-v3-turbo for 99+ languages, offering high accuracy and streaming support.
*   **Voice Activity Detection (VAD)**: Employs Silero VAD for precise, real-time speech segmentation.
*   **Voice Cloning**: Advanced 3-tier system (Instant, Professional, Synthetic) with backend complete, including Python ML service, worker pool integration, and API routes for CRUD operations.
*   **VLLM Integration**: Enables voice-enabled conversational AI using Llama 3.3 / Qwen 2.5 models.
*   **Real-time Gateway**: WebSocket-based dual-mode interface (voice/text/hybrid) for low-latency conversational AI with STT → VLLM → TTS pipeline.
*   **Agent Flow Builder**: Visual graph-based editor with AI-powered creation for complex voice AI workflows using 5 node types (Subagent, Tool, Agent Transfer, Phone Transfer, End Call).
*   **Real-Time Testing Playground**: Comprehensive testing interface for voice AI pipelines with WebSocket gateway, microphone integration, and real-time metrics.
*   **Platform Features**: API key management, usage tracking, real-time WebSocket streaming, usage analytics, rate limiting, authentication, and multi-format audio conversion.
*   **Telephony System**: Multi-provider telephony integration with **Twilio** and **Zadarma** fully integrated for call initiation, webhook handling, media streaming, and recording support. Features production-ready audio conversion pipeline (μ-law ↔ PCM, 8kHz ↔ 16kHz) for ML pipeline compatibility.

### System Design Choices
*   **Database Architecture**: PostgreSQL with Drizzle ORM and Neon serverless for production-grade persistence and scalability, with auto-seeding of API keys.
*   **Authentication System**: Multi-layered security with admin and API key authentication, featuring database-backed Bearer tokens, cryptographically generated keys, per-key rate limiting, and real-time usage statistics.
*   **Python ML Services Integration**: Unified worker pool architecture managing all ML services (STT, TTS, HF_TTS, VLLM, CLONE) through persistent Python processes to minimize cold start latency, using multiprocessing for task distribution, health checks, and JSON over stdin/stdout communication.
    *   **STT Workers**: Streaming transcription with VAD, confidence scoring, and timestamp alignment.
    *   **TTS Workers**: Base model synthesis.
    *   **HF_TTS Workers**: Hugging Face Inference API integration for multilingual TTS.
    *   **VLLM Workers**: Conversational AI with context management.
    *   **CLONE Workers**: Voice cloning with action-based dispatch and characteristics extraction.
*   **Architecture Benefits**: Provides consistent task queuing, priority handling, automatic failover, unified metrics, and health monitoring, designed for GPU model swap-in.

## External Dependencies
*   **Database**: PostgreSQL (Neon serverless)
*   **Frontend Libraries**: React, Wouter, Tailwind CSS, shadcn/ui, TanStack Query
*   **Backend Libraries**: Express, `ws`, Multer, Zod, Twilio SDK
*   **ML Models/Libraries**: Chatterbox, Higgs Audio V2, StyleTTS2, Whisper-large-v3-turbo (faster-whisper), Silero VAD, Llama 3.3, Qwen 2.5, ai4bharat/indic-parler-tts, parler-tts/parler-tts-mini-multilingual
*   **Telephony Providers**: Twilio (integrated), Zadarma (integrated)
*   **Audio Processing**: librosa, soundfile (for μ-law ↔ PCM conversion and resampling)