import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Header } from "@/components/Header";
import { Music, Play, Headphones, WandSparkles, Lightbulb, Clock, Tags, AudioWaveform, Share } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { MusicGeneration } from "@shared/schema";


export default function Landing() {
  const { toast } = useToast();
  
  // Fetch public tracks for the gallery
  const { data: publicTracks } = useQuery({
    queryKey: ["/api/public-tracks"],
    retry: false,
  });

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

  return (
    <div className="min-h-screen text-white">
      <Header currentPage="home" />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-music-purple/10 via-music-dark to-music-blue/10"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-music-purple/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-music-blue/20 rounded-full blur-3xl animate-pulse-slow"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content Column */}
            <div className="text-center lg:text-left">
              <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-music-accent to-music-green bg-clip-text text-transparent leading-tight">
                Create Music with AI
              </h2>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Transform your ideas into professional music tracks. Generate songs from text prompts or enhance existing audio with our cutting-edge AI technology.
              </p>
              
              {/* Hero CTA */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center mb-12">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600 text-white px-8 py-4 text-lg font-semibold transition-all transform hover:scale-105 shadow-2xl"
                  onClick={() => window.location.href = "/auth"}
                  data-testid="button-start-creating"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Start Creating Music
                </Button>

              </div>
            </div>


          </div>
        </div>
      </section>

      {/* Public Gallery Section */}
      {publicTracks && Array.isArray(publicTracks) && publicTracks.length > 0 && (
        <section className="py-20 bg-music-dark">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold mb-4">Community Gallery</h3>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Discover amazing tracks created by our community of AI music creators.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(publicTracks as MusicGeneration[]).slice(0, 6).map((track: MusicGeneration) => (
                <PublicTrackCard key={track.id} track={track} onShare={() => handleShare(track)} />
              ))}
            </div>

            {publicTracks.length > 6 && (
              <div className="text-center mt-12">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => window.location.href = "/auth"}
                  className="border-music-purple text-music-purple hover:bg-music-purple hover:text-white"
                  data-testid="button-explore-more"
                >
                  Explore More Tracks
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 bg-music-secondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold mb-4">Powerful AI Music Generation</h3>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Create professional-quality music with just text prompts. Our AI understands genres, styles, and musical structure.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-music-secondary rounded-2xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-gradient-to-br from-music-purple to-music-blue rounded-lg flex items-center justify-center mb-6">
                <WandSparkles className="text-white text-xl" />
              </div>
              <h4 className="text-xl font-bold mb-4">Text to Music</h4>
              <p className="text-gray-400">
                Describe your musical vision with genres, lyrics, and style tags. Our AI will compose a complete track for you.
              </p>
            </div>

            <div className="bg-music-secondary rounded-2xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-gradient-to-br from-music-green to-music-blue rounded-lg flex items-center justify-center mb-6">
                <Clock className="text-white text-xl" />
              </div>
              <h4 className="text-xl font-bold mb-4">Custom Duration</h4>
              <p className="text-gray-400">
                Generate tracks from 5 seconds to 4 minutes long. Perfect for loops, full songs, or background music.
              </p>
            </div>

            <div className="bg-music-secondary rounded-2xl p-8 border border-gray-700">
              <div className="w-12 h-12 bg-gradient-to-br from-music-accent to-music-purple rounded-lg flex items-center justify-center mb-6">
                <Lightbulb className="text-white text-xl" />
              </div>
              <h4 className="text-xl font-bold mb-4">Professional Quality</h4>
              <p className="text-gray-400">
                High-quality audio output suitable for streaming, social media, or professional projects.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-music-secondary border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-music-purple to-music-blue rounded-lg flex items-center justify-center">
                  <Music className="text-white text-sm" />
                </div>
                <span className="text-lg font-bold">NuSong</span>
              </div>
              <p className="text-gray-400">Create professional music with the power of artificial intelligence.</p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="/auth" className="hover:text-white transition-colors">Get Started</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 NuSong. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PublicTrackCard({ track, onShare }: { track: MusicGeneration; onShare: () => void }): JSX.Element {
  return (
    <Card className="bg-music-secondary border-gray-700 hover:border-gray-600 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-music-purple to-music-blue rounded-lg flex items-center justify-center">
              {track.type === "text-to-music" ? (
                <WandSparkles className="w-4 h-4 text-white" />
              ) : (
                <AudioWaveform className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <h4 className="font-semibold text-white">
                {track.title || "Untitled Track"}
              </h4>
              <p className="text-sm text-gray-400">
                AI Generated {track.type === "text-to-music" ? "Music" : "Remix"}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {track.tags && (
          <div className="flex items-center text-sm text-gray-400">
            <Tags className="w-4 h-4 mr-2" />
            <span className="truncate">{track.tags}</span>
          </div>
        )}
        
        {track.audioUrl && (
          <AudioPlayer 
            src={track.audioUrl}
            className="w-full"
          />
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs text-gray-500 space-x-4">
            <span>{track.duration ? `${track.duration}s` : ""}</span>
            <span className="capitalize">{track.type.replace("-", " ")}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onShare}
            className="text-gray-400 hover:text-white h-8 w-8 p-0"
            data-testid={`button-share-${track.id}`}
          >
            <Share className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
