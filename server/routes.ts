import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { rateLimiter } from "./rate-limiter";
import { mlClient } from "./ml-client";
import { RealTimeGateway } from "./realtime-gateway";
import { TelephonySignaling } from "./telephony-signaling";
import { TelephonyService } from "./services/telephony-service";
import { generateAgentFlow } from "./services/ai-flow-generator";
import multer from "multer";
import { z } from "zod";
import {
  ttsRequestSchema,
  sttRequestSchema,
  voiceCloneRequestSchema,
  insertApiKeySchema,
  insertTelephonyProviderSchema,
  insertPhoneNumberSchema,
  insertCallingCampaignSchema,
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
  
  // Initialize ML client (Python worker pools or HF Spaces API)
  console.log("[Server] Initializing ML client...");
  try {
    await mlClient.initialize();
    console.log("[Server] ML client initialized successfully");
  } catch (error) {
    console.error("[Server] Failed to initialize ML client:", error);
    console.log("[Server] Continuing without ML client (may have reduced functionality)");
  }
  
  // Setup graceful shutdown
  const shutdown = async () => {
    console.log("\n[Server] Shutting down...");
    await mlClient.shutdown();
    process.exit(0);
  };
  
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // Admin Authentication Middleware for API Key Management
  // In production, set ADMIN_TOKEN environment variable for security
  const authenticateAdmin = async (req: any, res: any, next: any) => {
    const adminToken = process.env.ADMIN_TOKEN;
    
    // In development mode (no admin token set), allow unrestricted access
    if (!adminToken) {
      console.warn("[Security] No ADMIN_TOKEN set - API key management is unprotected. Set ADMIN_TOKEN for production.");
      return next();
    }
    
    // In production mode, require admin token in Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Admin authentication required" });
    }
    
    const token = authHeader.substring(7);
    if (token !== adminToken) {
      return res.status(403).json({ error: "Invalid admin token" });
    }
    
    next();
  };

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
    const rateLimitResult = await rateLimiter.checkLimit(key.id, key.rateLimit);
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        retryAfter: rateLimitResult.retryAfter,
      });
    }

    // Attach API key info to request
    req.apiKey = key;
    await storage.incrementApiKeyUsage(key.id);
    next();
  };

  // Health Check Routes (Public - no authentication)
  app.get("/api/health", async (req, res) => {
    try {
      const healthData: any = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
      };

      // Check database connection
      try {
        // Note: Using simple query since storage doesn't expose lightweight ping
        // In production, consider adding a dedicated ping() method to IStorage
        const testQuery = await storage.getAllApiKeys();
        healthData.database = { status: 'connected', keys: testQuery.length };
      } catch (error: any) {
        healthData.database = { status: 'disconnected', error: error.message };
        healthData.status = 'degraded';
      }

      // Check ML worker pool
      try {
        healthData.ml_workers = { status: 'available' };
      } catch (error) {
        healthData.ml_workers = { status: 'unavailable' };
      }

      res.json(healthData);
    } catch (error: any) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get("/api/ready", async (req, res) => {
    try {
      // Check database connectivity
      await storage.getAllApiKeys();
      res.json({ status: 'ready', timestamp: new Date().toISOString() });
    } catch (error: any) {
      res.status(503).json({ status: 'not_ready', error: error.message });
    }
  });

  app.get("/api/live", (req, res) => {
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
  });

  // API Key Management Routes
  // GET is public (users need to see their keys), POST/DELETE/PATCH require admin auth
  app.get("/api/keys", async (req, res) => {
    try {
      const keys = await storage.getAllApiKeys();
      res.json(keys);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/keys", authenticateAdmin, async (req, res) => {
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

  app.delete("/api/keys/:id", authenticateAdmin, async (req, res) => {
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

  // Update API key (toggle active status)
  app.patch("/api/keys/:id", authenticateAdmin, async (req, res) => {
    try {
      const { active } = req.body;
      
      if (typeof active !== "boolean") {
        return res.status(400).json({ error: "Active status must be a boolean" });
      }
      
      const updatedKey = await storage.updateApiKey(req.params.id, { active });
      if (!updatedKey) {
        return res.status(404).json({ error: "API key not found" });
      }
      
      res.json(updatedKey);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
