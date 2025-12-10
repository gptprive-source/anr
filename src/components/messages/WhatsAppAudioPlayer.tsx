import { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppAudioPlayerProps {
  audioUrl: string;
  isOwn?: boolean; // true = sent by resident (green bubble)
  avatarUrl?: string;
  showAvatar?: boolean;
}

const WhatsAppAudioPlayer = ({
  audioUrl,
  isOwn = false,
  avatarUrl,
  showAvatar = true,
}: WhatsAppAudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Generate random waveform bars for visual effect
    const bars = Array.from({ length: 35 }, () => Math.random() * 0.7 + 0.3);
    setWaveformBars(bars);
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      {/* Avatar on the right for visitor messages (received) */}
      {!isOwn && showAvatar && (
        <div className="order-2 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Mic className="w-5 h-5 text-primary" />
            )}
          </div>
        </div>
      )}

      {/* Audio Player Bubble */}
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-2xl min-w-[200px] max-w-[280px]",
          isOwn
            ? "bg-[hsl(142,70%,85%)] order-1" // WhatsApp green for sent
            : "bg-card border order-1" // White/card for received
        )}
      >
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
            isOwn
              ? "bg-[hsl(142,60%,75%)] text-[hsl(142,50%,30%)] hover:bg-[hsl(142,60%,70%)]"
              : "bg-muted text-foreground hover:bg-muted/80"
          )}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Waveform */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center h-6 gap-[2px]">
            {waveformBars.map((height, index) => {
              const barProgress = (index / waveformBars.length) * 100;
              const isActive = barProgress <= progress;
              return (
                <div
                  key={index}
                  className={cn(
                    "w-[3px] rounded-full transition-colors",
                    isOwn
                      ? isActive
                        ? "bg-primary"
                        : "bg-[hsl(142,40%,70%)]"
                      : isActive
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                  )}
                  style={{ height: `${height * 100}%` }}
                />
              );
            })}
          </div>

          {/* Duration */}
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-xs",
                isOwn ? "text-[hsl(142,40%,35%)]" : "text-muted-foreground"
              )}
            >
              {formatTime(isPlaying ? currentTime : duration || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Avatar on the left for own messages (sent) */}
      {isOwn && showAvatar && (
        <div className="order-2 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
            <Mic className="w-5 h-5 text-primary" />
          </div>
        </div>
      )}

      <audio ref={audioRef} src={audioUrl} preload="metadata" />
    </div>
  );
};

export default WhatsAppAudioPlayer;
