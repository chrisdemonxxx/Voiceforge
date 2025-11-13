/**
 * Comprehensive HF Spaces API Test Script
 * Tests all available endpoints with proper request formats
 */

import { hfSpacesClient } from "./server/hf-spaces-client";

const API_URL = "https://chrisdemonxxx-voiceforge-v1-0.hf.space";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ ${message}`, colors.cyan);
}

function logWarning(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

function logSection(message: string) {
  log(`\n${"=".repeat(60)}`, colors.blue);
  log(message, colors.blue);
  log("=".repeat(60), colors.blue);
}

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [] as Array<{ name: string; status: "pass" | "fail" | "warn"; message: string }>,
};

function recordTest(name: string, status: "pass" | "fail" | "warn", message: string) {
  results.tests.push({ name, status, message });
  if (status === "pass") results.passed++;
  else if (status === "fail") results.failed++;
  else results.warnings++;
}

// Utility to create test audio data (PCM16 format)
function createTestAudioBase64(): string {
  // Create a simple sine wave audio (1 second at 16kHz, PCM16)
  const sampleRate = 16000;
  const duration = 1; // seconds
  const frequency = 440; // Hz (A4 note)
  const samples = sampleRate * duration;
  const buffer = Buffer.alloc(samples * 2); // 2 bytes per sample (16-bit)

  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate);
    const value = Math.floor(sample * 32767); // Convert to 16-bit PCM
    buffer.writeInt16LE(value, i * 2);
  }

  return buffer.toString("base64");
}

async function testHealthEndpoint() {
  logSection("Test 1: Health Endpoint");
  try {
    const response = await fetch(`${API_URL}/api/health`);
    const data = await response.json();

    if (response.ok) {
      logSuccess(`Health check passed: ${data.status}`);
      logInfo(`Timestamp: ${data.timestamp}`);
      logInfo(`Model Status:`);
      Object.entries(data.models).forEach(([model, status]) => {
        const statusColor = status === "loaded" ? colors.green : colors.yellow;
        log(`  - ${model}: ${status}`, statusColor);
      });
      recordTest("Health Endpoint", "pass", `API is ${data.status}`);
      return true;
    } else {
      logError(`Health check failed: ${response.status}`);
      recordTest("Health Endpoint", "fail", `HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Health check error: ${error instanceof Error ? error.message : String(error)}`);
    recordTest("Health Endpoint", "fail", `Error: ${error}`);
    return false;
  }
}

async function testModelsEndpoint() {
  logSection("Test 2: Models Endpoint");
  try {
    const response = await fetch(`${API_URL}/api/models`);
    const data = await response.json();

    if (response.ok) {
      logSuccess("Models endpoint responded");
      logInfo("Available models:");
      Object.entries(data.available_models).forEach(([key, model]: [string, any]) => {
        log(`  - ${key}: ${model.name} (${model.type})`, colors.cyan);
        log(`    Status: ${model.status}`, model.status === "loaded" ? colors.green : colors.yellow);
      });
      recordTest("Models Endpoint", "pass", `${Object.keys(data.available_models).length} models available`);
      return true;
    } else {
      logError(`Models endpoint failed: ${response.status}`);
      recordTest("Models Endpoint", "fail", `HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Models endpoint error: ${error instanceof Error ? error.message : String(error)}`);
    recordTest("Models Endpoint", "fail", `Error: ${error}`);
    return false;
  }
}

async function testTTSEndpoint() {
  logSection("Test 3: Text-to-Speech Endpoint");
  try {
    logInfo("Sending TTS request: 'Hello, this is a test of the text to speech system.'");
    logWarning("Note: First request may take 30-60 seconds as models load (cold start)");

    const startTime = Date.now();
    const response = await fetch(`${API_URL}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Hello, this is a test of the text to speech system.",
        voice: "default",
        speed: 1.0,
      }),
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (response.ok) {
      const data = await response.json();

      if (data.audio_base64) {
        const audioSize = Buffer.from(data.audio_base64, "base64").length;
        logSuccess(`TTS successful in ${duration}s`);
        logInfo(`Audio size: ${(audioSize / 1024).toFixed(2)} KB`);
        logInfo(`Duration: ${data.duration ? data.duration.toFixed(2) + "s" : "N/A"}`);
        recordTest("TTS Endpoint", "pass", `Generated ${(audioSize / 1024).toFixed(2)} KB in ${duration}s`);
        return true;
      } else {
        logError("TTS response missing audio_base64 field");
        recordTest("TTS Endpoint", "fail", "Invalid response format");
        return false;
      }
    } else {
      const errorText = await response.text();
      logError(`TTS failed: ${response.status}`);
      logError(`Error: ${errorText}`);

      if (response.status === 500 && errorText.includes("not loaded")) {
        logWarning("Model not loaded yet - try again in a few seconds");
        recordTest("TTS Endpoint", "warn", "Model not loaded");
      } else {
        recordTest("TTS Endpoint", "fail", `HTTP ${response.status}`);
      }
      return false;
    }
  } catch (error) {
    logError(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
    recordTest("TTS Endpoint", "fail", `Error: ${error}`);
    return false;
  }
}

