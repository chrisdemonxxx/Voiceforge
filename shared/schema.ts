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

// TTS Models enum
export const TTSModel = z.enum(["chatterbox", "higgs_audio_v2", "styletts2"]);
export type TTSModelType = z.infer<typeof TTSModel>;

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

// WebSocket message types
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
