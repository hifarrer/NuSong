import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Header } from "@/components/Header";
import { Music, Share2, Clock, Tags, User, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import type { MusicGeneration } from "@shared/schema";
import backgroundVideo from "/background-video.mp4";

export default function TrackPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  const trackId = location.split('/track/')[1];

  // Fetch track data
  const { data: track, isLoading, error } = useQuery<MusicGeneration>({
    queryKey: [`/api/track/${trackId}`],
    enabled: !!trackId,
    retry: false,
  });

  const handleShare = async () => {
    if (!track) return;
    
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



  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src={backgroundVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Content overlay */}
        <div className="relative z-10 bg-black/40 min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src={backgroundVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Content overlay */}
        <div className="relative z-10 bg-black/40 min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-gray-800/90 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Track Not Found</h3>
              <p className="text-gray-400 mb-6">The track you're looking for doesn't exist or has been removed.</p>
              <Link href="/">
                <Button className="bg-gradient-to-r from-music-purple to-music-blue hover:from-purple-600 hover:to-blue-600">
                  <Music className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src={backgroundVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Content overlay */}
      <div className="relative z-10 bg-black/40 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <Header currentPage="track" />

          {/* Track Card */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gray-800/90 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <Music className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-white">
                        {track.title || "Untitled Track"}
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant={track.status === "completed" ? "default" : "secondary"} 
                               className={track.status === "completed" ? "bg-green-600" : "bg-gray-600"}>
                          {track.status}
                        </Badge>
                        <Badge variant={track.visibility === "public" ? "default" : "secondary"}>
                          <Eye className="w-3 h-3 mr-1" />
                          {track.visibility}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleShare}
                      className="text-blue-400 hover:text-blue-300 border-blue-400 hover:border-blue-300"
                      data-testid="button-share-track"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Track Details */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                        <Tags className="w-4 h-4 mr-2" />
                        Tags
                      </h4>
                      <p className="text-white">{track.tags || "No tags"}</p>
                    </div>
                    
                    {track.duration && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          Duration
                        </h4>
                        <p className="text-white">{track.duration} seconds</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">
                        Generation Type
                      </h4>
                      <p className="text-white capitalize">{track.type.replace('-', ' to ')}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">
                        Created
                      </h4>
                      <p className="text-white">
                        {track.createdAt ? new Date(track.createdAt).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lyrics */}
                {track.lyrics && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Lyrics</h4>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <p className="text-gray-200 whitespace-pre-wrap">{track.lyrics}</p>
                    </div>
                  </div>
                )}

                {/* Audio Player */}
                {track.audioUrl && track.status === "completed" && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Audio</h4>
                    <AudioPlayer src={track.audioUrl} className="w-full" />
                  </div>
                )}
                
                {track.status === "generating" && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                    <p className="text-gray-400">Track is still generating...</p>
                  </div>
                )}
                
                {track.status === "failed" && (
                  <div className="text-center py-8">
                    <p className="text-red-400">Track generation failed</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}