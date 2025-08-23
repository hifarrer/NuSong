import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Music, Eye, EyeOff, Search, Filter, WandSparkles, AudioWaveform, Edit3, Check, X, Download } from "lucide-react";
import type { MusicGeneration } from "@shared/schema";

export function AdminMusicTracks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");

  // Fetch all music tracks
  const { data: tracks, isLoading } = useQuery({
    queryKey: ["/api/admin/tracks"],
    retry: false,
  });

  // Toggle gallery visibility mutation
  const toggleGalleryMutation = useMutation({
    mutationFn: async ({ trackId, showInGallery }: { trackId: string; showInGallery: boolean }) => {
      const response = await apiRequest(`/api/admin/tracks/${trackId}/gallery-visibility`, "PATCH", {
        showInGallery,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
      toast({
        title: "Track Updated",
        description: "Gallery visibility has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update track visibility.",
        variant: "destructive",
      });
    },
  });

  // Update title mutation
  const updateTitleMutation = useMutation({
    mutationFn: async ({ trackId, title }: { trackId: string; title: string }) => {
      const response = await apiRequest(`/api/admin/tracks/${trackId}/title`, "PATCH", {
        title,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tracks"] });
      setEditingTitle(null);
      setEditTitleValue("");
      toast({
        title: "Track Updated",
        description: "Track title has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update track title.",
        variant: "destructive",
      });
    },
  });

  const handleToggleGallery = (trackId: string, currentValue: boolean) => {
    toggleGalleryMutation.mutate({
      trackId,
      showInGallery: !currentValue,
    });
  };

  const handleStartEditTitle = (trackId: string, currentTitle: string) => {
    setEditingTitle(trackId);
    setEditTitleValue(currentTitle || "");
  };

  const handleSaveTitle = (trackId: string) => {
    if (editTitleValue.trim().length === 0) {
      toast({
        title: "Invalid Title",
        description: "Title cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    if (editTitleValue.length > 100) {
      toast({
        title: "Invalid Title",
        description: "Title must be 100 characters or less.",
        variant: "destructive",
      });
      return;
    }

    updateTitleMutation.mutate({
      trackId,
      title: editTitleValue.trim(),
    });
  };

  const handleCancelEditTitle = () => {
    setEditingTitle(null);
    setEditTitleValue("");
  };

  // Download track function
  const handleDownloadTrack = async (track: MusicGeneration) => {
    if (!track.audioUrl || track.status !== "completed") {
      toast({
        title: "Download Failed",
        description: "Track is not ready for download.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = track.audioUrl;
      link.download = `${track.title || 'Untitled Track'}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: `Downloading "${track.title || 'Untitled Track'}"...`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the track.",
        variant: "destructive",
      });
    }
  };

  // Filter tracks based on search and filters
  const filteredTracks = (tracks as MusicGeneration[] || []).filter((track: MusicGeneration) => {
    const matchesSearch = !searchQuery || 
      track.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.tags?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || track.status === statusFilter;
    const matchesVisibility = visibilityFilter === "all" || track.visibility === visibilityFilter;
    
    return matchesSearch && matchesStatus && matchesVisibility;
  });

  const publicTracks = filteredTracks.filter(track => track.visibility === "public");
  const galleryVisibleTracks = publicTracks.filter(track => track.showInGallery);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-white">Loading music tracks...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Music Tracks</h1>
          <p className="text-gray-400">
            Manage user-generated music tracks and gallery visibility
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Music className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Total Tracks</p>
                <p className="text-xl font-bold text-white">{(tracks as MusicGeneration[] || []).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-sm text-gray-400">Public Tracks</p>
                <p className="text-xl font-bold text-white">{publicTracks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-sm text-gray-400">Gallery Visible</p>
                <p className="text-xl font-bold text-white">{galleryVisibleTracks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <EyeOff className="h-4 w-4 text-yellow-400" />
              <div>
                <p className="text-sm text-gray-400">Hidden from Gallery</p>
                <p className="text-xl font-bold text-white">{publicTracks.length - galleryVisibleTracks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="text-gray-400 mb-2 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by title or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status-filter" className="text-gray-400 mb-2 block">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="generating">Generating</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="visibility-filter" className="text-gray-400 mb-2 block">Visibility</Label>
              <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Visibility</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tracks List */}
      <div className="space-y-4">
        {filteredTracks.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No tracks found</h3>
              <p className="text-gray-400">No tracks match your current filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredTracks.map((track: MusicGeneration) => (
            <Card key={track.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                      {track.type === "text-to-music" ? (
                        <WandSparkles className="w-5 h-5 text-white" />
                      ) : (
                        <AudioWaveform className="w-5 h-5 text-white" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {/* Editable Title */}
                        <div className="flex items-center space-x-2 flex-1">
                          {editingTitle === track.id ? (
                            <div className="flex items-center space-x-2 flex-1">
                              <Input
                                value={editTitleValue}
                                onChange={(e) => setEditTitleValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveTitle(track.id);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEditTitle();
                                  }
                                }}
                                className="bg-gray-700 border-gray-600 text-white flex-1"
                                placeholder="Enter track title"
                                autoFocus
                                data-testid={`input-edit-title-${track.id}`}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSaveTitle(track.id)}
                                disabled={updateTitleMutation.isPending}
                                className="text-green-400 hover:text-green-300"
                                data-testid={`button-save-title-${track.id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEditTitle}
                                disabled={updateTitleMutation.isPending}
                                className="text-red-400 hover:text-red-300"
                                data-testid={`button-cancel-title-${track.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 group">
                              <h3 className="text-lg font-semibold text-white">
                                {track.title || "Untitled Track"}
                              </h3>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStartEditTitle(track.id, track.title || "")}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 hover:text-blue-300 p-1"
                                data-testid={`button-edit-title-${track.id}`}
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={track.status === "completed" ? "default" : "secondary"}
                            className={
                              track.status === "completed" ? "bg-green-600" :
                              track.status === "failed" ? "bg-red-600" :
                              track.status === "generating" ? "bg-yellow-600" :
                              "bg-gray-600"
                            }
                          >
                            {track.status}
                          </Badge>
                          <Badge variant={track.visibility === "public" ? "default" : "secondary"}>
                            {track.visibility}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-400 space-y-1">
                        <p><strong>Tags:</strong> {track.tags || "No tags"}</p>
                        {track.lyrics && <p><strong>Lyrics:</strong> {track.lyrics.substring(0, 100)}{track.lyrics.length > 100 ? "..." : ""}</p>}
                        <p><strong>Created:</strong> {track.createdAt ? new Date(track.createdAt).toLocaleDateString() : "N/A"}</p>
                        {track.duration && <p><strong>Duration:</strong> {track.duration}s</p>}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3">
                    {/* Download Button */}
                    {track.audioUrl && track.status === "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadTrack(track)}
                        className="text-blue-400 hover:text-blue-300 border-blue-400 hover:border-blue-300"
                        data-testid={`button-download-${track.id}`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    )}
                    
                    {/* Gallery Visibility Toggle */}
                    {track.visibility === "public" && track.status === "completed" && (
                      <>
                        <Label htmlFor={`gallery-${track.id}`} className="text-sm text-gray-400">
                          Show in Gallery
                        </Label>
                        <Switch
                          id={`gallery-${track.id}`}
                          checked={track.showInGallery}
                          onCheckedChange={() => handleToggleGallery(track.id, track.showInGallery)}
                          disabled={toggleGalleryMutation.isPending}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Audio Player */}
                {track.audioUrl && track.status === "completed" && (
                  <div className="mt-4">
                    <AudioPlayer src={track.audioUrl} className="w-full" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}