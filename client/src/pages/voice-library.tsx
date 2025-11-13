import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Pause, Volume2, Search, Filter, Globe, Users, Mic } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AudioPlayer } from "@/components/audio-player";
import { useToast } from "@/hooks/use-toast";
import type { Voice } from "@shared/voices";

export default function VoiceLibrary() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Fetch voice library (no authentication required)
  const { data: voiceLibrary, isLoading, error } = useQuery<Voice[]>({
    queryKey: ["/api/voice-library"],
  });

  // Fetch cloned voices (public endpoint)
  const { data: clonedVoices = [] } = useQuery<any[]>({
    queryKey: ["/api/cloned-voices"],
  });

  // Get unique categories, genders, and languages
  const categories = Array.from(
    new Set(voiceLibrary?.map((v) => v.category).filter(Boolean) || [])
  );
  const genders = Array.from(
    new Set(voiceLibrary?.map((v) => v.gender).filter(Boolean) || [])
  );
  const languages = Array.from(
    new Set(voiceLibrary?.map((v) => v.language).filter(Boolean) || [])
  );

  // Filter voices
  const filteredVoices = voiceLibrary?.filter((voice) => {
    const matchesSearch =
      !searchQuery ||
      voice.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voice.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || voice.category === selectedCategory;
    const matchesGender =
      selectedGender === "all" || voice.gender === selectedGender;
    const matchesLanguage =
      selectedLanguage === "all" || voice.language === selectedLanguage;
    return matchesSearch && matchesCategory && matchesGender && matchesLanguage;
  });

  const handlePlaySample = async (voiceId: string, voice: Voice) => {
    if (playingVoice === voiceId && audioUrl) {
      // Stop playback
      setPlayingVoice(null);
      setAudioUrl(null);
      return;
    }

    try {
      setPlayingVoice(voiceId);

      // Helper to get API base URL
      const getApiBaseUrl = () => {
        if (import.meta.env.VITE_API_URL) {
          return import.meta.env.VITE_API_URL;
        }
        return "";
      };
      
      // Generate sample audio
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer vf_demo_public_key_for_landing_page",
        },
        body: JSON.stringify({
          text: `Hello, I am ${voice.displayName}. This is a preview of my voice.`,
          model: "chatterbox",
          voice: voice.type === "pre-made" ? voice.prompt : voiceId,
          format: "wav",
        }),
      });

      if (!response.ok) throw new Error("Failed to generate preview");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (error) {
      console.error("Failed to play voice sample:", error);
      toast({
        title: "Preview failed",
        description: "Could not generate voice preview. Please try again.",
        variant: "destructive",
      });
      setPlayingVoice(null);
    }
  };

  // Group voices by language
  const voicesByLanguage = filteredVoices?.reduce((acc, voice) => {
    const lang = voice.language || "Other";
    if (!acc[lang]) acc[lang] = [];
    acc[lang].push(voice);
    return acc;
  }, {} as Record<string, Voice[]>);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Voice Library</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Explore our premium collection of 120+ voices across 20+ languages
          </p>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
            <CardDescription>Find the perfect voice for your project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search voices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Gender</label>
                <Select value={selectedGender} onValueChange={setSelectedGender}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    {genders.map((gender) => (
                      <SelectItem key={gender} value={gender}>
                        {gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Language</label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    {languages.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice Library Content */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading voice library...
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            Failed to load voice library
          </div>
        ) : (
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">All Voices</TabsTrigger>
              {voicesByLanguage &&
                Object.keys(voicesByLanguage).map((lang) => (
                  <TabsTrigger key={lang} value={lang}>
                    {lang} ({voicesByLanguage[lang].length})
                  </TabsTrigger>
                ))}
            </TabsList>

            {Object.entries(voicesByLanguage || {}).map(([language, voices]) => (
              <TabsContent key={language} value={language} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4">{language} - {voices.length} voices</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {voices.map((voice) => (
                      <Card key={voice.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{voice.displayName}</CardTitle>
                            <Badge variant={voice.gender === "Male" ? "default" : "secondary"}>
                              {voice.gender}
                            </Badge>
                          </div>
                          <CardDescription>{voice.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Globe className="h-4 w-4" />
                            <span>{voice.language}</span>
                            {voice.fluency && (
                              <>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs">
                                  {voice.fluency}
                                </Badge>
                              </>
                            )}
                          </div>

                          {voice.characteristics && (
                            <div className="text-sm text-muted-foreground">
                              <p className="font-medium mb-1">Characteristics:</p>
                              <p>{voice.characteristics}</p>
                            </div>
                          )}

                          <Button
                            onClick={() => handlePlaySample(voice.id, voice)}
                            variant={playingVoice === voice.id ? "destructive" : "default"}
                            className="w-full"
                          >
                            {playingVoice === voice.id ? (
                              <>
                                <Pause className="mr-2 h-4 w-4" />
                                Stop Sample
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 h-4 w-4" />
                                Play Sample
                              </>
                            )}
                          </Button>

                          {playingVoice === voice.id && audioUrl && (
                            <AudioPlayer src={audioUrl} title={`${voice.displayName} Preview`} />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
            ))}

            <TabsContent value="all" className="space-y-6">
              {voicesByLanguage &&
                Object.entries(voicesByLanguage).map(([language, voices]) => (
                  <div key={language} className="space-y-4">
                    <h2 className="text-2xl font-bold">{language} - {voices.length} voices</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {voices.map((voice) => (
                        <Card key={voice.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{voice.displayName}</CardTitle>
                              <Badge variant={voice.gender === "Male" ? "default" : "secondary"}>
                                {voice.gender}
                              </Badge>
                            </div>
                            <CardDescription>{voice.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Globe className="h-4 w-4" />
                              <span>{voice.language}</span>
                              {voice.fluency && (
                                <>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-xs">
                                    {voice.fluency}
                                  </Badge>
                                </>
                              )}
                            </div>

                            {voice.characteristics && (
                              <div className="text-sm text-muted-foreground">
                                <p className="font-medium mb-1">Characteristics:</p>
                                <p>{voice.characteristics}</p>
                              </div>
                            )}

                            <Button
                              onClick={() => handlePlaySample(voice.id, voice)}
                              variant={playingVoice === voice.id ? "destructive" : "default"}
                              className="w-full"
                            >
                              {playingVoice === voice.id ? (
                                <>
                                  <Pause className="mr-2 h-4 w-4" />
                                  Stop Sample
                                </>
                              ) : (
                                <>
                                  <Play className="mr-2 h-4 w-4" />
                                  Play Sample
                                </>
                              )}
                            </Button>

                            {playingVoice === voice.id && audioUrl && (
                              <AudioPlayer src={audioUrl} title={`${voice.displayName} Preview`} />
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
            </TabsContent>
          </Tabs>
        )}

        {/* Cloned Voices Section */}
        {clonedVoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cloned Voices</CardTitle>
              <CardDescription>
                Custom voices created by users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clonedVoices.map((voice: any) => (
                  <Card key={voice.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{voice.name}</CardTitle>
                      <CardDescription>{voice.model}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline">{voice.cloningMode}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}