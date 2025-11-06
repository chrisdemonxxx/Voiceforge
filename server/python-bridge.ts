import { spawn, ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { v4 as uuidv4 } from "uuid";
import { EventEmitter } from "events";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TTSRequest {
  text: string;
  model: string;
  voice?: string;
  speed?: number;
  voice_characteristics?: any;
}

interface TTSResponse {
  status: "success" | "error";
  audio?: string;  // base64 encoded
  duration?: number;
  message?: string;
}

interface TTSStreamingRequest {
  text: string;
  model: string;
  voice?: string;
  speed?: number;
  chunk_duration_ms?: number;
  reference_audio?: string;
}

interface TTSChunkResponse {
  type: "tts_chunk" | "error";
  status: "success" | "error";
  chunk?: string;  // base64 encoded audio chunk
  sequence?: number;
  done?: boolean;
  latency_ms?: number;
  model_info?: {
    model: string;
    quality: number;
    sample_rate: number;
    emotional_range: string;
  };
  duration_ms?: number;
  message?: string;
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

interface WorkerTask {
  task_id: string;
  data: any;
  priority: number;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  submitted_at: number;
}

interface WorkerPoolMetrics {
  worker_type: string;
  num_workers: number;
  alive_workers: number;
  tasks_submitted: number;
  tasks_completed: number;
  tasks_failed: number;
  queue_depth: number;
  worker_utilization: number;
}

type WorkerType = "stt" | "tts" | "vllm";

class WorkerPool {
  private process: ChildProcess | null = null;
  private workerType: WorkerType;
  private numWorkers: number;
  private pendingTasks: Map<string, WorkerTask> = new Map();
  private ready: boolean = false;
  private eventEmitter: EventEmitter = new EventEmitter();
  private outputBuffer: string = "";
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  constructor(workerType: WorkerType, numWorkers: number = 2) {
    this.workerType = workerType;
    this.numWorkers = numWorkers;
  }
  
  async start(): Promise<void> {
    if (this.process) {
      throw new Error("Worker pool already started");
    }
    
    const scriptPath = path.join(__dirname, "ml-services", "worker_pool.py");
    
    return new Promise((resolve, reject) => {
      this.process = spawn("python3", [
        scriptPath,
        "--workers", String(this.numWorkers),
        "--worker-type", this.workerType
      ]);
      
      if (!this.process.stdout || !this.process.stdin || !this.process.stderr) {
        reject(new Error("Failed to create worker pool process streams"));
        return;
      }
      
      // Handle stdout - parse JSON responses
      this.process.stdout.on("data", (data) => {
        this.outputBuffer += data.toString();
        
        // Process complete JSON messages
        const lines = this.outputBuffer.split("\n");
        this.outputBuffer = lines.pop() || "";
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const message = JSON.parse(line);
            this.handleMessage(message);
          } catch (error) {
            console.error("[PythonBridge] Failed to parse message:", line, error);
          }
        }
      });
      
      // Handle stderr - log errors
      this.process.stderr.on("data", (data) => {
        const message = data.toString().trim();
        if (message) {
          console.log(`[WorkerPool:${this.workerType}]`, message);
        }
      });
      
      // Handle process exit
      this.process.on("close", (code) => {
        console.log(`[WorkerPool:${this.workerType}] Process exited with code ${code}`);
        this.ready = false;
        
        // Reject all pending tasks
        for (const [taskId, task] of Array.from(this.pendingTasks.entries())) {
          task.reject(new Error("Worker pool process terminated"));
        }
        this.pendingTasks.clear();
      });
      
      this.process.on("error", (error) => {
        console.error(`[WorkerPool:${this.workerType}] Process error:`, error);
        reject(error);
      });
      
      // Wait for ready signal
      this.eventEmitter.once("ready", () => {
        this.ready = true;
        console.log(`[WorkerPool:${this.workerType}] Ready with ${this.numWorkers} workers`);
        
        // Start health check
        this.startHealthCheck();
        
        resolve();
      });
      
      // Timeout if not ready in 10 seconds
      setTimeout(() => {
        if (!this.ready) {
          reject(new Error("Worker pool startup timeout"));
        }
      }, 10000);
    });
  }
  
  private handleMessage(message: any) {
    const type = message.type;
    
    if (type === "ready") {
      this.eventEmitter.emit("ready");
    } else if (type === "task_submitted") {
      // Task acknowledged, will get result later
      const taskId = message.task_id;
      const latency = message.submission_latency;
      
      // Optionally track submission latency
      if (latency > 50) {
        console.warn(`[WorkerPool:${this.workerType}] High submission latency: ${latency}ms`);
      }
    } else if (type === "task_result") {
      // Task completed
      const taskId = message.task_id;
      const task = this.pendingTasks.get(taskId);
      
      if (!task) {
        console.warn(`[WorkerPool:${this.workerType}] Received result for unknown task: ${taskId}`);
        return;
      }
      
      this.pendingTasks.delete(taskId);
      
      if (message.status === "success") {
        task.resolve(message.result);
      } else {
        task.reject(new Error(message.error || "Task failed"));
      }
    } else if (type === "no_result") {
      // No result available yet, will retry
    } else if (type === "metrics") {
      // Metrics update
      this.eventEmitter.emit("metrics", message);
    } else if (type === "error") {
      console.error(`[WorkerPool:${this.workerType}] Error:`, message.error);
    }
  }
  
  private startHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      this.sendCommand({ type: "health_check" });
      this.sendCommand({ type: "get_result", timeout: 0.1 });
    }, 5000);
  }
  
  private sendCommand(command: any) {
    if (!this.process || !this.process.stdin) {
      throw new Error("Worker pool not started");
    }
    
    this.process.stdin.write(JSON.stringify(command) + "\n");
  }
  
  async submitTask(data: any, priority: number = 0): Promise<any> {
    if (!this.ready) {
      throw new Error("Worker pool not ready");
    }
    
    const taskId = uuidv4();
    const submittedAt = Date.now();
    
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        task_id: taskId,
        data,
        priority,
        resolve,
        reject,
        submitted_at: submittedAt
      };
      
      this.pendingTasks.set(taskId, task);
      
      // Submit task to pool
      this.sendCommand({
        type: "submit_task",
        task_id: taskId,
        data,
        priority
      });
      
      // Start polling for results
      this.pollForResult(taskId);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingTasks.has(taskId)) {
          this.pendingTasks.delete(taskId);
          reject(new Error("Task timeout"));
        }
      }, 30000);
    });
  }
  
  private async pollForResult(taskId: string) {
    // Poll for result every 100ms
    const interval = setInterval(() => {
      if (!this.pendingTasks.has(taskId)) {
        clearInterval(interval);
        return;
      }
      
      this.sendCommand({
        type: "get_result",
        timeout: 0.1
      });
    }, 100);
  }
  
  async getMetrics(): Promise<WorkerPoolMetrics> {
    return new Promise((resolve, reject) => {
      this.eventEmitter.once("metrics", (metrics) => {
        resolve(metrics);
      });
      
      this.sendCommand({ type: "get_metrics" });
      
      setTimeout(() => reject(new Error("Metrics timeout")), 5000);
    });
  }
  
  async shutdown() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.process) {
      this.sendCommand({ type: "shutdown" });
      
      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        if (!this.process) {
          resolve();
          return;
        }
        
        this.process.once("close", () => resolve());
        
        setTimeout(() => {
          if (this.process) {
            this.process.kill("SIGTERM");
          }
          resolve();
        }, 5000);
      });
      
      this.process = null;
    }
    
    this.ready = false;
  }
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

