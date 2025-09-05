import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Music, Play, Pause, Download, ExternalLink, User, Calendar, Disc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ControlledAudioPlayer } from "@/components/ui/controlled-audio-player";
import { Header } from "@/components/Header";

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
  createdAt: string;
}

interface PublicProfileData {
  user: User;
  albums: Album[];
  tracks: Track[];
}

export default function PublicProfile() {
  const [location, navigate] = useLocation();
  // Support both old /profile/username and new /u/username URLs
  const username = location.includes('/profile/') 
    ? location.split('/profile/')[1]
    : location.split('/u/')[1];
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'albums' | 'tracks'>('tracks');

  useEffect(() => {
    if (!username) {
      setError("Invalid username");
      setLoading(false);
      return;
    }

    const fetchPublicProfile = async () => {
      try {
        const response = await fetch(`/api/profile/${username}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("User not found");
          } else {
            setError("Failed to load profile");
          }
          return;
        }
        
        const profileData = await response.json();
        setData(profileData);
      } catch (err) {
        console.error("Error fetching public profile:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [username]);

  const handlePlay = (track: Track) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black/50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black/50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <User className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {data.user.profileImageUrl && (
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-full overflow-hidden border border-gray-700 bg-gray-800 flex items-center justify-center">
                <img 
                  src={data.user.profileImageUrl} 
                  alt={`${data.user.firstName} ${data.user.lastName}`} 
                  className="w-full h-full object-cover" 
                />
              </div>
            )}
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {data.user.firstName} {data.user.lastName}
              </h1>
              <p className="text-gray-400 mb-2">@{data.user.username}</p>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="text-gray-400">
                  Joined {formatDate(data.user.createdAt)}
                </p>
              </div>
              <div className="flex gap-4 justify-center md:justify-start text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Disc className="w-4 h-4" />
                  <span>{data.albums.length} album{data.albums.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Music className="w-4 h-4" />
                  <span>{data.tracks.length} track{data.tracks.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-4 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('tracks')}
              className={`pb-2 px-1 border-b-2 transition-colors ${
                activeTab === 'tracks'
                  ? 'border-music-blue text-music-blue'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Tracks ({data.tracks.length})
            </button>
            <button
              onClick={() => setActiveTab('albums')}
              className={`pb-2 px-1 border-b-2 transition-colors ${
                activeTab === 'albums'
                  ? 'border-music-blue text-music-blue'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Albums ({data.albums.length})
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'tracks' && (
          <div className="space-y-4">
            {data.tracks.length === 0 ? (
              <div className="text-center py-8">
                <Music className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No public tracks yet</p>
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
                        {track.duration && (
                          <p className="text-gray-500 text-xs">
                            {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                          </p>
                        )}
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'albums' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.albums.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <Disc className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No albums yet</p>
              </div>
            ) : (
              data.albums.map((album) => (
                <Card 
                  key={album.id} 
                  className="bg-music-secondary border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                  onClick={() => navigate(`/u/${username}/${album.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="aspect-square rounded-lg overflow-hidden border border-gray-700 bg-gray-800 flex items-center justify-center mb-4">
                      {album.coverUrl ? (
                        <img 
                          src={album.coverUrl} 
                          alt={album.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Disc className="w-12 h-12 text-gray-600" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white truncate mb-1">
                      {album.name}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Created {formatDate(album.createdAt)}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Audio Player */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 bg-music-secondary border-t border-gray-700 p-4">
            <ControlledAudioPlayer
              src={currentTrack.audioUrl}
              title={currentTrack.title || 'Untitled Track'}
              isPlaying={isPlaying}
              onPlayPause={() => setIsPlaying(!isPlaying)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
