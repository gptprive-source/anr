import { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw, Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoCameraRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoRecorded: (blob: Blob) => void;
}

// Detect the best supported video format
const getSupportedMimeType = (): string => {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
};

const VideoCameraRecorder = ({ isOpen, onClose, onVideoRecorded }: VideoCameraRecorderProps) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setCameraError(null);
    stopStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (isOpen && !recordedBlob) {
      startCamera();
    }
    return () => {
      if (!isOpen) {
        stopStream();
      }
    };
  }, [isOpen, facingMode, recordedBlob, startCamera, stopStream]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    
    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        
        // Create preview URL
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stopStream();
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (err) {
      console.error('Recording error:', err);
      setCameraError('Erreur lors du démarrage de l\'enregistrement.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
    }
  };

  const retake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setRecordedBlob(null);
    setPreviewUrl(null);
    setRecordingDuration(0);
    startCamera();
  };

  const confirm = () => {
    if (recordedBlob) {
      onVideoRecorded(recordedBlob);
      handleClose();
    }
  };

  const handleClose = () => {
    stopStream();
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setRecordedBlob(null);
    setPreviewUrl(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setCameraError(null);
    onClose();
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const isPreviewMode = !!recordedBlob && !!previewUrl;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-zinc-900 to-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 pt-safe">
        <button
          onClick={handleClose}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        
        <div className="text-white/80 text-sm font-medium">
          {isPreviewMode ? `Durée: ${formatDuration(recordingDuration)}` : 'Enregistrer une vidéo'}
        </div>

        {!isPreviewMode && !isRecording ? (
          <button
            onClick={toggleCamera}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            disabled={isLoading}
          >
            <RefreshCw className="w-5 h-5 text-white" />
          </button>
        ) : (
          <div className="w-11" />
        )}
      </div>

      {/* Video Area */}
      <div className="flex-1 flex items-center justify-center px-4 py-2 min-h-0">
        <div className="relative w-full max-w-md h-full max-h-[70vh] rounded-3xl overflow-hidden bg-zinc-800 shadow-2xl">
          {/* Camera Error */}
          {cameraError && !isPreviewMode && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center z-10">
              <p className="text-white/70 text-sm">{cameraError}</p>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && !isPreviewMode && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Live Camera Feed */}
          {!isPreviewMode && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
          )}

          {/* Preview Video with Native Controls */}
          {isPreviewMode && (
            <video
              ref={previewVideoRef}
              src={previewUrl}
              playsInline
              controls
              autoPlay
              className="w-full h-full object-contain bg-black"
            />
          )}

          {/* Recording Indicator */}
          {isRecording && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 z-10">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white font-mono text-sm font-medium">
                {formatDuration(recordingDuration)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Controls Area */}
      <div className="px-6 pb-8 pt-6 pb-safe">
        {!isPreviewMode ? (
          <div className="flex flex-col items-center gap-4">
            {/* Record Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || !!cameraError}
              className="relative w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-50"
            >
              {/* Outer ring */}
              <div className={`absolute inset-0 rounded-full border-4 border-white transition-all duration-300 ${
                isRecording ? 'scale-110' : ''
              }`} />
              
              {/* Inner button */}
              <div className={`transition-all duration-300 ${
                isRecording 
                  ? 'w-8 h-8 rounded-md bg-red-500' 
                  : 'w-16 h-16 rounded-full bg-red-500 animate-pulse'
              }`} />
            </button>

            {/* Instruction Text */}
            <p className="text-white/60 text-sm">
              {isRecording ? 'Appuyez pour arrêter' : 'Appuyez pour enregistrer'}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4">
            {/* Retake Button */}
            <Button
              onClick={retake}
              variant="outline"
              size="lg"
              className="flex-1 max-w-36 h-14 rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white gap-2 text-base"
            >
              <RotateCcw className="w-5 h-5" />
              Reprendre
            </Button>

            {/* Send Button */}
            <Button
              onClick={confirm}
              size="lg"
              className="flex-1 max-w-36 h-14 rounded-full bg-primary hover:bg-primary/90 gap-2 text-base"
            >
              <Send className="w-5 h-5" />
              Envoyer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCameraRecorder;
