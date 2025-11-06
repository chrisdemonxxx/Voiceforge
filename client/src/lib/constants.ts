import type { ModelInfo } from "@shared/schema";

export const MODEL_INFO: Record<string, ModelInfo> = {
  "indic-parler-tts": {
    id: "indic-parler-tts",
    name: "Indic Parler TTS",
    description: "AI4Bharat's multilingual TTS for 21 Indian languages with 69 unique voices",
    parameters: "630M",
    languages: ["Hindi", "Tamil", "Telugu", "Malayalam", "Bengali", "Urdu", "Assamese", "Bodo", "Dogri", "Gujarati", "Kannada", "Konkani", "Maithili", "Manipuri", "Marathi", "Nepali", "Odia", "Punjabi", "Sanskrit", "Santali", "Sindhi", "English"],
    features: [
      "69 unique Indian voices",
      "Emotion rendering in 10 languages",
      "Controllable pitch, speed, and style",
      "Prompt-based voice control",
    ],
    speed: "Fast",
    quality: 5,
    voiceCloning: false,
    emotionalRange: "excellent",
  },
  chatterbox: {
    id: "chatterbox",
    name: "Chatterbox",
    description: "Most realistic TTS - beats ElevenLabs in 63.75% of blind tests",
    parameters: "500M",
    languages: ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Polish", "Turkish", "Russian", "Dutch", "Czech", "Arabic", "Chinese", "Japanese", "Korean", "Hindi", "Bengali", "Telugu", "Tamil", "Marathi", "Vietnamese", "Thai", "Javanese"],
    features: [
      "Zero-shot voice cloning (5-sec sample)",
      "Emotion exaggeration control",
      "Sub-200ms latency",
      "Neural watermarking built-in",
    ],
    speed: "~200ms TTFB",
    quality: 5,
    voiceCloning: true,
    emotionalRange: "excellent",
  },
  higgs_audio_v2: {
    id: "higgs_audio_v2",
    name: "Higgs Audio V2",
    description: "Industry-leading emotional expressiveness for audio dramas and podcasts",
    parameters: "3B (Llama base)",
    languages: ["English", "Chinese", "Spanish", "French", "German", "Japanese", "Korean", "Russian"],
    features: [
      "Best emotional expressiveness",
      "24 kHz high-quality output",
      "Multi-speaker dialogue support",
      "Zero-shot emotion control",
    ],
    speed: "Fast",
    quality: 5,
    voiceCloning: true,
    emotionalRange: "excellent",
  },
  styletts2: {
    id: "styletts2",
    name: "StyleTTS2",
    description: "Surpasses human recordings on benchmarks - English-only premium quality",
    parameters: "~100M",
    languages: ["English"],
    features: [
      "Human-level speech quality",
      "Life-like prosody and intonation",
      "Zero-shot voice cloning (5-10s)",
      "95× real-time on RTX 4090",
    ],
    speed: "95× real-time",
    quality: 5,
    voiceCloning: true,
    emotionalRange: "excellent",
  },
};

// Voice Library for Indic Parler TTS
export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: "male" | "female";
  description: string;
  prompt: string; // Natural language description for the model
}

