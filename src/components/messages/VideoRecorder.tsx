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
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Votre navigateur ne supporte pas l'accès à la caméra");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user", 
          width: { ideal: 480 }, 
          height: { ideal: 480 } 
        },
        audio: true
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraReady(true);
          }).catch(err => {
            console.error("[VideoRecorder] Play error:", err);
            setError("Impossible de démarrer la caméra");
          });
        };
      }
    } catch (err: any) {
      console.error("[VideoRecorder] Camera error:", err);
      if (err.name === 'NotAllowedError') {
        setError("Accès à la caméra refusé. Autorisez l'accès dans les paramètres.");
      } else if (err.name === 'NotFoundError') {
        setError("Aucune caméra détectée sur cet appareil.");
      } else {
        setError("Impossible d'accéder à la caméra: " + (err.message || err.name));
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const startRecording = () => {
    if (!streamRef.current) {
      console.error("[VideoRecorder] No stream available");
      return;
    }

    chunksRef.current = [];
    
    const mimeType = getSupportedMimeType();
    console.log("[VideoRecorder] Using mimeType:", mimeType);
    
    let mediaRecorder: MediaRecorder;
    
    try {
      const options = mimeType ? { mimeType } : undefined;
      mediaRecorder = new MediaRecorder(streamRef.current, options);
    } catch (e) {
      console.error("[VideoRecorder] MediaRecorder error:", e);
      setError("Enregistrement vidéo non supporté sur ce navigateur");
      return;
    }

    mediaRecorder.ondataavailable = (e) => {
      console.log("[VideoRecorder] Data available:", e.data.size);
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      console.log("[VideoRecorder] Recording stopped, chunks:", chunksRef.current.length);
      const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
      console.log("[VideoRecorder] Created blob:", blob.size, blob.type);
      onRecordingComplete(blob);
      
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      
      // Stop camera after recording
      stopCamera();
    };

    mediaRecorder.onerror = (e: any) => {
      console.error("[VideoRecorder] MediaRecorder error:", e);
      setError("Erreur lors de l'enregistrement");
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
            <Button variant="outline" size="sm" onClick={() => { setError(null); startCamera(); }}>
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
            playsInline
          />
        ) : (
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
            playsInline
            muted
            autoPlay
          />
        )}

        {/* Loading indicator */}
        {!cameraReady && !previewUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
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
      {!previewUrl && !isRecording && cameraReady && (
        <p className="text-center text-xs text-muted-foreground pb-3">
          Appuyez pour enregistrer (max 30s)
        </p>
      )}
    </div>
  );
};

export default VideoRecorder;