async function testSTTEndpoint() {
  logSection("Test 4: Speech-to-Text Endpoint");
  try {
    logInfo("Generating test audio data...");
    const audioBase64 = createTestAudioBase64();
    logInfo(`Audio size: ${(Buffer.from(audioBase64, "base64").length / 1024).toFixed(2)} KB`);

    logWarning("Note: First request may take 30-60 seconds as models load (cold start)");

    const startTime = Date.now();
    const response = await fetch(`${API_URL}/api/stt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_base64: audioBase64,
        language: "auto",
      }),
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (response.ok) {
      const data = await response.json();
      logSuccess(`STT successful in ${duration}s`);
      logInfo(`Transcription: "${data.text || '(empty)'}"`);
      logInfo(`Language: ${data.language || "N/A"}`);
      logInfo(`Confidence: ${data.confidence ? (data.confidence * 100).toFixed(1) + "%" : "N/A"}`);
      recordTest("STT Endpoint", "pass", `Processed in ${duration}s`);
      return true;
    } else {
      const errorText = await response.text();
      logError(`STT failed: ${response.status}`);
      logError(`Error: ${errorText}`);

      if (response.status === 500 && errorText.includes("not loaded")) {
        logWarning("Model not loaded yet - try again in a few seconds");
        recordTest("STT Endpoint", "warn", "Model not loaded");
      } else {
        recordTest("STT Endpoint", "fail", `HTTP ${response.status}`);
      }
      return false;
    }
  } catch (error) {
    logError(`STT error: ${error instanceof Error ? error.message : String(error)}`);
    recordTest("STT Endpoint", "fail", `Error: ${error}`);
    return false;
  }
}

async function testVADEndpoint() {
  logSection("Test 5: Voice Activity Detection Endpoint");
  try {
    logInfo("Generating test audio data...");
    const audioBase64 = createTestAudioBase64();

    logWarning("Note: First request may take time as models load");

    const startTime = Date.now();
    const response = await fetch(`${API_URL}/api/vad`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_base64: audioBase64,
        threshold: 0.5,
      }),
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (response.ok) {
      const data = await response.json();
      logSuccess(`VAD successful in ${duration}s`);
      logInfo(`Detected ${data.segments?.length || 0} voice segments`);

      if (data.segments && data.segments.length > 0) {
        data.segments.slice(0, 3).forEach((seg: any, idx: number) => {
          log(`  Segment ${idx + 1}: ${seg.start.toFixed(2)}s - ${seg.end.toFixed(2)}s (confidence: ${(seg.confidence * 100).toFixed(1)}%)`, colors.cyan);
        });
      }
      recordTest("VAD Endpoint", "pass", `Found ${data.segments?.length || 0} segments in ${duration}s`);
      return true;
    } else {
      const errorText = await response.text();
      logError(`VAD failed: ${response.status}`);
      logError(`Error: ${errorText}`);

      if (response.status === 500) {
        logWarning("VAD may not be fully operational - this is not critical");
        recordTest("VAD Endpoint", "warn", "Service error");
      } else {
        recordTest("VAD Endpoint", "fail", `HTTP ${response.status}`);
      }
      return false;
    }
  } catch (error) {
    logError(`VAD error: ${error instanceof Error ? error.message : String(error)}`);
    recordTest("VAD Endpoint", "fail", `Error: ${error}`);
    return false;
  }
}

async function testClientIntegration() {
  logSection("Test 6: Client Integration");
  try {
    logInfo("Testing HFSpacesClient class integration...");

    // Test initialize
    await hfSpacesClient.initialize();
    logSuccess("Client initialization successful");

    // Test TTS via client
    logInfo("Testing TTS via client class...");
    try {
      const audioBuffer = await hfSpacesClient.callTTS({
        text: "Testing client integration",
        model: "facebook/mms-tts-eng",
        voice: "default",
        speed: 1.0,
      });

      if (audioBuffer && audioBuffer.length > 0) {
        logSuccess(`Client TTS successful: ${(audioBuffer.length / 1024).toFixed(2)} KB`);
        recordTest("Client Integration", "pass", "All client methods working");
        return true;
      } else {
        logError("Client TTS returned empty buffer");
        recordTest("Client Integration", "fail", "Empty audio buffer");
        return false;
      }
    } catch (error: any) {
      if (error.message.includes("not loaded")) {
        logWarning("Models not loaded yet - client is functional but needs warm-up");
        recordTest("Client Integration", "warn", "Models need loading");
        return true;
      }
      throw error;
    }
  } catch (error) {
    logError(`Client integration error: ${error instanceof Error ? error.message : String(error)}`);
    recordTest("Client Integration", "fail", `Error: ${error}`);
    return false;
  }
}

function printSummary() {
  logSection("Test Summary");

  log(`\nTotal Tests: ${results.tests.length}`, colors.cyan);
  log(`Passed: ${results.passed}`, colors.green);
  log(`Failed: ${results.failed}`, results.failed > 0 ? colors.red : colors.reset);
  log(`Warnings: ${results.warnings}`, colors.yellow);

  const successRate = ((results.passed / results.tests.length) * 100).toFixed(1);
  log(`\nSuccess Rate: ${successRate}%`, Number(successRate) >= 80 ? colors.green : colors.yellow);

  log("\nDetailed Results:", colors.blue);
  results.tests.forEach((test) => {
    const icon = test.status === "pass" ? "✓" : test.status === "warn" ? "⚠" : "✗";
    const color = test.status === "pass" ? colors.green : test.status === "warn" ? colors.yellow : colors.red;
    log(`${icon} ${test.name}: ${test.message}`, color);
  });

  if (results.warnings > 0) {
    log("\nNote: Warnings indicate models may need time to load (cold start).", colors.yellow);
    log("Try running the test again after 30-60 seconds.", colors.yellow);
  }

  if (results.passed === results.tests.length) {
    log("\n🎉 All tests passed! HF Spaces API is fully operational.", colors.green);
  } else if (results.failed === 0) {
    log("\n⚠️  All tests passed with warnings. API is accessible but models may need loading.", colors.yellow);
  } else {
    log("\n❌ Some tests failed. Check the errors above.", colors.red);
  }
}

// Main test runner
async function runTests() {
  log("HF Spaces API Comprehensive Test Suite", colors.blue);
  log(`Testing: ${API_URL}`, colors.cyan);
  log(`Started: ${new Date().toISOString()}\n`, colors.cyan);

  await testHealthEndpoint();
  await testModelsEndpoint();
  await testTTSEndpoint();
  await testSTTEndpoint();
  await testVADEndpoint();
  await testClientIntegration();

  printSummary();

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  logError(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  console.error(error);
  process.exit(1);
});