export class PythonBridge {
  private pythonPath: string;
  private sttPool: WorkerPool | null = null;
  private ttsPool: WorkerPool | null = null;
  private vllmPool: WorkerPool | null = null;
  
  constructor() {
    // Use python3 from PATH
    this.pythonPath = "python3";
  }
  
  async initialize() {
    console.log("[PythonBridge] Initializing worker pools...");
    
    // Start STT worker pool (2 workers)
    this.sttPool = new WorkerPool("stt", 2);
    await this.sttPool.start();
    
    // Start TTS worker pool (2 workers)
    this.ttsPool = new WorkerPool("tts", 2);
    await this.ttsPool.start();
    
    // Start VLLM worker pool (1 worker for now, can scale up)
    this.vllmPool = new WorkerPool("vllm", 1);
    await this.vllmPool.start();
    
    console.log("[PythonBridge] Worker pools initialized");
  }
  
  async processSTTChunk(request: STTChunkRequest): Promise<STTChunkResponse> {
    if (!this.sttPool) {
      throw new Error("STT worker pool not initialized");
    }
    
    const result = await this.sttPool.submitTask(request, 0);
    return result as STTChunkResponse;
  }
  
  async callTTS(request: TTSRequest): Promise<Buffer> {
    // If using Hugging Face Indic Parler TTS model, route to HF service
    if (request.model === "indic-parler-tts") {
      return this.callHuggingFaceTTS(request);
    }
    
    if (!this.ttsPool) {
      // Fallback to spawn mode if pool not initialized
      return this.callTTSSpawn(request);
    }
    
    try {
      const result = await this.ttsPool.submitTask(request, 0);
      
      if (!result.audio) {
        throw new Error("No audio data in response");
      }
      
      // Decode base64 audio to buffer
      const audioBuffer = Buffer.from(result.audio, "base64");
      return audioBuffer;
    } catch (error) {
      console.error("[PythonBridge] TTS pool error, falling back to spawn:", error);
      return this.callTTSSpawn(request);
    }
  }
  
