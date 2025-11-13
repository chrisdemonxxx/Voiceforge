import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AudioPlayer } from "@/components/audio-player";
import { ModelCard } from "@/components/model-card";
import { VoiceSelector } from "@/components/voice-selector";
import { MODEL_INFO } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { UsageStats, ApiKey } from "@shared/schema";
import type { Voice } from "@shared/voices";

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState("indic-parler-tts");
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>(undefined);
  const [ttsText, setTtsText] = useState("");
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Voice cloning state
  const [cloneName, setCloneName] = useState("");
  const [cloneModel, setCloneModel] = useState("chatterbox");
  const [cloneDescription, setCloneDescription] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  
  // Synthetic voice state
  const [syntheticGender, setSyntheticGender] = useState("female");
  const [syntheticAge, setSyntheticAge] = useState("middle_aged");
  const [syntheticAccent, setSyntheticAccent] = useState("");
  const [syntheticTone, setSyntheticTone] = useState("");

  // API key creation state
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRateLimit, setNewKeyRateLimit] = useState("1000");

  // Fetch API keys from database (no auth required for key management)
  const { data: apiKeys = [], isLoading: apiKeysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/keys"],
  });

  // Helper to get auth headers with active API key
  const getAuthHeaders = () => {
    const activeKey = apiKeys.find(k => k.active);
    if (!activeKey) {
      return null;
    }
    return {
      "Authorization": `Bearer ${activeKey.key}`,
    };
  };

  // Helper to get API base URL (same as in queryClient)
  const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    return "";
  };

  // Fetch real usage stats from API
  const { data: stats = {
    totalRequests: 0,
    successRate: 0,
    avgLatency: 0,
    requestsToday: 0,
    ttsRequests: 0,
    sttRequests: 0,
    vadRequests: 0,
    vllmRequests: 0,
  }, isLoading: statsLoading } = useQuery<UsageStats>({
    queryKey: ["/api/usage", apiKeys.length],
    queryFn: async () => {
      const authHeaders = getAuthHeaders();
      if (!authHeaders) {
        // Return default empty stats if no active key
        return {
          totalRequests: 0,
          successRate: 0,
          avgLatency: 0,
          requestsToday: 0,
          ttsRequests: 0,
          sttRequests: 0,
          vadRequests: 0,
          vllmRequests: 0,
        };
      }
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/usage`, {
        headers: authHeaders,
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - API key may be invalid");
        }
        throw new Error("Failed to fetch usage stats");
      }
      return response.json();
    },
    enabled: apiKeys.some(k => k.active), // Only fetch when there's an active key
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) {
      toast({
        title: "Error",
        description: "Please enter text to synthesize",
        variant: "destructive",
      });
      return;
    }

    // Get the first active API key
    const activeKey = apiKeys.find(k => k.active);
    if (!activeKey) {
      toast({
        title: "Error",
        description: "No active API key found. Please create an API key first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedAudio(null);

    toast({
      title: "Generating speech...",
      description: `Using ${MODEL_INFO[selectedModel]?.name || selectedModel}`,
    });

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeKey.key}`,
        },
        body: JSON.stringify({
          text: ttsText,
          model: selectedModel,
          voice: selectedVoice,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate speech");
      }

      // Get the audio blob and create a URL
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      setGeneratedAudio(audioUrl);

      toast({
        title: "Speech generated",
        description: "Your audio is ready to play",
      });
    } catch (error: any) {
      console.error("TTS error:", error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate speech",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // API Key mutations
  const createApiKeyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/keys", {
        name: newKeyName || "New API Key",
        rateLimit: parseInt(newKeyRateLimit) || 1000,
      }, false); // Don't include auth for key creation (uses admin token if set)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      setIsKeyDialogOpen(false);
      setNewKeyName("");
      setNewKeyRateLimit("1000");
      toast({
        title: "API key created",
        description: "Your new API key has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create API key",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReferenceFile(file);
    }
  };

  // Fetch cloned voices (requires authentication)
  const { data: clonedVoices, isLoading: voicesLoading } = useQuery<any[]>({
    queryKey: ["/api/voices", apiKeys.length],
    queryFn: async () => {
      const authHeaders = getAuthHeaders();
      if (!authHeaders) {
        return []; // Return empty array if no active key
      }
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/voices`, {
        headers: authHeaders,
      });
      if (!response.ok) {
        if (response.status === 401) {
          return []; // Return empty array if unauthorized
        }
        throw new Error("Failed to fetch cloned voices");
      }
      return response.json();
    },
    enabled: apiKeys.some(k => k.active), // Only fetch when there's an active key
  });

  // Fetch voice library (no authentication required)
  const { data: voiceLibrary, isLoading: voiceLibraryLoading, error: voiceLibraryError } = useQuery<Voice[]>({
    queryKey: ["/api/voice-library"],
  });

  // Delete voice mutation
  const deleteVoiceMutation = useMutation({
    mutationFn: async (voiceId: string) => {
      const authHeaders = getAuthHeaders();
      if (!authHeaders) {
        throw new Error("No active API key");
      }
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/voices/${voiceId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!response.ok) {
        throw new Error("Failed to delete voice");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voices", apiKeys.length] });
      toast({
        title: "Voice deleted",
        description: "The cloned voice has been deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete voice",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage your API keys, generate speech, and monitor usage
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-20 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All time
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Requests Today</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.requestsToday.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last 24 hours
                  </p>
                </CardContent>
              </Card>

              <Card>
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

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.avgLatency}ms</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Response time
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="tts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tts">Text-to-Speech</TabsTrigger>
            <TabsTrigger value="voices">Voice Library</TabsTrigger>
            <TabsTrigger value="clone">Voice Cloning</TabsTrigger>
            <TabsTrigger value="keys">API Keys</TabsTrigger>
          </TabsList>

          {/* TTS Tab */}
          <TabsContent value="tts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Speech</CardTitle>
                <CardDescription>
                  Convert text to natural-sounding speech
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Text</Label>
                  <Textarea
                    placeholder="Enter text to synthesize..."
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(MODEL_INFO).map(([id, info]) => (
                          <SelectItem key={id} value={id}>
                            {info.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Voice</Label>
                    <VoiceSelector
                      value={selectedVoice}
                      onValueChange={setSelectedVoice}
                      voiceLibrary={voiceLibrary || []}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleGenerateTTS}
                  disabled={!ttsText.trim() || isGenerating || !apiKeys.some(k => k.active)}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Generate Speech
                    </>
                  )}
                </Button>

                {generatedAudio && (
                  <div className="mt-6">
                    <AudioPlayer src={generatedAudio} title="Generated Audio" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Voice Library Tab */}
          <TabsContent value="voices" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Voice Library</CardTitle>
                <CardDescription>
                  Browse available voices and your cloned voices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {voiceLibraryLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading voices...
                  </div>
                ) : voiceLibraryError ? (
                  <div className="text-center py-8 text-destructive">
                    Failed to load voice library
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {voiceLibrary?.map((voice) => (
                      <ModelCard key={voice.id} voice={voice} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cloned Voices */}
            {apiKeys.some(k => k.active) && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Cloned Voices</CardTitle>
                  <CardDescription>
                    Voices you've created through cloning
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {voicesLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading cloned voices...
                    </div>
                  ) : clonedVoices && clonedVoices.length > 0 ? (
                    <div className="space-y-4">
                      {clonedVoices.map((voice: any) => (
                        <div
                          key={voice.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <h4 className="font-medium">{voice.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {voice.model} • {voice.cloningMode}
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteVoiceMutation.mutate(voice.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No cloned voices yet
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Voice Cloning Tab */}
          <TabsContent value="clone" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Clone Voice</CardTitle>
                <CardDescription>
                  Create a custom voice from reference audio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Voice Name</Label>
                  <Input
                    placeholder="My Custom Voice"
                    value={cloneName}
                    onChange={(e) => setCloneName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={cloneModel} onValueChange={setCloneModel}>
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

                <div className="space-y-2">
                  <Label>Reference Audio</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileSelect}
                      className="flex-1"
                    />
                    {referenceFile && (
                      <Badge variant="outline">{referenceFile.name}</Badge>
                    )}
                  </div>
                </div>

                <Button
                  disabled={!cloneName || !referenceFile || !apiKeys.some(k => k.active)}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Clone Voice
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="keys" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>API Keys</CardTitle>
                    <CardDescription>
                      Manage your API keys for authentication
                    </CardDescription>
                  </div>
                  <Dialog open={isKeyDialogOpen} onOpenChange={setIsKeyDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Key
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create API Key</DialogTitle>
                        <DialogDescription>
                          Create a new API key for authentication
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            placeholder="My API Key"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rate Limit (requests/hour)</Label>
                          <Input
                            type="number"
                            placeholder="1000"
                            value={newKeyRateLimit}
                            onChange={(e) => setNewKeyRateLimit(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          onClick={() => createApiKeyMutation.mutate()}
                          disabled={createApiKeyMutation.isPending}
                        >
                          {createApiKeyMutation.isPending ? "Creating..." : "Create"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {apiKeysLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading API keys...
                  </div>
                ) : apiKeys.length > 0 ? (
                  <div className="space-y-4">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{key.name}</span>
                            {key.active && (
                              <Badge variant="default">Active</Badge>
                            )}
                            {!key.active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">
                            {key.key}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Usage: {key.usage}</span>
                            <span>Rate Limit: {key.rateLimit}/hr</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(key.key);
                              toast({
                                title: "Copied",
                                description: "API key copied to clipboard",
                              });
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No API keys found. Create one to get started.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}