import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Music, Play, Pause, ExternalLink, User, Calendar, ArrowLeft, Disc, Plus, Eye } from "lucide-react";
import { createSlug } from "@/lib/urlUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ControlledAudioPlayer } from "@/components/ui/controlled-audio-player";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { AddToPlaylistModal } from "@/components/AddToPlaylistModal";
import { useAuth } from "@/hooks/useAuth";

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  createdAt: string;
}

interface Album {
  id: string;
  name: string;
  coverUrl?: string;
  viewCount: number;
  createdAt: string;
}

interface Track {
  id: string;
  title?: string;
  tags: string;
  lyrics?: string;
  audioUrl: string;
  imageUrl?: string;
  duration?: number;
  type: string;
  viewCount: number;
  createdAt: string;
}

interface PublicTrackData {
  user: User;
  album: Album;
  track: Track;
}

export default function PublicTrack() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const pathParts = location.split('/');
  const username = pathParts[2]; // /u/username/albumslug/trackid
  const albumSlug = pathParts[3];
  const trackId = pathParts[4];
  
  const [data, setData] = useState<PublicTrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!username || !albumSlug || !trackId) {
      setError("Invalid track URL");
      setLoading(false);
      return;
    }

    const fetchPublicTrack = async () => {
      try {
        const response = await fetch(`/api/u/${username}/${albumSlug}/${trackId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Track not found");
          } else {
            setError("Failed to load track");
          }
          return;
        }
        
        const trackData = await response.json();
        setData(trackData);
      } catch (err) {
        console.error("Error fetching public track:", err);
        setError("Failed to load track");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicTrack();
  }, [username, albumSlug, trackId]);

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleAddToPlaylist = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to add tracks to playlists.",
        variant: "destructive",
      });
      return;
    }
    setShowAddToPlaylistModal(true);
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-black/50 flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-black/50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <Music className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Track Not Found</h1>
            <p className="text-gray-400">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => navigate(`/u/${username}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/u/${username}`)}
            className="text-gray-400 hover:text-white"
          >
            <User className="w-4 h-4 mr-2" />
            {data.user.firstName} {data.user.lastName}
          </Button>
          <span className="text-gray-600 self-center">/</span>
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/u/${username}/${albumSlug}`)}
            className="text-gray-400 hover:text-white"
          >
            <Disc className="w-4 h-4 mr-2" />
            {data.album.name}
          </Button>
        </div>

        {/* Track Display */}
        <div className="max-w-2xl mx-auto">
          <Card className="bg-music-secondary border-gray-700">
            <CardContent className="p-8">
              {/* Album Cover Image */}
              <div className="w-full aspect-square max-w-md mx-auto rounded-lg overflow-hidden border border-gray-700 bg-gray-800 flex items-center justify-center mb-6">
                {data.album.coverUrl ? (
                  <img 
                    src={data.album.coverUrl} 
                    alt={data.album.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <Music className="w-24 h-24 text-gray-600" />
                )}
              </div>

              {/* Track Info */}
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {data.track.title || 'Untitled Track'}
                </h1>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <button 
                    onClick={() => navigate(`/u/${data.user.username}`)}
                    className="text-music-blue hover:text-music-blue/80 transition-colors cursor-pointer"
                  >
                    {data.user.firstName} {data.user.lastName}
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Disc className="w-4 h-4 text-gray-400" />
                  <button 
                    onClick={() => navigate(`/u/${username}/${albumSlug}`)}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {data.album.name}
                  </button>
                </div>
                <p className="text-gray-400 text-sm mb-2">
                  {data.track.tags}
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                  {data.track.duration && (
                    <span>
                      Duration: {Math.floor(data.track.duration / 60)}:{(data.track.duration % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{data.track.viewCount} view{data.track.viewCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-4 mb-6">
                <Button
                  variant="default"
                  size="lg"
                  onClick={handlePlay}
                  className="bg-music-blue hover:bg-music-blue/80"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 mr-2" />
                  ) : (
                    <Play className="w-5 h-5 mr-2" />
                  )}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-gray-600"
                  onClick={async () => {
                    try {
                      const shareUrl = window.location.href;
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
                  }}
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Share
                </Button>
                {user && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-music-blue text-music-blue hover:bg-music-blue hover:text-white"
                    onClick={handleAddToPlaylist}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add to Playlist
                  </Button>
                )}
              </div>

              {/* Lyrics */}
              {data.track.lyrics && (
                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Lyrics</h3>
                  <div className="text-gray-300 whitespace-pre-line text-sm leading-relaxed">
                    {data.track.lyrics}
                  </div>
                </div>
              )}

              {/* Creation Date */}
              <div className="border-t border-gray-700 pt-4 mt-6">
                <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Created {formatDate(data.track.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audio Player */}
        <div className="fixed bottom-0 left-0 right-0 bg-music-secondary border-t border-gray-700 p-4">
          <ControlledAudioPlayer
            src={data.track.audioUrl}
            title={data.track.title || 'Untitled Track'}
            isPlaying={isPlaying}
            onPlayPause={handlePlay}
          />
        </div>

        {/* Add to Playlist Modal */}
        <AddToPlaylistModal
          isOpen={showAddToPlaylistModal}
          onClose={() => setShowAddToPlaylistModal(false)}
          trackId={data.track.id}
          trackTitle={data.track.title}
        />
      </div>
    </div>
  );
}
