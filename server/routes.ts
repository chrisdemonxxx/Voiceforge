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

  // API Key Management Routes (no auth required for dashboard management)
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
      const startTime = Date.now();
      const data = ttsRequestSchema.parse(req.body);
      
      // Call Python TTS service with formant synthesis
      const audioBuffer = await pythonBridge.callTTS({
        text: data.text,
        model: data.model,
        voice: data.voice,
        speed: data.speed,
      });
      
      const processingTime = Date.now() - startTime;
      
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("X-Processing-Time", `${processingTime}ms`);
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

  // Usage Stats Endpoint (no auth required for dashboard display)
  app.get("/api/usage", async (req, res) => {
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
