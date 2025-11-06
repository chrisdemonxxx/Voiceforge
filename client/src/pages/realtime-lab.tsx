import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Mic, MicOff, Play, Pause, Activity, Zap, MessageSquare, Volume2 } from "lucide-react";
import type { WSClientMessage, WSServerMessage } from "@shared/schema";

interface SessionConfig {
  mode: "voice" | "text" | "hybrid";
  sttEnabled: boolean;
  ttsEnabled: boolean;
  agentEnabled: boolean;
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
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: number;
  latency?: number;
}

export default function RealTimeLab() {
  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [config, setConfig] = useState<SessionConfig>({
    mode: "hybrid",
    sttEnabled: true,
    ttsEnabled: true,
    agentEnabled: true,
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
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioWorkletRef = useRef<AudioWorkletNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const audioBufferQueueRef = useRef<AudioBuffer[]>([]);
  
  // WebSocket connection
  const connect = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/realtime`);
    
    ws.onopen = () => {
      console.log("[RealTimeLab] WebSocket connected");
      setConnected(true);
      
      // Send init message
      const initMessage: WSClientMessage = {
        type: "init",
        eventId: generateEventId(),
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
      case "ready":
        setSessionId(message.sessionId);
        console.log("[RealTimeLab] Session ready:", message.sessionId);
        break;
        
      case "stt_partial":
        setPartialTranscript(message.text);
        break;
        
      case "stt_final":
        setPartialTranscript("");
        addMessage("user", message.text, message.latency.total);
        setLatency(prev => ({ ...prev, stt: message.latency.total }));
        break;
        
      case "agent_reply":
        addMessage("agent", message.text);
        break;
        
      case "tts_chunk":
        playTTSChunk(message.chunk);
        break;
        
      case "tts_complete":
        setLatency(prev => ({ ...prev, tts: message.latency.total }));
        break;
        
      case "metrics":
        if (message.metrics.endToEndLatency) {
          setLatency(prev => ({ ...prev, endToEnd: message.metrics.endToEndLatency || null }));
        }
        setSystemMetrics({
          activeConnections: message.metrics.activeConnections,
          queueDepth: message.metrics.queueDepth,
        });
        break;
        
      case "error":
        console.error("[RealTimeLab] Server error:", message.message);
        break;
        
      case "ended":
        console.log("[RealTimeLab] Session ended:", message.stats);
        disconnect();
        break;
    }
  };
  
  // Audio capture with real streaming
  const startRecording = async () => {
    if (!wsRef.current || !connected) {
      alert("Please connect to WebSocket first");
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      mediaStreamRef.current = stream;
      
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create analyzer for audio level visualization
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      
      // Monitor audio level
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateLevel = () => {
        if (!recording) return;
        analyzer.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average / 255 * 100);
        requestAnimationFrame(updateLevel);
      };
      updateLevel();
      
      // Create ScriptProcessor for audio capture (20ms frames = 320 samples at 16kHz)
      const bufferSize = 4096; // Will process in smaller chunks
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      scriptProcessorRef.current = processor;
      
      // Collect audio data and send to server
      let audioBuffer: number[] = [];
      const targetFrameSize = 320; // 20ms at 16kHz
      
      processor.onaudioprocess = (e) => {
        if (!wsRef.current || !connected || !recording) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 to Int16 PCM
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          audioBuffer.push(Math.floor(sample * 32767));
        }
        
        // Send frames of 320 samples (20ms)
        while (audioBuffer.length >= targetFrameSize) {
          const frame = audioBuffer.splice(0, targetFrameSize);
          
          // Convert to Int16Array then to base64
          const int16Array = new Int16Array(frame);
          const uint8Array = new Uint8Array(int16Array.buffer);
          const base64 = btoa(String.fromCharCode(...Array.from(uint8Array)));
          
          // Send audio chunk to server
          const message: WSClientMessage = {
            type: "audio_chunk",
            eventId: generateEventId(),
            chunk: base64,
            timestamp: Date.now(),
          };
          
          if (wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
          }
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setRecording(true);
      console.log("[RealTimeLab] Recording started - streaming audio chunks");
      
    } catch (error) {
      console.error("[RealTimeLab] Microphone access error:", error);
      alert("Failed to access microphone. Please check permissions.");
    }
  };
  
  const stopRecording = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setRecording(false);
    setAudioLevel(0);
    console.log("[RealTimeLab] Recording stopped");
  };
  
  // TTS audio playback
  const playTTSChunk = async (base64Chunk: string) => {
    try {
      // Initialize playback context if needed
      if (!playbackContextRef.current) {
        playbackContextRef.current = new AudioContext({ sampleRate: 16000 });
      }
      
      const context = playbackContextRef.current;
      
      // Decode base64 to audio data
      const binaryString = atob(base64Chunk);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Decode audio buffer
      const audioBuffer = await context.decodeAudioData(bytes.buffer);
      
      // Create source and play
      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(context.destination);
      source.start(0);
      
      console.log("[RealTimeLab] Playing TTS chunk:", audioBuffer.duration, "seconds");
      
    } catch (error) {
      console.error("[RealTimeLab] TTS playback error:", error);
    }
  };
  
  // Send text message
  const sendTextMessage = (text: string) => {
    if (!wsRef.current || !connected) return;
    
    const message: WSClientMessage = {
      type: "text_input",
      eventId: generateEventId(),
      text,
      timestamp: Date.now(),
    };
    wsRef.current.send(JSON.stringify(message));
  };
  
  // Helpers
  const generateEventId = () => `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const addMessage = (role: "user" | "agent", text: string, latency?: number) => {
    setConversation(prev => [...prev, {
      id: generateEventId(),
      role,
      text,
      timestamp: Date.now(),
      latency,
    }]);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);
  
  return (
    <div className="h-full overflow-auto p-6" data-testid="page-realtime-lab">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Real-Time Testing Playground</h1>
            <p className="text-muted-foreground mt-1">
              Test voice quality, latency, and agent flows in real-time
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {sessionId && (
              <Badge variant="outline" className="text-xs">
                Session: {sessionId.slice(0, 8)}
              </Badge>
            )}
            {connected ? (
              <Button 
                onClick={disconnect} 
                variant="destructive"
                data-testid="button-disconnect"
              >
                Disconnect
              </Button>
            ) : (
              <Button 
                onClick={connect}
                data-testid="button-connect"
              >
                Connect
              </Button>
            )}
          </div>
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Controls & Config */}
          <div className="space-y-6">
            {/* Connection Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Connection Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={connected ? "default" : "secondary"}>
                    {connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                {connected && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Active Sessions</span>
                      <span className="text-sm font-mono">{systemMetrics.activeConnections}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Queue Depth</span>
                      <span className="text-sm font-mono">{systemMetrics.queueDepth}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            
            {/* Session Configuration */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Configuration</CardTitle>
                <CardDescription className="text-xs">
                  Configure voice AI pipeline
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stt-enabled" className="text-sm">Speech-to-Text</Label>
                  <Switch
                    id="stt-enabled"
                    checked={config.sttEnabled}
                    onCheckedChange={(checked) => setConfig({ ...config, sttEnabled: checked })}
                    disabled={connected}
                    data-testid="switch-stt"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="tts-enabled" className="text-sm">Text-to-Speech</Label>
                  <Switch
                    id="tts-enabled"
                    checked={config.ttsEnabled}
                    onCheckedChange={(checked) => setConfig({ ...config, ttsEnabled: checked })}
                    disabled={connected}
                    data-testid="switch-tts"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="agent-enabled" className="text-sm">Agent (VLLM)</Label>
                  <Switch
                    id="agent-enabled"
                    checked={config.agentEnabled}
                    onCheckedChange={(checked) => setConfig({ ...config, agentEnabled: checked })}
                    disabled={connected}
                    data-testid="switch-agent"
                  />
                </div>
                
                <div className="pt-2 border-t">
                  <Label className="text-xs text-muted-foreground">TTS Model</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {["chatterbox", "higgs_audio_v2", "styletts2"].map((model) => (
                      <Button
                        key={model}
                        variant={config.model === model ? "default" : "outline"}
                        size="sm"
                        onClick={() => setConfig({ ...config, model: model as any })}
                        disabled={connected}
                        className="text-xs px-2 py-1 h-auto"
                        data-testid={`button-model-${model}`}
                      >
                        {model === "chatterbox" ? "CB" : model === "higgs_audio_v2" ? "Higgs" : "Style"}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Audio Controls */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Audio Input
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  {recording ? (
                    <Button
                      onClick={stopRecording}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      data-testid="button-stop-recording"
                    >
                      <MicOff className="h-4 w-4 mr-2" />
                      Stop Recording
                    </Button>
                  ) : (
                    <Button
                      onClick={startRecording}
                      size="sm"
                      className="flex-1"
                      disabled={!connected}
                      data-testid="button-start-recording"
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Start Recording
                    </Button>
                  )}
                </div>
                
                {/* Audio Level Visualizer */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Level</span>
                    <span>{Math.round(audioLevel)}%</span>
                  </div>
                  <Progress value={audioLevel} className="h-2" />
                </div>
                
                {recording && (
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                    <Activity className="h-3 w-3 animate-pulse" />
                    <span>Listening...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Center Column: Conversation & Latency */}
          <div className="lg:col-span-2 space-y-6">
            {/* Latency Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">STT Latency</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-latency-stt">
                        {latency.stt !== null ? `${latency.stt}ms` : "--"}
                      </p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-muted-foreground opacity-50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Agent Latency</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-latency-agent">
                        {latency.agent !== null ? `${latency.agent}ms` : "--"}
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-muted-foreground opacity-50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">TTS Latency</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-latency-tts">
                        {latency.tts !== null ? `${latency.tts}ms` : "--"}
                      </p>
                    </div>
                    <Volume2 className="h-8 w-8 text-muted-foreground opacity-50" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">End-to-End</p>
                      <p className="text-2xl font-bold text-primary" data-testid="text-latency-e2e">
                        {latency.endToEnd !== null ? `${latency.endToEnd}ms` : "--"}
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Conversation History */}
            <Card className="flex flex-col" style={{ height: "500px" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Conversation</CardTitle>
                <CardDescription className="text-xs">
                  Real-time voice and text interaction
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto space-y-3">
                {partialTranscript && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
                    <p className="text-sm text-muted-foreground italic">
                      {partialTranscript}...
                    </p>
                  </div>
                )}
                
                {conversation.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.role === "user"
                        ? "bg-primary/10 ml-auto max-w-[80%]"
                        : "bg-card border mr-auto max-w-[80%]"
                    }`}
                    data-testid={`message-${msg.role}-${msg.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={msg.role === "user" ? "default" : "secondary"} className="text-xs">
                        {msg.role === "user" ? "You" : "Agent"}
                      </Badge>
                      {msg.latency && (
                        <span className="text-xs text-muted-foreground">{msg.latency}ms</span>
                      )}
                    </div>
                    <p className="text-sm text-foreground">{msg.text}</p>
                  </div>
                ))}
                
                {conversation.length === 0 && !partialTranscript && (
                  <div className="flex items-center justify-center h-full text-center">
                    <div className="text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No conversation yet</p>
                      <p className="text-xs mt-1">Start speaking or send a text message</p>
                    </div>
                  </div>
                )}
              </CardContent>
              
              {/* Text Input */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 rounded-md bg-background border text-sm"
                    disabled={!connected}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        sendTextMessage(e.currentTarget.value.trim());
                        e.currentTarget.value = "";
                      }
                    }}
                    data-testid="input-text-message"
                  />
                  <Button
                    size="sm"
                    disabled={!connected}
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      if (input.value.trim()) {
                        sendTextMessage(input.value.trim());
                        input.value = "";
                      }
                    }}
                    data-testid="button-send-message"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
