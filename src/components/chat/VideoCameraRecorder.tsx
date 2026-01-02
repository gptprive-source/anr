import { useState, useRef, useEffect } from "react";
import { X, SwitchCamera, Square, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoCameraRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoRecorded: (blob: Blob) => void;
}

const VideoCameraRecorder = ({ isOpen, onClose, onVideoRecorded }: VideoCameraRecorderProps) => {
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start camera stream
  const startCamera = async () => {
    try {
      // Stop existing stream
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

  // Initialize camera when component opens
  useEffect(() => {
    if (isOpen && !recordedBlob) {
      startCamera();
    }
    
    return () => {
      // Cleanup on unmount
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

  // Restart camera when facing mode changes
  useEffect(() => {
    if (isOpen && !isRecording && !recordedBlob) {
      startCamera();
    }
  }, [facingMode]);

  // Flip camera
  const flipCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  // Start recording
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
      
      // Stop the live stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
    
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
    setRecordingDuration(0);
    
    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  // Stop recording
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

  // Retake video
  const retake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setRecordedBlob(null);
    setPreviewUrl(null);
    setRecordingDuration(0);
    startCamera();
  };

  // Confirm and send
  const confirm = () => {
    if (recordedBlob) {
      onVideoRecorded(recordedBlob);
    }
  };

  // Close and cleanup
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
    onClose();
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20">
          <X className="w-6 h-6" />
        </Button>
        
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-sm font-medium">{formatDuration(recordingDuration)}</span>
          </div>
        )}
        
        {!recordedBlob && !isRecording && (
          <Button variant="ghost" size="icon" onClick={flipCamera} className="text-white hover:bg-white/20">
            <SwitchCamera className="w-6 h-6" />
          </Button>
        )}
        
        {recordedBlob && <div className="w-10" />}
      </div>

      {/* Video area */}
      <div className="flex-1 relative">
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
          <video
            ref={previewVideoRef}
            src={previewUrl || undefined}
            controls
            autoPlay
            loop
            playsInline
            className="w-full h-full object-contain bg-black"
          />
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-center gap-8">
          {!recordedBlob ? (
            <>
              {/* Recording button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all",
                  isRecording ? "bg-transparent" : "bg-transparent"
                )}
              >
                {isRecording ? (
                  <Square className="w-8 h-8 text-destructive fill-destructive" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-destructive" />
                )}
              </button>
            </>
          ) : (
            <>
              {/* Retake button */}
              <Button
                variant="outline"
                size="lg"
                onClick={retake}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Reprendre
              </Button>
              
              {/* Confirm button */}
              <Button
                size="lg"
                onClick={confirm}
                className="bg-primary text-primary-foreground gap-2"
              >
                <Check className="w-5 h-5" />
                Envoyer
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCameraRecorder;
