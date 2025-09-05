import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { createSlug } from "@/lib/urlUtils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AudioPlayer } from "@/components/ui/audio-player";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ObjectUploader } from "@/components/ObjectUploader";
import { LyricsGeneratorModal } from "@/components/LyricsGeneratorModal";
import { AudioUploadModal } from "@/components/AudioUploadModal";
import { Header } from "@/components/Header";
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
  Trash2,
  Star,
  MessageSquare,
  ExternalLink,
  Share2,
  Copy
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
  const [audioPrompt, setAudioPrompt] = useState("");
  const [audioTitle, setAudioTitle] = useState("");
  const [audioVisibility, setAudioVisibility] = useState<"public" | "private">("public");
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string>("");
  
  // Shared state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<MusicGeneration | null>(null);
  const [activeTab, setActiveTab] = useState("textToMusic");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'textToMusic' || tab === 'audioToMusic' || tab === 'myLibrary') {
      setActiveTab(tab);
    }
  }, []);
  
  // Lyrics generator modal state
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [currentLyricsTarget, setCurrentLyricsTarget] = useState<'text'>('text');
  
  // Audio upload modal state
  const [showAudioUploadModal, setShowAudioUploadModal] = useState(false);

  // Fetch user's music generations
  const { data: generations } = useQuery({
    queryKey: ["/api/my-generations"],
    retry: false,
  });

  // Albums
  const { data: albums } = useQuery({
    queryKey: ["/api/albums"],
    retry: false,
  }) as { data: Array<{ id: string; name: string; isDefault?: boolean }>|undefined };

  const [albumIdText, setAlbumIdText] = useState<string>("");
  const [albumIdAudio, setAlbumIdAudio] = useState<string>("");
  const [libraryAlbumId, setLibraryAlbumId] = useState<string>("");
  
  // Clear share URL when album selection changes
  const handleLibraryAlbumChange = (albumId: string) => {
    setLibraryAlbumId(albumId);
    setShareUrl(""); // Clear cached share URL to force regeneration
  };
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumCoverUrl, setNewAlbumCoverUrl] = useState("");
  const [showEditAlbum, setShowEditAlbum] = useState(false);
  const [editAlbumName, setEditAlbumName] = useState("");
  const [editAlbumPrompt, setEditAlbumPrompt] = useState("");
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [generatedCoverUrl, setGeneratedCoverUrl] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (albums && albums.length > 0) {
      const def = albums.find(a => (a as any).isDefault === true) || albums[0];
      if (!albumIdText) setAlbumIdText(def.id);
      if (!albumIdAudio) setAlbumIdAudio(def.id);
      if (!libraryAlbumId) setLibraryAlbumId(def.id);
      const current = albums.find((a: any) => a.id === (libraryAlbumId || def.id));
      if (current && !showEditAlbum) {
        setEditAlbumName(current.name || "");
      }
    }
  }, [albums]);

  // Fetch user's generation status
  const { data: generationStatus } = useQuery({
    queryKey: ["/api/user/generation-status"],
    retry: false,
  }) as { data: { canGenerate: boolean; reason?: string; currentUsage: number; maxGenerations: number } | undefined };
  
  // Determine if user has an active paid subscription from local auth state
  const hasActiveSubscription = !!(user && (user as any)?.subscriptionPlanId && (user as any)?.planStatus === 'active');
  
  // Can the user generate? Default based on subscription status until status loads
  const canGenerate = generationStatus ? generationStatus.canGenerate : hasActiveSubscription;

  const upgradeInline = (
    <p className="mt-2 text-sm text-red-500">
      To generate tracks please subscribe (7 day trial) {""}
      <a href="/pricing" className="underline">View plans</a>
    </p>
  );

  // Helper function to check if user is on free plan
  const isUserOnFreePlan = () => {
    if (!user) return true;
    const userPlanStatus = (user as any)?.planStatus || 'free';
    // User is on free plan if planStatus is 'free' OR if they have no subscription plan ID
    // OR if their plan status is not 'active' (expired, cancelled, etc.)
    return userPlanStatus === 'free' || !(user as any)?.subscriptionPlanId || userPlanStatus !== 'active';
  };

  // Lyrics generator handlers
  const handleOpenLyricsGenerator = (target: 'text') => {
    setCurrentLyricsTarget(target);
    setShowLyricsModal(true);
  };

  const handleUseLyrics = (generatedLyrics: string) => {
    setLyrics(generatedLyrics);
  };

  // Audio upload handlers
  const handleAudioUploadComplete = (audioUrl: string) => {
    setUploadedAudioUrl(audioUrl);
    toast({
      title: "Upload successful",
      description: "Your audio file has been uploaded successfully!",
    });
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
    setIsGenerating(false);
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

    // Handle generation limit exceeded error
    if (error?.response?.status === 403) {
      const errorData = error.response.data;
      toast({
        title: "Generation Limit Reached",
        description: errorData.message || "You have reached your generation limit. Please upgrade your plan to continue.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Generation Failed",
      description: "There was an error generating your music. Please try again.",
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
    mutationFn: async (data: { tags: string; prompt: string; inputAudioUrl: string; title?: string; visibility: "public" | "private" }) => {
      const response = await apiRequest("/api/generate-audio-to-music", "POST", data);
      return await response.json();
    },
    onSuccess: handleGenerationSuccess,
    onError: handleGenerationError,
  });

  const handleGenerateTextToMusic = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canGenerate) {
      toast({
        title: "Upgrade Required",
        description: "To generate tracks please subscribe (7 day trial)",
        variant: "destructive",
      });
      return;
    }

    if (!tags.trim()) {
      toast({
        title: "Missing Tags",
        description: "Please enter at least one genre tag.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    generateTextToMusicMutation.mutate({
      tags: tags.trim(),
      lyrics: lyrics.trim(),
      duration: duration[0],
      title: title.trim() || undefined,
      visibility,
      albumId: albumIdText || undefined,
    });
  };

  const handleGenerateAudioToMusic = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canGenerate) {
      toast({
        title: "Upgrade Required",
        description: "To generate tracks please subscribe (7 day trial)",
        variant: "destructive",
      });
      return;
    }

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

    setIsGenerating(true);
    generateAudioToMusicMutation.mutate({
      tags: audioTags.trim(),
      prompt: audioPrompt.trim(),
      inputAudioUrl: uploadedAudioUrl,
      title: audioTitle.trim() || undefined,
      visibility: audioVisibility,
      albumId: albumIdAudio || undefined,
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

  // Share album functionality
  const generateShareLink = async (albumId: string) => {
    try {
      setIsGeneratingShareLink(true);
      
      // First try to get existing share link
      try {
        const response = await apiRequest(`/api/albums/${albumId}/share`, 'GET');
        const data = await response.json();
        setShareUrl(data.shareUrl);
        return data.shareUrl;
      } catch (error) {
        // If no existing link, create a new one
        const response = await apiRequest(`/api/albums/${albumId}/share`, 'POST');
        const data = await response.json();
        setShareUrl(data.shareUrl);
        return data.shareUrl;
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({ 
        title: 'Share failed', 
        description: 'Could not generate share link.', 
        variant: 'destructive' 
      });
      return null;
    } finally {
      setIsGeneratingShareLink(false);
    }
  };

  const copyShareLink = async (albumId: string) => {
    try {
      const url = await generateShareLink(albumId);
      await navigator.clipboard.writeText(url);
      toast({ 
        title: 'Link copied!', 
        description: 'Share link copied to clipboard.' 
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({ 
        title: 'Copy failed', 
        description: 'Could not copy link to clipboard.', 
        variant: 'destructive' 
      });
    }
  };

  const openShareLink = async (albumId: string) => {
    try {
      const url = await generateShareLink(albumId);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error opening share link:', error);
      toast({ 
        title: 'Open failed', 
        description: 'Could not open share link.', 
        variant: 'destructive' 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-black/50 flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="text-white">
      {/* Header */}
      <Header currentPage="create" />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="bg-music-secondary p-2 border border-gray-700 grid w-full grid-cols-3 h-12">
            <TabsTrigger 
              value="textToMusic"
              className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-music-purple data-[state=active]:to-music-blue data-[state=active]:text-white flex items-center justify-center h-8 rounded-md transition-all"
              data-testid="tab-text-to-music"
            >
              <WandSparkles className="mr-2 h-4 w-4" />
              Text to Music
            </TabsTrigger>
            <TabsTrigger 
              value="audioToMusic"
              className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-music-purple data-[state=active]:to-music-blue data-[state=active]:text-white flex items-center justify-center h-8 rounded-md transition-all"
              data-testid="tab-audio-to-music"
            >
              <AudioWaveform className="mr-2 h-4 w-4" />
              Audio to Music
            </TabsTrigger>
            <TabsTrigger 
              value="myLibrary"
              className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-music-purple data-[state=active]:to-music-blue data-[state=active]:text-white flex items-center justify-center h-8 rounded-md transition-all"
              data-testid="tab-my-library"
            >
              <Music className="mr-2 h-4 w-4" />
              My Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="textToMusic" className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
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
                          <Music className="inline mr-2 h-4 w-4 text-music-blue" />
                          Album
                        </label>
                        <div className="flex gap-2">
                          <Select value={albumIdText} onValueChange={(value: string) => setAlbumIdText(value)}>
                            <SelectTrigger className="bg-music-dark border-gray-600 text-white focus:border-music-blue" data-testid="select-album-text">
                              <SelectValue placeholder="Select album" />
                            </SelectTrigger>
                            <SelectContent className="bg-music-dark border-gray-600">
                              {(albums || []).map((a: any) => (
                                <SelectItem key={a.id} value={a.id} className="text-white hover:bg-gray-700">
                                  {a.name}{a.isDefault ? " (Default)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="outline" className="border-gray-600" onClick={() => setShowCreateAlbum(true)}>Create New</Button>
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
                        disabled={!canGenerate || generateTextToMusicMutation.isPending || isGenerating}
                        className="w-full bg-gradient-to-r from-music-purple via-music-blue to-music-green hover:from-purple-600 hover:via-blue-600 hover:to-green-600 text-white py-4 text-lg font-bold transition-all transform hover:scale-[1.02] shadow-2xl disabled:opacity-50"
                        data-testid="button-generate"
                      >
                        {generateTextToMusicMutation.isPending || isGenerating ? (
                          <LoadingSpinner className="mr-2 h-5 w-5" />
                        ) : (
                          <WandSparkles className="mr-2 h-5 w-5" />
                        )}
                        {generateTextToMusicMutation.isPending || isGenerating ? "Generating..." : "Generate Music Track"}
                      </Button>
                      {((generationStatus && !generationStatus.canGenerate) || !hasActiveSubscription) && upgradeInline}
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Results Panel */}
              <div className="space-y-6">
                {/* Loading State */}
                {isGenerating && (
                  <Card className="bg-music-secondary border-gray-700 border-2 border-music-purple/30 shadow-xl shadow-music-purple/20">
                    <CardContent className="pt-6 text-center">
                      <div className="space-y-6">
                        <div className="relative">
                          <div className="w-20 h-20 bg-gradient-to-br from-music-purple via-music-blue to-music-green rounded-full flex items-center justify-center mx-auto animate-pulse shadow-lg">
                            <WandSparkles className="text-3xl text-white animate-spin" style={{animationDuration: '2s'}} />
                          </div>
                          <div className="absolute -inset-2 bg-gradient-to-r from-music-purple to-music-blue rounded-full blur opacity-20 animate-pulse"></div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-2xl font-bold text-white">Creating Your Music...</h3>
                          <div className="flex items-center justify-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-music-purple rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-music-blue rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-music-green rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                          </div>
                          <p className="text-gray-300 font-medium">This usually takes 30-60 seconds</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <p className="text-sm text-gray-400">🎵 Analyzing your inputs...</p>
                          <p className="text-sm text-gray-400">🎼 Generating musical patterns...</p>
                          <p className="text-sm text-gray-400">🎹 Composing your unique track...</p>
                        </div>
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
                          onClick={() => {
                            if (!isUserOnFreePlan()) {
                              handleDownload(currentGeneration.audioUrl!);
                            } else {
                              window.location.href = "/pricing";
                            }
                          }}
                          className="flex-1 bg-music-purple hover:bg-purple-600"
                          data-testid="button-download"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {!isUserOnFreePlan() ? "Download" : "Upgrade"}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 border-gray-600 hover:border-music-accent"
                          onClick={() => {
                            if (!isUserOnFreePlan()) {
                              handleShare(currentGeneration);
                            } else {
                              toast({
                                title: "Upgrade Required",
                                description: "Please upgrade your plan to share tracks.",
                                variant: "destructive",
                              });
                            }
                          }}
                          data-testid="button-share"
                        >
                          <Share className="mr-2 h-4 w-4" />
                          Share
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleGenerateTextToMusic({ preventDefault: () => {} } as React.FormEvent)}
                          disabled={!canGenerate}
                          className="border-gray-600 hover:border-music-green"
                          data-testid="button-regenerate"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                      {isUserOnFreePlan() && (
                        <p className="text-xs text-gray-400 text-center mt-2">
                          Please upgrade to download or share.
                        </p>
                      )}
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

          <TabsContent value="audioToMusic" className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
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
                        
                        <Button
                          type="button"
                          onClick={() => setShowAudioUploadModal(true)}
                          className="w-full bg-music-dark border-2 border-dashed border-gray-600 hover:border-music-accent text-gray-300 hover:text-white min-h-[120px] rounded-lg transition-all duration-200 hover:scale-[1.02]"
                          variant="outline"
                        >
                          <div className="flex flex-col items-center justify-center space-y-3 px-4 py-4">
                            <div className="w-16 h-16 bg-music-accent/20 rounded-full flex items-center justify-center">
                              <AudioWaveform className="h-8 w-8 text-music-accent flex-shrink-0" />
                            </div>
                            <div className="text-center space-y-1">
                              <p className="text-base font-semibold">
                                {uploadedAudioUrl ? "Change Audio File" : "Upload Audio File"}
                              </p>
                              <p className="text-sm text-gray-400">
                                Drag & drop or click to browse • MP3, WAV, M4A, AAC, OGG (max 50MB)
                              </p>
                            </div>
                          </div>
                        </Button>
                        
                        {uploadedAudioUrl && (
                          <div className="mt-3 p-3 bg-green-900/20 border border-green-700 rounded-lg">
                            <p className="text-sm text-green-400 flex items-center">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Audio file uploaded successfully! Ready to transform.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Album Selector */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          <Music className="inline mr-2 h-4 w-4 text-music-blue" />
                          Album
                        </label>
                        <div className="flex gap-2">
                          <Select value={albumIdAudio} onValueChange={(value: string) => setAlbumIdAudio(value)}>
                            <SelectTrigger className="bg-music-dark border-gray-600 text-white focus:border-music-blue" data-testid="select-album-audio">
                              <SelectValue placeholder="Select album" />
                            </SelectTrigger>
                            <SelectContent className="bg-music-dark border-gray-600">
                              {(albums || []).map((a: any) => (
                                <SelectItem key={a.id} value={a.id} className="text-white hover:bg-gray-700">
                                  {a.name}{a.isDefault ? " (Default)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="outline" className="border-gray-600" onClick={() => setShowCreateAlbum(true)}>Create New</Button>
                        </div>
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
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
                                className="px-2 sm:px-3 py-1 text-xs bg-gray-700 hover:bg-music-purple hover:text-white text-gray-300 rounded-full transition-colors border border-gray-600 hover:border-music-purple whitespace-nowrap"
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

                      {/* Prompt Field */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-3">
                          <MessageSquare className="inline mr-2 h-4 w-4 text-music-green" />
                          Description (Optional)
                        </label>
                        <Textarea
                          value={audioPrompt}
                          onChange={(e) => setAudioPrompt(e.target.value)}
                          placeholder="A calm and relaxing piano track with soft melodies"
                          rows={3}
                          className="bg-music-dark border-gray-600 text-white placeholder-gray-300 focus:border-music-green resize-none"
                          data-testid="textarea-audio-prompt"
                        />
                        <p className="text-xs text-gray-400 mt-2">Describe the desired result for your audio transformation (e.g., "A calm and relaxing piano track with soft melodies")</p>
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
                        disabled={!canGenerate || generateAudioToMusicMutation.isPending || isGenerating}
                        className="w-full bg-gradient-to-r from-music-accent via-music-purple to-music-blue hover:from-purple-600 hover:via-blue-600 hover:to-green-600 text-white py-4 text-lg font-bold transition-all transform hover:scale-[1.02] shadow-2xl disabled:opacity-50"
                        data-testid="button-generate-audio"
                      >
                        {generateAudioToMusicMutation.isPending || isGenerating ? (
                          <LoadingSpinner className="mr-2 h-5 w-5" />
                        ) : (
                          <AudioWaveform className="mr-2 h-5 w-5" />
                        )}
                        {generateAudioToMusicMutation.isPending || isGenerating ? "Transforming..." : "Transform Audio"}
                      </Button>
                      {((generationStatus && !generationStatus.canGenerate) || !hasActiveSubscription) && upgradeInline}
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Results Panel - Shared with Text-to-Music */}
              <div className="space-y-6">
                {/* Loading State */}
                {isGenerating && (
                  <Card className="bg-music-secondary border-gray-700 border-2 border-music-accent/30 shadow-xl shadow-music-accent/20">
                    <CardContent className="pt-6 text-center">
                      <div className="space-y-6">
                        <div className="relative">
                          <div className="w-20 h-20 bg-gradient-to-br from-music-accent via-music-purple to-music-blue rounded-full flex items-center justify-center mx-auto animate-pulse shadow-lg">
                            <AudioWaveform className="text-3xl text-white animate-bounce" />
                          </div>
                          <div className="absolute -inset-2 bg-gradient-to-r from-music-accent to-music-blue rounded-full blur opacity-20 animate-pulse"></div>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-2xl font-bold text-white">Transforming Your Audio...</h3>
                          <div className="flex items-center justify-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-music-accent rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-music-purple rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                              <div className="w-2 h-2 bg-music-blue rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                          </div>
                          <p className="text-gray-300 font-medium">This usually takes 30-60 seconds</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <p className="text-sm text-gray-400">🎵 Processing your audio file...</p>
                          <p className="text-sm text-gray-400">🎼 Analyzing musical elements...</p>
                          <p className="text-sm text-gray-400">🎹 Creating your transformation...</p>
                        </div>
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
                          onClick={() => {
                            if (!isUserOnFreePlan()) {
                              handleDownload(currentGeneration.audioUrl!);
                            } else {
                              window.location.href = "/pricing";
                            }
                          }}
                          className="flex-1 bg-music-purple hover:bg-purple-600"
                          data-testid="button-download-audio"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {!isUserOnFreePlan() ? "Download" : "Upgrade"}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 border-gray-600 hover:border-music-accent"
                          onClick={() => {
                            if (!isUserOnFreePlan()) {
                              handleShare(currentGeneration);
                            } else {
                              toast({
                                title: "Upgrade Required",
                                description: "Please upgrade your plan to share tracks.",
                                variant: "destructive",
                              });
                            }
                          }}
                          data-testid="button-share-audio"
                        >
                          <Share className="mr-2 h-4 w-4" />
                          Share
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleGenerateAudioToMusic({ preventDefault: () => {} } as React.FormEvent)}
                          disabled={!canGenerate}
                          className="border-gray-600 hover:border-music-green"
                          data-testid="button-regenerate-audio"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                      {isUserOnFreePlan() && (
                        <p className="text-xs text-gray-400 text-center mt-2">
                          Please upgrade to download or share.
                        </p>
                      )}
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
                        <span>Specify style tags to guide the transformation direction</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="text-music-green mr-3 mt-1 h-4 w-4" />
                        <span>Add a description to specify the desired musical result</span>
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

          <TabsContent value="myLibrary" className="space-y-6 sm:space-y-8">
            {/* Generation Status Indicator */}
            {generationStatus && (
              <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${generationStatus.canGenerate ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-gray-300">
                      Generations: {generationStatus.currentUsage} / {generationStatus.maxGenerations} used this month
                    </span>
                  </div>
                  {!generationStatus.canGenerate && (
                    <div className="text-sm text-orange-400">
                      ⚠️ Limit reached. Upgrade your plan to continue generating.
                    </div>
                  )}
                </div>
                <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      generationStatus.canGenerate 
                        ? 'bg-gradient-to-r from-green-500 to-blue-500' 
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((generationStatus.currentUsage / generationStatus.maxGenerations) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            <div>
              <Card className="bg-music-secondary border-gray-700">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="flex items-center">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-music-purple to-music-blue rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                      <Music className="text-xs sm:text-sm text-white" />
                    </div>
                    <span className="text-music-blue text-sm sm:text-base truncate">My Music Library ({Array.isArray(generations) ? generations.length : 0} tracks)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  {/* Album Filter */}
                  <div className="mb-4 flex items-center gap-2">
                    <label className="text-sm text-gray-300">Album</label>
                    <Select value={libraryAlbumId} onValueChange={handleLibraryAlbumChange}>
                      <SelectTrigger className="w-64 bg-music-dark border-gray-600 text-white focus:border-music-blue">
                        <SelectValue placeholder="All albums" />
                      </SelectTrigger>
                      <SelectContent className="bg-music-dark border-gray-600">
                        {(albums || []).map((a: any) => (
                          <SelectItem key={a.id} value={a.id} className="text-white hover:bg-gray-700">
                            {a.name}{a.isDefault ? " (Default)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" className="border-gray-600" onClick={() => setShowCreateAlbum(true)}>Create New</Button>
                    <Button type="button" variant="outline" className="border-gray-600" onClick={() => {
                      const current = (albums || []).find((a: any) => a.id === libraryAlbumId);
                      setEditAlbumName((current as any)?.name || "");
                      setShowEditAlbum(true);
                    }}>Edit Album</Button>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="border-gray-600"
                        disabled={isGeneratingShareLink || !libraryAlbumId}
                        onClick={() => copyShareLink(libraryAlbumId)}
                      >
                        {isGeneratingShareLink ? (
                          <>
                            <LoadingSpinner className="w-4 h-4 mr-2" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Link
                          </>
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="border-gray-600"
                        disabled={isGeneratingShareLink || !libraryAlbumId}
                        onClick={() => openShareLink(libraryAlbumId)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open
                      </Button>
                    </div>
                  </div>
                  {!generations || !Array.isArray(generations) || generations.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <Music className="h-12 w-12 sm:h-16 sm:w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-400 mb-2">No tracks yet</h3>
                      <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6 px-4">Create your first AI-generated track to start your music library.</p>
                      
                    </div>
                  ) : (
                    <>
                      {/* Album cover thumbnail */}
                      {libraryAlbumId && (
                        <div className="flex justify-center mb-4">
                          <div className="w-40 h-40 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 flex items-center justify-center">
                            {(() => {
                              const alb = (albums || []).find((a: any) => a.id === libraryAlbumId);
                              if (alb && alb.coverUrl) {
                                return <img src={alb.coverUrl} alt={alb.name} className="w-full h-full object-cover" />
                              }
                              return <div className="text-gray-500 text-xs">No cover</div>;
                            })()}
                          </div>
                        </div>
                      )}

                      <div className="grid gap-3 sm:gap-4">
                      {(generations as MusicGeneration[])
                        .filter((t: any) => !libraryAlbumId || t.albumId === libraryAlbumId)
                        .map((track: MusicGeneration) => (
                          <TrackCard key={track.id} track={track} user={user} albums={albums || []} />
                        ))}
                      </div>
                    </>
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

      {/* Audio Upload Modal */}
      <AudioUploadModal
        isOpen={showAudioUploadModal}
        onClose={() => setShowAudioUploadModal(false)}
        onUploadComplete={handleAudioUploadComplete}
      />

      {/* Create Album Modal */}
      <Dialog open={showCreateAlbum} onOpenChange={setShowCreateAlbum}>
        <DialogContent className="bg-music-secondary border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Album</DialogTitle>
            <DialogDescription className="text-gray-400">Give your album a name. You can add a cover later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Album Name</label>
              <Input value={newAlbumName} onChange={(e) => setNewAlbumName(e.target.value)} placeholder="e.g., My First Album" className="bg-music-dark border-gray-600 text-white placeholder-gray-400" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" className="border-gray-600" onClick={() => setShowCreateAlbum(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!newAlbumName.trim()) return;
                try {
                  const res = await apiRequest('/api/albums', 'POST', { name: newAlbumName.trim() });
                  await res.json();
                  setNewAlbumName('');
                  setShowCreateAlbum(false);
                  queryClient.invalidateQueries({ queryKey: ['/api/albums'] });
                } catch (e) {
                  toast({ title: 'Error', description: 'Failed to create album', variant: 'destructive' });
                }
              }}
              className="bg-music-accent hover:bg-music-accent/80"
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Album Modal */}
      <Dialog open={showEditAlbum} onOpenChange={(open) => {
        setShowEditAlbum(open);
        if (!open) {
          setGeneratedCoverUrl('');
        }
      }}>
        <DialogContent className="bg-music-secondary border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Album</DialogTitle>
            <DialogDescription className="text-gray-400">Rename album or set a cover image.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Album Name</label>
              <Input value={editAlbumName} onChange={(e) => setEditAlbumName(e.target.value)} placeholder="Album name" className="bg-music-dark border-gray-600 text-white placeholder-gray-400" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Describe your ideal cover image</label>
              <Textarea
                value={editAlbumPrompt}
                onChange={(e) => setEditAlbumPrompt(e.target.value)}
                placeholder="Prompt to generate album cover..."
                rows={3}
                className="bg-music-dark border-gray-600 text-white placeholder-gray-400"
              />
              <div className="mt-2">
                <Button
                  disabled={isGeneratingCover || !libraryAlbumId || !editAlbumPrompt.trim()}
                  onClick={async () => {
                    try {
                      setIsGeneratingCover(true);
                      setGeneratedCoverUrl('');
                      const resp = await apiRequest(`/api/albums/${libraryAlbumId}/generate-cover`, 'POST', { prompt: editAlbumPrompt.trim() });
                      const data = await resp.json();
                      setGeneratedCoverUrl(data.coverUrl);
                      toast({ title: 'Cover updated', description: 'Album cover was generated successfully.' });
                      queryClient.invalidateQueries({ queryKey: ['/api/albums'] });
                      setEditAlbumPrompt('');
                    } catch (e) {
                      toast({ title: 'Generation failed', description: 'Could not generate cover.', variant: 'destructive' });
                    } finally {
                      setIsGeneratingCover(false);
                    }
                  }}
                  className="bg-music-accent hover:bg-music-accent/80"
                >
                  {isGeneratingCover ? 'Generating…' : 'Generate Cover'}
                </Button>
              </div>
              
              {/* Show generated image preview */}
              {generatedCoverUrl && (
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Generated Cover Preview</label>
                  <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 flex items-center justify-center">
                    <img src={generatedCoverUrl} alt="Generated cover" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Upload Cover Image</label>
              <input ref={imageFileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !libraryAlbumId) return;
                try {
                  setIsUploadingCover(true);
                  // Upload using existing objects/upload -> normalize path, then PATCH album coverUrl
                  const uploadInit = await apiRequest('/api/objects/upload', 'POST');
                  const upData = await uploadInit.json();
                  await fetch(upData.uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': 'application/octet-stream' } });
                  const norm = await apiRequest('/api/objects/normalize-path', 'POST', { uploadURL: upData.uploadURL });
                  const normData = await norm.json();
                  await apiRequest(`/api/albums/${libraryAlbumId}`, 'PATCH', { coverUrl: normData.objectPath });
                  toast({ title: 'Cover updated', description: 'Album cover was uploaded successfully.' });
                  queryClient.invalidateQueries({ queryKey: ['/api/albums'] });
                } catch (err) {
                  toast({ title: 'Upload failed', description: 'Could not upload image.', variant: 'destructive' });
                } finally {
                  setIsUploadingCover(false);
                  if (imageFileInputRef.current) imageFileInputRef.current.value = '';
                }
              }} />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-gray-600"
                  disabled={isUploadingCover}
                  onClick={() => imageFileInputRef.current?.click()}
                >
                  {isUploadingCover ? 'Uploading…' : 'Choose Image'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" className="border-gray-600" onClick={() => setShowEditAlbum(false)}>Close</Button>
            <Button
              onClick={async () => {
                if (!libraryAlbumId) return;
                try {
                  await apiRequest(`/api/albums/${libraryAlbumId}`, 'PATCH', { name: editAlbumName.trim() });
                  toast({ title: 'Album updated', description: 'Name saved.' });
                  queryClient.invalidateQueries({ queryKey: ['/api/albums'] });
                  setShowEditAlbum(false);
                } catch (e) {
                  toast({ title: 'Update failed', description: 'Could not save name.', variant: 'destructive' });
                }
              }}
              className="bg-music-accent hover:bg-music-accent/80"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TrackCard({ track, user, albums }: { track: MusicGeneration; user: any, albums: Array<{ id: string; name: string; isDefault?: boolean }> }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(track.title || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Helper function to check if user is on free plan
  const isUserOnFreePlan = () => {
    if (!user) return true;
    const userPlanStatus = (user as any)?.planStatus || 'free';
    // User is on free plan if planStatus is 'free' OR if they have no subscription plan ID
    // OR if their plan status is not 'active' (expired, cancelled, etc.)
    return userPlanStatus === 'free' || !(user as any)?.subscriptionPlanId || userPlanStatus !== 'active';
  };

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

  const updateAlbumMutation = useMutation({
    mutationFn: async (albumId: string) => {
      const response = await apiRequest(`/api/generation/${track.id}/visibility`, "PATCH", { 
        visibility: track.visibility,
        title: track.title,
        albumId: albumId
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-generations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/albums"] });
      toast({
        title: "Track moved",
        description: "Track has been moved to the selected album.",
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
        description: "Could not move track to album.",
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
      <CardContent className="p-4 sm:p-6">
        {/* Mobile-first responsive layout */}
        <div className="space-y-4">
          {/* Title and Type Row */}
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-gradient-to-br from-music-purple to-music-blue rounded flex items-center justify-center flex-shrink-0">
              {track.type === "text-to-music" ? (
                <WandSparkles className="w-3 h-3 text-white" />
              ) : (
                <AudioWaveform className="w-3 h-3 text-white" />
              )}
            </div>
            {isEditingTitle ? (
              <div className="flex items-center space-x-2 flex-1 min-w-0">
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
                  className="text-sm sm:text-lg font-semibold bg-music-secondary border-gray-600 text-white flex-1 min-w-0"
                  placeholder="Enter track title"
                  autoFocus
                  data-testid={`input-edit-title-${track.id}`}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateTitleMutation.mutate(editedTitle)}
                  disabled={updateTitleMutation.isPending}
                  className="text-music-green hover:text-music-green flex-shrink-0"
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
                  className="text-gray-400 hover:text-white flex-shrink-0"
                  data-testid={`button-cancel-title-${track.id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <h3 className="text-sm sm:text-lg font-semibold text-white truncate">
                  {track.title || `Untitled Track`}
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditingTitle(true);
                    setEditedTitle(track.title || "");
                  }}
                  className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 h-8 w-8 opacity-70 hover:opacity-100 transition-all flex-shrink-0"
                  data-testid={`button-edit-title-${track.id}`}
                  title="Edit track title"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            )}
            <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
              track.visibility === "public" 
                ? "bg-music-green/20 text-music-green" 
                : "bg-gray-600/20 text-gray-400"
            }`}>
              {track.visibility}
            </span>
          </div>
          
          {/* Track Metadata */}
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-400">
            {track.tags && (
              <div className="flex items-center">
                <Tags className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="truncate">{track.tags}</span>
              </div>
            )}
            {(track as any).albumId && (
              <div className="flex items-center">
                <Music className="w-4 h-4 mr-1 flex-shrink-0" />
                <span className="truncate">Album: {albums.find(a => a.id === (track as any).albumId)?.name || '—'}</span>
              </div>
            )}
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
              {track.duration ? `${track.duration}s` : "N/A"}
            </div>
            <div className="flex items-center">
              <span className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${
                track.status === "completed" ? "bg-music-green" :
                track.status === "processing" ? "bg-music-blue animate-pulse" :
                track.status === "failed" ? "bg-red-500" : "bg-gray-500"
              }`} />
              {track.status}
            </div>
          </div>

          {/* Audio Player */}
          {track.status === "completed" && track.audioUrl && (
            <div>
              <AudioPlayer 
                src={track.audioUrl}
                className="w-full"
              />
            </div>
          )}

          {/* Actions - Mobile responsive */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Select 
              value={track.visibility} 
              onValueChange={(value: "public" | "private") => updateVisibilityMutation.mutate(value)}
              disabled={updateVisibilityMutation.isPending}
            >
              <SelectTrigger className="w-full sm:w-32 bg-music-secondary border-gray-600 text-white text-xs">
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

            <Select 
              value={(track as any).albumId || ""} 
              onValueChange={(albumId: string) => updateAlbumMutation.mutate(albumId)}
              disabled={updateAlbumMutation.isPending}
            >
              <SelectTrigger className="w-full sm:w-40 bg-music-secondary border-gray-600 text-white text-xs">
                <SelectValue placeholder="Select album">
                  {albums.find(a => a.id === (track as any).albumId)?.name || "No album"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-music-dark border-gray-600">
                {albums.map((album) => (
                  <SelectItem 
                    key={album.id} 
                    value={album.id} 
                    className="text-white hover:bg-gray-700 text-xs"
                  >
                    {album.name}{album.isDefault ? " (Default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center justify-center gap-2 sm:gap-1">
                                            {track.status === "completed" && track.audioUrl && (
                 !isUserOnFreePlan() ? (
                   <Button
                     size="sm"
                     variant="ghost"
                     onClick={() => {
                       const link = document.createElement('a');
                       link.href = track.audioUrl!;
                       link.download = `${track.title || 'track'}.wav`;
                       link.click();
                     }}
                     className="text-gray-400 hover:text-white flex-1 sm:flex-initial flex-col h-auto py-2"
                     data-testid={`button-download-${track.id}`}
                   >
                     <Download className="w-4 h-4 mb-1" />
                     <span className="text-xs">Download</span>
                   </Button>
                 ) : (
                   <Button
                     size="sm"
                     variant="ghost"
                     onClick={() => window.location.href = "/pricing"}
                     className="text-music-purple hover:text-white hover:bg-music-purple/20 flex-1 sm:flex-initial flex-col h-auto py-2"
                     data-testid={`button-upgrade-download-${track.id}`}
                     title="Upgrade to download tracks"
                   >
                     <Download className="w-4 h-4 mb-1" />
                     <span className="text-xs">Download</span>
                   </Button>
                 )
               )}
              
              {isUserOnFreePlan() ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    toast({
                      title: "Upgrade Required",
                      description: "Please upgrade your plan to share tracks.",
                      variant: "destructive",
                    });
                  }}
                  className="text-music-purple hover:text-white hover:bg-music-purple/20 flex-1 sm:flex-initial flex-col h-auto py-2"
                  data-testid={`button-upgrade-share-${track.id}`}
                  title="Upgrade to share tracks"
                >
                  <ExternalLink className="w-4 h-4 mb-1" />
                  <span className="text-xs">Share</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText('https://nusong.app/track/' + track.id);
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
                  className="text-gray-400 hover:text-white flex-1 sm:flex-initial flex-col h-auto py-2"
                  data-testid={`button-share-${track.id}`}
                >
                  <Share className="w-4 h-4 mb-1" />
                  <span className="text-xs">Share</span>
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-gray-400 hover:text-red-400 flex-1 sm:flex-initial flex-col h-auto py-2"
                data-testid={`button-delete-${track.id}`}
              >
                <Trash2 className="w-4 h-4 mb-1" />
                <span className="text-xs">Delete</span>
              </Button>
            </div>
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
