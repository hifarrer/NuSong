import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AudioPlayer } from "@/components/ui/audio-player";
import { 
  Heart, 
  Share2, 
  MessageCircle, 
  X, 
  Send,
  Music,
  User,
  Disc,
  Users as UsersIcon
} from "lucide-react";
import { useLocation } from "wouter";

interface CommunityTrack {
  id: string;
  title: string | null;
  tags: string;
  audioUrl: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string | null;
    profileImageUrl: string | null;
  };
  album: {
    id: string;
    name: string;
    coverUrl: string | null;
  } | null;
  likeCount: number;
  commentCount: number;
  userLiked: boolean;
}

interface TrackComment {
  id: string;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string | null;
    profileImageUrl: string | null;
  };
}

interface TrackCommunityInfo {
  track: CommunityTrack;
  user: any;
  album: any;
  band: any;
  bandMembers: any[];
  likeCount: number;
  commentCount: number;
  userLiked: boolean;
}

export default function Community() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();

  const [tracks, setTracks] = useState<CommunityTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [trackInfos, setTrackInfos] = useState<Map<string, TrackCommunityInfo>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Fetch community tracks
  const { data: tracksData, isLoading: loadingTracks } = useQuery({
    queryKey: ["/api/community/tracks"],
    retry: false,
  }) as { data: CommunityTrack[] | undefined; isLoading: boolean };

  useEffect(() => {
    if (tracksData) {
      setTracks(tracksData);
      setIsLoading(false);
    }
  }, [tracksData]);

  // Fetch detailed info for current track
  const currentTrack = tracks.length > 0 ? tracks[currentIndex] : null;
  const { data: trackInfo } = useQuery<TrackCommunityInfo>({
    queryKey: [`/api/tracks/${currentTrack?.id}/community-info`],
    enabled: !!currentTrack?.id,
    retry: false,
  });

  useEffect(() => {
    if (trackInfo && currentTrack) {
      setTrackInfos(prev => {
        const newMap = new Map(prev);
        newMap.set(currentTrack.id, trackInfo);
        return newMap;
      });
    }
  }, [trackInfo, currentTrack]);

  // Fetch comments for selected track
  const { data: comments = [] } = useQuery<TrackComment[]>({
    queryKey: [`/api/tracks/${selectedTrackId}/comments`],
    enabled: showComments && !!selectedTrackId,
    retry: false,
  });

  // Handle scroll/wheel for navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isScrolling = false;
    const handleWheel = (e: WheelEvent) => {
      if (isScrolling) return;
      
      e.preventDefault();
      isScrolling = true;
      
      if (e.deltaY > 0 && currentIndex < tracks.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.deltaY < 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
      
      setTimeout(() => { isScrolling = false; }, 500);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [currentIndex, tracks.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showComments) return; // Don't navigate when comments are open
      
      if (e.key === 'ArrowDown' && currentIndex < tracks.length - 1) {
        e.preventDefault();
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        e.preventDefault();
        setCurrentIndex(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, tracks.length, showComments]);

  // Auto-play video when track becomes active
  useEffect(() => {
    if (!currentTrack) return;
    
    const video = videoRefs.current.get(currentTrack.id);
    if (video && currentTrack.videoUrl) {
      video.play().catch(() => {
        // Autoplay failed, user interaction required
      });
    }
    
    // Pause other videos
    videoRefs.current.forEach((v, id) => {
      if (id !== currentTrack.id && !v.paused) {
        v.pause();
      }
    });
  }, [currentIndex, currentTrack]);

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const response = await fetch(`/api/tracks/${trackId}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to like track');
      return response.json();
    },
    onSuccess: (data, trackId) => {
      setTracks(prev => prev.map(t => 
        t.id === trackId 
          ? { ...t, likeCount: data.likeCount, userLiked: data.liked }
          : t
      ));
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${trackId}/likes`] });
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ trackId, comment }: { trackId: string; comment: string }) => {
      const response = await fetch(`/api/tracks/${trackId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment }),
      });
      if (!response.ok) throw new Error('Failed to post comment');
      return response.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${selectedTrackId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/tracks"] });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async ({ trackId, commentId }: { trackId: string; commentId: string }) => {
      const response = await fetch(`/api/tracks/${trackId}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${selectedTrackId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/tracks"] });
    },
  });

  const handleLike = (trackId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to like tracks.",
        variant: "destructive",
      });
      return;
    }
    likeMutation.mutate(trackId);
  };

  const handleShare = async (track: CommunityTrack) => {
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

  const handleComment = (trackId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please log in to comment.",
        variant: "destructive",
      });
      return;
    }
    setSelectedTrackId(trackId);
    setShowComments(true);
  };

  const handlePostComment = () => {
    if (!commentText.trim() || !selectedTrackId) return;
    commentMutation.mutate({ trackId: selectedTrackId, comment: commentText.trim() });
  };

  const handleDeleteComment = (commentId: string) => {
    if (!selectedTrackId) return;
    deleteCommentMutation.mutate({ trackId: selectedTrackId, commentId });
  };

  // Get current track info (already fetched via query, but also stored in map)
  const currentInfo = currentTrack ? trackInfos.get(currentTrack.id) : null;

  if (isLoading || loadingTracks) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-music-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading community feed...</p>
        </div>
      </div>
    );
  }

  if (!tracks || tracks.length === 0) {
    return (
      <div className="min-h-screen bg-black">
        <Header currentPage="community" />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No tracks yet</h2>
            <p className="text-gray-400">Check back later for community content!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header currentPage="community" />
      
      <div 
        ref={containerRef}
        className="h-[calc(100vh-4rem)] overflow-hidden relative"
      >
        {tracks.map((track, index) => {
          const isActive = index === currentIndex;
          const info = trackInfos.get(track.id);
          const hasVideo = !!track.videoUrl;
          
          return (
            <div
              key={track.id}
              className={`absolute inset-0 transition-transform duration-500 ${
                isActive ? 'translate-y-0' : index < currentIndex ? '-translate-y-full' : 'translate-y-full'
              }`}
              style={{ zIndex: tracks.length - Math.abs(index - currentIndex) }}
            >
              <div className="h-full w-full flex">
                {/* Main content area */}
                <div className="flex-1 relative bg-black">
                  {hasVideo ? (
                    <video
                      ref={(el) => {
                        if (el) videoRefs.current.set(track.id, el);
                        else videoRefs.current.delete(track.id);
                      }}
                      src={track.videoUrl!}
                      className="w-full h-full object-cover"
                      loop
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black p-8">
                      {/* Album cover or track image */}
                      <div className="mb-8">
                        {info?.album?.coverUrl ? (
                          <img 
                            src={info.album.coverUrl} 
                            alt={info.album.name}
                            className="w-64 h-64 object-cover rounded-lg shadow-2xl"
                          />
                        ) : track.imageUrl ? (
                          <img 
                            src={track.imageUrl} 
                            alt={track.title || "Track"}
                            className="w-64 h-64 object-cover rounded-lg shadow-2xl"
                          />
                        ) : (
                          <div className="w-64 h-64 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow-2xl">
                            <Music className="w-32 h-32 text-white opacity-50" />
                          </div>
                        )}
                      </div>

                      {/* Track info */}
                      <div className="text-center mb-6 max-w-2xl">
                        <h2 className="text-3xl font-bold text-white mb-2">
                          {track.title || "Untitled Track"}
                        </h2>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <button
                            onClick={() => info?.user?.username && navigate(`/u/${info.user.username}`)}
                            className="text-music-blue hover:text-music-blue/80"
                          >
                            {track.user.firstName} {track.user.lastName}
                          </button>
                        </div>
                        {info?.album && (
                          <div className="flex items-center justify-center gap-2 mb-4">
                            <Disc className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">{info.album.name}</span>
                          </div>
                        )}
                        {info?.band && (
                          <div className="flex items-center justify-center gap-2 mb-4">
                            <UsersIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">{info.band.name}</span>
                          </div>
                        )}
                        {info?.bandMembers && info.bandMembers.length > 0 && (
                          <div className="flex items-center justify-center gap-2 mb-4">
                            <div className="flex -space-x-2">
                              {info.bandMembers.slice(0, 4).map((member: any, idx: number) => (
                                <div
                                  key={member.id}
                                  className="w-8 h-8 rounded-full border-2 border-gray-800 overflow-hidden bg-gray-700"
                                  style={{ zIndex: 4 - idx }}
                                >
                                  {member.imageUrl ? (
                                    <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                      {member.name[0]}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-gray-400 text-sm">{track.tags}</p>
                      </div>

                      {/* Audio player */}
                      {track.audioUrl && (
                        <div className="w-full max-w-md">
                          <AudioPlayer src={track.audioUrl} className="w-full" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Overlay gradient for video */}
                  {hasVideo && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  )}
                </div>

                {/* Right sidebar with actions */}
                {isActive && (
                  <div className="absolute right-4 bottom-20 flex flex-col items-center gap-6 z-10">
                    {/* User avatar */}
                    <div className="flex flex-col items-center">
                      <Avatar className="w-12 h-12 border-2 border-white">
                        {track.user.profileImageUrl ? (
                          <AvatarImage src={track.user.profileImageUrl} />
                        ) : (
                          <AvatarFallback>
                            {track.user.firstName[0]}{track.user.lastName[0]}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </div>

                    {/* Like button */}
                    <button
                      onClick={() => handleLike(track.id)}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                        track.userLiked 
                          ? 'bg-red-500' 
                          : 'bg-gray-800/50 hover:bg-gray-700/50'
                      }`}>
                        <Heart className={`w-6 h-6 ${track.userLiked ? 'fill-white text-white' : 'text-white'}`} />
                      </div>
                      <span className="text-white text-sm font-medium">{track.likeCount}</span>
                    </button>

                    {/* Comment button */}
                    <button
                      onClick={() => handleComment(track.id)}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-800/50 hover:bg-gray-700/50 flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-white text-sm font-medium">{track.commentCount}</span>
                    </button>

                    {/* Share button */}
                    <button
                      onClick={() => handleShare(track)}
                      className="flex flex-col items-center gap-1"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-800/50 hover:bg-gray-700/50 flex items-center justify-center">
                        <Share2 className="w-6 h-6 text-white" />
                      </div>
                    </button>
                  </div>
                )}

                {/* Track info overlay (for videos) */}
                {isActive && hasVideo && (
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                    <div className="max-w-md">
                      <h3 className="text-white font-bold text-lg mb-2">
                        {track.title || "Untitled Track"}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="w-6 h-6">
                          {track.user.profileImageUrl ? (
                            <AvatarImage src={track.user.profileImageUrl} />
                          ) : (
                            <AvatarFallback className="text-xs">
                              {track.user.firstName[0]}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span className="text-white text-sm">
                          {track.user.firstName} {track.user.lastName}
                        </span>
                      </div>
                      <p className="text-white/80 text-sm line-clamp-2">{track.tags}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comments Dialog */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-md max-h-[80vh] bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Comments</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      {comment.user.profileImageUrl ? (
                        <AvatarImage src={comment.user.profileImageUrl} />
                      ) : (
                        <AvatarFallback className="text-xs">
                          {comment.user.firstName[0]}{comment.user.lastName[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium text-sm">
                          {comment.user.firstName} {comment.user.lastName}
                        </span>
                        {user?.id === comment.user.id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <p className="text-gray-300 text-sm">{comment.comment}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="flex gap-2 mt-4">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="bg-gray-800 border-gray-700 text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePostComment();
                }
              }}
            />
            <Button
              onClick={handlePostComment}
              disabled={!commentText.trim() || commentMutation.isPending}
              className="bg-music-blue hover:bg-music-blue/80"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

