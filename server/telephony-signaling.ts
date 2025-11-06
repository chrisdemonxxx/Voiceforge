import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./storage";
import { telephonyService, TelephonyService } from "./services/telephony-service";

/**
 * WebRTC Signaling Message Types
 */
interface SignalingMessage {
  type: "init" | "offer" | "answer" | "ice_candidate" | "start_call" | "end_call" | "error";
  apiKey?: string;
  sessionId?: string;
  phoneNumber?: string;
  flowId?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  callId?: string;
  error?: string;
}

/**
 * Active WebRTC peer connection state
 */
interface PeerConnectionState {
  sessionId: string;
  callId: string;
  ws: WebSocket;
  apiKeyId: string;
  phoneNumber: string;
  flowId?: string;
  providerId: string;
  createdAt: Date;
  lastActivity: Date;
  isAuthenticated: boolean;
}

/**
 * Telephony WebSocket Signaling Handler
 * Manages WebRTC signaling for browser-based calling
 */
export class TelephonySignaling {
  private wss: WebSocketServer;
  private connections: Map<WebSocket, PeerConnectionState> = new Map();
  private sessionIndex: Map<string, WebSocket> = new Map();

  constructor(httpServer: Server, path: string = "/ws/telephony") {
    this.wss = new WebSocketServer({ server: httpServer, path });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on("connection", (ws: WebSocket) => {
      console.log("[TelephonySignaling] New WebRTC peer connected");

      ws.on("message", async (data: Buffer) => {
        try {
          const message: SignalingMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error: any) {
          console.error("[TelephonySignaling] Message error:", error.message);
          this.sendError(ws, "Invalid message format");
        }
      });

      ws.on("close", () => {
        this.handleDisconnect(ws);
      });

      ws.on("error", (error) => {
        console.error("[TelephonySignaling] WebSocket error:", error);
        this.handleDisconnect(ws);
      });
    });

    console.log("[TelephonySignaling] WebSocket server initialized");
  }

  /**
   * Handle incoming signaling messages
   */
  private async handleMessage(ws: WebSocket, message: SignalingMessage) {
    try {
      switch (message.type) {
        case "init":
          await this.handleInit(ws, message);
          break;

        case "start_call":
          await this.handleStartCall(ws, message);
          break;

        case "offer":
          await this.handleOffer(ws, message);
          break;

        case "answer":
          await this.handleAnswer(ws, message);
          break;

        case "ice_candidate":
          await this.handleIceCandidate(ws, message);
          break;

        case "end_call":
          await this.handleEndCall(ws, message);
          break;

        default:
          this.sendError(ws, "Unknown message type");
      }
    } catch (error: any) {
      console.error("[TelephonySignaling] Handler error:", error.message);
      this.sendError(ws, error.message);
    }
  }

  /**
   * Handle WebSocket initialization and API key validation
   */
  private async handleInit(ws: WebSocket, message: SignalingMessage) {
    if (!message.apiKey) {
      throw new Error("API key is required");
    }

    // Validate API key
    const apiKey = await storage.getApiKeyByKey(message.apiKey);
    if (!apiKey) {
      ws.close(4001, "Invalid API key");
      return;
    }

    if (!apiKey.active) {
      ws.close(4002, "API key is inactive");
      return;
    }

    // Generate unique session ID for this WebSocket connection
    const sessionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store authentication state on WebSocket
    (ws as any).apiKeyId = apiKey.id;
    (ws as any).sessionId = sessionId;
    (ws as any).isAuthenticated = true;

    // Send acknowledgment with real session ID
    this.send(ws, {
      type: "init",
      sessionId,
    });

    console.log(`[TelephonySignaling] WebSocket initialized: session=${sessionId}, apiKey=${apiKey.id}`);
  }

  /**
   * Handle call initiation
   */
  private async handleStartCall(ws: WebSocket, message: SignalingMessage) {
    // Verify authentication
    if (!(ws as any).isAuthenticated) {
      throw new Error("WebSocket not initialized. Send 'init' message first.");
    }

    const apiKeyId = (ws as any).apiKeyId;
    const wsSessionId = (ws as any).sessionId;

    if (!message.phoneNumber) {
      throw new Error("Phone number is required");
    }

    // Validate phone number format
    const isValid = TelephonyService.validatePhoneNumber(message.phoneNumber);
    if (!isValid) {
      throw new Error("Invalid phone number format");
    }

    // Get active provider for this API key
    const provider = await storage.getActiveTelephonyProvider(apiKeyId);
    if (!provider) {
      throw new Error("No telephony provider configured for this account");
    }

    // Get a phone number from this provider (use first available)
    const phoneNumbers = await storage.getAllPhoneNumbers(provider.id);
    const fromNumber = phoneNumbers.find((pn: any) => pn.active)?.phoneNumber || "+10000000000";

    // Create call session with telephony service
    const session = await telephonyService.initiateCall({
      providerId: provider.id,
      from: fromNumber,
      to: message.phoneNumber,
      flowId: message.flowId,
    });

    // Persist call record to database
    const callRecord = await storage.createCall({
      providerId: provider.id,
      from: fromNumber,
      to: message.phoneNumber,
      direction: "outbound",
      status: "initiated",
      flowId: message.flowId || null,
      campaignId: null,
      phoneNumberId: phoneNumbers.find((pn: any) => pn.phoneNumber === fromNumber)?.id || null,
      metadata: {
        wsSessionId,
        userAgent: "WebRTC Dialer",
      },
    });
    
    // Store connection state
    const state: PeerConnectionState = {
      sessionId: session.id,
      callId: callRecord.id,
      ws,
      apiKeyId,
      phoneNumber: message.phoneNumber,
      flowId: message.flowId,
      providerId: provider.id,
      createdAt: new Date(),
      lastActivity: new Date(),
      isAuthenticated: true,
    };

    this.connections.set(ws, state);
    this.sessionIndex.set(session.id, ws);

    // Send session info back to client
    this.send(ws, {
      type: "start_call",
      sessionId: session.id,
      callId: callRecord.id,
    });

    console.log(`[TelephonySignaling] Call started: ${callRecord.id} to ${message.phoneNumber}`);
  }

