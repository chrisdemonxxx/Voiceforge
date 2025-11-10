# VoiceForge API - Voice AI Platform

## Overview
VoiceForge API is a GPU-accelerated voice AI platform providing state-of-the-art Text-to-Speech (TTS), Speech-to-Text (STT), Voice Activity Detection (VAD), and Voice Large Language Model (VLLM) capabilities. The platform aims to deliver ElevenLabs-quality voice synthesis and intelligent voice interactions using leading open-source models. Its purpose is to offer a robust and scalable solution for integrating advanced voice AI into diverse applications, targeting developers and businesses requiring high-fidelity and low-latency voice technologies. The platform is production-ready for Hugging Face Spaces with 80GB A100 GPU.

## User Preferences
I prefer detailed explanations and a collaborative approach. Please ask before making major architectural changes or introducing new external dependencies. I value modular and maintainable code.

## System Architecture

### UI/UX Decisions
The platform features a premium royal purple theme, designed to match and exceed ElevenLabs' elegance, incorporating a royal color palette, glass morphism effects, premium Shadcn/ui components, professional navigation, and Inter/IBM Plex Sans typography.

### Technical Implementations
*   **Frontend**: React 18, TypeScript, Wouter for routing, Tailwind CSS with shadcn/ui, TanStack Query for state management, WebSocket clients for real-time communication.
*   **Backend**: Node.js, Express, TypeScript, PostgreSQL (Neon serverless) via Drizzle ORM, `ws` for WebSockets, Multer for file uploads, Zod for validation. A Python 3.10 subprocess bridge manages ML services.
*   **ML Services (Python 3.10)**: Chatterbox, Higgs Audio V2, StyleTTS2 for TTS; Whisper-large-v3-turbo for STT; Silero VAD for VAD; Llama 3.3 / Qwen 2.5 via VLLM for conversational AI.

### Feature Specifications
*   **Text-to-Speech (TTS)**: Includes base models (Chatterbox, Higgs Audio V2, StyleTTS2), Indian and T1 country language support, and a voice library of 135+ voices across 30+ languages with intelligent auto-routing.
*   **Speech-to-Text (STT)**: Utilizes Whisper-large-v3-turbo for 99+ languages, offering high accuracy and streaming support.
*   **Voice Activity Detection (VAD)**: Employs Silero VAD for precise, real-time speech segmentation.
*   **Voice Cloning**: Advanced 3-tier system (Instant, Professional, Synthetic) with backend implementation including Python ML service, worker pool integration, and API routes.
*   **VLLM Integration**: Enables voice-enabled conversational AI using Llama 3.3 / Qwen 2.5 models.
*   **Real-time Gateway**: WebSocket-based dual-mode interface (voice/text/hybrid) for low-latency conversational AI with STT → VLLM → TTS pipeline.
*   **Agent Flow Builder**: Visual graph-based editor with AI-powered creation for complex voice AI workflows.
*   **Real-Time Testing Playground**: Comprehensive testing interface for voice AI pipelines with WebSocket gateway, microphone integration, and real-time metrics.
*   **Platform Features**: API key management, usage tracking, real-time WebSocket streaming, usage analytics, rate limiting, authentication, and multi-format audio conversion.
*   **Telephony System**: Multi-provider telephony integration with Twilio and Zadarma (via REST API and full SIP protocol support) for call initiation, webhook handling, media streaming, recording, and production-ready audio conversion.

### System Design Choices
*   **Database Architecture**: PostgreSQL with Drizzle ORM and Neon serverless for production-grade persistence and scalability, with auto-seeding of API keys.
*   **Authentication System**: Multi-layered security with admin and API key authentication, featuring database-backed Bearer tokens, cryptographically generated keys, per-key rate limiting, and real-time usage statistics.
*   **Python ML Services Integration**: Unified worker pool architecture managing all ML services through persistent Python processes to minimize cold start latency, using multiprocessing for task distribution, health checks, and JSON over stdin/stdout communication. This architecture provides consistent task queuing, priority handling, automatic failover, unified metrics, and health monitoring, designed for GPU model swap-in.
*   **Deployment**: Optimized for Hugging Face Spaces with GPU acceleration, featuring a multi-stage Dockerfile (Python 3.10 from Ubuntu 22.04), GPU detection, graceful startup, and automated GitHub→HF deployment pipeline via GitHub Actions.

### Recent Deployment Fixes
*   **Python Version Fix** (Nov 10, 2025): Changed from Python 3.11 to Python 3.10 (Ubuntu 22.04 system default) to resolve build failures
*   **Dockerfile Path Correction**: Fixed multi-stage build to copy pip packages from `/usr/local/lib/python3.10/dist-packages` (actual location) instead of `/usr/local/lib/python3.10`
*   **Build Verification**: Added sanity checks in python-base stage to log site-packages paths for debugging
*   **pip3 Direct Usage Fix**: Removed problematic `update-alternatives` for pip that was failing in HF Spaces build environment; using `pip3` directly throughout Dockerfile
*   **Runtime Directory Creation**: Moved directory creation from Dockerfile RUN command to app.py startup to avoid Docker build cache miss errors; directories now created at runtime with proper error handling
*   **Python3 Direct Usage**: Removed ALL `update-alternatives` commands (HF Spaces doesn't support them); using `python3` and `pip3` explicitly everywhere instead of creating symlinks
*   **Deployment Pipeline**: Replit → GitHub → GitHub Actions → HF Spaces (fully automated)

## External Dependencies
*   **Database**: PostgreSQL (Neon serverless)
*   **Frontend Libraries**: React, Wouter, Tailwind CSS, shadcn/ui, TanStack Query
*   **Backend Libraries**: Express, `ws`, Multer, Zod, Twilio SDK, `sip` (Node.js SIP protocol library)
*   **ML Models/Libraries**: Chatterbox, Higgs Audio V2, StyleTTS2, Whisper-large-v3-turbo (faster-whisper), Silero VAD, Llama 3.3, Qwen 2.5, ai4bharat/indic-parler-tts, parler-tts/parler-tts-mini-multilingual
*   **Telephony Providers**: Twilio, Zadarma
*   **Audio Processing**: librosa, soundfile