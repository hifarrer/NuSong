import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import MuxPlayer from '@mux/mux-player-react';

interface MuxVideoPlayerProps {
  playbackId?: string | null;  // MUX playback ID
  fallbackUrl?: string;         // Direct video URL fallback
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export const MuxVideoPlayer = forwardRef<HTMLVideoElement, MuxVideoPlayerProps>(({ 
  playbackId, 
  fallbackUrl,
  className,
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
  poster,
  onPlay,
  onPause,
  onEnded,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const muxPlayerRef = useRef<any>(null);
  const mediaElementRef = useRef<HTMLVideoElement | null>(null);

  // Expose video element ref to parent
  useImperativeHandle(ref, () => {
    // If using MuxPlayer, try to get the underlying video element
    if (mediaElementRef.current) {
      return mediaElementRef.current;
    }
    // Otherwise return the native video element
    return videoRef.current as HTMLVideoElement;
  }, []);

  // Update media element ref when MuxPlayer's media becomes available
  useEffect(() => {
    if (!playbackId || !muxPlayerRef.current) return;

    const updateMediaRef = () => {
      if (muxPlayerRef.current?.media) {
        mediaElementRef.current = muxPlayerRef.current.media as HTMLVideoElement;
      }
    };

    // Try immediately
    updateMediaRef();

    // Also try after a short delay (MuxPlayer might not be ready immediately)
    const timeout = setTimeout(updateMediaRef, 100);

    return () => clearTimeout(timeout);
  }, [playbackId]);

  // Set up event listeners for native video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (onPlay) {
      video.addEventListener('play', onPlay);
    }
    if (onPause) {
      video.addEventListener('pause', onPause);
    }
    if (onEnded) {
      video.addEventListener('ended', onEnded);
    }

    return () => {
      if (onPlay) {
        video.removeEventListener('play', onPlay);
      }
      if (onPause) {
        video.removeEventListener('pause', onPause);
      }
      if (onEnded) {
        video.removeEventListener('ended', onEnded);
      }
    };
  }, [onPlay, onPause, onEnded]);

  // Set up event listeners for MuxPlayer
  useEffect(() => {
    const muxPlayer = muxPlayerRef.current;
    if (!muxPlayer || !playbackId) return;

    const media = muxPlayer.media;
    if (!media) return;

    if (onPlay) {
      media.addEventListener('play', onPlay);
    }
    if (onPause) {
      media.addEventListener('pause', onPause);
    }
    if (onEnded) {
      media.addEventListener('ended', onEnded);
    }

    return () => {
      if (onPlay) {
        media.removeEventListener('play', onPlay);
      }
      if (onPause) {
        media.removeEventListener('pause', onPause);
      }
      if (onEnded) {
        media.removeEventListener('ended', onEnded);
      }
    };
  }, [onPlay, onPause, onEnded, playbackId]);

  // If MUX playback ID is available, use MUX player
  if (playbackId) {
    return (
      <MuxPlayer
        ref={muxPlayerRef}
        playbackId={playbackId}
        streamType="on-demand"
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        className={className}
        poster={poster}
      />
    );
  }

  // Fallback to regular video element
  if (fallbackUrl) {
    return (
      <video
        ref={videoRef}
        src={fallbackUrl}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        className={className}
        poster={poster}
        playsInline
      />
    );
  }

  return (
    <div className={`flex items-center justify-center bg-gray-900 text-gray-500 ${className || ''}`}>
      <div className="text-center">
        <p>No video available</p>
        {playbackId === null && fallbackUrl && (
          <p className="text-sm mt-2">Video is being optimized...</p>
        )}
      </div>
    </div>
  );
});

MuxVideoPlayer.displayName = 'MuxVideoPlayer';

