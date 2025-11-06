import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// API Keys table
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  usage: integer("usage").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  rateLimit: integer("rate_limit").default(1000).notNull(), // requests per hour
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  key: true,
  createdAt: true,
  usage: true,
  active: true,
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// Cloned Voices table
export const clonedVoices = pgTable("cloned_voices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  model: text("model").notNull(), // chatterbox or higgs_audio_v2
  description: text("description"),
  referenceAudioPath: text("reference_audio_path").notNull(),
  voiceCharacteristics: jsonb("voice_characteristics"), // stores formant values, pitch, etc.
  status: text("status").notNull().default("ready"), // processing, ready, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClonedVoiceSchema = createInsertSchema(clonedVoices).omit({
  id: true,
  createdAt: true,
});

export type InsertClonedVoice = z.infer<typeof insertClonedVoiceSchema>;
export type ClonedVoice = typeof clonedVoices.$inferSelect;

// TTS Models enum
export const TTSModel = z.enum(["indic-parler-tts", "chatterbox", "higgs_audio_v2", "styletts2"]);
export type TTSModelType = z.infer<typeof TTSModel>;

// Agent Modes enum
export const AgentMode = z.enum(["echo", "assistant", "conversational", "custom"]);
export type AgentModeType = z.infer<typeof AgentMode>;

// Audio format enum
export const AudioFormat = z.enum(["wav", "mp3", "flac", "ogg"]);
export type AudioFormatType = z.infer<typeof AudioFormat>;

// TTS Request schema
export const ttsRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  model: TTSModel,
  voice: z.string().optional(),
  format: AudioFormat.default("wav"),
  speed: z.number().min(0.5).max(2.0).default(1.0),
});

export type TTSRequest = z.infer<typeof ttsRequestSchema>;

// STT Request schema
export const sttRequestSchema = z.object({
  language: z.string().default("en"),
  format: AudioFormat,
});

export type STTRequest = z.infer<typeof sttRequestSchema>;

// Voice Clone Request schema
export const voiceCloneRequestSchema = z.object({
  name: z.string().min(1).max(100),
  model: z.enum(["chatterbox", "higgs_audio_v2"]),
  description: z.string().optional(),
});

export type VoiceCloneRequest = z.infer<typeof voiceCloneRequestSchema>;

// Usage Stats interface
export interface UsageStats {
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  requestsToday: number;
  ttsRequests: number;
  sttRequests: number;
  vadRequests: number;
  vllmRequests: number;
}

// Model Info interface
export interface ModelInfo {
  id: TTSModelType;
  name: string;
  description: string;
  parameters: string;
  languages: string[];
  features: string[];
  speed: string;
  quality: number; // 1-5 stars
  voiceCloning: boolean;
  emotionalRange: "low" | "medium" | "high" | "excellent";
}

