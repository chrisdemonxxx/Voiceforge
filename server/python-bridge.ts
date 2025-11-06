import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TTSRequest {
  text: string;
  model: string;
  voice?: string;
  speed?: number;
}

interface TTSResponse {
  status: "success" | "error";
  audio?: string;  // base64 encoded
  duration?: number;
  message?: string;
}

export class PythonBridge {
  private pythonPath: string;

  constructor() {
    // Use python3 from PATH
    this.pythonPath = "python3";
  }

  async callTTS(request: TTSRequest): Promise<Buffer> {
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
}

export const pythonBridge = new PythonBridge();
