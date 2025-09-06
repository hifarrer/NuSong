import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Music, Play, Pause, Download, ExternalLink, User, Calendar, ArrowLeft, Share2, Eye, Plus } from "lucide-react";
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

interface PublicAlbumData {
  user: User;
  album: Album;
  tracks: Track[];
}

export default function PublicAlbum() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const pathParts = location.split('/');
  const username = pathParts[2]; // /u/username/albumslug
  const albumSlug = pathParts[3];
  
  const [data, setData] = useState<PublicAlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlistMode, setPlaylistMode] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<Track | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!username || !albumSlug) {
      setError("Invalid album URL");
      setLoading(false);
      return;
    }

    const fetchPublicAlbum = async () => {
      try {
        const response = await fetch(`/api/u/${username}/${albumSlug}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Album not found");
          } else {
            setError("Failed to load album");
          }
          return;
        }
        
        const albumData = await response.json();
        setData(albumData);
      } catch (err) {
        console.error("Error fetching public album:", err);
        setError("Failed to load album");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicAlbum();
  }, [username, albumSlug]);

  const handlePlay = (track: Track) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
      setPlaylistMode(false); // Exit playlist mode when manually selecting a track
    }
  };

  const handlePlayAll = () => {
    if (!data || data.tracks.length === 0) return;
    
    if (playlistMode && isPlaying) {
      // If already in playlist mode and playing, just pause
      setIsPlaying(false);
    } else {
      // Start playlist mode from the beginning
      setPlaylistMode(true);
      setCurrentTrackIndex(0);
      setCurrentTrack(data.tracks[0]);
      setIsPlaying(true);
    }
  };

  const handleTrackEnd = () => {
    if (!playlistMode || !data) return;
    
    const nextIndex = currentTrackIndex + 1;
    if (nextIndex < data.tracks.length) {
      // Play next track
      setCurrentTrackIndex(nextIndex);
      setCurrentTrack(data.tracks[nextIndex]);
      setIsPlaying(true);
    } else {
      // End of playlist
      setPlaylistMode(false);
      setCurrentTrackIndex(0);
      setIsPlaying(false);
    }
  };

  const handleAddToPlaylist = (track: Track) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to add tracks to playlists.",
        variant: "destructive",
      });
      return;
    }
    setSelectedTrackForPlaylist(track);
    setShowAddToPlaylistModal(true);
  };

  const handleDownload = async (audioUrl: string, title?: string) => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title ? `${title}.mp3` : 'track.mp3';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleShareTrack = async (trackId: string) => {
    const shareUrl = `${window.location.origin}/u/${username}/${albumSlug}/${trackId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied!",
        description: "Track link has been copied to your clipboard.",
      });
    } catch (error) {
      console.error('Error copying track URL:', error);
      toast({
        title: "Share Failed",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleOpenTrack = (trackId: string) => {
    navigate(`/u/${username}/${albumSlug}/${trackId}`);
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
            <h1 className="text-2xl font-bold text-white mb-2">Album Not Found</h1>
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
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/u/${username}`)}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {data.user.firstName} {data.user.lastName}'s Profile
          </Button>
        </div>

        {/* Album Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 flex items-center justify-center">
              {data.album.coverUrl ? (
                <img 
                  src={data.album.coverUrl} 
                  alt={data.album.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <img 
                  src="/nusong_cover.png" 
                  alt="Default album cover" 
                  className="w-full h-full object-cover" 
                />
              )}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {data.album.name}
              </h1>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <User className="w-4 h-4 text-gray-400" />
                <p className="text-gray-400">
                  by{' '}
                  <button 
                    onClick={() => navigate(`/u/${data.user.username}`)}
                    className="text-music-blue hover:text-music-blue/80 transition-colors cursor-pointer"
                  >
                    {data.user.firstName} {data.user.lastName}
                  </button>
                </p>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="text-gray-400">
                  Created {formatDate(data.album.createdAt)}
                </p>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                <p className="text-gray-400">
                  {data.tracks.length} track{data.tracks.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4 text-gray-400" />
                  <p className="text-gray-400">
                    {data.album.viewCount} view{data.album.viewCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-center md:justify-start">
                <Button
                  variant="default"
                  className="bg-music-blue hover:bg-music-blue/80"
                  onClick={handlePlayAll}
                  disabled={!data || data.tracks.length === 0}
                >
                  {playlistMode && isPlaying ? (
                    <Pause className="w-4 h-4 mr-2" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  {playlistMode && isPlaying ? 'Pause All' : 'Play All'}
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-600"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}/u/${username}/${albumSlug}`;
                    navigator.clipboard.writeText(shareUrl);
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Share Album
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tracks List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white mb-4">Tracks</h2>
          {data.tracks.length === 0 ? (
            <div className="text-center py-8">
              <Music className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No public tracks in this album</p>
            </div>
          ) : (
            data.tracks.map((track) => (
              <Card key={track.id} className="bg-music-secondary border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Track Image */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 flex items-center justify-center flex-shrink-0">
                      {track.imageUrl ? (
                        <img 
                          src={track.imageUrl} 
                          alt={track.title || 'Track'} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Music className="w-6 h-6 text-gray-600" />
                      )}
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {track.title || 'Untitled Track'}
                      </h3>
                      <p className="text-gray-400 text-sm truncate">
                        {track.tags}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {track.duration && (
                          <span>
                            {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{track.viewCount} view{track.viewCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
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
                        className="border-gray-600"
                        onClick={() => handleDownload(track.audioUrl, track.title)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-600"
                        onClick={() => handleOpenTrack(track.id)}
                        title="View Track"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-600"
                        onClick={() => handleShareTrack(track.id)}
                        title="Share Track"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      {user && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-music-blue text-music-blue hover:bg-music-blue hover:text-white"
                          onClick={() => handleAddToPlaylist(track)}
                          title="Add to Playlist"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
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

        {/* Add to Playlist Modal */}
        <AddToPlaylistModal
          isOpen={showAddToPlaylistModal}
          onClose={() => {
            setShowAddToPlaylistModal(false);
            setSelectedTrackForPlaylist(null);
          }}
          trackId={selectedTrackForPlaylist?.id || ""}
          trackTitle={selectedTrackForPlaylist?.title}
        />
      </div>
    </div>
  );
}
