import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Music, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  MoreVertical, 
  Calendar,
  Clock,
  User,
  Disc
} from "lucide-react";
import { ControlledAudioPlayer } from "@/components/ui/controlled-audio-player";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Playlist {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PlaylistTrack {
  id: string;
  title: string;
  tags?: string;
  lyrics?: string;
  audioUrl: string;
  imageUrl?: string;
  duration?: number;
  type: string;
  visibility: string;
  status: string;
  createdAt: string;
  userId: string;
  albumId?: string;
  addedAt: string;
  position: number;
}

export default function PlaylistsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [currentTrack, setCurrentTrack] = useState<PlaylistTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlistMode, setPlaylistMode] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const [newPlaylistData, setNewPlaylistData] = useState({
    name: "",
    description: "",
    isPublic: false,
  });

  const [editPlaylistData, setEditPlaylistData] = useState({
    name: "",
    description: "",
    isPublic: false,
  });

  // Fetch user's playlists
  const { data: playlists = [], isLoading: playlistsLoading } = useQuery({
    queryKey: ["/api/playlists"],
  });

  // Fetch tracks for selected playlist
  const { data: playlistTracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ["/api/playlists", selectedPlaylistId, "tracks"],
    enabled: !!selectedPlaylistId,
    queryFn: async () => {
      const response = await apiRequest(`/api/playlists/${selectedPlaylistId}/tracks`, "GET");
      return response.json();
    },
  });

  // Create playlist mutation
  const createPlaylistMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; isPublic: boolean }) => {
      const response = await apiRequest("/api/playlists", "POST", data);
      return response.json();
    },
    onSuccess: (newPlaylist) => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      setSelectedPlaylistId(newPlaylist.id);
      setShowCreateModal(false);
      setNewPlaylistData({ name: "", description: "", isPublic: false });
      toast({
        title: "Playlist created",
        description: `"${newPlaylist.name}" has been created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create playlist",
        description: error.message || "Could not create playlist.",
        variant: "destructive",
      });
    },
  });

  // Update playlist mutation
  const updatePlaylistMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest(`/api/playlists/${id}`, "PATCH", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      setShowEditModal(false);
      setEditingPlaylist(null);
      setEditPlaylistData({ name: "", description: "", isPublic: false });
      toast({
        title: "Playlist updated",
        description: "Playlist has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update playlist",
        description: error.message || "Could not update playlist.",
        variant: "destructive",
      });
    },
  });

  // Delete playlist mutation
  const deletePlaylistMutation = useMutation({
    mutationFn: async (playlistId: string) => {
      const response = await apiRequest(`/api/playlists/${playlistId}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      if (selectedPlaylistId === editingPlaylist?.id) {
        setSelectedPlaylistId("");
      }
      toast({
        title: "Playlist deleted",
        description: "Playlist has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete playlist",
        description: error.message || "Could not delete playlist.",
        variant: "destructive",
      });
    },
  });

  // Remove track from playlist mutation
  const removeTrackMutation = useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: string; trackId: string }) => {
      const response = await apiRequest(`/api/playlists/${playlistId}/tracks/${trackId}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists", selectedPlaylistId, "tracks"] });
      toast({
        title: "Track removed",
        description: "Track has been removed from playlist.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to remove track",
        description: error.message || "Could not remove track from playlist.",
        variant: "destructive",
      });
    },
  });

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistData.name.trim()) {
      toast({
        title: "Playlist name required",
        description: "Please enter a name for your playlist.",
        variant: "destructive",
      });
      return;
    }
    createPlaylistMutation.mutate(newPlaylistData);
  };

  const handleEditPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPlaylistData.name.trim() || !editingPlaylist) {
      toast({
        title: "Playlist name required",
        description: "Please enter a name for your playlist.",
        variant: "destructive",
      });
      return;
    }
    updatePlaylistMutation.mutate({ id: editingPlaylist.id, data: editPlaylistData });
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    if (confirm(`Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`)) {
      deletePlaylistMutation.mutate(playlist.id);
    }
  };

  const handleEditPlaylistClick = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setEditPlaylistData({
      name: playlist.name,
      description: playlist.description || "",
      isPublic: playlist.isPublic,
    });
    setShowEditModal(true);
  };

  const handlePlay = (track: PlaylistTrack) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
      setPlaylistMode(false);
    }
  };

  const handlePlayAll = () => {
    if (!playlistTracks || playlistTracks.length === 0) return;
    
    if (playlistMode && isPlaying) {
      setIsPlaying(false);
    } else {
      setPlaylistMode(true);
      setCurrentTrackIndex(0);
      setCurrentTrack(playlistTracks[0]);
      setIsPlaying(true);
    }
  };

  const handleTrackEnd = () => {
    if (!playlistMode || !playlistTracks) return;
    
    const nextIndex = currentTrackIndex + 1;
    if (nextIndex < playlistTracks.length) {
      setCurrentTrackIndex(nextIndex);
      setCurrentTrack(playlistTracks[nextIndex]);
      setIsPlaying(true);
    } else {
      setPlaylistMode(false);
      setCurrentTrackIndex(0);
      setIsPlaying(false);
    }
  };

  const handleRemoveTrack = (trackId: string) => {
    if (confirm("Are you sure you want to remove this track from the playlist?")) {
      removeTrackMutation.mutate({ playlistId: selectedPlaylistId, trackId });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return "0:00";
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!user) {
    return (
      <div className="bg-music-dark">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Login Required</h1>
            <p className="text-gray-400">Please log in to access your playlists.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-music-dark">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Playlists</h1>
            <p className="text-gray-400">Create and manage your music playlists</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-music-blue hover:bg-music-blue/80"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Playlist
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Playlists List */}
          <div className="lg:col-span-1">
            <Card className="bg-music-secondary border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Music className="w-5 h-5" />
                  Playlists ({playlists.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {playlistsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : playlists.length === 0 ? (
                  <div className="text-center py-8">
                    <Music className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">No playlists yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateModal(true)}
                      className="border-music-blue text-music-blue hover:bg-music-blue hover:text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Playlist
                    </Button>
                  </div>
                ) : (
                  playlists.map((playlist: Playlist) => (
                    <div
                      key={playlist.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPlaylistId === playlist.id
                          ? "bg-music-blue/20 border-music-blue"
                          : "bg-music-dark border-gray-700 hover:border-gray-600"
                      }`}
                      onClick={() => setSelectedPlaylistId(playlist.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium truncate">{playlist.name}</h3>
                          <p className="text-gray-400 text-sm">
                            {formatDate(playlist.createdAt)}
                            {playlist.isPublic && (
                              <span className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded">
                                Public
                              </span>
                            )}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-music-dark border-gray-600">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPlaylistClick(playlist);
                              }}
                              className="text-white hover:bg-gray-700"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePlaylist(playlist);
                              }}
                              className="text-red-400 hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Playlist Tracks */}
          <div className="lg:col-span-2">
            {selectedPlaylistId ? (
              <Card className="bg-music-secondary border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Disc className="w-5 h-5" />
                        {playlists.find((p: Playlist) => p.id === selectedPlaylistId)?.name}
                      </CardTitle>
                      <p className="text-gray-400 text-sm mt-1">
                        {playlistTracks.length} track{playlistTracks.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {playlistTracks.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={handlePlayAll}
                        className="border-music-blue text-music-blue hover:bg-music-blue hover:text-white"
                      >
                        {playlistMode && isPlaying ? (
                          <Pause className="w-4 h-4 mr-2" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        {playlistMode && isPlaying ? 'Pause All' : 'Play All'}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {tracksLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : playlistTracks.length === 0 ? (
                    <div className="text-center py-8">
                      <Music className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No tracks in this playlist</p>
                      <p className="text-gray-500 text-sm mt-2">
                        Add tracks from public profiles using the + button
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {playlistTracks.map((track: PlaylistTrack, index: number) => (
                        <div
                          key={track.id}
                          className="flex items-center gap-4 p-3 bg-music-dark rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-music-purple to-music-blue rounded-lg flex items-center justify-center flex-shrink-0">
                              <Music className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-medium truncate">{track.title}</h4>
                              <p className="text-gray-400 text-sm truncate">{track.tags}</p>
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                              <Clock className="w-4 h-4" />
                              {formatDuration(track.duration)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-600"
                              onClick={() => handlePlay(track)}
                            >
                              {currentTrack?.id === track.id && isPlaying ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                              onClick={() => handleRemoveTrack(track.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-music-secondary border-gray-700">
                <CardContent className="text-center py-12">
                  <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Select a Playlist</h3>
                  <p className="text-gray-400">
                    Choose a playlist from the left to view and manage its tracks
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Audio Player */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 bg-music-secondary border-t border-gray-700 p-4">
            <ControlledAudioPlayer
              src={currentTrack.audioUrl}
              title={currentTrack.title || 'Untitled Track'}
              isPlaying={isPlaying}
              onPlayPause={() => setIsPlaying(!isPlaying)}
              onEnded={handleTrackEnd}
            />
          </div>
        )}

        {/* Create Playlist Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-music-blue" />
                Create New Playlist
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <Label htmlFor="playlist-name">Playlist Name</Label>
                <Input
                  id="playlist-name"
                  value={newPlaylistData.name}
                  onChange={(e) => setNewPlaylistData({ ...newPlaylistData, name: e.target.value })}
                  className="mt-1 bg-music-dark border-gray-600 text-white"
                  placeholder="Enter playlist name..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="playlist-description">Description (Optional)</Label>
                <Textarea
                  id="playlist-description"
                  value={newPlaylistData.description}
                  onChange={(e) => setNewPlaylistData({ ...newPlaylistData, description: e.target.value })}
                  className="mt-1 bg-music-dark border-gray-600 text-white"
                  placeholder="Describe your playlist..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is-public"
                  checked={newPlaylistData.isPublic}
                  onCheckedChange={(checked) => setNewPlaylistData({ ...newPlaylistData, isPublic: checked })}
                />
                <Label htmlFor="is-public" className="text-sm">
                  Make this playlist public
                </Label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="border-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createPlaylistMutation.isPending}
                  className="bg-music-blue hover:bg-music-blue/80"
                >
                  {createPlaylistMutation.isPending ? "Creating..." : "Create Playlist"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Playlist Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-music-blue" />
                Edit Playlist
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditPlaylist} className="space-y-4">
              <div>
                <Label htmlFor="edit-playlist-name">Playlist Name</Label>
                <Input
                  id="edit-playlist-name"
                  value={editPlaylistData.name}
                  onChange={(e) => setEditPlaylistData({ ...editPlaylistData, name: e.target.value })}
                  className="mt-1 bg-music-dark border-gray-600 text-white"
                  placeholder="Enter playlist name..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-playlist-description">Description (Optional)</Label>
                <Textarea
                  id="edit-playlist-description"
                  value={editPlaylistData.description}
                  onChange={(e) => setEditPlaylistData({ ...editPlaylistData, description: e.target.value })}
                  className="mt-1 bg-music-dark border-gray-600 text-white"
                  placeholder="Describe your playlist..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is-public"
                  checked={editPlaylistData.isPublic}
                  onCheckedChange={(checked) => setEditPlaylistData({ ...editPlaylistData, isPublic: checked })}
                />
                <Label htmlFor="edit-is-public" className="text-sm">
                  Make this playlist public
                </Label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="border-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatePlaylistMutation.isPending}
                  className="bg-music-blue hover:bg-music-blue/80"
                >
                  {updatePlaylistMutation.isPending ? "Updating..." : "Update Playlist"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
