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
  
  const [tags, setTags] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [duration, setDuration] = useState([60]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<MusicGeneration | null>(null);

  // Fetch user's music generations
  const { data: generations } = useQuery({
    queryKey: ["/api/my-generations"],
    retry: false,
  });

  // Generate music mutation
  const generateMusicMutation = useMutation({
    mutationFn: async (data: { tags: string; lyrics: string; duration: number }) => {
      const response = await apiRequest("POST", "/api/generate-music", data);
      return await response.json();
    },
    onSuccess: async (data) => {
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
    },
    onError: (error) => {
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
    },
  });

  const handleGenerateMusic = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tags.trim()) {
      toast({
        title: "Missing Tags",
        description: "Please enter at least one genre tag.",
        variant: "destructive",
      });
      return;
    }

    generateMusicMutation.mutate({
      tags: tags.trim(),
      lyrics: lyrics.trim(),
      duration: duration[0],
    });
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
                  {user?.firstName || user?.email || "User"}
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
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-music-purple data-[state=active]:to-music-blue data-[state=active]:text-white opacity-50 cursor-not-allowed"
              disabled
              data-testid="tab-audio-to-music"
            >
              <AudioWaveform className="mr-2 h-4 w-4" />
              Audio to Music
              <span className="ml-2 text-xs bg-music-accent px-2 py-1 rounded-full">Coming Soon</span>
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
                    <form onSubmit={handleGenerateMusic} className="space-y-6">
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
                        disabled={generateMusicMutation.isPending || isGenerating}
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
                          <span>Duration: {Math.floor(currentGeneration.duration / 60)}:{(currentGeneration.duration % 60).toString().padStart(2, '0')}</span>
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
                          onClick={() => handleGenerateMusic({ preventDefault: () => {} } as React.FormEvent)}
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

          <TabsContent value="audioToMusic">
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-music-accent to-music-blue rounded-full flex items-center justify-center mx-auto mb-6">
                <AudioWaveform className="text-3xl text-white" />
              </div>
              <h3 className="text-3xl font-bold mb-4">Audio to Music</h3>
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                Transform existing audio files into new musical arrangements. This feature is coming soon!
              </p>
              <Button className="bg-gradient-to-r from-music-accent to-music-blue opacity-50 cursor-not-allowed" disabled>
                Coming Soon
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
