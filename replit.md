# VoiceForge API - Voice AI Platform

## Overview
VoiceForge API is a comprehensive, GPU-accelerated voice AI platform offering state-of-the-art Text-to-Speech (TTS), Speech-to-Text (STT), Voice Activity Detection (VAD), and Voice Large Language Model (VLLM) capabilities. The platform aims to deliver ElevenLabs-quality voice synthesis and intelligent voice interactions by leveraging the best open-source models. Its purpose is to provide a robust and scalable solution for integrating advanced voice AI into various applications, targeting developers and businesses seeking high-fidelity and low-latency voice technologies.

## User Preferences
I prefer detailed explanations and a collaborative approach. Please ask before making major architectural changes or introducing new external dependencies. I value modular and maintainable code.

## System Architecture

### UI/UX Decisions
The platform adopts a developer-centric aesthetic inspired by platforms like Stripe, Replicate, and Hugging Face. This includes a professional, technical appearance with consistent spacing, component usage, and typography (Inter/IBM Plex Sans). Beautiful interactions and loading states are prioritized to enhance user experience.

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
*   **Voice Cloning**: Provides zero-shot cloning with 5-second samples, supported by Chatterbox and Higgs Audio V2.
*   **VLLM Integration**: Enables voice-enabled conversational AI using Llama 3.3 / Qwen 2.5 models.
*   **Platform Features**: Includes API key management with usage tracking, real-time WebSocket streaming, usage analytics, rate limiting, authentication, and multi-format audio conversion.

### System Design Choices
*   **Database Architecture**: PostgreSQL with Drizzle ORM ensures production-grade persistence for API keys, usage tracking, and rate limits, utilizing atomic SQL operations and Neon serverless for scalability.
*   **Python ML Services Integration**: A robust worker pool architecture manages persistent Python processes to minimize cold start latency. This design uses multiprocessing for task distribution, health checks, and automatic worker restarts. Communication with Python services occurs via JSON over stdin/stdout. The system supports streaming STT with partial transcriptions, VAD, confidence scoring, and timestamp alignment, achieving 30-60ms latency per chunk. TTS services use formant synthesis and are integrated into the worker pool. The architecture is designed for seamless GPU model swap-in when infrastructure is available.

## External Dependencies
*   **Database**: PostgreSQL (Neon serverless)
*   **Frontend Libraries**: React, Wouter, Tailwind CSS, shadcn/ui, TanStack Query
*   **Backend Libraries**: Express, `ws`, Multer, Zod
*   **ML Models/Libraries**: Chatterbox, Higgs Audio V2, StyleTTS2, Whisper-large-v3-turbo (faster-whisper), Silero VAD, Llama 3.3, Qwen 2.5