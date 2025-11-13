import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/audio-player";
import { useToast } from "@/hooks/use-toast";
import { MODEL_INFO } from "@/lib/constants";
import {
  Zap,
  Mic,
  MessageSquare,
  Code,
  Shield,
  ArrowRight,
  Play,
  CheckCircle,
  Globe,
  Users,
  TrendingUp,
} from "lucide-react";
import Navbar from "@/components/navbar";

const ICON_MAP: Record<string, any> = {
  Zap,
  Mic,
  MessageSquare,
  Code,
  Shield,
};

export default function Home() {
  const [demoText, setDemoText] = useState(
    "Welcome to VoiceForge API - the most realistic open-source voice synthesis platform."
  );
  const [selectedModel, setSelectedModel] = useState<string>("chatterbox");
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!demoText.trim()) return;
    
    setIsGenerating(true);
    setGeneratedAudio(null);
    
    try {
      // Helper to get API base URL
      const getApiBaseUrl = () => {
        if (import.meta.env.VITE_API_URL) {
          return import.meta.env.VITE_API_URL;
        }
        return "";
      };
      
      // Use the authenticated /api/tts endpoint with public demo key
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer vf_demo_public_key_for_landing_page",
        },
        body: JSON.stringify({
          text: demoText,
          model: selectedModel,
          format: "wav",
          speed: 1.0,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Create blob URL from audio data
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      setGeneratedAudio(audioUrl);
      
      toast({
        title: "Speech generated",
        description: `Audio created using ${MODEL_INFO[selectedModel].name}`,
      });
    } catch (error) {
      console.error("TTS generation error:", error);
      toast({
        title: "Generation failed",
        description: "Failed to generate speech. Please try again.",
        variant: "destructive",
      });
      // Fallback to placeholder for demo purposes
      setGeneratedAudio("/placeholder-audio.mp3");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              VoiceForge API
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
              The most realistic open-source voice synthesis platform.
              Generate natural-sounding speech in 20+ languages with 120+ voices.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/dashboard">
                <Button size="lg">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="outline" size="lg">
                  View Documentation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-24 sm:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Try It Now</CardTitle>
                <CardDescription>
                  Generate speech in real-time using our advanced TTS models
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Text</label>
                  <Textarea
                    placeholder="Enter text to synthesize..."
                    value={demoText}
                    onChange={(e) => setDemoText(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Model</label>
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

                <Button
                  onClick={handleGenerate}
                  disabled={!demoText.trim() || isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Play className="mr-2 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
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
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Powerful Features
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to build voice-enabled applications
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <Zap className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Real-Time Processing</CardTitle>
                <CardDescription>
                  Low-latency voice synthesis with streaming support
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Mic className="h-10 w-10 text-primary mb-4" />
                <CardTitle>120+ Voices</CardTitle>
                <CardDescription>
                  Extensive voice library across 20+ languages
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <MessageSquare className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Voice Cloning</CardTitle>
                <CardDescription>
                  Create custom voices from reference audio
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Code className="h-10 w-10 text-primary mb-4" />
                <CardTitle>RESTful API</CardTitle>
                <CardDescription>
                  Simple HTTP API with comprehensive documentation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Secure & Scalable</CardTitle>
                <CardDescription>
                  Enterprise-grade security with rate limiting
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Globe className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Multi-Language</CardTitle>
                <CardDescription>
                  Support for 20+ languages and dialects
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 sm:py-32">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">120+</div>
              <div className="text-muted-foreground">Voices</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">20+</div>
              <div className="text-muted-foreground">Languages</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">&lt;200ms</div>
              <div className="text-muted-foreground">Latency</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 bg-primary/10">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start building voice-enabled applications today with our powerful API
            </p>
            <Link href="/dashboard">
              <Button size="lg">
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}