  /**
   * Handle WebRTC offer (from client)
   */
  private async handleOffer(ws: WebSocket, message: SignalingMessage) {
    // Verify authentication
    if (!(ws as any).isAuthenticated) {
      throw new Error("Not authenticated");
    }

    const state = this.connections.get(ws);
    if (!state) {
      throw new Error("No active call session. Start a call first.");
    }

    if (!message.sdp) {
      throw new Error("SDP offer is required");
    }

    // In a real implementation, this would:
    // 1. Process the SDP offer
    // 2. Create an SDP answer with server audio configuration
    // 3. Set up media tracks for bidirectional audio
    // 4. Configure STUN/TURN servers for NAT traversal

    // For now, we'll acknowledge the offer and let the client know
    // the server is ready to exchange ICE candidates
    console.log(`[TelephonySignaling] Received offer for session ${state.sessionId}`);

    // Update activity and call status
    state.lastActivity = new Date();
    await storage.updateCall(state.callId, { status: "ringing" });

    // Send acknowledgment
    this.send(ws, {
      type: "offer",
      sessionId: state.sessionId,
    });
  }

  /**
   * Handle WebRTC answer (from client if server sent offer, or vice versa)
   */
  private async handleAnswer(ws: WebSocket, message: SignalingMessage) {
    // Verify authentication
    if (!(ws as any).isAuthenticated) {
      throw new Error("Not authenticated");
    }

    const state = this.connections.get(ws);
    if (!state) {
      throw new Error("No active call session");
    }

    if (!message.sdp) {
      throw new Error("SDP answer is required");
    }

    console.log(`[TelephonySignaling] Received answer for session ${state.sessionId}`);

    // Update activity and call status
    state.lastActivity = new Date();
    await storage.updateCall(state.callId, { status: "in-progress" });

    // Acknowledge answer received
    this.send(ws, {
      type: "answer",
      sessionId: state.sessionId,
    });
  }

  /**
   * Handle ICE candidate exchange
   */
  private async handleIceCandidate(ws: WebSocket, message: SignalingMessage) {
    // Verify authentication
    if (!(ws as any).isAuthenticated) {
      throw new Error("Not authenticated");
    }

    const state = this.connections.get(ws);
    if (!state) {
      throw new Error("No active call session");
    }

    if (!message.candidate) {
      throw new Error("ICE candidate is required");
    }

    // In a real implementation, this would add the ICE candidate
    // to the peer connection for NAT traversal
    console.log(`[TelephonySignaling] Received ICE candidate for session ${state.sessionId}`);

    // Update activity
    state.lastActivity = new Date();

    // Acknowledge candidate received
    this.send(ws, {
      type: "ice_candidate",
      sessionId: state.sessionId,
    });
  }

  /**
   * Handle call termination
   */
  private async handleEndCall(ws: WebSocket, message: SignalingMessage) {
    // Verify authentication
    if (!(ws as any).isAuthenticated) {
      throw new Error("Not authenticated");
    }

    const state = this.connections.get(ws);
    if (!state) {
      throw new Error("No active call session");
    }

    // End the telephony session
    await telephonyService.endCall(state.sessionId);

    // Update call record in database
    await storage.updateCall(state.callId, {
      status: "completed",
      endedAt: new Date(),
    });

    // Clean up connection state
    this.connections.delete(ws);
    this.sessionIndex.delete(state.sessionId);

    // Send confirmation
    this.send(ws, {
      type: "end_call",
      sessionId: state.sessionId,
      callId: state.callId,
    });

    console.log(`[TelephonySignaling] Call ended: ${state.callId}`);

    // Close WebSocket
    ws.close();
  }

  /**
   * Handle client disconnect
   */
  private async handleDisconnect(ws: WebSocket) {
    const state = this.connections.get(ws);
    if (state) {
      console.log(`[TelephonySignaling] Client disconnected: ${state.sessionId}`);

      // End call if still active
      try {
        await telephonyService.endCall(state.sessionId);
        await storage.updateCall(state.callId, {
          status: "failed",
          endedAt: new Date(),
        });
      } catch (error) {
        console.error("[TelephonySignaling] Error ending call on disconnect:", error);
      }

      // Clean up
      this.connections.delete(ws);
      this.sessionIndex.delete(state.sessionId);
    }
  }

  /**
   * Send message to client
   */
  private send(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message
   */
  private sendError(ws: WebSocket, error: string) {
    this.send(ws, {
      type: "error",
      error,
    });
  }

  /**
   * Broadcast message to specific session
   */
  broadcastToSession(sessionId: string, message: any) {
    const ws = this.sessionIndex.get(sessionId);
    if (ws) {
      this.send(ws, message);
    }
  }

  /**
   * Get active connection count
   */
  getActiveConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId: string): PeerConnectionState | undefined {
    const ws = this.sessionIndex.get(sessionId);
    return ws ? this.connections.get(ws) : undefined;
  }
}