// Audio Job interface
export interface AudioJob {
  id: string;
  type: "tts" | "stt" | "vad" | "clone";
  status: "pending" | "processing" | "completed" | "failed";
  model?: string;
  input: string;
  output?: string;
  duration?: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// Real-time WebSocket Protocol
// For dual-channel architecture: /ws/audio (low-latency audio) and /ws/control (session management)

// Client → Server Messages
export const wsClientMessageSchema = z.discriminatedUnion("type", [
  // Session initialization
  z.object({
    type: z.literal("init"),
    eventId: z.string(),
    config: z.object({
      mode: z.enum(["voice", "text", "hybrid"]),
      sttEnabled: z.boolean().default(true),
      ttsEnabled: z.boolean().default(true),
      agentEnabled: z.boolean().default(false),
      agentMode: AgentMode.default("assistant"),
      systemPrompt: z.string().optional(),
      model: TTSModel.default("chatterbox"),
      voice: z.string().optional(),
      language: z.string().default("en"),
    }),
  }),
  
  // Audio chunk (PCM16, 20ms frames)
  z.object({
    type: z.literal("audio_chunk"),
    eventId: z.string(),
    chunk: z.string(), // base64 encoded PCM16
    timestamp: z.number(), // client timestamp for latency tracking
  }),
  
  // Text input (alternative to voice)
  z.object({
    type: z.literal("text_input"),
    eventId: z.string(),
    text: z.string(),
    timestamp: z.number(),
  }),
  
  // Control messages
  z.object({
    type: z.literal("pause"),
    eventId: z.string(),
  }),
  z.object({
    type: z.literal("resume"),
    eventId: z.string(),
  }),
  z.object({
    type: z.literal("end"),
    eventId: z.string(),
  }),
  
  // Quality feedback
  z.object({
    type: z.literal("quality_feedback"),
    eventId: z.string(),
    category: z.enum(["stt_accuracy", "tts_quality", "latency", "overall"]),
    score: z.number().min(1).max(5),
    comment: z.string().optional(),
  }),
]);

// Server → Client Messages
export const wsServerMessageSchema = z.discriminatedUnion("type", [
  // Session acknowledgment
  z.object({
    type: z.literal("ready"),
    eventId: z.string(),
    sessionId: z.string(),
    serverTimestamp: z.number(),
  }),
  
  // STT partial result (streaming)
  z.object({
    type: z.literal("stt_partial"),
    eventId: z.string(),
    text: z.string(),
    confidence: z.number(),
    timestamp: z.number(),
  }),
  
  // STT final result
  z.object({
    type: z.literal("stt_final"),
    eventId: z.string(),
    text: z.string(),
    confidence: z.number(),
    language: z.string(),
    duration: z.number(),
    latency: z.object({
      capture: z.number(),
      network: z.number(),
      processing: z.number(),
      total: z.number(),
    }),
  }),
  
  // Agent processing
  z.object({
    type: z.literal("agent_thinking"),
    eventId: z.string(),
    status: z.string(),
  }),
  
  // Agent response
  z.object({
    type: z.literal("agent_reply"),
    eventId: z.string(),
    text: z.string(),
    timestamp: z.number(),
  }),
  
  // TTS audio chunk (streaming)
  z.object({
    type: z.literal("tts_chunk"),
    eventId: z.string(),
    chunk: z.string(), // base64 encoded audio
    sequence: z.number(),
    done: z.boolean(),
  }),
  
  // TTS complete
  z.object({
    type: z.literal("tts_complete"),
    eventId: z.string(),
    duration: z.number(),
    latency: z.object({
      processing: z.number(),
      streaming: z.number(),
      total: z.number(),
    }),
  }),
  
  // Real-time metrics
  z.object({
    type: z.literal("metrics"),
    eventId: z.string(),
    metrics: z.object({
      sttLatency: z.number().optional(),
      ttsLatency: z.number().optional(),
      agentLatency: z.number().optional(),
      endToEndLatency: z.number().optional(),
      activeConnections: z.number(),
      queueDepth: z.number(),
    }),
  }),
  
  // Error handling
  z.object({
    type: z.literal("error"),
    eventId: z.string(),
    code: z.string(),
    message: z.string(),
    recoverable: z.boolean(),
  }),
  
  // Session ended
  z.object({
    type: z.literal("ended"),
    eventId: z.string(),
    reason: z.string(),
    stats: z.object({
      duration: z.number(),
      messagesProcessed: z.number(),
      avgLatency: z.number(),
      errorCount: z.number(),
    }),
  }),
]);

export type WSClientMessage = z.infer<typeof wsClientMessageSchema>;
export type WSServerMessage = z.infer<typeof wsServerMessageSchema>;

// Legacy WebSocket message types (for backward compatibility)
export const wsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("tts_stream"),
    text: z.string(),
    model: TTSModel,
    voice: z.string().optional(),
  }),
  z.object({
    type: z.literal("stt_stream"),
    audio: z.string(), // base64 encoded
  }),
  z.object({
    type: z.literal("vllm_chat"),
    message: z.string(),
    voice: z.string().optional(),
  }),
]);

export type WSMessage = z.infer<typeof wsMessageSchema>;

// Real-time session state
export interface RealTimeSession {
  id: string;
  apiKeyId: string;
  mode: "voice" | "text" | "hybrid";
  startedAt: Date;
  endedAt?: Date;
  messagesProcessed: number;
  avgLatency: number;
  errorCount: number;
}
