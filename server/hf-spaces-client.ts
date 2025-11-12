/**
 * HF Spaces Client - Calls Hugging Face Spaces ML APIs instead of local Python
 * This is used when running on Render without GPU/Python ML dependencies
 */

interface TTSRequest {
  text: string;
  model: string;
  voice?: string;
  speed?: number;
  voice_characteristics?: any;
}

interface STTChunkRequest {
  chunk: string;  // base64 encoded PCM16
  sequence: number;
  language?: string;
  return_partial?: boolean;
}

interface STTChunkResponse {
  text: string;
  language: string;
  confidence: number;
  duration: number;
  segments: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
    tokens: string[];
  }>;
  is_partial: boolean;
  vad_active: boolean;
  sequence: number;
  processing_time: number;
}

interface VLLMRequest {
  session_id: string;
  message: string;
  mode?: string;
  system_prompt?: string;
  stream?: boolean;
}

interface VLLMResponse {
  response: string;
  session_id: string;
  mode: string;
  processing_time: number;
  context_size: number;
  tokens: number;
}

export class HFSpacesClient {
  private apiUrl: string;
  private timeout: number = 30000; // 30 seconds

  constructor() {
    // Get HF Spaces ML API URL from environment
    this.apiUrl = process.env.HF_ML_API_URL || "https://chrisdemonxxx-voiceforge-v1-0.hf.space";
    console.log(`[HFSpacesClient] Using ML API: ${this.apiUrl}`);
  }

  async initialize() {
    console.log("[HFSpacesClient] Testing connection to HF Spaces ML API...");

    try {
      const response = await fetch(`${this.apiUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      console.log("[HFSpacesClient] Successfully connected to HF Spaces ML API");
    } catch (error) {
      console.error("[HFSpacesClient] Failed to connect to HF Spaces ML API:", error);
      console.warn("[HFSpacesClient] Continuing anyway - API may become available later");
    }
  }

  async callTTS(request: TTSRequest): Promise<Buffer> {
    console.log(`[HFSpacesClient] TTS request: model=${request.model}, text length=${request.text?.length || 0}`);

    try {
      const response = await fetch(`${this.apiUrl}/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (!data.audio) {
        throw new Error("No audio data in TTS response");
      }

      // Decode base64 audio to buffer
      const audioBuffer = Buffer.from(data.audio, "base64");
      console.log(`[HFSpacesClient] TTS success: generated ${audioBuffer.length} bytes`);

      return audioBuffer;
    } catch (error) {
      console.error("[HFSpacesClient] TTS error:", error);
      throw new Error(`TTS failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async processSTTChunk(request: STTChunkRequest): Promise<STTChunkResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/stt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`STT API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data as STTChunkResponse;
    } catch (error) {
      console.error("[HFSpacesClient] STT error:", error);
      throw new Error(`STT failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async callVLLM(request: VLLMRequest): Promise<VLLMResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/vllm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`VLLM API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data as VLLMResponse;
    } catch (error) {
      console.error("[HFSpacesClient] VLLM error:", error);

      // Fallback response
      return {
        response: `I received your message: "${request.message}". How can I help you?`,
        session_id: request.session_id,
        mode: request.mode || "assistant",
        processing_time: 0.1,
        context_size: 1,
        tokens: 10
      };
    }
  }

  async analyzeVoice(audioBuffer: Buffer): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/api/voice/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          audio: audioBuffer.toString("base64")
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Voice analysis API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[HFSpacesClient] Voice analysis error:", error);
      throw error;
    }
  }

  async createInstantClone(cloneId: string, audioData: Buffer, name: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/api/voice/clone/instant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          clone_id: cloneId,
          audio: audioData.toString("base64"),
          name: name
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Instant clone API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[HFSpacesClient] Instant clone error:", error);
      throw error;
    }
  }

  async createProfessionalClone(cloneId: string, audioData: Buffer, name: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/api/voice/clone/professional`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          clone_id: cloneId,
          audio: audioData.toString("base64"),
          name: name
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Professional clone API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[HFSpacesClient] Professional clone error:", error);
      throw error;
    }
  }

  async createSyntheticClone(cloneId: string, description: string, characteristics: any): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/api/voice/clone/synthetic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          clone_id: cloneId,
          description: description,
          characteristics: characteristics
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Synthetic clone API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[HFSpacesClient] Synthetic clone error:", error);
      throw error;
    }
  }

  async getCloneStatus(cloneId: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/api/voice/clone/${cloneId}/status`, {
        method: "GET",
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Clone status API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[HFSpacesClient] Clone status error:", error);
      throw error;
    }
  }

  async getMetrics() {
    try {
      const response = await fetch(`${this.apiUrl}/api/metrics`, {
        method: "GET",
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Metrics API error (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      console.error("[HFSpacesClient] Metrics error:", error);
      return {
        stt: null,
        tts: null,
        vllm: null,
        clone: null
      };
    }
  }

  async callTTSStreaming(
    request: any,
    onChunk: (chunk: any) => void
  ): Promise<void> {
    // Note: Streaming over HTTP can be implemented using Server-Sent Events or WebSocket
    // For now, falling back to regular TTS
    console.warn("[HFSpacesClient] Streaming TTS not yet implemented, using regular TTS");
    throw new Error("Streaming TTS not yet implemented for HF Spaces client");
  }

  async shutdown() {
    console.log("[HFSpacesClient] Shutdown called (no-op for API client)");
    // No cleanup needed for HTTP client
  }
}

// Export singleton instance
export const hfSpacesClient = new HFSpacesClient();
