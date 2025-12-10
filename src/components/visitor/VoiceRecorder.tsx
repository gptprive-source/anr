import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Pause, Play, Trash2, AlertCircle, Send, X } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob | null) => void;
  onSend?: () => void;
  onCancel?: () => void;
  sending?: boolean;
  audioBlob?: Blob | null;
  maxDuration?: number;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VoiceRecorder = ({ 
  onRecordingComplete, 
  onSend, 
  onCancel, 
  sending = false,
  audioBlob: externalAudioBlob,
  maxDuration = 60 
}: VoiceRecorderProps) => {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob: internalAudioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    error,
  } = useVoiceRecorder(maxDuration);

  const hasNotifiedRef = useRef(false);

  // Notify parent when recording is complete (only once per recording)
  useEffect(() => {
    if (internalAudioBlob && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      onRecordingComplete(internalAudioBlob);
    }
    if (!internalAudioBlob) {
      hasNotifiedRef.current = false;
    }
  }, [internalAudioBlob, onRecordingComplete]);

  const handleReset = () => {
    resetRecording();
    onRecordingComplete(null);
  };

  const handleCancel = () => {
    resetRecording();
    onRecordingComplete(null);
    onCancel?.();
  };

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
        <Button variant="outline" onClick={handleCancel} className="w-full">
          Retour
        </Button>
      </div>
    );
  }

  // Show audio player with send button if recording is complete (WhatsApp style)
  if (audioUrl && !isRecording) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
        
        <div className="flex-1 flex items-center gap-2 p-2 bg-muted rounded-full">
          <audio src={audioUrl} controls className="flex-1 h-8" />
          <span className="text-xs text-muted-foreground px-2">
            {formatDuration(duration)}
          </span>
        </div>
        
        <Button
          size="icon"
          onClick={onSend}
          disabled={sending}
          className="flex-shrink-0 rounded-full"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  // Recording in progress (WhatsApp style)
  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </Button>
        
        <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-muted rounded-full">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
          <span className="font-mono text-sm font-medium">
            {formatDuration(duration)}
          </span>
          <div className="flex-1 h-1 bg-muted-foreground/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 transition-all duration-1000"
              style={{ width: `${(duration / maxDuration) * 100}%` }}
            />
          </div>
        </div>
        
        {isPaused ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={resumeRecording}
            className="flex-shrink-0"
          >
            <Play className="w-5 h-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={pauseRecording}
            className="flex-shrink-0"
          >
            <Pause className="w-5 h-5" />
          </Button>
        )}
        
        <Button
          size="icon"
          onClick={stopRecording}
          className="flex-shrink-0 rounded-full bg-red-500 hover:bg-red-600"
        >
          <Square className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // Initial state - show record button (WhatsApp style)
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCancel}
        className="flex-shrink-0"
      >
        <X className="w-5 h-5" />
      </Button>
      <Button
        variant="outline"
        onClick={startRecording}
        className="flex-1 gap-2 rounded-full"
      >
        <Mic className="w-4 h-4" />
        Appuyer pour enregistrer
      </Button>
    </div>
  );
};

export default VoiceRecorder;
