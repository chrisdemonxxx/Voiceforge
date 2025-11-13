import { useState, useRef } from "react";
import { Upload, Sparkles, Zap, FlaskConical, Loader2, Mic2, Info, X, FileAudio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export default function CloneVoice() {
  const [voiceName, setVoiceName] = useState("");
  const [description, setDescription] = useState("");
  const [cloningMode, setCloningMode] = useState("instant");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [cloneId, setCloneId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/flac'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|flac)$/i)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a WAV, MP3, or FLAC file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 50MB",
          variant: "destructive",
        });
        return;
      }

      setUploadedFile(file);
      toast({
        title: "File uploaded",
        description: `${file.name} ready for cloning`,
      });
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const pollCloneStatus = async (id: string) => {
    const maxAttempts = 60; // 2 minutes max
    let attempts = 0;

    const poll = setInterval(async () => {
      try {
        const response = await fetch(`/api/voices/${id}`);
        if (response.ok) {
          const data = await response.json();

          if (data.processingStatus === 'completed') {
            setTrainingProgress(100);
            setIsProcessing(false);
            clearInterval(poll);
            toast({
              title: "Voice clone ready!",
              description: `${voiceName} has been successfully cloned`,
            });
            // Reset form
            setVoiceName("");
            setDescription("");
            setUploadedFile(null);
            setCloneId(null);
            setTrainingProgress(0);
          } else if (data.processingStatus === 'failed') {
            setIsProcessing(false);
            clearInterval(poll);
            toast({
              title: "Cloning failed",
              description: "There was an error processing your voice. Please try again.",
              variant: "destructive",
            });
          } else if (data.processingStatus === 'processing') {
            // Update progress based on estimated time
            const progress = Math.min(95, (attempts / maxAttempts) * 100);
            setTrainingProgress(progress);
          }
        }

        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          setIsProcessing(false);
          toast({
            title: "Processing timeout",
            description: "Voice cloning is taking longer than expected. Please check your voices later.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error polling clone status:', error);
      }
    }, 2000);
  };

  const handleCloneVoice = async () => {
    if (!voiceName.trim()) {
      toast({
        title: "Voice name required",
        description: "Please enter a name for your cloned voice",
        variant: "destructive",
      });
      return;
    }

    // Validate audio file for non-synthetic modes
    if (cloningMode !== "synthetic" && !uploadedFile) {
      toast({
        title: "Audio file required",
        description: "Please upload an audio file for voice cloning",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setTrainingProgress(0);

    try {
      const formData = new FormData();
      formData.append('name', voiceName);
      formData.append('description', description);
      formData.append('cloningMode', cloningMode);
      formData.append('model', 'chatterbox'); // Default model

      if (uploadedFile && cloningMode !== "synthetic") {
        formData.append('reference', uploadedFile);
      }

      const response = await fetch('/api/clone-voice', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clone voice');
      }

      setCloneId(data.id);

      if (cloningMode === 'professional' && data.processingStatus === 'processing') {
        // Start polling for professional clones
        toast({
          title: "Training started",
          description: `Your voice "${voiceName}" is being trained. This may take 1-2 minutes.`,
        });
        pollCloneStatus(data.id);
      } else if (data.processingStatus === 'completed') {
        // Instant and synthetic clones complete immediately
        setIsProcessing(false);
        toast({
          title: "Voice clone ready!",
          description: `${voiceName} has been successfully cloned`,
        });
        // Reset form
        setVoiceName("");
        setDescription("");
        setUploadedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error: any) {
      setIsProcessing(false);
      toast({
        title: "Cloning failed",
        description: error.message || "Failed to clone voice. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Clone Voice</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Create a custom voice clone from audio samples with professional quality
          </p>
        </div>

        {/* Cloning Modes */}
        <Card>
          <CardHeader>
            <CardTitle>Select Cloning Mode</CardTitle>
            <CardDescription>
              Choose the cloning method that best fits your needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={cloningMode} onValueChange={setCloningMode}>
              <div className="space-y-3">
                <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${
                  cloningMode === "instant" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover-elevate"
                }`}>
                  <RadioGroupItem value="instant" id="instant" data-testid="radio-instant" />
                  <div className="flex-1">
                    <Label htmlFor="instant" className="flex items-center gap-2 cursor-pointer">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="font-medium">Instant Clone</span>
                      <Badge variant="secondary">Fast</Badge>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Quick voice cloning from 30 seconds of audio. Perfect for testing and rapid prototyping.
                    </p>
                  </div>
                </div>

                <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${
                  cloningMode === "professional" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover-elevate"
                }`}>
                  <RadioGroupItem value="professional" id="professional" data-testid="radio-professional" />
                  <div className="flex-1">
                    <Label htmlFor="professional" className="flex items-center gap-2 cursor-pointer">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-medium">Professional Clone</span>
                      <Badge variant="secondary">Recommended</Badge>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      High-quality voice cloning from 5+ minutes of audio. Best for production use.
                    </p>
                  </div>
                </div>

                <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${
                  cloningMode === "synthetic" 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover-elevate"
                }`}>
                  <RadioGroupItem value="synthetic" id="synthetic" data-testid="radio-synthetic" />
                  <div className="flex-1">
                    <Label htmlFor="synthetic" className="flex items-center gap-2 cursor-pointer">
                      <FlaskConical className="h-4 w-4 text-primary" />
                      <span className="font-medium">Synthetic Design</span>
                      <Badge variant="secondary">Experimental</Badge>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generate entirely new voices with AI. No audio samples required.
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Voice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Voice Details</CardTitle>
            <CardDescription>
              Provide information about your cloned voice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="voice-name">Voice Name *</Label>
              <Input
                id="voice-name"
                placeholder="e.g., My Custom Voice"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                data-testid="input-voice-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the characteristics of this voice..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] resize-none"
                data-testid="input-description"
              />
            </div>

            <Separator />

            {/* Audio Upload Section */}
            {cloningMode !== "synthetic" && (
              <div className="space-y-2">
                <Label>Reference Audio</Label>
                {!uploadedFile ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover-elevate transition-smooth">
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          Upload audio samples
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cloningMode === "instant"
                            ? "Minimum 5 seconds of clear audio"
                            : "1+ minutes recommended for best results"}
                        </p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".wav,.mp3,.flac,audio/wav,audio/mpeg,audio/mp3,audio/flac"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="audio-upload"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="button-upload-audio"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Select Files
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <FileAudio className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={removeFile}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    Supported formats: WAV, MP3, FLAC. For best results, use high-quality recordings
                    with minimal background noise.
                  </p>
                </div>
              </div>
            )}

            {/* Training Progress */}
            {isProcessing && cloningMode === 'professional' && trainingProgress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Training Progress</Label>
                  <span className="text-sm text-muted-foreground">{Math.round(trainingProgress)}%</span>
                </div>
                <Progress value={trainingProgress} className="h-2" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleCloneVoice} 
                disabled={isProcessing}
                className="flex-1"
                data-testid="button-create-clone"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Voice Clone
                  </>
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setVoiceName("");
                  setDescription("");
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tips Section */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mic2 className="h-5 w-5 text-primary" />
              Tips for Best Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Use high-quality audio recordings (44.1kHz or higher)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Ensure minimal background noise and consistent volume</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Include varied speech patterns and emotions for more natural results</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Professional mode requires 5-10 minutes of audio for optimal quality</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
