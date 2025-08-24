import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioPlayer } from "@/components/ui/audio-player";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ObjectUploader } from "@/components/ObjectUploader";
import { LyricsGeneratorModal } from "@/components/LyricsGeneratorModal";
import { 
  Music, 
  WandSparkles, 
  Mic, 
  Clock, 
  Play, 
  Download, 
  Share, 
  RotateCcw,
  Tags,
  Lightbulb,
  CheckCircle,
  AudioWaveform,
  LogOut,
  User,
  Edit2,
  Check,
  X,
  Trash2
} from "lucide-react";
import type { MusicGeneration } from "@shared/schema";

export default function Home() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Text-to-music state
  const [tags, setTags] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [duration, setDuration] = useState([60]);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  
  // Audio-to-music state
  const [audioTags, setAudioTags] = useState("");
  const [audioLyrics, setAudioLyrics] = useState("");
  const [audioTitle, setAudioTitle] = useState("");
  const [audioVisibility, setAudioVisibility] = useState<"public" | "private">("public");
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string>("");
  
  // Shared state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<MusicGeneration | null>(null);
  const [activeTab, setActiveTab] = useState("textToMusic");
  
  // Lyrics generator modal state
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [currentLyricsTarget, setCurrentLyricsTarget] = useState<'text' | 'audio'>('text');

  // Fetch user's music generations
  const { data: generations } = useQuery({
    queryKey: ["/api/my-generations"],
    retry: false,
  });

  // Lyrics generator handlers
  const handleOpenLyricsGenerator = (target: 'text' | 'audio') => {
    setCurrentLyricsTarget(target);
    setShowLyricsModal(true);
  };

  const handleUseLyrics = (generatedLyrics: string) => {
    if (currentLyricsTarget === 'text') {
      setLyrics(generatedLyrics);
    } else {
      setAudioLyrics(generatedLyrics);
    }
  };

  // Shared generation success handler
  const handleGenerationSuccess = async (data: any) => {
    setIsGenerating(true);
    const { generationId } = data;
    
    // Poll for status updates
    const pollStatus = async () => {
      try {
        const response = await apiRequest(`/api/generation/${generationId}/status`, "GET");
        const generation = await response.json();
        
        setCurrentGeneration(generation);
        
        if (generation.status === "completed") {
          setIsGenerating(false);
          toast({
            title: "Music Generated!",
            description: "Your track is ready to play.",
          });
          queryClient.invalidateQueries({ queryKey: ["/api/my-generations"] });
        } else if (generation.status === "failed") {
          setIsGenerating(false);
          toast({
            title: "Generation Failed",
            description: "There was an error generating your music. Please try again.",
            variant: "destructive",
          });
        } else {
          setTimeout(pollStatus, 3000); // Poll every 3 seconds
        }
      } catch (error) {
        if (isUnauthorizedError(error as Error)) {
          toast({
            title: "Unauthorized",
            description: "You are logged out. Logging in again...",
            variant: "destructive",
          });
          setTimeout(() => {
            window.location.href = "/auth";
          }, 500);
          return;
        }
        console.error("Error polling status:", error);
        setIsGenerating(false);
        toast({
          title: "Error",
          description: "Failed to check generation status.",
          variant: "destructive",
        });
      }
    };
    
    pollStatus();
  };

  // Shared generation error handler
  const handleGenerationError = (error: any) => {
    if (isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 500);
      return;
    }
    toast({
      title: "Generation Failed",
      description: "Failed to start music generation. Please try again.",
      variant: "destructive",
    });
  };

  // Text-to-music generation mutation
  const generateTextToMusicMutation = useMutation({
    mutationFn: async (data: { tags: string; lyrics: string; duration: number; title?: string; visibility: "public" | "private" }) => {
      const response = await apiRequest("/api/generate-text-to-music", "POST", data);
      return await response.json();
    },
    onSuccess: handleGenerationSuccess,
    onError: handleGenerationError,
  });

  // Audio-to-music generation mutation
  const generateAudioToMusicMutation = useMutation({
    mutationFn: async (data: { tags: string; lyrics: string; inputAudioUrl: string; title?: string; visibility: "public" | "private" }) => {
      const response = await apiRequest("/api/generate-audio-to-music", "POST", data);
      return await response.json();
    },
    onSuccess: handleGenerationSuccess,
    onError: handleGenerationError,
  });

  const handleGenerateTextToMusic = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tags.trim()) {
      toast({
        title: "Missing Tags",
        description: "Please enter at least one genre tag.",
        variant: "destructive",
      });
      return;
    }

    generateTextToMusicMutation.mutate({
      tags: tags.trim(),
      lyrics: lyrics.trim(),
      duration: duration[0],
      title: title.trim() || undefined,
      visibility,
    });
  };

  const handleGenerateAudioToMusic = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!audioTags.trim()) {
      toast({
        title: "Missing Tags",
        description: "Please enter at least one genre tag.",
        variant: "destructive",
      });
      return;
    }

    if (!uploadedAudioUrl) {
      toast({
        title: "Missing Audio File",
        description: "Please upload an audio file first.",
        variant: "destructive",
      });
      return;
    }

    generateAudioToMusicMutation.mutate({
      tags: audioTags.trim(),
      lyrics: audioLyrics.trim(),
      inputAudioUrl: uploadedAudioUrl,
      title: audioTitle.trim() || undefined,
      visibility: audioVisibility,
    });
  };

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("/api/objects/upload", "POST");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      // Call backend to convert the upload URL to object path format
      try {
        const response = await apiRequest("/api/objects/normalize-path", "POST", { 
          uploadURL: uploadedFile.uploadURL 
        });
        const data = await response.json();
        setUploadedAudioUrl(data.objectPath);
        toast({
          title: "Audio Uploaded!",
          description: "Your audio file is ready for processing.",
        });
      } catch (error) {
        console.error("Error normalizing upload path:", error);
        toast({
          title: "Upload Error",
          description: "Failed to process uploaded file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDownload = async (audioUrl: string) => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-music-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the track.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (track: MusicGeneration) => {
    try {
      const shareUrl = `${window.location.origin}/track/${track.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied!",
        description: "Track link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black/50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <header className="bg-music-secondary/80 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-music-purple to-music-blue rounded-xl flex items-center justify-center">
                <Music className="text-white text-lg" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-music-purple to-music-blue bg-clip-text text-transparent">
                NuMusic
              </h1>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => (document.querySelector('[data-testid="tab-text-to-music"]') as HTMLElement)?.click()}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Create
              </button>
              <a href="/pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <a href="/contact" className="text-gray-300 hover:text-white transition-colors">Contact</a>
            </nav>
            
            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <a href="/profile" className="flex items-center space-x-3 hover:bg-gray-800/50 rounded-lg px-3 py-2 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-music-purple to-music-blue flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-gray-300 hover:text-white transition-colors">
                  {(user as any)?.firstName || (user as any)?.email || "User"}
                </span>
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tab Navigation */}
        <Tabs defaultValue="textToMusic" className="mb-8">
          <TabsList className="bg-music-secondary p-2 border border-gray-700 grid w-full grid-cols-3">
            <TabsTrigger 
              value="textToMusic"
              className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-music-purple data-[state=active]:to-music-blue data-[state=active]:text-white"
              data-testid="tab-text-to-music"
            >
              <WandSparkles className="mr-2 h-4 w-4" />
              Text to Music
            </TabsTrigger>
            <TabsTrigger 
              value="audioToMusic"
              className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-music-purple data-[state=active]:to-music-blue data-[state=active]:text-white"
              data-testid="tab-audio-to-music"
            >
              <AudioWaveform className="mr-2 h-4 w-4" />
              Audio to Music
            </TabsTrigger>
            <TabsTrigger 
              value="myLibrary"
              className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-music-purple data-[state=active]:to-music-blue data-[state=active]:text-white"
              data-testid="tab-my-library"
            >
              <Music className="mr-2 h-4 w-4" />
              My Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="textToMusic" className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Input Form */}
              <div className="space-y-6">
                <Card className="bg-music-secondary border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-music-purple to-music-blue rounded-lg flex items-center justify-center mr-3">
                        <WandSparkles className="text-sm text-white" />
                      </div>
                      <span className="text-music-blue">Create Your Track</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleGenerateTextToMusic} className="space-y-6">
                      {/* Tags Field */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          <Tags className="inline mr-2 h-4 w-4 text-music-accent" />
                          Music Genres & Style Tags
                        </label>
                        <Input
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                          placeholder="e.g., lofi, hiphop, electronic, chill, trap"
                          className="bg-music-dark border-gray-600 text-white placeholder-gray-300 focus:border-music-purple"
                          required
                          data-testid="input-tags"
                        />
                        
                        {/* Popular Tag Bubbles */}
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-2">Popular tags (click to add):</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              "female singer", "male singer", "pop", "electronic", "hip hop",
                              "ad jingle", "synthwave", "lo-fi", "energetic", "upbeat"
                            ].map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  const currentTags = tags.split(',').map(t => t.trim()).filter(t => t);
                                  if (!currentTags.includes(tag)) {
                                    setTags(currentTags.length > 0 ? `${tags}, ${tag}` : tag);
                                  }
                                }}
                                className="px-3 py-1 text-xs bg-gray-700 hover:bg-music-purple hover:text-white text-gray-300 rounded-full transition-colors border border-gray-600 hover:border-music-purple"
                                data-testid={`tag-bubble-${tag.replace(/\s+/g, '-')}`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-400 mt-2">Separate multiple genres with commas</p>
                      </div>

                      {/* Lyrics Field */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-semibold text-gray-300">
                            <Mic className="inline mr-2 h-4 w-4 text-music-green" />
                            Lyrics (Optional)
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenLyricsGenerator('text')}
                            className="border-music-purple text-music-purple hover:bg-music-purple hover:text-white"
                            data-testid="button-generate-lyrics-text"
                          >
                            <WandSparkles className="mr-1 h-3 w-3" />
                            AI Generate
                          </Button>
                        </div>
                        <Textarea
                          value={lyrics}
                          onChange={(e) => setLyrics(e.target.value)}
                          placeholder="[Verse 1]&#10;Walking down the street tonight&#10;City lights are shining bright&#10;&#10;[Chorus]&#10;This is my moment to shine&#10;Everything's gonna be fine"
                          rows={6}
                          className="bg-music-dark border-gray-600 text-white placeholder-gray-300 focus:border-music-green resize-none"
                          data-testid="textarea-lyrics"
                        />
                        <p className="text-xs text-gray-400 mt-2">Use [verse], [chorus], [bridge] to structure your song. Leave empty for instrumental.</p>
                      </div>

                      {/* Title Field */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          <Music className="inline mr-2 h-4 w-4 text-music-accent" />
                          Track Title (Optional)
                        </label>
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g., Sunset Dreams, Midnight Vibes"
                          className="bg-music-dark border-gray-600 text-white placeholder-gray-300 focus:border-music-accent"
                          data-testid="input-title"
                        />
                      </div>

                      {/* Duration Slider */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          <Clock className="inline mr-2 h-4 w-4 text-music-blue" />
                          Duration: <span className="text-music-blue font-bold">{duration[0]}</span> seconds
                        </label>
                        <Slider
                          value={duration}
                          onValueChange={setDuration}
                          min={5}
                          max={240}
                          step={1}
                          className="w-full"
                          data-testid="slider-duration"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-2">
                          <span>5s</span>
                          <span>240s (4 min)</span>
                        </div>
                      </div>

                      {/* Visibility Selector */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          <Share className="inline mr-2 h-4 w-4 text-music-green" />
                          Track Visibility
                        </label>
                        <Select value={visibility} onValueChange={(value: "public" | "private") => setVisibility(value)}>
                          <SelectTrigger className="bg-music-dark border-gray-600 text-white focus:border-music-green" data-testid="select-visibility">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-music-dark border-gray-600">
                            <SelectItem value="public" className="text-white hover:bg-gray-700">
                              Public - Visible in gallery
                            </SelectItem>
                            <SelectItem value="private" className="text-white hover:bg-gray-700">
                              Private - Only you can see
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400 mt-2">Public tracks appear in the community gallery</p>
                      </div>

                      {/* Generate Button */}
                      <Button
                        type="submit"
                        disabled={generateTextToMusicMutation.isPending || isGenerating}
                        className="w-full bg-gradient-to-r from-music-purple via-music-blue to-music-green hover:from-purple-600 hover:via-blue-600 hover:to-green-600 text-white py-4 text-lg font-bold transition-all transform hover:scale-[1.02] shadow-2xl disabled:opacity-50"
                        data-testid="button-generate"
                      >
                        <WandSparkles className="mr-2 h-5 w-5" />
                        Generate Music Track
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Results Panel */}
              <div className="space-y-6">
                {/* Loading State */}
                {isGenerating && (
                  <Card className="bg-music-secondary border-gray-700">
                    <CardContent className="pt-6 text-center">
                      <div className="space-y-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-music-purple to-music-blue rounded-full flex items-center justify-center mx-auto animate-bounce">
                          <WandSparkles className="text-2xl text-white" />
                        </div>
                        <h3 className="text-xl font-bold">Creating Your Music...</h3>
                        <p className="text-gray-400">This usually takes 30-60 seconds</p>
                        <LoadingSpinner />
                        <p className="text-sm text-gray-400">Processing your creative vision...</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Music Player */}
                {currentGeneration?.status === "completed" && currentGeneration.audioUrl && (
                  <Card className="bg-music-secondary border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-music-green to-music-blue rounded-lg flex items-center justify-center mr-3">
                          <Play className="text-sm text-white" />
                        </div>
                        <span className="text-music-blue">Your Generated Track</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <AudioPlayer src={currentGeneration.audioUrl} />
                      
                      {/* Track Info */}
                      <div className="pt-4 border-t border-gray-700">
                        <div className="flex justify-between text-sm text-gray-400">
                          <span>Duration: {currentGeneration.duration ? Math.floor(currentGeneration.duration / 60) + ':' + (currentGeneration.duration % 60).toString().padStart(2, '0') : 'N/A'}</span>
                          <span>Genre: {currentGeneration.tags}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-3">
                        <Button
                          onClick={() => handleDownload(currentGeneration.audioUrl!)}
                          className="flex-1 bg-music-purple hover:bg-purple-600"
                          data-testid="button-download"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 border-gray-600 hover:border-music-accent"
                          onClick={() => handleShare(currentGeneration)}
                          data-testid="button-share"
                        >
                          <Share className="mr-2 h-4 w-4" />
                          Share
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleGenerateTextToMusic({ preventDefault: () => {} } as React.FormEvent)}
                          className="border-gray-600 hover:border-music-green"
                          data-testid="button-regenerate"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tips Card */}
                <Card className="bg-gradient-to-br from-music-secondary to-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lightbulb className="text-music-accent mr-3 h-5 w-5" />
                      <span className="text-music-blue">Tips for Better Results</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-gray-300">
                      <li className="flex items-start">
                        <CheckCircle className="text-music-green mr-3 mt-1 h-4 w-4" />
                        <span>Use specific genre tags like "synthwave", "lo-fi hip hop", or "ambient electronic"</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="text-music-green mr-3 mt-1 h-4 w-4" />
                        <span>Structure lyrics with [verse], [chorus], and [bridge] markers for better flow</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="text-music-green mr-3 mt-1 h-4 w-4" />
                        <span>Longer durations allow for more complex musical development</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="text-music-green mr-3 mt-1 h-4 w-4" />
                        <span>Leave lyrics empty or use "[instrumental]" for instrumental tracks</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audioToMusic" className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Audio Upload Form */}
              <div className="space-y-6">
                <Card className="bg-music-secondary border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-music-accent to-music-blue rounded-lg flex items-center justify-center mr-3">
                        <AudioWaveform className="text-sm text-white" />
                      </div>
                      <span className="text-music-blue">Transform Your Audio</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleGenerateAudioToMusic} className="space-y-6">
                      {/* Audio Upload */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          <AudioWaveform className="inline mr-2 h-4 w-4 text-music-accent" />
                          Upload Audio File
                        </label>
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={50485760} // 50MB
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handleUploadComplete}
                          acceptedFileTypes={['.mp3', '.wav', '.m4a', '.aac', '.ogg']}
                          buttonClassName="w-full bg-music-dark border-2 border-dashed border-gray-600 hover:border-music-accent text-gray-300 hover:text-white py-8 rounded-lg transition-all"
                        >
                          <div className="flex flex-col items-center space-y-3">
                            <AudioWaveform className="h-8 w-8 text-music-accent" />
                            <div className="text-center">
                              <p className="font-semibold">Click to upload audio file</p>
                              <p className="text-sm text-gray-400">Supports MP3, WAV, M4A, AAC, OGG (max 50MB)</p>
                            </div>
                          </div>
                        </ObjectUploader>
                        {uploadedAudioUrl && (
                          <p className="text-sm text-music-green mt-2">✓ Audio file uploaded successfully!</p>
                        )}
                      </div>

                      {/* Tags Field */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          <Tags className="inline mr-2 h-4 w-4 text-music-accent" />
                          Target Genres & Style Tags
                        </label>
                        <Input
                          value={audioTags}
                          onChange={(e) => setAudioTags(e.target.value)}
                          placeholder="e.g., lofi, hiphop, electronic, chill, trap"
                          className="bg-music-dark border-gray-600 text-white placeholder-gray-300 focus:border-music-purple"
                          required
                          data-testid="input-audio-tags"
                        />
                        
                        {/* Popular Tag Bubbles */}
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-2">Popular tags (click to add):</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              "female singer", "male singer", "pop", "electronic", "hip hop",
                              "ad jingle", "synthwave", "lo-fi", "energetic", "upbeat"
                            ].map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  const currentTags = audioTags.split(',').map(t => t.trim()).filter(t => t);
                                  if (!currentTags.includes(tag)) {
                                    setAudioTags(currentTags.length > 0 ? `${audioTags}, ${tag}` : tag);
                                  }
                                }}
                                className="px-3 py-1 text-xs bg-gray-700 hover:bg-music-purple hover:text-white text-gray-300 rounded-full transition-colors border border-gray-600 hover:border-music-purple"
                                data-testid={`audio-tag-bubble-${tag.replace(/\s+/g, '-')}`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-400 mt-2">Describe the style you want the output to have</p>
                      </div>

                      {/* Title Field */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          <Music className="inline mr-2 h-4 w-4 text-music-accent" />
                          Track Title (Optional)
                        </label>
                        <Input
                          value={audioTitle}
                          onChange={(e) => setAudioTitle(e.target.value)}
                          placeholder="e.g., Transformed Melody, Audio Remix"
                          className="bg-music-dark border-gray-600 text-white placeholder-gray-300 focus:border-music-accent"
                          data-testid="input-audio-title"
                        />
                      </div>

                      {/* Lyrics Field */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-semibold text-gray-300">
                            <Mic className="inline mr-2 h-4 w-4 text-music-green" />
                            Lyrics (Optional)
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenLyricsGenerator('audio')}
                            className="border-music-purple text-music-purple hover:bg-music-purple hover:text-white"
                            data-testid="button-generate-lyrics-audio"
                          >
                            <WandSparkles className="mr-1 h-3 w-3" />
                            AI Generate
                          </Button>
                        </div>
                        <Textarea
                          value={audioLyrics}
                          onChange={(e) => setAudioLyrics(e.target.value)}
                          placeholder="[Verse 1]&#10;Add lyrics to overlay on the audio&#10;&#10;[Chorus]&#10;Transform the melody with vocals"
                          rows={6}
                          className="bg-music-dark border-gray-600 text-white placeholder-gray-300 focus:border-music-green resize-none"
                          data-testid="textarea-audio-lyrics"
                        />
                        <p className="text-xs text-gray-400 mt-2">Add lyrics to be sung over the transformed audio. Leave empty to keep instrumental.</p>
                      </div>

                      {/* Visibility Selector */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          <Share className="inline mr-2 h-4 w-4 text-music-green" />
                          Track Visibility
                        </label>
                        <Select value={audioVisibility} onValueChange={(value: "public" | "private") => setAudioVisibility(value)}>
                          <SelectTrigger className="bg-music-dark border-gray-600 text-white focus:border-music-green" data-testid="select-audio-visibility">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-music-dark border-gray-600">
                            <SelectItem value="public" className="text-white hover:bg-gray-700">
                              Public - Visible in gallery
                            </SelectItem>
                            <SelectItem value="private" className="text-white hover:bg-gray-700">
                              Private - Only you can see
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400 mt-2">Public tracks appear in the community gallery</p>
                      </div>

                      {/* Generate Button */}
                      <Button
                        type="submit"
                        disabled={generateAudioToMusicMutation.isPending || isGenerating}
                        className="w-full bg-gradient-to-r from-music-accent via-music-purple to-music-blue hover:from-purple-600 hover:via-blue-600 hover:to-green-600 text-white py-4 text-lg font-bold transition-all transform hover:scale-[1.02] shadow-2xl disabled:opacity-50"
                        data-testid="button-generate-audio"
                      >
                        <AudioWaveform className="mr-2 h-5 w-5" />
                        Transform Audio
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Results Panel - Shared with Text-to-Music */}
              <div className="space-y-6">
                {/* Loading State */}
                {isGenerating && (
                  <Card className="bg-music-secondary border-gray-700">
                    <CardContent className="pt-6 text-center">
                      <div className="space-y-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-music-accent to-music-blue rounded-full flex items-center justify-center mx-auto animate-bounce">
                          <AudioWaveform className="text-2xl text-white" />
                        </div>
                        <h3 className="text-xl font-bold">Transforming Your Audio...</h3>
                        <p className="text-gray-400">This usually takes 30-60 seconds</p>
                        <LoadingSpinner />
                        <p className="text-sm text-gray-400">Processing your audio transformation...</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Music Player */}
                {currentGeneration?.status === "completed" && currentGeneration.audioUrl && (
                  <Card className="bg-music-secondary border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-music-green to-music-blue rounded-lg flex items-center justify-center mr-3">
                          <Play className="text-sm text-white" />
                        </div>
                        Your Transformed Track
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <AudioPlayer src={currentGeneration.audioUrl} />
                      
                      {/* Track Info */}
                      <div className="pt-4 border-t border-gray-700">
                        <div className="flex justify-between text-sm text-gray-400">
                          <span>Type: {currentGeneration.type === 'audio-to-music' ? 'Audio Transformation' : 'Text Generation'}</span>
                          <span>Genre: {currentGeneration.tags}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-3">
                        <Button
                          onClick={() => handleDownload(currentGeneration.audioUrl!)}
                          className="flex-1 bg-music-purple hover:bg-purple-600"
                          data-testid="button-download-audio"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 border-gray-600 hover:border-music-accent"
                          data-testid="button-share-audio"
                        >
                          <Share className="mr-2 h-4 w-4" />
                          Share
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleGenerateAudioToMusic({ preventDefault: () => {} } as React.FormEvent)}
                          className="border-gray-600 hover:border-music-green"
                          data-testid="button-regenerate-audio"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tips Card */}
                <Card className="bg-gradient-to-br from-music-secondary to-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lightbulb className="text-music-accent mr-3 h-5 w-5" />
                      <span className="text-music-blue">Audio Transformation Tips</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-gray-300">
                      <li className="flex items-start">
                        <CheckCircle className="text-music-green mr-3 mt-1 h-4 w-4" />
                        <span>Upload clear, high-quality audio files for best results</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="text-music-green mr-3 mt-1 h-4 w-4" />
                        <span>Specify target genres to guide the transformation style</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="text-music-green mr-3 mt-1 h-4 w-4" />
                        <span>Add lyrics to create a vocal version of instrumental tracks</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="text-music-green mr-3 mt-1 h-4 w-4" />
                        <span>Shorter audio clips (30s-2min) typically work best</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="myLibrary" className="space-y-8">
            <div>
              <Card className="bg-music-secondary border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-music-purple to-music-blue rounded-lg flex items-center justify-center mr-3">
                      <Music className="text-sm text-white" />
                    </div>
                    <span className="text-music-blue">My Music Library ({Array.isArray(generations) ? generations.length : 0} tracks)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!generations || !Array.isArray(generations) || generations.length === 0 ? (
                    <div className="text-center py-12">
                      <Music className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-400 mb-2">No tracks yet</h3>
                      <p className="text-gray-500 mb-6">Create your first AI-generated track to start your music library.</p>
                      <Button
                        onClick={() => (document.querySelector('[data-testid="tab-text-to-music"]') as HTMLElement)?.click()}
                        className="bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600"
                        data-testid="button-create-first-track"
                      >
                        <WandSparkles className="mr-2 h-4 w-4" />
                        Create First Track
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {(generations as MusicGeneration[]).map((track: MusicGeneration) => (
                        <TrackCard key={track.id} track={track} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Lyrics Generator Modal */}
      <LyricsGeneratorModal
        isOpen={showLyricsModal}
        onClose={() => setShowLyricsModal(false)}
        onUseLyrics={handleUseLyrics}
        duration={currentLyricsTarget === 'text' ? duration[0] : 60}
      />
    </div>
  );
}

function TrackCard({ track }: { track: MusicGeneration }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(track.title || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateTitleMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest(`/api/generation/${track.id}/visibility`, "PATCH", { 
        title,
        visibility: track.visibility 
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-generations"] });
      setIsEditingTitle(false);
      toast({
        title: "Track updated",
        description: "Title has been changed.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Update failed",
        description: "Could not update track title.",
        variant: "destructive",
      });
    },
  });
  
  const updateVisibilityMutation = useMutation({
    mutationFn: async (visibility: "public" | "private") => {
      const response = await apiRequest(`/api/generation/${track.id}/visibility`, "PATCH", { 
        visibility,
        title: track.title 
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-generations"] });
      toast({
        title: "Track updated",
        description: "Visibility setting has been changed.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Update failed",
        description: "Could not update track visibility.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/generation/${track.id}`, "DELETE");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-generations"] });
      toast({
        title: "Track deleted",
        description: "Your track has been permanently deleted.",
      });
      setShowDeleteConfirm(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Delete failed",
        description: "Could not delete track. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="bg-music-dark border-gray-600 hover:border-gray-500 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-6 h-6 bg-gradient-to-br from-music-purple to-music-blue rounded flex items-center justify-center">
                {track.type === "text-to-music" ? (
                  <WandSparkles className="w-3 h-3 text-white" />
                ) : (
                  <AudioWaveform className="w-3 h-3 text-white" />
                )}
              </div>
              {isEditingTitle ? (
                <div className="flex items-center space-x-2 flex-1">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateTitleMutation.mutate(editedTitle);
                      } else if (e.key === 'Escape') {
                        setIsEditingTitle(false);
                        setEditedTitle(track.title || "");
                      }
                    }}
                    className="text-lg font-semibold bg-music-secondary border-gray-600 text-white"
                    placeholder="Enter track title"
                    autoFocus
                    data-testid={`input-edit-title-${track.id}`}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateTitleMutation.mutate(editedTitle)}
                    disabled={updateTitleMutation.isPending}
                    className="text-music-green hover:text-music-green"
                    data-testid={`button-save-title-${track.id}`}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingTitle(false);
                      setEditedTitle(track.title || "");
                    }}
                    className="text-gray-400 hover:text-white"
                    data-testid={`button-cancel-title-${track.id}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 flex-1">
                  <h3 className="text-lg font-semibold text-white">
                    {track.title || `Untitled Track`}
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditingTitle(true);
                      setEditedTitle(track.title || "");
                    }}
                    className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 h-8 w-8 opacity-70 hover:opacity-100 transition-all"
                    data-testid={`button-edit-title-${track.id}`}
                    title="Edit track title"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                track.visibility === "public" 
                  ? "bg-music-green/20 text-music-green" 
                  : "bg-gray-600/20 text-gray-400"
              }`}>
                {track.visibility}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-3">
              {track.tags && (
                <div className="flex items-center">
                  <Tags className="w-4 h-4 mr-1" />
                  {track.tags}
                </div>
              )}
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {track.duration ? `${track.duration}s` : "N/A"}
              </div>
              <div className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  track.status === "completed" ? "bg-music-green" :
                  track.status === "processing" ? "bg-music-blue animate-pulse" :
                  track.status === "failed" ? "bg-red-500" : "bg-gray-500"
                }`} />
                {track.status}
              </div>
            </div>

            {track.status === "completed" && track.audioUrl && (
              <div className="mb-4">
                <AudioPlayer 
                  src={track.audioUrl}
                  className="w-full"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <Select 
              value={track.visibility} 
              onValueChange={(value: "public" | "private") => updateVisibilityMutation.mutate(value)}
              disabled={updateVisibilityMutation.isPending}
            >
              <SelectTrigger className="w-32 bg-music-secondary border-gray-600 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-music-dark border-gray-600">
                <SelectItem value="public" className="text-white hover:bg-gray-700 text-xs">
                  Public
                </SelectItem>
                <SelectItem value="private" className="text-white hover:bg-gray-700 text-xs">
                  Private  
                </SelectItem>
              </SelectContent>
            </Select>
            
            {track.status === "completed" && track.audioUrl && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = track.audioUrl!;
                  link.download = `${track.title || 'track'}.wav`;
                  link.click();
                }}
                className="text-gray-400 hover:text-white"
                data-testid={`button-download-${track.id}`}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText('https://numusic.app/track/' + track.id);
                  toast({
                    title: "Link Copied!",
                    description: "Track link has been copied to your clipboard.",
                  });
                } catch (error) {
                  toast({
                    title: "Share Failed",
                    description: "Failed to copy link to clipboard.",
                    variant: "destructive",
                  });
                }
              }}
              className="text-gray-400 hover:text-white"
              data-testid={`button-share-${track.id}`}
            >
              <Share className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-gray-400 hover:text-red-400"
              data-testid={`button-delete-${track.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {track.lyrics && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-400 mb-2">
              <Mic className="inline w-3 h-3 mr-1" />
              Lyrics
            </label>
            <div className="max-h-24 overflow-y-auto p-3 bg-music-secondary/50 rounded-lg border border-gray-600">
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{track.lyrics}</p>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
            <div className="bg-music-dark border border-gray-600 rounded-lg p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white mb-2">Delete Track</h3>
              <p className="text-gray-300 mb-4">
                Are you sure you want to delete "{track.title || 'Untitled'}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-gray-400 hover:text-white"
                  data-testid="button-cancel-delete"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  data-testid="button-confirm-delete"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
