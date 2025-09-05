import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Music, Play, Pause, Volume2, VolumeX, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Header } from "@/components/Header";

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

interface SharedAlbumData {
  album: Album;
  tracks: Track[];
}

export default function SharedAlbum() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedAlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid share link");
      setLoading(false);
      return;
    }

    const fetchSharedAlbum = async () => {
      try {
        const response = await fetch(`/api/share/${token}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Album not found or link has expired");
          } else {
            setError("Failed to load album");
          }
          return;
        }
        
        const albumData = await response.json();
        setData(albumData);
      } catch (err) {
        console.error("Error fetching shared album:", err);
        setError("Failed to load album");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedAlbum();
  }, [token]);

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
            <Music className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Album Not Found</h1>
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
        {/* Album Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {data.album.coverUrl && (
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-lg overflow-hidden border border-gray-700 bg-gray-800 flex items-center justify-center">
                <img 
                  src={data.album.coverUrl} 
                  alt={data.album.name} 
                  className="w-full h-full object-cover" 
                />
              </div>
            )}
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {data.album.name}
              </h1>
              <p className="text-gray-400 mb-4">
                {data.tracks.length} track{data.tracks.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2 justify-center md:justify-start">
                <Button
                  variant="outline"
                  className="border-gray-600"
                  onClick={() => window.open(window.location.href, '_blank')}
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

        {/* Audio Player */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 bg-music-secondary border-t border-gray-700 p-4">
            <AudioPlayer
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
