import { useState, useRef, useEffect } from "react";
import { X, SwitchCamera, Square, Check, RotateCcw, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoCameraRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoRecorded: (blob: Blob) => void;
}

const VideoCameraRecorder = ({ isOpen, onClose, onVideoRecorded }: VideoCameraRecorderProps) => {
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start camera stream
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  useEffect(() => {
    if (isOpen && !recordedBlob) {
      startCamera();
    }
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !isRecording && !recordedBlob) {
      startCamera();
    }
  }, [facingMode]);

  const flipCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setPreviewUrl(url);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
    
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
    setRecordingDuration(0);
    
    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const retake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setRecordedBlob(null);
    setPreviewUrl(null);
    setRecordingDuration(0);
    setIsPlaying(false);
    startCamera();
  };

  const confirm = () => {
    if (recordedBlob) {
      onVideoRecorded(recordedBlob);
    }
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setRecordedBlob(null);
    setPreviewUrl(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setIsPlaying(false);
    onClose();
  };

  const togglePlayPause = () => {
    if (previewVideoRef.current) {
      if (isPlaying) {
        previewVideoRef.current.pause();
      } else {
        previewVideoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header - Safe area top */}
      <div className="flex-shrink-0 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClose} 
            className="w-12 h-12 rounded-full text-white hover:bg-white/20"
          >
            <X className="w-7 h-7" />
          </Button>
          
          {isRecording && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive">
              <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
              <span className="text-white text-base font-semibold">{formatDuration(recordingDuration)}</span>
            </div>
          )}
          
          {!recordedBlob && !isRecording && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={flipCamera} 
              className="w-12 h-12 rounded-full text-white hover:bg-white/20"
            >
              <SwitchCamera className="w-7 h-7" />
            </Button>
          )}
          
          {recordedBlob && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10">
              <span className="text-white text-base font-medium">{formatDuration(recordingDuration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Video area - takes remaining space with proper margins */}
      <div className="flex-1 flex items-center justify-center px-4 py-2 min-h-0">
        <div className="relative w-full h-full max-h-full rounded-3xl overflow-hidden bg-black/50">
          {!recordedBlob ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover",
                facingMode === "user" && "scale-x-[-1]"
              )}
            />
          ) : (
            <>
              <video
                ref={previewVideoRef}
                src={previewUrl || undefined}
                playsInline
                loop
                onClick={togglePlayPause}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full h-full object-contain bg-black cursor-pointer"
              />
              {/* Play/Pause overlay */}
              <button
                onClick={togglePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
              >
                <div className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                  {isPlaying ? (
                    <Pause className="w-10 h-10 text-white" />
                  ) : (
                    <Play className="w-10 h-10 text-white ml-1" />
                  )}
                </div>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Controls - Fixed at bottom with safe area */}
      <div className="flex-shrink-0 pb-safe">
        <div className="px-6 py-6">
          {!recordedBlob ? (
            /* Recording mode - centered record button */
            <div className="flex items-center justify-center">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "w-24 h-24 rounded-full border-[6px] border-white flex items-center justify-center transition-all active:scale-95",
                  isRecording ? "bg-transparent" : "bg-transparent"
                )}
                aria-label={isRecording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
              >
                {isRecording ? (
                  <Square className="w-10 h-10 text-destructive fill-destructive rounded-sm" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-destructive" />
                )}
              </button>
            </div>
          ) : (
            /* Preview mode - two clear action buttons */
            <div className="flex items-center justify-center gap-6">
              <Button
                variant="outline"
                size="lg"
                onClick={retake}
                className="h-14 px-8 bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white text-base font-medium gap-3 rounded-full"
              >
                <RotateCcw className="w-6 h-6" />
                Reprendre
              </Button>
              
              <Button
                size="lg"
                onClick={confirm}
                className="h-14 px-8 bg-primary text-primary-foreground text-base font-medium gap-3 rounded-full"
              >
                <Check className="w-6 h-6" />
                Envoyer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCameraRecorder;
