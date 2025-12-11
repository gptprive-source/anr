import { useState, useRef, useEffect } from "react";
import { Video, X, Send, Loader2, RotateCcw, Square, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onSend: () => void;
  onCancel: () => void;
  sending: boolean;
  videoBlob: Blob | null;
}

const VideoRecorder = ({ onRecordingComplete, onSend, onCancel, sending, videoBlob }: VideoRecorderProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start camera when component mounts
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => {
          // Max 30 seconds
          if (prev >= 30) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: true
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute to avoid echo
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err: any) {
      console.error("[VideoRecorder] Camera error:", err);
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    let mediaRecorder: MediaRecorder;
    
    try {
      mediaRecorder = new MediaRecorder(streamRef.current, options);
    } catch (e) {
      // Fallback for browsers that don't support vp9
      try {
        mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
      } catch (e2) {
        // Last resort - try mp4
        mediaRecorder = new MediaRecorder(streamRef.current);
      }
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'video/webm' });
      onRecordingComplete(blob);
      
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      
      // Stop camera after recording
      stopCamera();
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100);
    setIsRecording(true);
    setRecordingTime(0);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setRecordingTime(0);
    startCamera();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="bg-muted rounded-2xl p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Video className="w-6 h-6 text-destructive" />
          </div>
          <p className="text-sm text-destructive">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={startCamera}>
              Réessayer
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted rounded-2xl overflow-hidden">
      {/* Video Preview */}
      <div className="relative aspect-square max-h-64 bg-black">
        {previewUrl ? (
          <video 
            src={previewUrl} 
            className="w-full h-full object-cover"
            controls
            autoPlay
            loop
          />
        ) : (
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover mirror"
            style={{ transform: 'scaleX(-1)' }}
            playsInline
            muted
          />
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-sm font-medium">{formatTime(recordingTime)}</span>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white hover:bg-black/80"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Controls */}
      <div className="p-4 flex items-center justify-center gap-4">
        {!previewUrl ? (
          // Recording controls
          <>
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={!cameraReady}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                <Circle className="w-8 h-8 text-white fill-white" />
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors animate-pulse"
              >
                <Square className="w-6 h-6 text-white fill-white" />
              </button>
            )}
          </>
        ) : (
          // Playback controls
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={handleRetake}
              className="gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Refaire
            </Button>
            
            <Button
              size="lg"
              onClick={onSend}
              disabled={sending || !videoBlob}
              className="gap-2 bg-green-500 hover:bg-green-600"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Envoyer
                </>
              )}
            </Button>
          </>
        )}
      </div>
      
      {/* Hint text */}
      {!previewUrl && !isRecording && (
        <p className="text-center text-xs text-muted-foreground pb-3">
          Appuyez pour enregistrer (max 30s)
        </p>
      )}
    </div>
  );
};

export default VideoRecorder;
