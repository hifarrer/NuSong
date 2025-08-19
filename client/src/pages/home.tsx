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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AudioPlayer } from "@/components/ui/audio-player";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ObjectUploader } from "@/components/ObjectUploader";
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
  User
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
  
  // Audio-to-music state
  const [audioTags, setAudioTags] = useState("");
  const [audioLyrics, setAudioLyrics] = useState("");
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string>("");
  
  // Shared state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<MusicGeneration | null>(null);
  const [activeTab, setActiveTab] = useState("textToMusic");

  // Fetch user's music generations
  const { data: generations } = useQuery({
    queryKey: ["/api/my-generations"],
    retry: false,
  });

  // Shared generation success handler
  const handleGenerationSuccess = async (data: any) => {
    setIsGenerating(true);
    const { generationId } = data;
    
    // Poll for status updates
    const pollStatus = async () => {
      try {
        const response = await apiRequest("GET", `/api/generation/${generationId}/status`);
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
            window.location.href = "/api/login";
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
        window.location.href = "/api/login";
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
    mutationFn: async (data: { tags: string; lyrics: string; duration: number }) => {
      const response = await apiRequest("POST", "/api/generate-text-to-music", data);
      return await response.json();
    },
    onSuccess: handleGenerationSuccess,
    onError: handleGenerationError,
  });

  // Audio-to-music generation mutation
  const generateAudioToMusicMutation = useMutation({
    mutationFn: async (data: { tags: string; lyrics: string; inputAudioUrl: string }) => {
      const response = await apiRequest("POST", "/api/generate-audio-to-music", data);
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
    });
  };

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      setUploadedAudioUrl(uploadedFile.uploadURL);
      toast({
        title: "Audio Uploaded!",
        description: "Your audio file is ready for processing.",
      });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-music-dark flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-music-dark text-white">
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
                AI Music Studio
              </h1>
            </div>
            
            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-music-purple to-music-blue flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-gray-300">
                  {(user as any)?.firstName || (user as any)?.email || "User"}
                </span>
              </div>
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
          <TabsList className="bg-music-secondary p-2 border border-gray-700">
            <TabsTrigger 
              value="textToMusic"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-music-purple data-[state=active]:to-music-blue data-[state=active]:text-white"
              data-testid="tab-text-to-music"
            >
              <WandSparkles className="mr-2 h-4 w-4" />
              Text to Music
            </TabsTrigger>
            <TabsTrigger 
              value="audioToMusic"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-music-purple data-[state=active]:to-music-blue data-[state=active]:text-white"
              data-testid="tab-audio-to-music"
            >
              <AudioWaveform className="mr-2 h-4 w-4" />
              Audio to Music
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
                      Create Your Track
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
                          className="bg-music-dark border-gray-600 text-white placeholder-gray-400 focus:border-music-purple"
                          required
                          data-testid="input-tags"
                        />
                        <p className="text-xs text-gray-400 mt-2">Separate multiple genres with commas</p>
                      </div>

                      {/* Lyrics Field */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          <Mic className="inline mr-2 h-4 w-4 text-music-green" />
                          Lyrics (Optional)
                        </label>
                        <Textarea
                          value={lyrics}
                          onChange={(e) => setLyrics(e.target.value)}
                          placeholder="[Verse 1]&#10;Walking down the street tonight&#10;City lights are shining bright&#10;&#10;[Chorus]&#10;This is my moment to shine&#10;Everything's gonna be fine"
                          rows={6}
                          className="bg-music-dark border-gray-600 text-white placeholder-gray-400 focus:border-music-green resize-none"
                          data-testid="textarea-lyrics"
                        />
                        <p className="text-xs text-gray-400 mt-2">Use [verse], [chorus], [bridge] to structure your song. Leave empty for instrumental.</p>
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
                        Your Generated Track
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
                      Tips for Better Results
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
                      Transform Your Audio
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
                          className="bg-music-dark border-gray-600 text-white placeholder-gray-400 focus:border-music-purple"
                          required
                          data-testid="input-audio-tags"
                        />
                        <p className="text-xs text-gray-400 mt-2">Describe the style you want the output to have</p>
                      </div>

                      {/* Lyrics Field */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          <Mic className="inline mr-2 h-4 w-4 text-music-green" />
                          Lyrics (Optional)
                        </label>
                        <Textarea
                          value={audioLyrics}
                          onChange={(e) => setAudioLyrics(e.target.value)}
                          placeholder="[Verse 1]&#10;Add lyrics to overlay on the audio&#10;&#10;[Chorus]&#10;Transform the melody with vocals"
                          rows={6}
                          className="bg-music-dark border-gray-600 text-white placeholder-gray-400 focus:border-music-green resize-none"
                          data-testid="textarea-audio-lyrics"
                        />
                        <p className="text-xs text-gray-400 mt-2">Add lyrics to be sung over the transformed audio. Leave empty to keep instrumental.</p>
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
                      Audio Transformation Tips
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
        </Tabs>
      </main>
    </div>
  );
}
