import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Camera, Loader2, CheckCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FaceRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered: () => void;
  employeeId?: string;
}

export function FaceRegistrationDialog({
  open,
  onOpenChange,
  onRegistered,
  employeeId
}: FaceRegistrationDialogProps) {
  const [step, setStep] = useState<'consent' | 'capture' | 'processing' | 'success' | 'error'>('consent');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Erreur caméra:', err);
      setError('Impossible d\'accéder à la caméra');
      setStep('error');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const handleConsent = async () => {
    setStep('capture');
    await startCamera();
  };

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.8);
    }
    return null;
  }, []);

  const handleCapture = useCallback(async () => {
    const image = captureImage();
    if (!image) return;

    const newImages = [...capturedImages, image];
    setCapturedImages(newImages);
    setProgress((newImages.length / 3) * 100);

    if (newImages.length >= 3) {
      // 3 images capturées, envoyer au backend
      stopCamera();
      setStep('processing');

      try {
        const response = await supabase.functions.invoke('register-face', {
          body: {
            images: newImages.map(img => img.split(',')[1]),
            employee_id: employeeId,
            consent_given: true,
          },
        });

        if (response.error) throw new Error(response.error.message);

        if (response.data.success) {
          setStep('success');
          toast({
            title: "Visage enregistré",
            description: "Votre reconnaissance faciale est maintenant active",
          });
        } else {
          throw new Error(response.data.error || 'Échec de l\'enregistrement');
        }
      } catch (err) {
        console.error('Erreur enregistrement:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setStep('error');
      }
    }
  }, [capturedImages, captureImage, stopCamera, employeeId, toast]);

  const handleClose = () => {
    stopCamera();
    setCapturedImages([]);
    setProgress(0);
    setStep('consent');
    setError(null);
    onOpenChange(false);
    if (step === 'success') {
      onRegistered();
    }
  };

  const retry = () => {
    setCapturedImages([]);
    setProgress(0);
    setError(null);
    setStep('capture');
    startCamera();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Enregistrement facial
          </DialogTitle>
          <DialogDescription>
            {step === 'consent' && "Configurez la reconnaissance faciale pour le pointage sécurisé"}
            {step === 'capture' && `Capture ${capturedImages.length + 1}/3 - Regardez la caméra`}
            {step === 'processing' && "Traitement en cours..."}
            {step === 'success' && "Enregistrement réussi !"}
            {step === 'error' && "Une erreur est survenue"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Étape consentement */}
          {step === 'consent' && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
                <p className="font-medium">Consentement RGPD</p>
                <p>
                  En continuant, vous acceptez que vos données biométriques (empreinte faciale) 
                  soient collectées et traitées pour la vérification d'identité lors du pointage.
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Données stockées de manière sécurisée et chiffrée</li>
                  <li>Utilisées uniquement pour le pointage</li>
                  <li>Supprimables sur simple demande</li>
                  <li>Conservation limitée à la durée de votre contrat</li>
                </ul>
              </div>
              <Button onClick={handleConsent} className="w-full">
                J'accepte et je continue
              </Button>
            </div>
          )}

          {/* Étape capture */}
          {step === 'capture' && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Cadre de guidage */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-white/50 rounded-full" />
                </div>
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <Progress value={progress} className="h-2" />

              <Button onClick={handleCapture} className="w-full" size="lg">
                <Camera className="h-5 w-5 mr-2" />
                Capturer ({capturedImages.length + 1}/3)
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Tournez légèrement la tête entre chaque capture pour un meilleur enregistrement
              </p>
            </div>
          )}

          {/* Étape traitement */}
          {step === 'processing' && (
            <div className="py-8 text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p>Analyse des images en cours...</p>
              <p className="text-sm text-muted-foreground">
                Veuillez patienter quelques secondes
              </p>
            </div>
          )}

          {/* Étape succès */}
          {step === 'success' && (
            <div className="py-8 text-center">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <p className="font-medium text-lg">Enregistrement réussi !</p>
              <p className="text-sm text-muted-foreground mb-4">
                Votre reconnaissance faciale est maintenant active
              </p>
              <Button onClick={handleClose}>
                Fermer
              </Button>
            </div>
          )}

          {/* Étape erreur */}
          {step === 'error' && (
            <div className="py-8 text-center">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <p className="font-medium text-lg">Erreur</p>
              <p className="text-sm text-muted-foreground mb-4">
                {error || "Une erreur est survenue lors de l'enregistrement"}
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={handleClose}>
                  Fermer
                </Button>
                <Button onClick={retry}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
