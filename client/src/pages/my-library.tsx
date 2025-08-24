import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Music, Search, Filter, WandSparkles, AudioWaveform, Download, Share, Eye, EyeOff, Trash2 } from "lucide-react";
import type { MusicGeneration } from "@shared/schema";

export default function MyLibrary() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");

  // Fetch user's generations
  const { data: generations, isLoading } = useQuery({
    queryKey: ["/api/my-generations"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Filter generations based on search and filters
  const filteredGenerations = (generations as MusicGeneration[] || []).filter((generation: MusicGeneration) => {
    const matchesSearch = !searchQuery || 
      generation.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      generation.tags?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || generation.status === statusFilter;
    const matchesType = typeFilter === "all" || generation.type === typeFilter;
    const matchesVisibility = visibilityFilter === "all" || generation.visibility === visibilityFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesVisibility;
  });

  const completedGenerations = filteredGenerations.filter(gen => gen.status === "completed");
  const publicGenerations = filteredGenerations.filter(gen => gen.visibility === "public");
  const privateGenerations = filteredGenerations.filter(gen => gen.visibility === "private");

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400">Please log in to view your library.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your music library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-400 mb-2">My Music Library</h1>
            <p className="text-gray-400">
              Welcome back, {(user as any)?.email || 'there'}! Here are all your music creations.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Music className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-sm text-gray-400">Total Tracks</p>
                  <p className="text-xl font-bold text-white">{filteredGenerations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <WandSparkles className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-sm text-gray-400">Completed</p>
                  <p className="text-xl font-bold text-white">{completedGenerations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-sm text-gray-400">Public</p>
                  <p className="text-xl font-bold text-white">{publicGenerations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <EyeOff className="h-5 w-5 text-yellow-400" />
                <div>
                  <p className="text-sm text-gray-400">Private</p>
                  <p className="text-xl font-bold text-white">{privateGenerations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-gray-900 border-gray-700 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by title or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-600 text-white"
                    data-testid="input-search"
                  />
                </div>
              </div>

              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="generating">Generating</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="text-to-music">Text to Music</SelectItem>
                    <SelectItem value="audio-to-music">Audio to Music</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
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

        {/* Generations Grid */}
        {filteredGenerations.length === 0 ? (
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-12 text-center">
              <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No music found</h3>
              <p className="text-gray-400 mb-6">
                {searchQuery || statusFilter !== "all" || typeFilter !== "all" || visibilityFilter !== "all"
                  ? "No tracks match your current filters."
                  : "You haven't created any music yet. Start by generating your first track!"}
              </p>
              {!searchQuery && statusFilter === "all" && typeFilter === "all" && visibilityFilter === "all" && (
                <Button 
                  onClick={() => window.location.href = '/'}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-create-first"
                >
                  Create Your First Track
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGenerations.map((generation: MusicGeneration) => (
              <Card key={generation.id} className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        {generation.type === "text-to-music" ? (
                          <WandSparkles className="w-5 h-5 text-white" />
                        ) : (
                          <AudioWaveform className="w-5 h-5 text-white" />
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {generation.title || "Untitled Track"}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge 
                            variant={generation.status === "completed" ? "default" : "secondary"}
                            className={
                              generation.status === "completed" ? "bg-green-600 text-white" :
                              generation.status === "failed" ? "bg-red-600 text-white" :
                              generation.status === "generating" ? "bg-yellow-600 text-white" :
                              "bg-gray-600 text-white"
                            }
                          >
                            {generation.status}
                          </Badge>
                          <Badge variant={generation.visibility === "public" ? "default" : "secondary"}>
                            {generation.visibility}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-400">
                      <p><strong>Tags:</strong> {generation.tags || "No tags"}</p>
                      {generation.lyrics && (
                        <p className="mt-1">
                          <strong>Lyrics:</strong> {generation.lyrics.substring(0, 100)}
                          {generation.lyrics.length > 100 ? "..." : ""}
                        </p>
                      )}
                      <p className="mt-1">
                        <strong>Created:</strong> {generation.createdAt ? new Date(generation.createdAt).toLocaleDateString() : "N/A"}
                      </p>
                      {generation.duration && (
                        <p><strong>Duration:</strong> {generation.duration}s</p>
                      )}
                    </div>

                    {/* Audio Player */}
                    {generation.audioUrl && generation.status === "completed" && (
                      <div className="mt-4">
                        <AudioPlayer src={generation.audioUrl} className="w-full" />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 items-center pt-3 border-t border-gray-700">
                      {generation.status === "completed" && generation.audioUrl && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = generation.audioUrl!;
                            a.download = `${generation.title || 'track'}.wav`;
                            a.click();
                          }}
                          className="text-blue-400 hover:text-blue-300 flex-1"
                          data-testid={`button-download-${generation.id}`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText('https://numusic.app/track/' + generation.id);
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
                        className="text-green-400 hover:text-green-300 flex-1"
                        data-testid={`button-share-${generation.id}`}
                      >
                        <Share className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}