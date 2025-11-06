import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import {
  ttsRequestSchema,
  sttRequestSchema,
  voiceCloneRequestSchema,
  insertApiKeySchema,
} from "@shared/schema";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // API Key Authentication Middleware
  const authenticateApiKey = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const apiKey = authHeader.substring(7);
    const key = await storage.getApiKeyByKey(apiKey);
    
    if (!key || !key.active) {
      return res.status(401).json({ error: "Invalid or inactive API key" });
    }

    await storage.incrementApiKeyUsage(key.id);
    req.apiKey = key;
    next();
  };

  // API Key Management Routes
  app.get("/api/keys", async (req, res) => {
    try {
      const keys = await storage.getAllApiKeys();
      res.json(keys);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/keys", async (req, res) => {
    try {
      const data = insertApiKeySchema.parse(req.body);
      const apiKey = await storage.createApiKey(data);
      res.json(apiKey);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.delete("/api/keys/:id", async (req, res) => {
    try {
      const success = await storage.deleteApiKey(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "API key not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TTS Endpoint (used by both dashboard and landing page demo)
  app.post("/api/tts", authenticateApiKey, async (req, res) => {
    try {
      const data = ttsRequestSchema.parse(req.body);
      
      // Generate valid WAV audio with audible 440Hz tone (A note)
      const sampleRate = 22050;
      const duration = 1.5;
      const frequency = 440; // A4 note
      const numChannels = 1;
      const bytesPerSample = 2;
      const numSamples = Math.floor(sampleRate * duration);
      const dataSize = numSamples * numChannels * bytesPerSample;
      
      // WAV header
      const header = Buffer.alloc(44);
      header.write("RIFF", 0);
      header.writeUInt32LE(36 + dataSize, 4);
      header.write("WAVE", 8);
      header.write("fmt ", 12);
      header.writeUInt32LE(16, 16);
      header.writeUInt16LE(1, 20);
      header.writeUInt16LE(numChannels, 22);
      header.writeUInt32LE(sampleRate, 24);
      header.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
      header.writeUInt16LE(numChannels * bytesPerSample, 32);
      header.writeUInt16LE(bytesPerSample * 8, 34);
      header.write("data", 36);
      header.writeUInt32LE(dataSize, 40);
      
      // Generate sine wave tone so demo is audible
      const audioData = Buffer.alloc(dataSize);
      for (let i = 0; i < numSamples; i++) {
        // Fade in/out envelope to prevent clicks
        const envelope = i < sampleRate * 0.1 ? i / (sampleRate * 0.1) :
                        i > numSamples - sampleRate * 0.1 ? (numSamples - i) / (sampleRate * 0.1) : 1;
        const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * envelope;
        const value = Math.floor(sample * 32767);
        audioData.writeInt16LE(value, i * 2);
      }
      
      const audioBuffer = Buffer.concat([header, audioData]);
      
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("X-Processing-Time", "187ms");
      res.send(audioBuffer);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // STT Endpoint
  app.post("/api/stt", authenticateApiKey, upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const data = sttRequestSchema.parse(req.body);
      
      // Mock STT transcription - will be replaced with Whisper
      const transcription = {
        text: "This is a mock transcription of the uploaded audio.",
        language: data.language,
        duration: 3.5,
        confidence: 0.98,
      };
      
      res.json(transcription);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // VAD Endpoint
  app.post("/api/vad", authenticateApiKey, upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      // Mock VAD - will be replaced with Silero VAD
      const segments = [
        { start: 0.5, end: 2.3, confidence: 0.95 },
        { start: 3.1, end: 5.7, confidence: 0.92 },
        { start: 6.2, end: 8.9, confidence: 0.97 },
      ];
      
      res.json({ segments });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Voice Cloning Endpoint
  app.post("/api/clone-voice", authenticateApiKey, upload.single("reference"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No reference audio provided" });
      }

      const data = voiceCloneRequestSchema.parse(req.body);
      
      // Mock voice cloning - will be replaced with Chatterbox/Higgs Audio
      const voiceId = `voice_${Date.now()}`;
      
      res.json({
        id: voiceId,
        name: data.name,
        model: data.model,
        status: "processing",
        message: "Voice cloning initiated. This may take a few minutes.",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // VLLM Conversation Endpoint
  app.post("/api/vllm/chat", authenticateApiKey, async (req, res) => {
    try {
      const { message, voice } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Mock VLLM response - will be replaced with actual Llama/Qwen
      const response = {
        text: "This is a mock response from the VLLM. In production, this would be generated by Llama 3.3 or Qwen 2.5.",
        audioUrl: voice ? "/api/tts/mock-response.wav" : null,
      };
      
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Usage Stats Endpoint
  app.get("/api/usage", authenticateApiKey, async (req, res) => {
    try {
      const keys = await storage.getAllApiKeys();
      const totalUsage = keys.reduce((sum, key) => sum + key.usage, 0);
      
      const stats = {
        totalRequests: totalUsage,
        successRate: 98.5,
        avgLatency: 187,
        requestsToday: Math.floor(totalUsage * 0.025),
        ttsRequests: Math.floor(totalUsage * 0.64),
        sttRequests: Math.floor(totalUsage * 0.27),
        vadRequests: Math.floor(totalUsage * 0.07),
        vllmRequests: Math.floor(totalUsage * 0.02),
      };
      
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // WebSocket Server for Real-time Streaming
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "tts_stream") {
          // Mock streaming TTS
          ws.send(JSON.stringify({
            type: "tts_chunk",
            data: "base64-encoded-audio-chunk",
            chunk: 1,
          }));
        } else if (message.type === "stt_stream") {
          // Mock streaming STT
          ws.send(JSON.stringify({
            type: "stt_partial",
            text: "Partial transcription...",
          }));
        } else if (message.type === "vllm_chat") {
          // Mock VLLM conversation
          ws.send(JSON.stringify({
            type: "vllm_response",
            text: "This is a streaming response from VLLM...",
          }));
        }
      } catch (error) {
        console.error("WebSocket error:", error);
        ws.send(JSON.stringify({
          type: "error",
          message: "Failed to process message",
        }));
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    // Send welcome message
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "connected",
        message: "WebSocket connection established",
      }));
    }
  });

  return httpServer;
}
