import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, MicOff, Play, Pause, Activity, Zap, MessageSquare, Volume2, Download, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import type { WSClientMessage, WSServerMessage, ApiKey } from "@shared/schema";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SessionConfig {
  mode: "voice" | "text" | "hybrid";
  sttEnabled: boolean;
  ttsEnabled: boolean;
  agentEnabled: boolean;
  agentMode: "echo" | "assistant" | "conversational" | "custom";
  systemPrompt?: string;
  model: "chatterbox" | "higgs_audio_v2" | "styletts2";
  language: string;
  voice?: string;
}

interface LatencyMetrics {
  stt: number | null;
  tts: number | null;
  agent: number | null;
  endToEnd: number | null;
}

interface ConversationMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  latency?: number;
}

export default function RealTimeLab() {
  // Fetch API keys for authentication
  const { data: apiKeys } = useQuery<ApiKey[]>({
    queryKey: ["/api/keys"],
  });

  const activeApiKey = apiKeys?.find(key => key.active);

  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [config, setConfig] = useState<SessionConfig>({
    mode: "hybrid",
    sttEnabled: true,
    ttsEnabled: true,
    agentEnabled: true,
    agentMode: "assistant",
    model: "chatterbox",
    language: "en",
  });
  
  const [latency, setLatency] = useState<LatencyMetrics>({
    stt: null,
    tts: null,
    agent: null,
    endToEnd: null,
  });
  
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [systemMetrics, setSystemMetrics] = useState({ activeConnections: 0, queueDepth: 0 });
  const [metricsView, setMetricsView] = useState<"live" | "historical">("live");
  const [latencyHistory, setLatencyHistory] = useState<Array<{timestamp: number; stt: number; agent: number; tts: number; e2e: number}>>([]);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioWorkletRef = useRef<AudioWorkletNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const audioBufferQueueRef = useRef<AudioBuffer[]>([]);
  
  // Helper to get WebSocket URL
  const getWebSocketUrl = () => {
    // If VITE_API_URL is set, use it for WebSocket (direct backend connection)
    if (import.meta.env.VITE_API_URL) {
      const apiUrl = import.meta.env.VITE_API_URL;
      // Convert http/https to ws/wss
      const wsUrl = apiUrl.replace(/^http/, "ws");
      return `${wsUrl}/ws/realtime`;
    }
    
    // If VITE_WS_URL is explicitly set, use it
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }
    
    // Default: connect directly to Render backend
    // Vercel doesn't support WebSocket proxying, so we need direct connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//voiceforge-api.onrender.com/ws/realtime`;
  };

  // WebSocket connection
  const connect = () => {
    if (!activeApiKey) {
      console.error("[RealTimeLab] No active API key found");
      return;
    }

    const wsUrl = getWebSocketUrl();
    console.log("[RealTimeLab] Connecting to WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log("[RealTimeLab] WebSocket connected");
      setConnected(true);
      
      // Send init message with API key
      const initMessage: WSClientMessage = {
        type: "init",
        eventId: generateEventId(),
        apiKey: activeApiKey.key,
        config,
      };
      ws.send(JSON.stringify(initMessage));
    };
    
    ws.onmessage = (event) => {
      try {
        const message: WSServerMessage = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (error) {
        console.error("[RealTimeLab] Message parse error:", error);
      }
    };
    
    ws.onclose = () => {
      console.log("[RealTimeLab] WebSocket disconnected");
      setConnected(false);
      setSessionId(null);
    };
    
    ws.onerror = (error) => {
      console.error("[RealTimeLab] WebSocket error:", error);
    };
    
    wsRef.current = ws;
  };
  
  const disconnect = () => {
    if (wsRef.current) {
      const endMessage: WSClientMessage = {
        type: "end",
        eventId: generateEventId(),
      };
      wsRef.current.send(JSON.stringify(endMessage));
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setSessionId(null);
    stopRecording();
  };
  
  // Handle server messages
  const handleServerMessage = (message: WSServerMessage) => {
    switch (message.type) {
      case "session_created":
        setSessionId(message.sessionId);
        console.log("[RealTimeLab] Session created:", message.sessionId);
        break;
        
      case "stt_partial":
        setPartialTranscript(message.text);
        break;
        
      case "stt_final":
        setPartialTranscript("");
        setConversation(prev => [...prev, {
          role: "user",
          text: message.text,
          timestamp: Date.now(),
        }]);
        break;
        
      case "agent_response":
        setConversation(prev => [...prev, {
          role: "assistant",
          text: message.text,
          timestamp: Date.now(),
          latency: message.latency,
        }]);
        if (message.latency) {
          setLatency(prev => ({ ...prev, agent: message.latency }));
        }
        break;
        
      case "tts_audio":
        // Handle audio playback
        if (message.audioBase64) {
          playAudioChunk(message.audioBase64);
        }
        if (message.latency) {
          setLatency(prev => ({ ...prev, tts: message.latency }));
        }
        break;
        
      case "metrics":
        if (message.metrics) {
          setSystemMetrics({
            activeConnections: message.metrics.activeConnections || 0,
            queueDepth: message.metrics.queueDepth || 0,
          });
          if (message.metrics.latency) {
            setLatency(message.metrics.latency);
            // Update history
            setLatencyHistory(prev => {
              const newEntry = {
                timestamp: Date.now(),
                stt: message.metrics?.latency?.stt || 0,
                agent: message.metrics?.latency?.agent || 0,
                tts: message.metrics?.latency?.tts || 0,
                e2e: message.metrics?.latency?.endToEnd || 0,
              };
              const updated = [...prev, newEntry].slice(-50); // Keep last 50 entries
              return updated;
            });
          }
        }
        break;
        
      case "error":
        console.error("[RealTimeLab] Server error:", message.error);
        break;
    }
  };
  
  const generateEventId = () => {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  };
  
  const startRecording = async () => {
    if (!connected || !sessionId) {
      alert("Please connect to WebSocket first");
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // Try to use AudioWorklet (modern approach)
      try {
        await audioContext.audioWorklet.addModule("/audio-processor.js");
        const workletNode = new AudioWorkletNode(audioContext, "audio-processor");
        workletNode.port.onmessage = (event) => {
          if (event.data.type === "audioData" && wsRef.current?.readyState === WebSocket.OPEN) {
            const message: WSClientMessage = {
              type: "audio_chunk",
              eventId: generateEventId(),
              audioBase64: event.data.audioData,
              sessionId: sessionId!,
            };
            wsRef.current.send(JSON.stringify(message));
          }
        };
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(workletNode);
        audioWorkletRef.current = workletNode;
      } catch (workletError) {
        // Fallback to ScriptProcessorNode
        console.warn("[RealTimeLab] AudioWorklet not available, using ScriptProcessorNode");
        const bufferSize = 4096;
        const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
        
        processor.onaudioprocess = (event) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const inputData = event.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
            }
            const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
            
            const message: WSClientMessage = {
              type: "audio_chunk",
              eventId: generateEventId(),
              audioBase64: base64,
              sessionId: sessionId!,
            };
            wsRef.current.send(JSON.stringify(message));
          }
        };
        
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(processor);
        processor.connect(audioContext.destination);
        scriptProcessorRef.current = processor;
      }
      
      setRecording(true);
    } catch (error) {
      console.error("[RealTimeLab] Failed to start recording:", error);
      alert("Failed to access microphone. Please check permissions.");
    }
  };
  
  const stopRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioWorkletRef.current) {
      audioWorkletRef.current.disconnect();
      audioWorkletRef.current = null;
    }
    
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setRecording(false);
  };
  
  const playAudioChunk = (audioBase64: string) => {
    try {
      const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
      const audioContext = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      
      audioContext.decodeAudioData(audioData.buffer).then(audioBuffer => {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
      }).catch(error => {
        console.error("[RealTimeLab] Failed to decode audio:", error);
      });
    } catch (error) {
      console.error("[RealTimeLab] Failed to play audio chunk:", error);
    }
  };
  
  const sendTextMessage = () => {
    if (!connected || !sessionId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert("Please connect to WebSocket first");
      return;
    }
    
    const input = document.getElementById("text-input") as HTMLInputElement;
    if (!input || !input.value.trim()) return;
    
    const message: WSClientMessage = {
      type: "text_message",
      eventId: generateEventId(),
      text: input.value,
      sessionId: sessionId,
    };
    
    wsRef.current.send(JSON.stringify(message));
    input.value = "";
  };
  
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);
  
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Real-Time Testing Playground</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Test voice AI in real-time with live audio streaming
          </p>
        </div>

        {/* Connection Status */}
        {!activeApiKey && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No active API key found. Please create and activate an API key in the API Keys page to use the Real-Time Testing Playground.
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Connection</CardTitle>
            <CardDescription>Connect to the real-time voice AI service</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant={connected ? "default" : "secondary"}>
                {connected ? "Connected" : "Disconnected"}
              </Badge>
              {sessionId && (
                <Badge variant="outline">Session: {sessionId.substring(0, 8)}...</Badge>
              )}
              {!connected ? (
                <Button onClick={connect} disabled={!activeApiKey}>
                  Connect
                </Button>
              ) : (
                <Button onClick={disconnect} variant="destructive">
                  Disconnect
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Configure your real-time session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select
                  value={config.mode}
                  onValueChange={(value: "voice" | "text" | "hybrid") =>
                    setConfig(prev => ({ ...prev, mode: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voice">Voice Only</SelectItem>
                    <SelectItem value="text">Text Only</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Model</Label>
                <Select
                  value={config.model}
                  onValueChange={(value: "chatterbox" | "higgs_audio_v2" | "styletts2") =>
                    setConfig(prev => ({ ...prev, model: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chatterbox">Chatterbox</SelectItem>
                    <SelectItem value="higgs_audio_v2">Higgs Audio v2</SelectItem>
                    <SelectItem value="styletts2">StyleTTS2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Speech-to-Text (STT)</Label>
                <Switch
                  checked={config.sttEnabled}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({ ...prev, sttEnabled: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Text-to-Speech (TTS)</Label>
                <Switch
                  checked={config.ttsEnabled}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({ ...prev, ttsEnabled: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>AI Agent</Label>
                <Switch
                  checked={config.agentEnabled}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({ ...prev, agentEnabled: checked }))
                  }
                />
              </div>
            </div>
            
            {config.agentEnabled && (
              <div className="space-y-2">
                <Label>Agent Mode</Label>
                <Select
                  value={config.agentMode}
                  onValueChange={(value: "echo" | "assistant" | "conversational" | "custom") =>
                    setConfig(prev => ({ ...prev, agentMode: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="echo">Echo</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                    <SelectItem value="conversational">Conversational</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voice Input */}
        {connected && (
          <Card>
            <CardHeader>
              <CardTitle>Voice Input</CardTitle>
              <CardDescription>Record and stream audio in real-time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={recording ? stopRecording : startRecording}
                  variant={recording ? "destructive" : "default"}
                  size="lg"
                >
                  {recording ? (
                    <>
                      <MicOff className="mr-2 h-4 w-4" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Start Recording
                    </>
                  )}
                </Button>
                
                {recording && (
                  <div className="flex-1">
                    <Progress value={audioLevel} className="h-2" />
                  </div>
                )}
              </div>
              
              {partialTranscript && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Partial transcript:</p>
                  <p className="mt-1">{partialTranscript}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Text Input */}
        {connected && config.mode !== "voice" && (
          <Card>
            <CardHeader>
              <CardTitle>Text Input</CardTitle>
              <CardDescription>Send text messages to the AI agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <input
                  id="text-input"
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border rounded-lg"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      sendTextMessage();
                    }
                  }}
                />
                <Button onClick={sendTextMessage}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conversation */}
        {conversation.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
              <CardDescription>View the conversation history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {conversation.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${
                      msg.role === "user" ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={msg.role === "user" ? "default" : "secondary"}>
                        {msg.role === "user" ? "You" : "Assistant"}
                      </Badge>
                      {msg.latency && (
                        <span className="text-xs text-muted-foreground">
                          {msg.latency}ms
                        </span>
                      )}
                    </div>
                    <p>{msg.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Latency Metrics */}
        {connected && (
          <Card>
            <CardHeader>
              <CardTitle>Latency Metrics</CardTitle>
              <CardDescription>Real-time performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={metricsView} onValueChange={(v) => setMetricsView(v as "live" | "historical")}>
                <TabsList>
                  <TabsTrigger value="live">Live</TabsTrigger>
                  <TabsTrigger value="historical">Historical</TabsTrigger>
                </TabsList>
                
                <TabsContent value="live" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">STT</p>
                      <p className="text-2xl font-bold">
                        {latency.stt !== null ? `${latency.stt}ms` : "—"}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Agent</p>
                      <p className="text-2xl font-bold">
                        {latency.agent !== null ? `${latency.agent}ms` : "—"}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">TTS</p>
                      <p className="text-2xl font-bold">
                        {latency.tts !== null ? `${latency.tts}ms` : "—"}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">End-to-End</p>
                      <p className="text-2xl font-bold">
                        {latency.endToEnd !== null ? `${latency.endToEnd}ms` : "—"}
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="historical">
                  {latencyHistory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={latencyHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="stt" stroke="#8884d8" name="STT" />
                        <Line type="monotone" dataKey="agent" stroke="#82ca9d" name="Agent" />
                        <Line type="monotone" dataKey="tts" stroke="#ffc658" name="TTS" />
                        <Line type="monotone" dataKey="e2e" stroke="#ff7300" name="E2E" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No historical data yet
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* System Metrics */}
        {connected && (
          <Card>
            <CardHeader>
              <CardTitle>System Metrics</CardTitle>
              <CardDescription>Server-side performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Active Connections</p>
                  <p className="text-2xl font-bold">{systemMetrics.activeConnections}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Queue Depth</p>
                  <p className="text-2xl font-bold">{systemMetrics.queueDepth}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}