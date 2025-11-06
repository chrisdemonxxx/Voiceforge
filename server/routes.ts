import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { rateLimiter } from "./rate-limiter";
import { pythonBridge } from "./python-bridge";
import { RealTimeGateway } from "./realtime-gateway";
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
  
  // Initialize database with default API key if none exist
  console.log("[Server] Checking database initialization...");
  try {
    const existingKeys = await storage.getAllApiKeys();
    if (existingKeys.length === 0) {
      console.log("[Server] No API keys found. Creating default API key...");
      const defaultKey = await storage.createApiKey({
        name: "Default API Key",
        rateLimit: 1000,
      });
      console.log(`[Server] Created default API key: ${defaultKey.key}`);
    } else {
      console.log(`[Server] Found ${existingKeys.length} existing API key(s)`);
    }
  } catch (error) {
    console.error("[Server] Failed to initialize database:", error);
  }
  
  // Initialize Python worker pools
  console.log("[Server] Initializing Python worker pools...");
  try {
    await pythonBridge.initialize();
    console.log("[Server] Python worker pools initialized successfully");
  } catch (error) {
    console.error("[Server] Failed to initialize Python worker pools:", error);
    console.log("[Server] Continuing without worker pools (will use fallback spawn mode)");
  }
  
  // Setup graceful shutdown
  const shutdown = async () => {
    console.log("\n[Server] Shutting down...");
    await pythonBridge.shutdown();
    process.exit(0);
  };
  
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // API Key Authentication Middleware with Rate Limiting
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

    // Check rate limit
    const rateLimitResult = rateLimiter.check(key);
    
    // Add rate limit headers to response
    res.setHeader("X-RateLimit-Limit", rateLimitResult.limit.toString());
    res.setHeader("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
    res.setHeader("X-RateLimit-Reset", new Date(rateLimitResult.resetTime).toISOString());

    if (!rateLimitResult.allowed) {
      return res.status(429).json({ 
        error: "Rate limit exceeded",
        limit: rateLimitResult.limit,
        resetTime: new Date(rateLimitResult.resetTime).toISOString(),
      });
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

  // Get voice library
  app.get("/api/voice-library", async (req, res) => {
    try {
      // Import voice library from shared module
      const { VOICE_LIBRARY } = await import("@shared/voices");
      res.json(VOICE_LIBRARY);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // TTS Endpoint (used by both dashboard and landing page demo)
  app.post("/api/tts", authenticateApiKey, async (req, res) => {
    try {
      const startTime = Date.now();
      const data = ttsRequestSchema.parse(req.body);
      
      // Prepare voice data for TTS service
      let voiceData: any = {
        voice: data.voice,
      };
      
      // Check if voice is a cloned voice ID (UUID format)
      if (data.voice && data.voice.includes("-") && data.voice.length > 20) {
        const clonedVoice = await storage.getClonedVoice(data.voice);
        if (clonedVoice) {
          voiceData.voice_characteristics = clonedVoice.voiceCharacteristics;
        }
      }
      
      // Call Python TTS service
      const audioBuffer = await pythonBridge.callTTS({
        text: data.text,
        model: data.model,
        voice: voiceData.voice,
        speed: data.speed,
        voice_characteristics: voiceData.voice_characteristics,
      });
      
      const processingTime = Date.now() - startTime;
      
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("X-Processing-Time", `${processingTime}ms`);
      res.send(audioBuffer);
    } catch (error: any) {
      console.error("[TTS] Error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid input", 
          details: error.errors 
        });
      }
      
      // Handle Hugging Face specific errors
      if (error.message.includes("503") || error.message.includes("Model is loading")) {
        return res.status(503).json({ 
          error: "Model is loading. Please try again in a few seconds.",
          retry_after: 10
        });
      }
      
      if (error.message.includes("HF API error") || error.message.includes("HF TTS")) {
        return res.status(503).json({ 
          error: "Hugging Face service temporarily unavailable. Please try again.",
          service: "huggingface"
        });
      }
      
      // Worker pool errors
      if (error.message.includes("Worker pool") || error.message.includes("worker")) {
        return res.status(503).json({ 
          error: "TTS service temporarily unavailable. Please try again.",
          service: "worker_pool"
        });
      }
      
      // Generic error
      res.status(500).json({ error: error.message || "Failed to generate speech" });
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
      const apiKey = (req as any).apiKey;
      
      // Analyze the reference audio to extract voice characteristics
      const analysis = await pythonBridge.analyzeVoice(req.file.buffer);
      
      if (!analysis.success) {
        return res.status(400).json({ 
          error: "Failed to analyze reference audio",
          details: analysis.error 
        });
      }
      
      // Save reference audio to filesystem
      const fs = await import("fs/promises");
      const path = await import("path");
      const uploadsDir = path.join(process.cwd(), "uploads", "voices");
      await fs.mkdir(uploadsDir, { recursive: true });
      
      const audioFileName = `voice_${Date.now()}_${Math.random().toString(36).substring(7)}.wav`;
      const audioFilePath = path.join(uploadsDir, audioFileName);
      await fs.writeFile(audioFilePath, req.file.buffer);
      
      // Create cloned voice in database
      const clonedVoice = await storage.createClonedVoice({
        apiKeyId: apiKey.id,
        name: data.name,
        model: data.model,
        description: data.description,
        referenceAudioPath: `uploads/voices/${audioFileName}`,
        voiceCharacteristics: analysis.characteristics,
        status: "ready",
      });
      
      res.json({
        id: clonedVoice.id,
        name: clonedVoice.name,
        model: clonedVoice.model,
        status: clonedVoice.status,
        createdAt: clonedVoice.createdAt,
        characteristics: clonedVoice.voiceCharacteristics,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid input", details: error.errors });
      } else {
        console.error("[Voice Cloning] Error:", error);
        res.status(500).json({ error: error.message });
      }
    }
  });

  // List Cloned Voices
  app.get("/api/voices", authenticateApiKey, async (req, res) => {
    try {
      const apiKey = (req as any).apiKey;
      const voices = await storage.getAllClonedVoices(apiKey.id);
      res.json(voices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Single Cloned Voice
  app.get("/api/voices/:id", authenticateApiKey, async (req, res) => {
    try {
      const voice = await storage.getClonedVoice(req.params.id);
      if (!voice) {
        return res.status(404).json({ error: "Voice not found" });
      }
      res.json(voice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete Cloned Voice
  app.delete("/api/voices/:id", authenticateApiKey, async (req, res) => {
    try {
      const voice = await storage.getClonedVoice(req.params.id);
      if (!voice) {
        return res.status(404).json({ error: "Voice not found" });
      }

      // Delete the reference audio file
      const fs = await import("fs/promises");
      const path = await import("path");
      const audioPath = path.join(process.cwd(), voice.referenceAudioPath);
      
      try {
        await fs.unlink(audioPath);
      } catch (error) {
        console.warn("[Voice Delete] Failed to delete audio file:", error);
      }

      // Delete from database
      const success = await storage.deleteClonedVoice(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Voice not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  // Real-Time Gateway for Voice AI Playground
  const realTimeGateway = new RealTimeGateway(httpServer, "/ws/realtime");
  
  // Metrics endpoint for real-time gateway
  app.get("/api/realtime/metrics", (req, res) => {
    res.json(realTimeGateway.getMetrics());
  });
  
  // Metrics history endpoint for charts and export
  app.get("/api/realtime/metrics/history", (req, res) => {
    const format = req.query.format as string || 'json';
    const history = realTimeGateway.getMetricsHistory();
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'timestamp,stt,agent,tts,e2e,queueDepth,activeConnections\n';
      const csvRows = history.samples.map(s => 
        `${s.timestamp},${s.stt},${s.agent},${s.tts},${s.e2e},${s.queueDepth},${s.activeConnections}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=metrics-history.csv');
      res.send(csvHeader + csvRows);
    } else {
      res.json(history);
    }
  });
  
  // WebSocket Server for Real-time Streaming (legacy)
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
