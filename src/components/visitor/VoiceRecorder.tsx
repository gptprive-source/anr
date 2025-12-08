import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Pause, Play, Trash2, AlertCircle } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob | null) => void;
  maxDuration?: number;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VoiceRecorder = ({ onRecordingComplete, maxDuration = 60 }: VoiceRecorderProps) => {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    error,
  } = useVoiceRecorder(maxDuration);

  // Notify parent when recording is complete
  useEffect(() => {
    onRecordingComplete(audioBlob);
  }, [audioBlob, onRecordingComplete]);

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  // Show audio player if recording is complete
  if (audioUrl && !isRecording) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <audio src={audioUrl} controls className="flex-1 h-10" />
          <Button
            variant="ghost"
            size="icon"
            onClick={resetRecording}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Durée: {formatDuration(duration)}
        </p>
      </div>
    );
  }

  // Recording in progress
  if (isRecording) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
          {/* Recording indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-lg font-mono font-medium">
              {formatDuration(duration)}
            </span>
            <span className="text-xs text-muted-foreground">
              / {formatDuration(maxDuration)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-2">
          {isPaused ? (
            <Button
              variant="outline"
              size="sm"
              onClick={resumeRecording}
              className="gap-2"
            >
              <Play className="w-4 h-4" />
              Reprendre
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={pauseRecording}
              className="gap-2"
            >
              <Pause className="w-4 h-4" />
              Pause
            </Button>
          )}
          
          <Button
            variant="default"
            size="sm"
            onClick={stopRecording}
            className="gap-2"
          >
            <Square className="w-4 h-4" />
            Terminer
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={resetRecording}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Initial state - show record button
  return (
    <Button
      variant="outline"
      onClick={startRecording}
      className="w-full gap-2"
    >
      <Mic className="w-4 h-4" />
      Enregistrer un message vocal
    </Button>
  );
};

export default VoiceRecorder;