  private async callHuggingFaceTTS(request: TTSRequest): Promise<Buffer> {
    const scriptPath = path.join(__dirname, "ml-services", "huggingface_tts_service.py");
    
    return new Promise(async (resolve, reject) => {
      const python = spawn(this.pythonPath, [scriptPath]);
      
      let stdoutData = "";
      let stderrData = "";

      if (!python.stdout || !python.stdin || !python.stderr) {
        reject(new Error("Failed to create Hugging Face TTS process streams"));
        return;
      }

      python.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      python.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      python.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`HF TTS process exited with code ${code}: ${stderrData}`));
          return;
        }

        try {
          const response: TTSResponse = JSON.parse(stdoutData);
          
          if (response.status === "error") {
            reject(new Error(`HF TTS error: ${response.message}`));
            return;
          }

          if (!response.audio) {
            reject(new Error("No audio data in HF TTS response"));
            return;
          }

          // Decode base64 audio
          const audioBuffer = Buffer.from(response.audio, "base64");
          resolve(audioBuffer);
        } catch (error) {
          reject(new Error(`Failed to parse HF TTS response: ${error}`));
        }
      });

      python.on("error", (error) => {
        reject(new Error(`Failed to spawn HF TTS process: ${error.message}`));
      });

      // Look up voice from voice library
      let voicePrompt = "Speaks in a clear and expressive voice";
      let language = "Hindi";
      
      if (request.voice) {
        try {
          // Import voice library from shared module
          const { VOICE_LIBRARY } = await import("@shared/voices");
          const voice = VOICE_LIBRARY.find((v) => v.id === request.voice);
          
          if (voice) {
            voicePrompt = voice.prompt;
            language = voice.language;
          }
        } catch (error) {
          console.warn("[HF TTS] Failed to load voice library, using defaults:", error);
        }
      }

      // Prepare request for Hugging Face service
      const hfRequest = {
        text: request.text,
        voice_prompt: voicePrompt,
        language: language,
      };

      python.stdin.write(JSON.stringify(hfRequest) + "\n");
      python.stdin.end();
    });
  }
  
  async callTTSStreaming(
    request: TTSStreamingRequest,
    onChunk: (chunk: TTSChunkResponse) => void
  ): Promise<void> {
    const scriptPath = path.join(__dirname, "ml-services", "tts_streaming.py");
    
    return new Promise((resolve, reject) => {
      const python = spawn(this.pythonPath, [scriptPath]);
      
      let outputBuffer = "";
      
      if (!python.stdout || !python.stdin || !python.stderr) {
        reject(new Error("Failed to create streaming TTS process streams"));
        return;
      }
      
      // Handle stdout - parse JSON chunks
      python.stdout.on("data", (data) => {
        outputBuffer += data.toString();
        
        // Process complete JSON messages
        const lines = outputBuffer.split("\n");
        outputBuffer = lines.pop() || "";
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const chunk: TTSChunkResponse = JSON.parse(line);
            onChunk(chunk);
          } catch (error) {
            console.error("[PythonBridge] Failed to parse TTS chunk:", line, error);
          }
        }
      });
      
      // Handle stderr - log messages
      python.stderr.on("data", (data) => {
        const message = data.toString().trim();
        if (message) {
          console.log(`[TTS Streaming]`, message);
        }
      });
      
      // Handle process completion
      python.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`TTS streaming process exited with code ${code}`));
          return;
        }
        resolve();
      });
      
      python.on("error", (error) => {
        reject(new Error(`Failed to spawn TTS streaming process: ${error.message}`));
      });
      
      // Send request with streaming enabled
      const streamingRequest = {
        ...request,
        streaming: true,
      };
      python.stdin.write(JSON.stringify(streamingRequest) + "\n");
      python.stdin.end();
    });
  }
  
  private async callTTSSpawn(request: TTSRequest): Promise<Buffer> {
    const scriptPath = path.join(__dirname, "ml-services", "tts_service.py");
    
    return new Promise((resolve, reject) => {
      const python = spawn(this.pythonPath, [scriptPath]);
      
      let stdoutData = "";
      let stderrData = "";

      python.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      python.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      python.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${stderrData}`));
          return;
        }

        try {
          const response: TTSResponse = JSON.parse(stdoutData);
          
          if (response.status === "error") {
            reject(new Error(response.message || "TTS service error"));
            return;
          }

          if (!response.audio) {
            reject(new Error("No audio data in response"));
            return;
          }

          // Decode base64 audio to buffer
          const audioBuffer = Buffer.from(response.audio, "base64");
          resolve(audioBuffer);
        } catch (error) {
          reject(new Error(`Failed to parse Python response: ${error}`));
        }
      });

      python.on("error", (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });

      // Send request to Python service via stdin
      python.stdin.write(JSON.stringify(request) + "\n");
      python.stdin.end();
    });
  }
  
  async callVLLM(request: VLLMRequest): Promise<VLLMResponse> {
    if (!this.vllmPool) {
      throw new Error("VLLM worker pool not initialized");
    }
    
    try {
      const result = await this.vllmPool.submitTask(request, 0);
      
      if (!result.response) {
        throw new Error("No response from VLLM agent");
      }
      
      return result as VLLMResponse;
    } catch (error) {
      console.error("[PythonBridge] VLLM error:", error);
      
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
    const scriptPath = path.join(__dirname, "ml-services", "voice_cloning_service.py");
    
    return new Promise((resolve, reject) => {
      const python = spawn(this.pythonPath, [scriptPath]);
      
      let outputBuffer = "";
      let stderrData = "";

      if (!python.stdout || !python.stdin || !python.stderr) {
        reject(new Error("Failed to create voice cloning process streams"));
        return;
      }

      // Handle stdout
      python.stdout.on("data", (data) => {
        outputBuffer += data.toString();
        
        // Process complete JSON messages
        const lines = outputBuffer.split("\n");
        outputBuffer = lines.pop() || "";
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const message = JSON.parse(line);
            
            // Handle ready message
            if (message.status === "ready") {
              // Send analyze command
              const request = {
                command: "analyze",
                audio: audioBuffer.toString("base64")
              };
              python.stdin.write(JSON.stringify(request) + "\n");
              python.stdin.end();
            }
            // Handle response
            else if (message.success !== undefined) {
              if (message.success) {
                resolve(message.result);
              } else {
                reject(new Error(message.error || "Voice analysis failed"));
              }
              python.kill();
            }
          } catch (error) {
            console.error("[VoiceCloning] Failed to parse message:", line, error);
          }
        }
      });

      python.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      python.on("close", (code) => {
        if (code !== 0 && code !== null) {
          reject(new Error(`Voice cloning process exited with code ${code}: ${stderrData}`));
        }
      });

      python.on("error", (error) => {
        reject(new Error(`Failed to spawn voice cloning process: ${error.message}`));
      });
    });
  }

  async getMetrics() {
    const metrics: any = {
      stt: null,
      tts: null,
      vllm: null
    };
    
    if (this.sttPool) {
      try {
        metrics.stt = await this.sttPool.getMetrics();
      } catch (error) {
        console.error("[PythonBridge] Failed to get STT metrics:", error);
      }
    }
    
    if (this.ttsPool) {
      try {
        metrics.tts = await this.ttsPool.getMetrics();
      } catch (error) {
        console.error("[PythonBridge] Failed to get TTS metrics:", error);
      }
    }
    
    if (this.vllmPool) {
      try {
        metrics.vllm = await this.vllmPool.getMetrics();
      } catch (error) {
        console.error("[PythonBridge] Failed to get VLLM metrics:", error);
      }
    }
    
    return metrics;
  }
  
  async shutdown() {
    console.log("[PythonBridge] Shutting down worker pools...");
    
    if (this.sttPool) {
      await this.sttPool.shutdown();
    }
    
    if (this.ttsPool) {
      await this.ttsPool.shutdown();
    }
    
    if (this.vllmPool) {
      await this.vllmPool.shutdown();
    }
    
    console.log("[PythonBridge] Worker pools shut down");
  }
}

export const pythonBridge = new PythonBridge();
