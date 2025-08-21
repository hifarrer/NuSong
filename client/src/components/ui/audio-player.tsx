import { useState, useRef, useEffect } from "react";
import { Button } from "./button";
import { Slider } from "./slider";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  className?: string;
}

export function AudioPlayer({ src, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState([1]);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);

    audio.addEventListener("loadeddata", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);

    return () => {
      audio.removeEventListener("loadeddata", setAudioData);
      audio.removeEventListener("timeupdate", setAudioTime);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = value[0];
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    const vol = value[0];
    audio.volume = vol;
    setVolume([vol]);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume[0];
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
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
        onEnded={() => setIsPlaying(false)}
        data-testid="audio-element"
      />

      {/* Play/Pause and Time */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlayPause}
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

      {/* Volume Controls */}
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="text-gray-400 hover:text-white"
          data-testid="button-mute"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <div className="w-20">
          <Slider
            value={isMuted ? [0] : volume}
            onValueChange={handleVolumeChange}
            max={1}
            step={0.1}
            className="w-full"
            data-testid="slider-volume"
          />
        </div>
      </div>
    </div>
  );
}
