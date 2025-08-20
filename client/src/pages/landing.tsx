import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Music, Play, Headphones, WandSparkles, Lightbulb, Clock, Tags, AudioWaveform } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { MusicGeneration } from "@shared/schema";

export default function Landing() {
  // Fetch public tracks for the gallery
  const { data: publicTracks } = useQuery({
    queryKey: ["/api/public-tracks"],
    retry: false,
  });

  return (
    <div className="min-h-screen bg-music-dark text-white">
      {/* Header Navigation */}
      <header className="bg-music-secondary/80 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-music-purple to-music-blue rounded-xl flex items-center justify-center">
                <Music className="text-white text-lg" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-music-purple to-music-blue bg-clip-text text-transparent">
                AI Music Studio
              </h1>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Home</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Pricing</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Community</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Help</a>
            </nav>
            
            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white"
                onClick={() => window.location.href = "/api/login"}
              >
                Sign In
              </Button>
              <Button
                className="bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600 text-white font-medium transition-all transform hover:scale-105"
                onClick={() => window.location.href = "/api/login"}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

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
                  onClick={() => window.location.href = "/api/login"}
                  data-testid="button-start-creating"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Start Creating Music
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-gray-600 hover:border-music-accent text-gray-300 hover:text-white px-8 py-4 text-lg font-semibold"
                  data-testid="button-listen-examples"
                >
                  <Headphones className="mr-2 h-5 w-5" />
                  Listen to Examples
                </Button>
              </div>

              {/* Waveform Visualization */}
              <div className="flex justify-center lg:justify-start items-center space-x-1 mb-8 opacity-60">
                {Array.from({ length: 8 }, (_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-gradient-to-t from-music-purple to-music-accent rounded-full animate-pulse"
                    style={{
                      height: `${20 + Math.random() * 25}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Image Column */}
            <div className="relative">
              <div className="relative z-10">
                <img 
                  src="/attached_assets/MZVFGa87BRUKkOkO0cUlN_output_1755653603944.png"
                  alt="AI Music Generation - Futuristic robot with headphones creating music with sound waves"
                  className="w-full h-auto rounded-lg shadow-2xl"
                />
              </div>
              {/* Decorative elements around image */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-music-accent/20 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-music-blue/20 rounded-full blur-2xl"></div>
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
              {(publicTracks as MusicGeneration[]).slice(0, 6).map((track) => (
                <PublicTrackCard key={track.id} track={track} />
              ))}
            </div>

            {publicTracks.length > 6 && (
              <div className="text-center mt-12">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => window.location.href = "/api/login"}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-music-purple to-music-blue rounded-lg flex items-center justify-center">
                  <Music className="text-white text-sm" />
                </div>
                <span className="text-lg font-bold">AI Music Studio</span>
              </div>
              <p className="text-gray-400">Create professional music with the power of artificial intelligence.</p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Text to Music</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Audio to Music</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Access</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Mobile App</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tutorials</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Copyright</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Licensing</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AI Music Studio. All rights reserved. Powered by FAL.ai</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PublicTrackCard({ track }: { track: MusicGeneration }) {
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
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{track.duration ? `${track.duration}s` : ""}</span>
          <span className="capitalize">{track.type.replace("-", " ")}</span>
        </div>
      </CardContent>
    </Card>
  );
}
