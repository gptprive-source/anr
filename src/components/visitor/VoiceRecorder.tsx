import { useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Trash2, AlertCircle, Send, X } from "lucide-react";
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
  maxDuration = 60 
}: VoiceRecorderProps) => {
  const {
    isRecording,
    duration,
    audioBlob: internalAudioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    resetRecording,
    error,
  } = useVoiceRecorder(maxDuration);

  const hasNotifiedRef = useRef(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

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

  // Long press handlers for touch devices
  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    isLongPressRef.current = false;
    
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      startRecording();
    }, 200); // Start recording after 200ms hold
  }, [startRecording]);

  const handleTouchEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (isLongPressRef.current && isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  const handleTouchCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (isRecording) {
      handleReset();
    }
  }, [isRecording, handleReset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div className="flex flex-col gap-2 w-full">
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

  // Show audio player with send button if recording is complete
  if (audioUrl && !isRecording) {
    return (
      <div className="flex items-center gap-2 w-full min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
        
        <div className="flex-1 flex items-center gap-2 p-2 bg-muted rounded-full min-w-0 overflow-hidden">
          <audio src={audioUrl} controls className="flex-1 h-8 min-w-0" style={{ maxWidth: '100%' }} />
          <span className="text-xs text-muted-foreground px-2 flex-shrink-0">
            {formatDuration(duration)}
          </span>
        </div>
        
        <Button
          size="icon"
          onClick={onSend}
          disabled={sending}
          className="flex-shrink-0 rounded-full h-10 w-10 bg-primary hover:bg-primary/90"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  // Recording in progress
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 w-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="flex-shrink-0 h-10 w-10"
        >
          <X className="w-5 h-5" />
        </Button>
        
        <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-muted rounded-full">
          <div className="w-3 h-3 rounded-full flex-shrink-0 bg-destructive animate-pulse" />
          <span className="font-mono text-sm font-medium flex-shrink-0">
            {formatDuration(duration)}
          </span>
          <div className="flex-1 h-1 bg-muted-foreground/20 rounded-full overflow-hidden min-w-0">
            <div 
              className="h-full bg-destructive transition-all duration-1000"
              style={{ width: `${(duration / maxDuration) * 100}%` }}
            />
          </div>
        </div>
        
        <div 
          className="flex-shrink-0 rounded-full bg-destructive h-12 w-12 flex items-center justify-center cursor-pointer touch-none select-none"
          onMouseUp={handleTouchEnd}
          onTouchEnd={handleTouchEnd}
        >
          <Mic className="w-5 h-5 text-destructive-foreground" />
          <span className="sr-only">Relâcher pour arrêter</span>
        </div>
      </div>
    );
  }

  // Initial state - hold to record
  return (
    <div className="flex items-center gap-2 w-full">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCancel}
        className="flex-shrink-0 h-10 w-10"
      >
        <X className="w-5 h-5" />
      </Button>
      
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Maintenir pour enregistrer
      </div>
      
      <div 
        className="flex-shrink-0 rounded-full bg-primary h-12 w-12 flex items-center justify-center cursor-pointer touch-none select-none active:scale-95 transition-transform"
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchCancel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <Mic className="w-5 h-5 text-primary-foreground" />
        <span className="sr-only">Maintenir pour enregistrer</span>
      </div>
    </div>
  );
};

export default VoiceRecorder;
