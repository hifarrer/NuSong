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
  Users,
  Edit2,
  Check,
  X,
  Trash2,
  Star,
  MessageSquare,
  ExternalLink,
  Share2,
  Copy,
  Video,
  Film
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

  // Debug mode from URL parameter
  const [isDebugMode, setIsDebugMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'textToMusic' || tab === 'audioToMusic' || tab === 'createVideo') {
      setActiveTab(tab);
    }
    // Check for debug parameter
    setIsDebugMode(params.get('debug') === '1');
  }, []);
  
  // Lyrics generator modal state
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [currentLyricsTarget, setCurrentLyricsTarget] = useState<'text'>('text');
  
  // Audio upload modal state
  const [showAudioUploadModal, setShowAudioUploadModal] = useState(false);
  
  // Video creation modal state
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedTrackForVideo, setSelectedTrackForVideo] = useState<MusicGeneration | null>(null);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedScenes, setGeneratedScenes] = useState<any[]>([]);
  const [sceneTasks, setSceneTasks] = useState<any[]>([]);
  const [showSceneResults, setShowSceneResults] = useState(false);
  const [audioParts, setAudioParts] = useState<string[]>([]);
  const [trimmedAudioUrl, setTrimmedAudioUrl] = useState<string | null>(null);
  
  // Album creation modal state
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [videoTasks, setVideoTasks] = useState<any[]>([]);
  const [isGeneratingVideos, setIsGeneratingVideos] = useState(false);
  const [isMergingVideos, setIsMergingVideos] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

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

  // Fetch user's band data
  const { data: bandData } = useQuery({
    queryKey: ["/api/band"],
    retry: false,
  }) as { data: { band: { id: string; name: string } | null; members: Array<{ id: string; name?: string; role?: string; imageUrl: string | null }> } | undefined };

  // Create album mutation
  const createAlbumMutation = useMutation({
    mutationFn: async (albumName: string) => {
      const response = await apiRequest("/api/albums", "POST", { name: albumName });
      return await response.json();
    },
    onSuccess: (newAlbum) => {
      queryClient.invalidateQueries({ queryKey: ["/api/albums"] });
      setAlbumIdText(newAlbum.id);
      setAlbumIdAudio(newAlbum.id);
      setShowCreateAlbum(false);
      setNewAlbumName("");
      toast({
        title: "Album Created",
        description: `"${newAlbum.name}" has been created and selected.`,
      });
    },
    onError: (error: any) => {
      console.error("Error creating album:", error);
      toast({
        title: "Error",
        description: "Failed to create album. Please try again.",
        variant: "destructive",
      });
    },
  });

  const [albumIdText, setAlbumIdText] = useState<string>("");
  const [albumIdAudio, setAlbumIdAudio] = useState<string>("");

  useEffect(() => {
    if (albums && albums.length > 0) {
      const def = albums.find(a => (a as any).isDefault === true) || albums[0];
      if (!albumIdText) setAlbumIdText(def.id);
      if (!albumIdAudio) setAlbumIdAudio(def.id);
    }
  }, [albums, albumIdText, albumIdAudio]);

  // Fetch user's generation status (audio and video separately)
  const { data: generationStatus } = useQuery({
    queryKey: ["/api/user/generation-status"],
    retry: false,
  }) as { data: { 
    canGenerate: boolean; 
    reason?: string; 
    currentUsage: number; 
    maxGenerations: number;
    audio?: { canGenerate: boolean; reason?: string; currentUsage: number; maxGenerations: number };
    video?: { canGenerate: boolean; reason?: string; currentUsage: number; maxGenerations: number };
  } | undefined };
  
  // Determine if user has an active paid subscription from local auth state
  const hasActiveSubscription = !!(user && (user as any)?.subscriptionPlanId && (user as any)?.planStatus === 'active');
  
  // Can the user generate audio? Default based on subscription status until status loads
  const canGenerateAudio = generationStatus?.audio?.canGenerate ?? generationStatus?.canGenerate ?? hasActiveSubscription;
  
  // Can the user generate video? Default based on subscription status until status loads
  const canGenerateVideo = generationStatus?.video?.canGenerate ?? hasActiveSubscription;
  
  // For backwards compatibility
  const canGenerate = canGenerateAudio;

  const upgradeInline = (
    <p className="mt-2 text-sm text-red-500">
      To generate tracks please subscribe {""}
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

  // Video creation handlers
  const handleCreateVideo = (track: MusicGeneration) => {
    // Check video generation limit before opening modal
    if (!canGenerateVideo) {
      const videoStatus = generationStatus?.video;
      toast({
        title: "Video Generation Limit Reached",
        description: videoStatus?.reason || `You've used ${videoStatus?.currentUsage || 0} / ${videoStatus?.maxGenerations || 1} video generations this month. Please upgrade your plan to continue generating videos.`,
        variant: "destructive",
        action: (
          <a href="/pricing" className="underline text-white font-semibold">
            View Plans
          </a>
        ) as any,
      });
      return;
    }
    
    setSelectedTrackForVideo(track);
    setVideoPrompt("");
    setShowSceneResults(false); // Reset to show creation form
    setFinalVideoUrl(null); // Clear any existing video URL to show creation form
    setShowVideoModal(true);
  };

  // Check if user has a band with members that have images
  const hasValidBand = bandData?.band && bandData.members.some(member => member.imageUrl);

  // Video duration selection: 30s default, 60s optional
  const [videoDurationSec, setVideoDurationSec] = useState<number>(30);

  const handleGenerateVideo = async () => {
    if (!selectedTrackForVideo || !videoPrompt.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a video description.",
        variant: "destructive",
      });
      return;
    }

    // Check video generation limit before proceeding
    if (!canGenerateVideo) {
      const videoStatus = generationStatus?.video;
      toast({
        title: "Video Generation Limit Reached",
        description: videoStatus?.reason || `You've used ${videoStatus?.currentUsage || 0} / ${videoStatus?.maxGenerations || 1} video generations this month. Please upgrade your plan to continue generating videos.`,
        variant: "destructive",
        action: (
          <a href="/pricing" className="underline text-white font-semibold">
            View Plans
          </a>
        ) as any,
      });
      return;
    }

    setIsGeneratingVideo(true);
    try {
      // Call the API to generate video scenes
      const response = await apiRequest("/api/generate-video-scenes", "POST", {
        trackId: selectedTrackForVideo.id,
        videoPrompt: videoPrompt.trim(),
        videoDurationSec,
      });
      
      const result = await response.json();
      
      // Store the generated scenes, tasks, and audio parts
      console.log(`🎵 Frontend handleGenerateVideo - result.trimmedAudioUrl:`, result.trimmedAudioUrl);
      console.log(`🔍 Frontend handleGenerateVideo - result.trimmedAudioUrl type:`, typeof result.trimmedAudioUrl);
      console.log(`🔍 Frontend handleGenerateVideo - result.trimmedAudioUrl length:`, result.trimmedAudioUrl?.length);
      console.log(`🔍 Frontend handleGenerateVideo - result.trimmedAudioUrl is null:`, result.trimmedAudioUrl === null);
      console.log(`🔍 Frontend handleGenerateVideo - result.trimmedAudioUrl is undefined:`, result.trimmedAudioUrl === undefined);
      
      setGeneratedScenes(result.scenes || []);
      setSceneTasks(result.sceneTasks || []);
      setAudioParts(result.audioParts || []);
      setTrimmedAudioUrl(result.trimmedAudioUrl || null);
      setShowSceneResults(true);
      
      console.log(`🔍 Frontend handleGenerateVideo - After setTrimmedAudioUrl, trimmedAudioUrl state:`, result.trimmedAudioUrl);
      
      // Start polling for scene completion
      pollSceneTasks(result.sceneTasks || []);
      
    } catch (error: any) {
      console.error("Error generating video scenes:", error);
      
      // Handle generation limit exceeded error
      if (error?.response?.status === 403) {
        const errorData = error.response.data;
        toast({
          title: "Video Generation Limit Reached",
          description: errorData.message || "You have reached your video generation limit. Please upgrade your plan to continue.",
          variant: "destructive",
          action: (
            <a href="/pricing" className="underline text-white font-semibold">
              View Plans
            </a>
          ) as any,
        });
        return;
      }
      
      toast({
        title: "Generation Failed",
        description: "There was an error generating video scenes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Poll scene tasks for completion
  const pollSceneTasks = async (tasks: any[]) => {
    const pollInterval = setInterval(async () => {
      let allCompleted = true;
      const updatedTasks = [...tasks];
      
      for (let i = 0; i < updatedTasks.length; i++) {
        const task = updatedTasks[i];
        if (task.status === 'processing' && task.taskId) {
          try {
            const response = await apiRequest(`/api/scene-task-status/${task.taskId}`, "GET");
            const status = await response.json();
            
            if (status.status === 'success') {
              updatedTasks[i] = {
                ...task,
                status: 'completed',
                resultUrls: status.resultUrls || []
              };
            } else if (status.status === 'failed') {
              updatedTasks[i] = {
                ...task,
                status: 'failed',
                error: status.error
              };
            } else {
              allCompleted = false;
            }
          } catch (error) {
            console.error(`Error checking task ${task.taskId}:`, error);
            updatedTasks[i] = {
              ...task,
              status: 'failed',
              error: 'Failed to check status'
            };
          }
        } else if (task.status === 'processing') {
          allCompleted = false;
        }
      }
      
      setSceneTasks(updatedTasks);
      
      if (allCompleted) {
        clearInterval(pollInterval);
        const completedCount = updatedTasks.filter(t => t.status === 'completed').length;
        
        // Automatically start video generation if all scenes are completed
        if (completedCount === updatedTasks.length && selectedTrackForVideo) {
          startVideoGeneration(updatedTasks);
        }
      }
    }, 5000); // Poll every 5 seconds
    
    // Clear interval after 5 minutes to prevent infinite polling
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 300000);
  };

  // Start video generation
  const startVideoGeneration = async (completedSceneTasks: any[]) => {
    if (!selectedTrackForVideo) return;
    
    setIsGeneratingVideos(true);
    try {
      const response = await apiRequest("/api/start-video-generation", "POST", {
        trackId: selectedTrackForVideo.id,
        sceneTasks: completedSceneTasks,
        videoDurationSec,
      });
      
      const result = await response.json();
      
      setVideoTasks(result.videoTasks || []);
      
      // Start polling for video completion
      pollVideoTasks(result.videoTasks || []);
      
    } catch (error) {
      console.error("Error starting video generation:", error);
      toast({
        title: "Video Generation Failed",
        description: "There was an error starting video generation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingVideos(false);
    }
  };

  // Poll video tasks for completion
  const pollVideoTasks = async (tasks: any[]) => {
    const pollInterval = setInterval(async () => {
      let allCompleted = true;
      const updatedTasks = [...tasks];
      
      for (let i = 0; i < updatedTasks.length; i++) {
        const task = updatedTasks[i];
        if (task.status === 'processing' && task.videoRequestId) {
          try {
            const response = await apiRequest(`/api/video-task-status/${task.videoRequestId}`, "GET");
            const status = await response.json();
            
            if (status.status === 'completed') {
              updatedTasks[i] = {
                ...task,
                status: 'completed',
                videoUrl: status.outputs && status.outputs.length > 0 ? status.outputs[0] : null
              };
            } else if (status.status === 'failed') {
              updatedTasks[i] = {
                ...task,
                status: 'failed',
                error: status.error
              };
            } else {
              allCompleted = false;
            }
          } catch (error) {
            console.error(`Error checking video task ${task.videoRequestId}:`, error);
            updatedTasks[i] = {
              ...task,
              status: 'failed',
              error: 'Failed to check status'
            };
          }
        } else if (task.status === 'processing') {
          allCompleted = false;
        }
      }
      
      setVideoTasks(updatedTasks);
      
      if (allCompleted) {
        clearInterval(pollInterval);
        const completedCount = updatedTasks.filter(t => t.status === 'completed').length;
        
        // Automatically start video merging if all videos are completed
        if (completedCount === updatedTasks.length && selectedTrackForVideo) {
          mergeVideos(updatedTasks);
        }
      }
    }, 10000); // Poll every 10 seconds for videos (they take longer)
    
    // Clear interval after 30 minutes to prevent infinite polling
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 1800000);
  };

  // Merge videos function
  const mergeVideos = async (completedVideoTasks: any[]) => {
    if (!selectedTrackForVideo) return;
    
    setIsMergingVideos(true);
    try {
      console.log(`🎬 Frontend mergeVideos - trimmedAudioUrl:`, trimmedAudioUrl);
      console.log(`🔍 Frontend mergeVideos - trimmedAudioUrl type:`, typeof trimmedAudioUrl);
      console.log(`🔍 Frontend mergeVideos - trimmedAudioUrl length:`, trimmedAudioUrl?.length);
      console.log(`🔍 Frontend mergeVideos - selectedTrackForVideo.audioUrl:`, selectedTrackForVideo.audioUrl);
      console.log(`🔍 Frontend mergeVideos - trimmedAudioUrl is null:`, trimmedAudioUrl === null);
      console.log(`🔍 Frontend mergeVideos - trimmedAudioUrl is undefined:`, trimmedAudioUrl === undefined);
      
      const requestBody = {
        trackId: selectedTrackForVideo.id,
        videoTasks: completedVideoTasks,
        trimmedAudioUrl: trimmedAudioUrl
      };
      
      console.log(`🔍 Frontend mergeVideos - request body:`, JSON.stringify(requestBody, null, 2));
      
      const response = await apiRequest("/api/merge-videos", "POST", requestBody);
      
      const result = await response.json();
      
      if (result.success) {
        setFinalVideoUrl(result.finalVideoUrl);
        // Refresh the generations list to show the new video
        queryClient.invalidateQueries({ queryKey: ["/api/my-generations"] });
        toast({
          title: "Video Created!",
          description: "Your music video has been successfully created.",
        });
      } else {
        throw new Error(result.message || 'Video merging failed');
      }
      
    } catch (error: any) {
      console.error("Error merging videos:", error);
      
      // Handle generation limit exceeded error
      if (error?.response?.status === 403) {
        const errorData = error.response.data;
        toast({
          title: "Video Generation Limit Reached",
          description: errorData.message || "You have reached your video generation limit. Please upgrade your plan to continue.",
          variant: "destructive",
          action: (
            <a href="/pricing" className="underline text-white font-semibold">
              View Plans
            </a>
          ) as any,
        });
        return;
      }
      
      toast({
        title: "Video Merging Failed",
        description: "There was an error merging the videos. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsMergingVideos(false);
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
      const isAudioGeneration = error.response.config?.url?.includes('text-to-music') || error.response.config?.url?.includes('audio-to-music');
      const limitType = isAudioGeneration ? 'Audio' : 'Video';
      toast({
        title: `${limitType} Generation Limit Reached`,
        description: errorData.message || `You have reached your ${limitType.toLowerCase()} generation limit. Please upgrade your plan to continue.`,
        variant: "destructive",
        action: (
          <a href="/pricing" className="underline text-white font-semibold">
            View Plans
          </a>
        ) as any,
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
    
    if (!canGenerateAudio) {
      const audioStatus = generationStatus?.audio;
      toast({
        title: "Audio Generation Limit Reached",
        description: audioStatus?.reason || `You've used ${audioStatus?.currentUsage || 0} / ${audioStatus?.maxGenerations || 5} audio generations this month. Please upgrade your plan to continue generating music.`,
        variant: "destructive",
        action: (
          <a href="/pricing" className="underline text-white font-semibold">
            View Plans
          </a>
        ) as any,
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
    
    if (!canGenerateAudio) {
      const audioStatus = generationStatus?.audio;
      toast({
        title: "Audio Generation Limit Reached",
        description: audioStatus?.reason || `You've used ${audioStatus?.currentUsage || 0} / ${audioStatus?.maxGenerations || 5} audio generations this month. Please upgrade your plan to continue generating music.`,
        variant: "destructive",
        action: (
          <a href="/pricing" className="underline text-white font-semibold">
            View Plans
          </a>
        ) as any,
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
              value="createVideo"
              className="text-gray-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-music-purple data-[state=active]:to-music-blue data-[state=active]:text-white flex items-center justify-center h-8 rounded-md transition-all"
              data-testid="tab-create-video"
            >
              <Video className="mr-2 h-4 w-4" />
              Create Video
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

          <TabsContent value="createVideo" className="space-y-6 sm:space-y-8">
            <div className="space-y-6">
              {/* Header */}
              <Card className="bg-music-secondary border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-music-purple to-music-blue rounded-lg flex items-center justify-center mr-3">
                      <Video className="text-sm text-white" />
                    </div>
                    <span className="text-music-blue">Create Music Video</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-3">
                    Select one of your tracks below and create a music video with AI-generated scenes. 
                    Describe your vision and we'll generate 6 scene prompts for your video.
                  </p>
                  {!hasValidBand && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <p className="text-sm text-yellow-400 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>You need to create a <a href="/my-band" className="underline hover:text-yellow-300 font-medium">band with members</a> first. Band members will be used as characters in your music videos.</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Songs List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Music className="mr-2 h-5 w-5 text-music-accent" />
                  Your Tracks
                </h3>
                
                {generations && generations.length > 0 ? (
                  <div className="grid gap-4">
                    {generations
                      .filter((track: MusicGeneration) => track.status === "completed" && track.audioUrl)
                      .map((track: MusicGeneration) => (
                        <Card key={track.id} className="bg-music-dark border-gray-600 hover:border-gray-500 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-4">
                              {/* Track Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-lg font-semibold text-white truncate">
                                  {track.title || track.tags || "Untitled Track"}
                                </h4>
                                <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                                  {track.title && (
                                    <span className="flex items-center">
                                      <Tags className="w-4 h-4 mr-1" />
                                      {track.tags}
                                    </span>
                                  )}
                                  <span className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    {track.duration ? `${track.duration}s` : "N/A"}
                                  </span>
                                </div>
                              </div>

                              {/* Mini Audio Player */}
                              <div className="flex-shrink-0">
                                <AudioPlayer 
                                  src={track.audioUrl!}
                                  className="w-64"
                                />
                              </div>

                              {/* Video Actions */}
                              <div className="flex-shrink-0 flex items-center gap-2">
                                {(track as any).videoUrl ? (
                                  <>
                                    <Button
                                      onClick={() => {
                                        setSelectedTrackForVideo(track);
                                        setFinalVideoUrl((track as any).videoUrl);
                                        setShowSceneResults(true); // Show video display section
                                        setShowVideoModal(true);
                                      }}
                                      variant="outline"
                                      className="border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
                                      data-testid={`button-play-video-${track.id}`}
                                    >
                                      <Play className="mr-2 h-4 w-4" />
                                      Play Video
                                    </Button>
                                    <Button
                                      onClick={() => handleCreateVideo(track)}
                                      className="bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600 text-white"
                                      data-testid={`button-recreate-video-${track.id}`}
                                    >
                                      <Film className="mr-2 h-4 w-4" />
                                      Recreate Video
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    onClick={() => handleCreateVideo(track)}
                                    className="bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600 text-white"
                                    data-testid={`button-create-video-${track.id}`}
                                  >
                                    <Film className="mr-2 h-4 w-4" />
                                    Create Video
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <Card className="bg-music-dark border-gray-600">
                    <CardContent className="p-8 text-center">
                      <Video className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">No Tracks Available</h3>
                      <p className="text-gray-400 mb-4">
                        You need to create some music tracks first before you can create videos.
                      </p>
                      <Button
                        onClick={() => setActiveTab("textToMusic")}
                        className="bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600 text-white"
                      >
                        <WandSparkles className="mr-2 h-4 w-4" />
                        Create Your First Track
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
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

      {/* Video Creation Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="bg-music-dark border-gray-600 text-white max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center text-xl">
              <Video className="mr-3 h-6 w-6 text-music-blue" />
              {finalVideoUrl ? "Music Video" : "Create Music Video"}
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              {selectedTrackForVideo && (
                <span>
                  {finalVideoUrl ? "Viewing video for: " : "Creating video for: "}
                  <span className="text-white font-semibold">{selectedTrackForVideo.title || selectedTrackForVideo.tags || "Untitled Track"}</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Only show creation form when not viewing an existing video */}
            {!showSceneResults && !finalVideoUrl && !(selectedTrackForVideo as any)?.videoUrl && (
              <>
                {/* Video Length Selector */}
                <div className="bg-music-secondary rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-300 mb-2">Video Length</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="video-length"
                        value={30}
                        checked={videoDurationSec === 30}
                        onChange={() => setVideoDurationSec(30)}
                      />
                      <span>30 seconds (default)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="video-length"
                        value={60}
                        checked={videoDurationSec === 60}
                        onChange={() => setVideoDurationSec(60)}
                      />
                      <span>60 seconds</span>
                    </label>
                  </div>
                </div>
                {/* Track Preview */}
                {selectedTrackForVideo && (
                  <div className="bg-music-secondary rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Track Preview</h4>
                    <AudioPlayer 
                      src={selectedTrackForVideo.audioUrl!}
                      className="w-full"
                    />
                    <div className="flex items-center space-x-4 text-xs text-gray-400 mt-2">
                      <span className="text-white font-medium">
                        {selectedTrackForVideo.title || selectedTrackForVideo.tags || "Untitled Track"}
                      </span>
                      {selectedTrackForVideo.title && (
                        <span className="flex items-center">
                          <Tags className="w-3 h-3 mr-1" />
                          {selectedTrackForVideo.tags}
                        </span>
                      )}
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {selectedTrackForVideo.duration ? `${selectedTrackForVideo.duration}s` : "N/A"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Band Members Preview */}
                {hasValidBand && bandData?.members && (() => {
                  const membersWithImages = bandData.members.filter((m) => m.imageUrl);
                  return membersWithImages.length > 0 ? (
                    <div className="bg-music-secondary rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
                        <Users className="mr-2 h-4 w-4 text-music-blue" />
                        Band Members in Video
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        {membersWithImages.map((member) => (
                          <div 
                            key={member.id} 
                            className="flex flex-col items-center bg-music-dark rounded-lg p-3 border border-gray-600"
                          >
                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-700 mb-2">
                              {member.imageUrl && (
                                <img 
                                  src={member.imageUrl} 
                                  alt={member.name || 'Band member'} 
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="text-xs text-center">
                              <p className="text-white font-medium">{member.name || 'Member'}</p>
                              {member.role && (
                                <p className="text-gray-400 text-[10px] mt-0.5">{member.role}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 bg-music-dark/50 rounded p-2 border border-gray-700/50">
                        <strong className="text-gray-300">Note:</strong> Your band members will automatically appear in the video scenes. Focus your description on the video setting, story, and visual style—no need to describe the band members themselves.
                      </p>
                    </div>
                  ) : null;
                })()}

                {/* Band Requirement Warning */}
                {!hasValidBand && (
                  <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-yellow-400 mb-1">Band Required</h4>
                        <p className="text-sm text-yellow-300/90 mb-3">
                          You need to create a band with at least one member before you can generate music videos. Your band members will be used as characters in the video scenes.
                        </p>
                        <Button
                          onClick={() => {
                            setShowVideoModal(false);
                            window.location.href = '/my-band';
                          }}
                          className="bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600 text-white text-sm"
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Go to My Band
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Video Description */}
                <div>
                  <Label className="text-sm font-semibold text-gray-300 mb-3 block">
                    <Film className="inline mr-2 h-4 w-4 text-music-accent" />
                    Describe Your Video Vision
                  </Label>
                  <Textarea
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder="Describe the setting, story, visual style, and mood of your music video. For example: 'A cinematic music video set in a neon-lit city at night, following a character driving through empty streets with dramatic lighting and close-up shots of urban details.'"
                    rows={4}
                    className="bg-music-secondary border-gray-600 text-white placeholder-gray-400 focus:border-music-blue resize-none"
                    data-testid="textarea-video-prompt"
                    disabled={!hasValidBand}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Focus on the video setting, story, visual style, and mood. Your band members will automatically appear in the scenes—no need to describe them. We'll generate 6 scene prompts based on your description.
                  </p>
                </div>



                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowVideoModal(false);
                      setShowSceneResults(false);
                      setGeneratedScenes([]);
                      setSceneTasks([]);
                      setAudioParts([]);
                      setTrimmedAudioUrl(null);
                      setVideoTasks([]);
                      setFinalVideoUrl(null);
                    }}
                    className="border-gray-600 text-gray-300 hover:text-white"
                    disabled={isGeneratingVideo}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerateVideo}
                    disabled={!videoPrompt.trim() || isGeneratingVideo || !hasValidBand || !canGenerateVideo}
                    className="bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-generate-video"
                  >
                    {isGeneratingVideo ? (
                      <>
                        <LoadingSpinner className="mr-2 h-4 w-4" />
                        Generating Scenes...
                      </>
                    ) : (
                      <>
                        <WandSparkles className="mr-2 h-4 w-4" />
                        Generate Video Scenes
                      </>
                    )}
                  </Button>
                  {!canGenerateVideo && generationStatus?.video && (
                    <p className="mt-2 text-sm text-red-500">
                      {generationStatus.video.reason || `You've used ${generationStatus.video.currentUsage} / ${generationStatus.video.maxGenerations} video generations this month. `}
                      <a href="/pricing" className="underline font-semibold">Upgrade your plan</a> to continue.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Close button for viewing existing video */}
            {(showSceneResults || finalVideoUrl || (selectedTrackForVideo as any)?.videoUrl) && !sceneTasks.length && !videoTasks.length && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowVideoModal(false);
                    setShowSceneResults(false);
                    setFinalVideoUrl(null);
                  }}
                  className="border-gray-600 text-gray-300 hover:text-white"
                >
                  Close
                </Button>
              </div>
            )}

            {/* Progress Bar - Only show when actively generating a video */}
            {showSceneResults && (sceneTasks.length > 0 || videoTasks.length > 0 || isGeneratingVideo || isMergingVideos) && (
              <div className="mt-6 pt-6 border-t border-gray-600">
                {/* Calculate progress */}
                {(() => {
                  const totalSteps = 3;
                  let progress = 0;
                  let currentStep = '';
                  
                  // Step 1: Scene Images (0-33%)
                  const completedScenes = sceneTasks.filter(t => t.status === 'completed').length;
                  const totalScenes = sceneTasks.length || 6;
                  const sceneProgress = (completedScenes / totalScenes) * 33;
                  
                  // Step 2: Video Generation (33-83%)
                  const completedVideos = videoTasks.filter(t => t.status === 'completed').length;
                  const totalVideos = videoTasks.length || 6;
                  const videoProgress = totalVideos > 0 ? (completedVideos / totalVideos) * 50 : 0;
                  
                  // Step 3: Video Merging (83-100%)
                  const mergeProgress = finalVideoUrl ? 17 : (isMergingVideos ? 5 : 0);
                  
                  if (finalVideoUrl) {
                    // Final video is ready
                    progress = 100;
                    currentStep = 'Complete! Your video is ready.';
                  } else if (totalVideos > 0 && completedVideos === totalVideos) {
                    // All videos done, merging in progress
                    progress = 83 + mergeProgress;
                    currentStep = isMergingVideos ? 'Merging videos...' : 'Preparing to merge...';
                  } else if (totalVideos > 0) {
                    // Videos in progress
                    progress = 33 + videoProgress;
                    currentStep = `Generating videos: ${completedVideos}/${totalVideos}`;
                  } else if (totalScenes > 0) {
                    // Scenes in progress
                    progress = sceneProgress;
                    currentStep = `Generating scene images: ${completedScenes}/${totalScenes}`;
                  } else {
                    progress = 0;
                    currentStep = 'Initializing...';
                  }
                  
                  return (
                    <div className="space-y-4">
                      {/* Progress Bar */}
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-semibold text-white flex items-center">
                            <Film className="mr-2 h-5 w-5 text-music-accent" />
                            Generating Your Music Video
                          </h4>
                          <span className="text-sm text-gray-400">{Math.round(progress)}%</span>
                        </div>
                        <div className="relative w-full h-4 bg-music-dark rounded-full overflow-hidden">
                          <div
                            className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out video-progress-glow"
                            style={{
                              width: `${progress}%`
                            }}
                          />
                        </div>
                        <p className="text-sm text-gray-400 mt-2">{currentStep}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Debug UI - Scene Results - Only show if debug=1 */}
                {isDebugMode && (
                  <>
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center mt-6">
                      <Film className="mr-2 h-5 w-5 text-music-accent" />
                      Generated Scene Images (Debug)
                    </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sceneTasks.map((task, index) => (
                    <Card key={index} className="bg-music-secondary border-gray-600">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Scene Number and Status */}
                          <div className="flex items-center justify-between">
                            <h5 className="font-semibold text-white">
                              Scene {task.sceneNumber}
                            </h5>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              task.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                              task.status === 'processing' ? 'bg-blue-600/20 text-blue-400' :
                              task.status === 'failed' ? 'bg-red-600/20 text-red-400' :
                              'bg-gray-600/20 text-gray-400'
                            }`}>
                              {task.status}
                            </span>
                          </div>

                          {/* Scene Prompt */}
                          <div>
                            <p className="text-sm font-medium text-gray-300 mb-1">Prompt:</p>
                            <p className="text-sm text-gray-400 bg-music-dark p-2 rounded">
                              {task.prompt}
                            </p>
                          </div>

                          {/* Generated Image */}
                          {task.status === 'completed' && task.resultUrls && task.resultUrls.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-300 mb-2">Generated Image:</p>
                              <div className="space-y-2">
                                {task.resultUrls.map((url: string, urlIndex: number) => (
                                  <div key={urlIndex} className="relative">
                                    <img
                                      src={url}
                                      alt={`Scene ${task.sceneNumber} - Image ${urlIndex + 1}`}
                                      className="w-full h-48 object-cover rounded border border-gray-600"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                      {urlIndex + 1}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Processing State */}
                          {task.status === 'processing' && (
                            <div className="flex items-center space-x-2 text-blue-400">
                              <LoadingSpinner className="h-4 w-4" />
                              <span className="text-sm">Generating image...</span>
                            </div>
                          )}

                          {/* Error State */}
                          {task.status === 'failed' && (
                            <div className="text-red-400 text-sm">
                              <p className="font-medium">Error:</p>
                              <p>{task.error || 'Unknown error occurred'}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Audio Parts Debug Info - Only show if debug=1 */}
                {isDebugMode && audioParts.length > 0 && (
                  <div className="mt-4 p-3 bg-music-secondary/50 rounded-lg">
                    <h5 className="text-sm font-semibold text-gray-300 mb-2">Audio Parts (Debug)</h5>
                    <p className="text-sm text-gray-400 mb-2">
                      Original audio has been split into {audioParts.length} parts:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {audioParts.map((url, index) => (
                        <div key={index} className="bg-music-dark p-2 rounded">
                          <span className="text-music-accent">Part {index + 1}:</span>
                          <div className="text-gray-400 truncate mt-1" title={url}>
                            {url.split('/').pop()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video Generation Debug Info - Only show if debug=1 */}
                {isDebugMode && videoTasks.length > 0 && (
                  <div className="mt-4 p-3 bg-music-secondary/50 rounded-lg">
                    <h5 className="text-sm font-semibold text-gray-300 mb-2">Video Generation (Debug)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {videoTasks.map((task, index) => (
                        <div key={index} className="bg-music-dark p-3 rounded">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">
                              Scene {task.sceneNumber}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              task.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                              task.status === 'processing' ? 'bg-blue-600/20 text-blue-400' :
                              task.status === 'failed' ? 'bg-red-600/20 text-red-400' :
                              task.status === 'skipped' ? 'bg-yellow-600/20 text-yellow-400' :
                              'bg-gray-600/20 text-gray-400'
                            }`}>
                              {task.status}
                            </span>
                          </div>
                          
                          {task.model && (
                            <p className="text-xs text-gray-400 mb-1">
                              Model: {task.model}
                            </p>
                          )}
                          
                          {task.status === 'processing' && (
                            <div className="flex items-center space-x-2 text-blue-400">
                              <LoadingSpinner className="h-3 w-3" />
                              <span className="text-xs">Generating video...</span>
                            </div>
                          )}
                          
                          {task.status === 'completed' && task.videoUrl && (
                            <div className="mt-2">
                              <video
                                src={task.videoUrl}
                                controls
                                className="w-full h-32 object-cover rounded border border-gray-600"
                                preload="metadata"
                              />
                            </div>
                          )}
                          
                          {task.status === 'failed' && (
                            <p className="text-xs text-red-400 mt-1">
                              Error: {task.error}
                            </p>
                          )}
                          
                          {task.status === 'skipped' && (
                            <p className="text-xs text-yellow-400 mt-1">
                              {task.reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                  </>
                )}

                {/* Video Merging Status - Only show if debug=1 */}
                {isDebugMode && isMergingVideos && (
                  <div className="mt-4 p-3 bg-music-secondary/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <LoadingSpinner className="h-5 w-5 text-music-accent" />
                      <div>
                        <p className="text-sm font-medium text-white">Merging Videos...</p>
                        <p className="text-xs text-gray-400">
                          Combining all 6 video scenes with the original audio track
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary - Only show if debug=1 */}
                {isDebugMode && (
                  <div className="mt-4 p-3 bg-music-secondary/50 rounded-lg">
                    <p className="text-sm text-gray-300">
                      <strong>Summary:</strong> {sceneTasks.filter(t => t.status === 'completed').length} of {sceneTasks.length} scenes completed
                    </p>
                    {audioParts.length > 0 && (
                      <p className="text-sm text-green-400 mt-1">
                        ✅ Audio successfully split into {audioParts.length} parts
                      </p>
                    )}
                    {videoTasks.length > 0 && (
                      <p className="text-sm text-blue-400 mt-1">
                        🎬 Videos: {videoTasks.filter(t => t.status === 'completed').length} of {videoTasks.length} completed
                      </p>
                    )}
                    {finalVideoUrl && (
                      <p className="text-sm text-green-400 mt-1">
                        🎉 Final video successfully created and saved!
                      </p>
                    )}
                    {sceneTasks.some(t => t.status === 'processing') && (
                      <p className="text-sm text-blue-400 mt-1">
                        Some scenes are still being generated. This page will update automatically.
                      </p>
                    )}
                    {videoTasks.some(t => t.status === 'processing') && (
                      <p className="text-sm text-blue-400 mt-1">
                        Some videos are still being generated. This may take several minutes.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Final Video Display - Show when viewing an existing video or after generation */}
            {(finalVideoUrl || (selectedTrackForVideo as any)?.videoUrl) && (
              <div className="mt-4 p-4 bg-gradient-to-r from-music-purple/20 to-music-blue/20 rounded-lg border border-music-purple/30">
                <h5 className="text-lg font-semibold text-white mb-3 flex items-center">
                  🎉 Final Music Video
                </h5>
                <div className="bg-music-dark rounded-lg p-4">
                  <div className="w-full max-w-md mx-auto">
                    <video
                      src={finalVideoUrl || (selectedTrackForVideo as any)?.videoUrl}
                      controls
                      className="w-full aspect-[3/4] object-cover rounded border border-gray-600"
                      preload="metadata"
                      poster={selectedTrackForVideo?.imageUrl || selectedTrackForVideo?.coverUrl}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-300">
                        <strong>Track:</strong> {selectedTrackForVideo?.title || selectedTrackForVideo?.tags || 'Untitled'}
                      </p>
                      {videoPrompt && (
                        <p className="text-sm text-gray-400">
                          <strong>Description:</strong> {videoPrompt}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-green-400">
                        ✅ Video {finalVideoUrl ? 'creation complete' : 'available'}!
                      </p>
                      <p className="text-xs text-gray-400">
                        {finalVideoUrl ? 'All 6 scenes merged with original audio' : 'Your generated music video'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Album Modal */}
      <Dialog open={showCreateAlbum} onOpenChange={setShowCreateAlbum}>
        <DialogContent className="bg-music-secondary border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Album</DialogTitle>
            <DialogDescription className="text-gray-400">Give your album a name. You can add a cover later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="album-name" className="text-gray-300">Album Name</Label>
              <Input
                id="album-name"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="Enter album name..."
                className="bg-music-dark border-gray-600 text-white focus:border-music-blue"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newAlbumName.trim()) {
                      createAlbumMutation.mutate(newAlbumName.trim());
                    }
                  }
                }}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateAlbum(false);
                  setNewAlbumName("");
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (newAlbumName.trim()) {
                    createAlbumMutation.mutate(newAlbumName.trim());
                  }
                }}
                disabled={!newAlbumName.trim() || createAlbumMutation.isPending}
                className="bg-music-blue hover:bg-music-blue/80 text-white"
              >
                {createAlbumMutation.isPending ? "Creating..." : "Create Album"}
              </Button>
            </div>
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
                      await navigator.clipboard.writeText('https://nusong.ai/track/' + track.id);
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
