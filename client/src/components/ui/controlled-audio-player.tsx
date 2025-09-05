import { useState, useRef, useEffect } from "react";
import { Button } from "./button";
import { Slider } from "./slider";
import { Play, Pause } from "lucide-react";

interface ControlledAudioPlayerProps {
  src: string;
  title?: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onEnded?: () => void;
  className?: string;
}

export function ControlledAudioPlayer({ 
  src, 
  title, 
  isPlaying, 
  onPlayPause, 
  onEnded,
  className 
}: ControlledAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Sync external isPlaying state with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Reset current time when src changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);

    const handleEnded = () => {
      if (onEnded) {
        onEnded(); // Use custom onEnded callback if provided
      } else {
        onPlayPause(); // Default behavior: pause the player
      }
    };

    audio.addEventListener("loadeddata", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadeddata", setAudioData);
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [onPlayPause, onEnded]);

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = value[0];
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <audio
        ref={audioRef}
        src={src}
        data-testid="audio-element"
      />

      {/* Track Title */}
      {title && (
        <div className="text-center">
          <h3 className="text-white font-medium truncate">{title}</h3>
        </div>
      )}

      {/* Play/Pause and Time */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="icon"
          onClick={onPlayPause}
          className="bg-music-dark border-gray-600 hover:border-music-purple"
          data-testid="button-play-pause"
        >
          {isPlaying ? <Pause className="h-4 w-4 text-music-blue" /> : <Play className="h-4 w-4 text-music-blue" />}
        </Button>

        <div className="flex-1">
          <Slider
            value={[currentTime]}
            onValueChange={handleSeek}
            max={duration || 100}
            step={1}
            className="w-full"
            data-testid="slider-seek"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