export const VOICE_LIBRARY: Voice[] = [
  // Hindi Voices
  { id: "hindi-aditi-f", name: "Aditi", language: "Hindi", gender: "female", description: "Clear and expressive female voice", prompt: "Aditi speaks in a clear and expressive voice" },
  { id: "hindi-rahul-m", name: "Rahul", language: "Hindi", gender: "male", description: "Professional male voice", prompt: "Rahul speaks in a professional and confident tone" },
  { id: "hindi-priya-f", name: "Priya", language: "Hindi", gender: "female", description: "Warm and friendly female voice", prompt: "Priya speaks in a warm and friendly manner" },
  { id: "hindi-vikram-m", name: "Vikram", language: "Hindi", gender: "male", description: "Deep and authoritative male voice", prompt: "Vikram speaks with a deep and authoritative voice" },
  
  // Tamil Voices
  { id: "tamil-lakshmi-f", name: "Lakshmi", language: "Tamil", gender: "female", description: "Melodious female voice", prompt: "Lakshmi speaks in a melodious and pleasant voice" },
  { id: "tamil-kumar-m", name: "Kumar", language: "Tamil", gender: "male", description: "Strong male voice", prompt: "Kumar speaks with a strong and clear voice" },
  { id: "tamil-meena-f", name: "Meena", language: "Tamil", gender: "female", description: "Soft and gentle female voice", prompt: "Meena speaks in a soft and gentle manner" },
  
  // Telugu Voices
  { id: "telugu-anjali-f", name: "Anjali", language: "Telugu", gender: "female", description: "Bright and cheerful female voice", prompt: "Anjali speaks in a bright and cheerful tone" },
  { id: "telugu-ravi-m", name: "Ravi", language: "Telugu", gender: "male", description: "Confident male voice", prompt: "Ravi speaks with confidence and clarity" },
  { id: "telugu-sita-f", name: "Sita", language: "Telugu", gender: "female", description: "Calm and soothing female voice", prompt: "Sita speaks in a calm and soothing voice" },
  
  // Malayalam Voices
  { id: "malayalam-maya-f", name: "Maya", language: "Malayalam", gender: "female", description: "Elegant female voice", prompt: "Maya speaks in an elegant and refined manner" },
  { id: "malayalam-suresh-m", name: "Suresh", language: "Malayalam", gender: "male", description: "Warm male voice", prompt: "Suresh speaks with a warm and welcoming voice" },
  { id: "malayalam-divya-f", name: "Divya", language: "Malayalam", gender: "female", description: "Sweet and pleasant female voice", prompt: "Divya speaks in a sweet and pleasant tone" },
  
  // Bengali Voices
  { id: "bengali-riya-f", name: "Riya", language: "Bengali", gender: "female", description: "Expressive female voice", prompt: "Riya speaks in an expressive and emotional voice" },
  { id: "bengali-amit-m", name: "Amit", language: "Bengali", gender: "male", description: "Distinguished male voice", prompt: "Amit speaks with a distinguished and mature voice" },
  { id: "bengali-puja-f", name: "Puja", language: "Bengali", gender: "female", description: "Lively and energetic female voice", prompt: "Puja speaks in a lively and energetic manner" },
  
  // Urdu Voices
  { id: "urdu-zara-f", name: "Zara", language: "Urdu", gender: "female", description: "Poetic female voice", prompt: "Zara speaks in a poetic and graceful voice" },
  { id: "urdu-hassan-m", name: "Hassan", language: "Urdu", gender: "male", description: "Eloquent male voice", prompt: "Hassan speaks with eloquence and sophistication" },
  { id: "urdu-aisha-f", name: "Aisha", language: "Urdu", gender: "female", description: "Refined female voice", prompt: "Aisha speaks in a refined and cultured manner" },
  
  // English (Indian accent)
  { id: "english-neha-f", name: "Neha", language: "English", gender: "female", description: "Indian English female voice", prompt: "Neha speaks English with a clear Indian accent" },
  { id: "english-arjun-m", name: "Arjun", language: "English", gender: "male", description: "Indian English male voice", prompt: "Arjun speaks English confidently with an Indian accent" },
];

export const API_EXAMPLES = {
  curl: `curl -X POST https://api.voiceforge.ai/v1/tts \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Hello, this is a test of the VoiceForge API",
    "model": "chatterbox",
    "format": "mp3",
    "speed": 1.0
  }'`,
  
  python: `from voiceforge import VoiceForgeClient

client = VoiceForgeClient(api_key="YOUR_API_KEY")

# Generate speech
audio = client.tts(
    text="Hello, this is a test of the VoiceForge API",
    model="chatterbox",
    format="mp3",
    speed=1.0
)

# Save to file
audio.save("output.mp3")`,
  
  javascript: `import { VoiceForgeClient } from 'voiceforge-js';

const client = new VoiceForgeClient({
  apiKey: 'YOUR_API_KEY'
});

// Generate speech
const audio = await client.tts({
  text: 'Hello, this is a test of the VoiceForge API',
  model: 'chatterbox',
  format: 'mp3',
  speed: 1.0
});

// Play or download
audio.play();`,
};

export const FEATURES = [
  {
    icon: "Mic2",
    title: "Real-time TTS",
    description: "Three state-of-the-art models with sub-200ms latency for natural-sounding speech synthesis",
  },
  {
    icon: "User",
    title: "Voice Cloning",
    description: "Clone any voice with just 5 seconds of reference audio using Chatterbox or Higgs Audio",
  },
  {
    icon: "Languages",
    title: "Multi-language STT",
    description: "Whisper-large-v3-turbo for accurate speech recognition in 99+ languages",
  },
  {
    icon: "Volume2",
    title: "Voice Activity Detection",
    description: "Silero VAD for precise speech segment detection in real-time audio streams",
  },
  {
    icon: "MessageSquare",
    title: "VLLM Integration",
    description: "Voice-enabled conversational AI with Llama 3.3 or Qwen 2.5 for intelligent interactions",
  },
  {
    icon: "Zap",
    title: "GPU Acceleration",
    description: "CUDA-optimized inference pipeline for maximum performance on Replit infrastructure",
  },
  {
    icon: "Code",
    title: "Open Source Stack",
    description: "100% open-source models - Chatterbox, Higgs Audio V2, StyleTTS2, Whisper, and more",
  },
  {
    icon: "Shield",
    title: "API Key Management",
    description: "Secure authentication, rate limiting, and usage tracking for production deployments",
  },
];
