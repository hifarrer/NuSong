import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { createSlug } from "@/lib/urlUtils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Header } from "@/components/Header";
import { AudioPlayer } from "@/components/ui/audio-player";
import { 
  Music, 
  Download, 
  Share, 
  ExternalLink, 
  Copy, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff,
  Plus,
  Settings,
  Mic
} from "lucide-react";
import type { MusicGeneration } from "@shared/schema";

export default function MyLibrary() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [libraryAlbumId, setLibraryAlbumId] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isGeneratingShareLink, setIsGeneratingShareLink] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<MusicGeneration | null>(null);

  // Fetch user's albums
  const { data: albums } = useQuery({
    queryKey: ["/api/albums"],
    enabled: isAuthenticated,
    retry: false,
  }) as { data: Array<{ id: string; name: string; isDefault?: boolean; coverUrl?: string }>|undefined };

  // Fetch user's generations
  const { data: generations, isLoading } = useQuery({
    queryKey: ["/api/my-generations"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Set default album when albums are loaded
  useEffect(() => {
    if (albums && albums.length > 0) {
      const def = albums.find(a => (a as any).isDefault === true) || albums[0];
      if (!libraryAlbumId) setLibraryAlbumId(def.id);
    }
  }, [albums, libraryAlbumId]);

  // Clear share URL when album selection changes
  const handleLibraryAlbumChange = (albumId: string) => {
    setLibraryAlbumId(albumId);
    setShareUrl(""); // Clear cached share URL to force regeneration
  };

  // Helper function to check if user is on free plan
  const isUserOnFreePlan = () => {
    if (!user) return true;
    const userPlanStatus = (user as any)?.planStatus || 'free';
    return userPlanStatus === 'free' || !(user as any)?.subscriptionPlanId || userPlanStatus !== 'active';
  };

  // Generate share link for album
  const generateShareLink = async (albumId: string) => {
    try {
      setIsGeneratingShareLink(true);
      const response = await apiRequest(`/api/albums/${albumId}/share`, "POST");
      const data = await response.json();
      return data.shareUrl;
    } catch (error) {
      console.error("Error generating share link:", error);
      throw error;
    } finally {
      setIsGeneratingShareLink(false);
    }
  };

  // Copy share link to clipboard
  const copyShareLink = async (albumId: string) => {
    try {
      const url = await generateShareLink(albumId);
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied!",
        description: "Album link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  // Open share link in new tab
  const openShareLink = async (albumId: string) => {
    try {
      const url = await generateShareLink(albumId);
      window.open(url, '_blank');
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Failed to open share link.",
        variant: "destructive",
      });
    }
  };

  // Delete track mutation
  const deleteTrackMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const response = await apiRequest(`/api/generation/${trackId}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-generations"] });
      toast({
        title: "Track deleted",
        description: "Track has been deleted successfully.",
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
        title: "Delete failed",
        description: "Could not delete track.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteTrack = (track: MusicGeneration) => {
    setTrackToDelete(track);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (trackToDelete) {
      deleteTrackMutation.mutate(trackToDelete.id);
      setShowDeleteConfirm(false);
      setTrackToDelete(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-music-dark text-white flex items-center justify-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to access your library</h1>
          <Button onClick={() => window.location.href = "/auth"}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-music-dark text-white">
      <Header currentPage="library" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Library</h1>
          <p className="text-gray-400">Manage and organize your AI-generated music tracks</p>
        </div>

        <Card className="bg-music-secondary border-gray-700">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-2">
              <Music className="w-5 h-5" />
              Your Music Library
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            {/* Album Filter */}
            <div className="mb-4 flex items-center gap-2 flex-wrap">
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

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : !generations || !Array.isArray(generations) || generations.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Music className="h-12 w-12 sm:h-16 sm:w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-gray-400 mb-2">No tracks yet</h3>
                <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6 px-4">Create your first AI-generated track to start your music library.</p>
                <Button 
                  onClick={() => window.location.href = "/"}
                  className="bg-music-blue hover:bg-music-blue/80"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Track
                </Button>
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
                      <TrackCard 
                        key={track.id} 
                        track={track} 
                        user={user} 
                        albums={albums || []} 
                        onDelete={handleDeleteTrack}
                        isUserOnFreePlan={isUserOnFreePlan}
                      />
                    ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Track
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{trackToDelete?.title || 'this track'}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-gray-600"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteTrackMutation.isPending}
            >
              {deleteTrackMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// TrackCard component (extracted from home.tsx)
function TrackCard({ 
  track, 
  user, 
  albums, 
  onDelete,
  isUserOnFreePlan 
}: { 
  track: MusicGeneration; 
  user: any; 
  albums: Array<{ id: string; name: string; isDefault?: boolean }>;
  onDelete: (track: MusicGeneration) => void;
  isUserOnFreePlan: () => boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(track.title || "");

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

  const handleTitleSubmit = () => {
    if (editedTitle.trim() && editedTitle !== track.title) {
      updateTitleMutation.mutate(editedTitle.trim());
    } else {
      setIsEditingTitle(false);
      setEditedTitle(track.title || "");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSubmit();
    } else if (e.key === "Escape") {
      setIsEditingTitle(false);
      setEditedTitle(track.title || "");
    }
  };

  return (
    <div className="bg-music-dark border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
      {/* Track Info */}
      <div className="flex-1 min-w-0 mb-4">
        {isEditingTitle ? (
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleKeyPress}
            className="bg-music-secondary border-gray-600 text-white text-sm h-8"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2">
            <h3 
              className="text-white font-medium truncate cursor-pointer hover:text-music-blue transition-colors"
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit title"
            >
              {track.title || "Untitled Track"}
            </h3>
            <Edit3 className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs px-2 py-1 rounded ${
            track.status === "completed" 
              ? "bg-green-600/20 text-green-400" 
              : track.status === "processing" 
              ? "bg-yellow-600/20 text-yellow-400"
              : "bg-gray-600/20 text-gray-400"
          }`}>
            {track.status}
          </span>
          
          <span className={`text-xs px-2 py-1 rounded ${
            track.visibility === "public" 
              ? "bg-blue-600/20 text-blue-400" 
              : "bg-gray-600/20 text-gray-400"
          }`}>
            {track.visibility}
          </span>
          
          <span className="text-xs text-gray-500">
            {track.type === "text_to_music" ? "Text to Music" : "Audio to Music"}
          </span>
        </div>
      </div>

      {/* Audio Player */}
      {track.status === "completed" && track.audioUrl && (
        <div className="mb-4">
          <AudioPlayer 
            src={track.audioUrl}
            className="w-full"
          />
        </div>
      )}

      {/* Lyrics */}
      {track.lyrics && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-2">
            <Mic className="inline w-3 h-3 mr-1" />
            Lyrics
          </label>
          <div className="max-h-24 overflow-y-auto p-3 bg-music-secondary/50 rounded-lg border border-gray-600">
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{track.lyrics}</p>
          </div>
        </div>
      )}

      {/* Controls Row */}
      <div className="flex items-center gap-4">
        {/* Album Selector */}
        <div className="w-full sm:w-40">
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
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
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
              title="Upgrade to share tracks"
            >
              <Share className="w-4 h-4 mb-1" />
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
            >
              <Share className="w-4 h-4 mb-1" />
              <span className="text-xs">Share</span>
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateVisibilityMutation.mutate(track.visibility === "public" ? "private" : "public")}
            disabled={updateVisibilityMutation.isPending}
            className="text-gray-400 hover:text-white flex-1 sm:flex-initial flex-col h-auto py-2"
          >
            {track.visibility === "public" ? (
              <EyeOff className="w-4 h-4 mb-1" />
            ) : (
              <Eye className="w-4 h-4 mb-1" />
            )}
            <span className="text-xs">{track.visibility === "public" ? "Hide" : "Show"}</span>
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(track)}
            className="text-gray-400 hover:text-red-400 flex-1 sm:flex-initial flex-col h-auto py-2"
          >
            <Trash2 className="w-4 h-4 mb-1" />
            <span className="text-xs">Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}