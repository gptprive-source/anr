import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface FaceVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: (imageBase64: string) => void;
  action: 'ENTRY' | 'EXIT';
}

export function FaceVerificationDialog({
  open,
  onOpenChange,
  onVerified,
  action
}: FaceVerificationDialogProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Erreur caméra:', error);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (open) {
      startCamera();
      setCaptured(false);
      setCapturedImage(null);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      setCaptured(true);
    }
    setCapturing(false);
  }, []);

  const retake = useCallback(() => {
    setCaptured(false);
    setCapturedImage(null);
  }, []);

  const confirm = useCallback(() => {
    if (capturedImage) {
      // Extraire le base64 sans le préfixe data:image/jpeg;base64,
      const base64 = capturedImage.split(',')[1];
      onVerified(base64);
    }
  }, [capturedImage, onVerified]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Vérification faciale
          </DialogTitle>
          <DialogDescription>
            {action === 'ENTRY' 
              ? "Positionnez votre visage dans le cadre pour pointer votre entrée"
              : "Confirmez votre identité pour pointer votre sortie"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Zone vidéo/photo */}
          <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
            {!captured ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={capturedImage || ''}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            )}

            {/* Cadre de guidage */}
            {!captured && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/50 rounded-full" />
              </div>
            )}

            {/* Overlay de capture */}
            {capturing && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin" />
              </div>
            )}
          </div>

          {/* Canvas caché pour la capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Boutons */}
          <div className="flex gap-3">
            {!captured ? (
              <Button 
                onClick={capturePhoto} 
                disabled={!stream || capturing}
                className="flex-1"
                size="lg"
              >
                {capturing ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 mr-2" />
                )}
                Capturer
              </Button>
            ) : (
              <>
                <Button 
                  onClick={retake}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Reprendre
                </Button>
                <Button 
                  onClick={confirm}
                  className="flex-1"
                  size="lg"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Confirmer
                </Button>
              </>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Votre photo sera comparée à votre profil enregistré pour vérification.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
