import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Download, Loader2, Sparkles, Volume2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { Voice } from "@shared/voices";
import type { ClonedVoice } from "@shared/schema";

interface VoiceOption {
  id: string;
  name: string;
  type: "pre-made" | "cloned";
  language?: string;
  cloningMode?: string;
  prompt?: string;
}

export default function TTSPlayground() {
  const [text, setText] = useState("Hello! This is a test of the voice generation system. How do I sound?");
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [model, setModel] = useState<string>("chatterbox");
  const [speed, setSpeed] = useState<number>(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Fetch pre-made voices
  const { data: preMadeVoices = [] } = useQuery<Voice[]>({
    queryKey: ["/api/voice-library"],
  });

  // Fetch cloned voices
  const { data: clonedVoices = [] } = useQuery<ClonedVoice[]>({
    queryKey: ["/api/cloned-voices"],
  });

  // Combine all voices into options
  const voiceOptions: VoiceOption[] = [
    ...preMadeVoices.map(v => ({
      id: v.id || v.prompt,
      name: `${v.name} (${v.language})`,
      type: "pre-made" as const,
      language: v.language,
      prompt: v.prompt,
    })),
    ...clonedVoices
      .filter(v => v.processingStatus === "completed" || v.status === "ready")
      .map(v => ({
        id: v.id,
        name: `${v.name} (Cloned)`,
        type: "cloned" as const,
        cloningMode: v.cloningMode,
      })),
  ];

  // Set default voice when options load
  useEffect(() => {
    if (!selectedVoice && voiceOptions.length > 0) {
      setSelectedVoice(voiceOptions[0].id);
    }
  }, [voiceOptions, selectedVoice]);

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast({
        title: "Text required",
        description: "Please enter some text to generate speech",
        variant: "destructive",
      });
      return;
    }

    if (!selectedVoice) {
      toast({
        title: "Voice required",
        description: "Please select a voice",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model,
          voice: selectedVoice,
          speed,
          format: "wav",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate speech");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Clean up old audio URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      setAudioUrl(url);

      toast({
        title: "Speech generated!",
        description: "Your audio is ready to play",
      });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate speech. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlay = () => {
    if (!audioUrl) return;

    if (isPlaying && audioElement) {
      audioElement.pause();
      setIsPlaying(false);
      return;
    }

    const audio = new Audio(audioUrl);
    audio.addEventListener("ended", () => setIsPlaying(false));
    audio.play();
    setAudioElement(audio);
    setIsPlaying(true);
  };

  const handleDownload = () => {
    if (!audioUrl) return;

    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `voiceforge-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const selectedVoiceInfo = voiceOptions.find(v => v.id === selectedVoice);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Volume2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">TTS Playground</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Test text-to-speech with pre-made voices and your custom clones
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>
                  Choose your voice and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Voice Selection */}
                <div className="space-y-2">
                  <Label>Voice</Label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger data-testid="select-voice">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {clonedVoices.filter(v => v.processingStatus === "completed" || v.status === "ready").length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            Cloned Voices
                          </div>
                          {clonedVoices
                            .filter(v => v.processingStatus === "completed" || v.status === "ready")
                            .map(v => (
                              <SelectItem key={v.id} value={v.id}>
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-3 w-3 text-primary" />
                                  {v.name}
                                </div>
                              </SelectItem>
                            ))}
                          <Separator className="my-2" />
                        </>
                      )}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Pre-made Voices
                      </div>
                      {preMadeVoices.slice(0, 20).map(v => (
                        <SelectItem key={v.id || v.prompt} value={v.id || v.prompt}>
                          {v.name} ({v.language})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedVoiceInfo && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {selectedVoiceInfo.type === "cloned" ? (
                          <>
                            <Sparkles className="h-3 w-3 mr-1" />
                            {selectedVoiceInfo.cloningMode || "Cloned"}
                          </>
                        ) : (
                          selectedVoiceInfo.language
                        )}
                      </Badge>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Model Selection */}
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger data-testid="select-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chatterbox">Chatterbox (Fast)</SelectItem>
                      <SelectItem value="higgs_audio_v2">Higgs Audio V2 (Expressive)</SelectItem>
                      <SelectItem value="styletts2">StyleTTS2 (Premium)</SelectItem>
                      <SelectItem value="indic-parler-tts">Indic Parler TTS</SelectItem>
                      <SelectItem value="parler-tts-multilingual">Parler Multilingual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Speed Control */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Speed</Label>
                    <span className="text-sm text-muted-foreground">{speed.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[speed]}
                    onValueChange={([value]) => setSpeed(value)}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    className="w-full"
                    data-testid="slider-speed"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0.5x</span>
                    <span>1.0x</span>
                    <span>2.0x</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview Stats */}
            {audioUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Generated Audio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      onClick={handlePlay}
                      className="flex-1"
                      data-testid="button-play-audio"
                    >
                      {isPlaying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Playing
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Play
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownload}
                      data-testid="button-download-audio"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Text Input Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Text Input</CardTitle>
                <CardDescription>
                  Enter the text you want to convert to speech
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Type or paste your text here..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[300px] resize-none font-sans"
                  data-testid="textarea-input"
                />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{text.length} characters</span>
                  <span>{text.split(/\s+/).filter(w => w).length} words</span>
                </div>

                <Separator />

                <div className="flex gap-3">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !text.trim() || !selectedVoice}
                    className="flex-1"
                    data-testid="button-generate"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Generate Speech
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setText("")}
                    data-testid="button-clear"
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sample Texts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sample Texts</CardTitle>
                <CardDescription>
                  Click to try these examples
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {[
                    "Hello! Welcome to Voiceforge. We're excited to help you create amazing voice experiences.",
                    "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.",
                    "In a world where technology meets creativity, voice AI opens up endless possibilities for communication and expression.",
                    "Testing one, two, three. How does this voice sound to you? Let us know what you think!",
                  ].map((sample, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start h-auto py-3 px-4 text-left text-sm"
                      onClick={() => setText(sample)}
                      data-testid={`button-sample-${index}`}
                    >
                      {sample}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
