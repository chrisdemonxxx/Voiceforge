import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Mic2,
  Key,
  Activity,
  Zap,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  Trash2,
  Copy,
  Play,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/audio-player";
import { ModelCard } from "@/components/model-card";
import { MODEL_INFO } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { UsageStats, ApiKey } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState("chatterbox");
  const [ttsText, setTtsText] = useState("");
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);

  // Mock data - will be replaced with real API calls
  const stats: UsageStats = {
    totalRequests: 12847,
    successRate: 98.5,
    avgLatency: 187,
    requestsToday: 324,
    ttsRequests: 8234,
    sttRequests: 3421,
    vadRequests: 892,
    vllmRequests: 300,
  };

  const apiKeys: ApiKey[] = [
    {
      id: "1",
      name: "Production API",
      key: "vf_sk_1234567890abcdef",
      createdAt: new Date("2025-01-01"),
      usage: 8234,
      active: true,
    },
    {
      id: "2",
      name: "Development",
      key: "vf_sk_0987654321fedcba",
      createdAt: new Date("2025-01-15"),
      usage: 423,
      active: true,
    },
  ];

  const handleGenerateTTS = () => {
    toast({
      title: "Generating speech...",
      description: `Using ${MODEL_INFO[selectedModel].name}`,
    });
    
    // Mock generation
    setTimeout(() => {
      setGeneratedAudio("/placeholder-audio.mp3");
      toast({
        title: "Speech generated",
        description: "Your audio is ready to play",
      });
    }, 1000);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "API key copied",
      description: "The API key has been copied to your clipboard",
    });
  };

  const handleDeleteKey = (id: string) => {
    toast({
      title: "API key deleted",
      description: "The API key has been permanently deleted",
      variant: "destructive",
    });
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Mic2 className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-sidebar-foreground">VoiceForge</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Button
            variant="secondary"
            className="w-full justify-start"
            data-testid="nav-overview"
          >
            <Activity className="mr-3 h-4 w-4" />
            Overview
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start hover-elevate"
            data-testid="nav-api-keys"
          >
            <Key className="mr-3 h-4 w-4" />
            API Keys
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start hover-elevate"
            data-testid="nav-analytics"
          >
            <BarChart3 className="mr-3 h-4 w-4" />
            Analytics
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start hover-elevate"
            data-testid="nav-settings"
          >
            <Settings className="mr-3 h-4 w-4" />
            Settings
          </Button>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start hover-elevate"
            data-testid="button-logout"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8 space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Monitor your API usage and test voice models
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card data-testid="card-stat-requests">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requests Today</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.requestsToday.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  +12% from yesterday
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-success-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.successRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Excellent performance
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-latency">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgLatency}ms</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sub-200ms target
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-total">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  All time
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Voice Testing Interface */}
          <Card>
            <CardHeader>
              <CardTitle>Voice Testing</CardTitle>
              <CardDescription>
                Test TTS, STT, VAD, and voice cloning in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tts" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="tts" data-testid="tab-tts">Text-to-Speech</TabsTrigger>
                  <TabsTrigger value="stt" data-testid="tab-stt">Speech-to-Text</TabsTrigger>
                  <TabsTrigger value="vad" data-testid="tab-vad">Voice Detection</TabsTrigger>
                  <TabsTrigger value="clone" data-testid="tab-clone">Voice Cloning</TabsTrigger>
                </TabsList>

                {/* TTS Tab */}
                <TabsContent value="tts" className="space-y-6 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="tts-text">Text to Synthesize</Label>
                    <Textarea
                      id="tts-text"
                      value={ttsText}
                      onChange={(e) => setTtsText(e.target.value)}
                      placeholder="Enter text to convert to speech..."
                      className="min-h-[120px] resize-none"
                      data-testid="input-tts-text"
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    {Object.values(MODEL_INFO).map((model) => (
                      <ModelCard
                        key={model.id}
                        model={model}
                        selected={selectedModel === model.id}
                        onSelect={() => setSelectedModel(model.id)}
                      />
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Select defaultValue="wav">
                      <SelectTrigger className="w-32" data-testid="select-audio-format">
                        <SelectValue placeholder="Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wav">WAV</SelectItem>
                        <SelectItem value="mp3">MP3</SelectItem>
                        <SelectItem value="flac">FLAC</SelectItem>
                        <SelectItem value="ogg">OGG</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={handleGenerateTTS}
                      disabled={!ttsText.trim()}
                      data-testid="button-generate-tts"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Generate Speech
                    </Button>
                  </div>

                  {generatedAudio && (
                    <div className="mt-6">
                      <AudioPlayer
                        src={generatedAudio}
                        title={`${MODEL_INFO[selectedModel].name} - Generated Audio`}
                      />
                    </div>
                  )}
                </TabsContent>

                {/* STT Tab */}
                <TabsContent value="stt" className="space-y-6 mt-6">
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Upload Audio File
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Support for WAV, MP3, FLAC, OGG formats
                    </p>
                    <Button data-testid="button-upload-audio">
                      Select File
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Transcription Result</Label>
                    <Textarea
                      readOnly
                      placeholder="Transcribed text will appear here..."
                      className="min-h-[120px] resize-none bg-muted"
                      data-testid="output-transcription"
                    />
                  </div>
                </TabsContent>

                {/* VAD Tab */}
                <TabsContent value="vad" className="space-y-6 mt-6">
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Voice Activity Detection
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Upload audio to detect speech segments using Silero VAD
                    </p>
                    <Button data-testid="button-upload-vad">
                      Select Audio File
                    </Button>
                  </div>
                </TabsContent>

                {/* Voice Cloning Tab */}
                <TabsContent value="clone" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="clone-name">Voice Name</Label>
                      <Input
                        id="clone-name"
                        placeholder="e.g., My Custom Voice"
                        data-testid="input-clone-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Reference Audio (5+ seconds)</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Upload a clear 5-10 second audio sample
                        </p>
                        <Button className="mt-4" variant="outline" data-testid="button-upload-reference">
                          Select File
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Select defaultValue="chatterbox">
                        <SelectTrigger data-testid="select-clone-model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chatterbox">Chatterbox</SelectItem>
                          <SelectItem value="higgs_audio_v2">Higgs Audio V2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button className="w-full" data-testid="button-create-voice">
                      Create Voice Clone
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* API Keys Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage your API keys for authentication
                  </CardDescription>
                </div>
                <Button data-testid="button-create-api-key">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 border border-card-border rounded-lg hover-elevate"
                    data-testid={`api-key-${key.id}`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{key.name}</p>
                        <Badge
                          variant="secondary"
                          className={
                            key.active
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : ""
                          }
                        >
                          {key.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <code className="bg-muted px-2 py-1 rounded">
                          {key.key.slice(0, 20)}...
                        </code>
                        <span>Created {key.createdAt.toLocaleDateString()}</span>
                        <span>{key.usage.toLocaleString()} requests</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopyKey(key.key)}
                        data-testid={`button-copy-key-${key.id}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteKey(key.id)}
                        data-testid={`button-delete-key-${key.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Usage Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Analytics</CardTitle>
              <CardDescription>
                API usage breakdown by service
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Text-to-Speech</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.ttsRequests.toLocaleString()} requests
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(stats.ttsRequests / stats.totalRequests) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Speech-to-Text</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.sttRequests.toLocaleString()} requests
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(stats.sttRequests / stats.totalRequests) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Voice Activity Detection</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.vadRequests.toLocaleString()} requests
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${(stats.vadRequests / stats.totalRequests) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">VLLM Conversations</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.vllmRequests.toLocaleString()} requests
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{
                        width: `${(stats.vllmRequests / stats.totalRequests) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
