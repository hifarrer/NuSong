import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Music, Loader2 } from "lucide-react";

interface Playlist {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  trackTitle?: string;
}

export function AddToPlaylistModal({ isOpen, onClose, trackId, trackTitle }: AddToPlaylistModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistData, setNewPlaylistData] = useState({
    name: "",
    description: "",
    isPublic: false,
  });

  // Fetch user's playlists
  const { data: playlists = [], isLoading: playlistsLoading } = useQuery({
    queryKey: ["/api/playlists"],
    enabled: isOpen,
  });

  // Auto-create "My Playlist" if user has no playlists
  useEffect(() => {
    if (isOpen && !playlistsLoading && playlists.length === 0) {
      const createDefaultPlaylist = async () => {
        try {
          const response = await apiRequest("/api/playlists", "POST", {
            name: "My Playlist",
            description: "Your personal playlist",
            isPublic: false,
          });
          const newPlaylist = await response.json();
          queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
          setSelectedPlaylistId(newPlaylist.id);
          toast({
            title: "Playlist created",
            description: "Created 'My Playlist' for you!",
          });
        } catch (error) {
          console.error("Failed to create default playlist:", error);
        }
      };
      createDefaultPlaylist();
    }
  }, [isOpen, playlistsLoading, playlists.length, queryClient, toast]);

  // Create playlist mutation
  const createPlaylistMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; isPublic: boolean }) => {
      const response = await apiRequest("/api/playlists", "POST", data);
      return response.json();
    },
    onSuccess: (newPlaylist) => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      setSelectedPlaylistId(newPlaylist.id);
      setShowCreateForm(false);
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

  // Add track to playlist mutation
  const addToPlaylistMutation = useMutation({
    mutationFn: async (playlistId: string) => {
      const response = await apiRequest(`/api/playlists/${playlistId}/tracks`, "POST", { trackId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Track added",
        description: `"${trackTitle || 'Track'}" has been added to the playlist.`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add track",
        description: error.message || "Could not add track to playlist.",
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

  const handleAddToPlaylist = () => {
    if (!selectedPlaylistId) {
      toast({
        title: "No playlist selected",
        description: "Please select a playlist or create a new one.",
        variant: "destructive",
      });
      return;
    }
    addToPlaylistMutation.mutate(selectedPlaylistId);
  };

  const handleClose = () => {
    setSelectedPlaylistId("");
    setShowCreateForm(false);
    setNewPlaylistData({ name: "", description: "", isPublic: false });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-music-blue" />
            Add to Playlist
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Track Info */}
          <div className="p-3 bg-music-secondary rounded-lg border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-music-purple to-music-blue rounded-lg flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">
                  {trackTitle || "Untitled Track"}
                </p>
                <p className="text-gray-400 text-sm">Track</p>
              </div>
            </div>
          </div>

          {/* Playlist Selection */}
          {!showCreateForm && (
            <div className="space-y-3">
              <Label htmlFor="playlist-select">Select Playlist</Label>
              {playlistsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-music-blue" />
                  <span className="ml-2 text-gray-400">Loading playlists...</span>
                </div>
              ) : playlists.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-3">You don't have any playlists yet.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateForm(true)}
                    className="border-music-blue text-music-blue hover:bg-music-blue hover:text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Playlist
                  </Button>
                </div>
              ) : (
                <Select value={selectedPlaylistId} onValueChange={setSelectedPlaylistId}>
                  <SelectTrigger className="bg-music-dark border-gray-600 text-white">
                    <SelectValue placeholder="Choose a playlist..." />
                  </SelectTrigger>
                  <SelectContent className="bg-music-dark border-gray-600">
                    {playlists.map((playlist: Playlist) => (
                      <SelectItem
                        key={playlist.id}
                        value={playlist.id}
                        className="text-white hover:bg-gray-700"
                      >
                        {playlist.name}
                        {playlist.isPublic && (
                          <span className="ml-2 text-xs text-gray-400">(Public)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Create New Playlist Form */}
          {showCreateForm && (
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
            </form>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {showCreateForm ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 border-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePlaylist}
                  disabled={createPlaylistMutation.isPending || !newPlaylistData.name.trim()}
                  className="flex-1 bg-music-blue hover:bg-music-blue/80"
                >
                  {createPlaylistMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Playlist
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 border-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="flex-1 border-music-blue text-music-blue hover:bg-music-blue hover:text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Playlist
                </Button>
                {selectedPlaylistId && (
                  <Button
                    onClick={handleAddToPlaylist}
                    disabled={addToPlaylistMutation.isPending}
                    className="flex-1 bg-music-blue hover:bg-music-blue/80"
                  >
                    {addToPlaylistMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add to Playlist
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
