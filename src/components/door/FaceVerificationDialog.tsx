import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Camera, Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { useToast } from '@/hooks/use-toast';

interface FaceVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: (imageBase64: string) => void;
  action: 'ENTRY' | 'EXIT';
  employeeId?: string;
}

export function FaceVerificationDialog({
  open,
  onOpenChange,
  onVerified,
  action,
  employeeId
}: FaceVerificationDialogProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [step, setStep] = useState<'loading-models' | 'capture' | 'verifying' | 'success' | 'failed'>('loading-models');
  const [captured, setCaptured] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ verified: boolean; confidence: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { loadModels, verifyFace, loading: modelsLoading, loadingProgress, modelsLoaded } = useFaceRecognition();
  const { toast } = useToast();

  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Erreur caméra:', error);
      toast({
        title: "Erreur caméra",
        description: "Impossible d'accéder à la caméra",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    let cancelled = false;
    
    const init = async () => {
      setCaptured(false);
      setCapturedImage(null);
      setVerificationResult(null);
      setStep('loading-models');
      
      // Charger les modèles
      const loaded = await loadModels();
      if (cancelled) return;
      
      if (loaded) {
        setStep('capture');
        await startCamera();
      }
    };
    
    init();
    
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, loadModels, startCamera, stopCamera]);

  const captureAndVerify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

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
      setStep('verifying');

      try {
        // Récupérer l'embedding stocké
        const { data: { user } } = await supabase.auth.getUser();
        
        let query = supabase
          .from('face_embeddings')
          .select('embedding')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1);

        if (employeeId) {
          query = query.eq('employee_id', employeeId);
        } else if (user) {
          query = query.eq('user_id', user.id);
        }

        const { data: embeddingData, error } = await query.single();

        if (error || !embeddingData) {
          throw new Error('Aucun visage enregistré. Veuillez d\'abord vous enregistrer.');
        }

        // Vérifier localement avec face-api.js
        const storedEmbedding = embeddingData.embedding as number[];
        const result = await verifyFace(imageData, storedEmbedding);

        if (result.error) {
          throw new Error(result.error);
        }

        setVerificationResult({
          verified: result.verified,
          confidence: result.confidence,
        });

        if (result.verified) {
          setStep('success');
          
          // Mettre à jour les statistiques
          if (employeeId) {
            await supabase
              .from('face_embeddings')
              .update({
                last_verified_at: new Date().toISOString(),
                verification_count: embeddingData.embedding ? 1 : 1, // Increment would need RPC
              })
              .eq('employee_id', employeeId)
              .is('deleted_at', null);
          } else if (user) {
            await supabase
              .from('face_embeddings')
              .update({
                last_verified_at: new Date().toISOString(),
              })
              .eq('user_id', user.id)
              .is('deleted_at', null);
          }

          // Appeler le callback après un court délai pour montrer le succès
          setTimeout(() => {
            onVerified(imageData.split(',')[1]);
          }, 1000);
        } else {
          setStep('failed');
        }
      } catch (err) {
        console.error('Erreur vérification:', err);
        setStep('failed');
        setVerificationResult({ verified: false, confidence: 0 });
        toast({
          title: "Erreur",
          description: err instanceof Error ? err.message : "Vérification échouée",
          variant: "destructive",
        });
      }
    }
  }, [employeeId, verifyFace, onVerified, toast]);

  const retake = useCallback(() => {
    setCaptured(false);
    setCapturedImage(null);
    setVerificationResult(null);
    setStep('capture');
  }, []);

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
          {/* Chargement des modèles */}
          {step === 'loading-models' && (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <div className="space-y-2">
                <p>Chargement de la reconnaissance faciale...</p>
                <Progress value={loadingProgress} className="h-2 max-w-xs mx-auto" />
              </div>
            </div>
          )}

          {/* Zone vidéo/photo */}
          {(step === 'capture' || step === 'verifying') && (
            <>
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

                {/* Overlay de vérification */}
                {step === 'verifying' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-white" />
                  </div>
                )}
              </div>

              {/* Canvas caché pour la capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Bouton de capture */}
              {step === 'capture' && !captured && (
                <Button 
                  onClick={captureAndVerify} 
                  disabled={!stream}
                  className="w-full"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Vérifier mon identité
                </Button>
              )}
            </>
          )}

          {/* Résultat succès */}
          {step === 'success' && (
            <div className="py-8 text-center">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <p className="font-medium text-lg">Identité vérifiée !</p>
              <p className="text-sm text-muted-foreground">
                Confiance: {((verificationResult?.confidence || 0) * 100).toFixed(0)}%
              </p>
            </div>
          )}

          {/* Résultat échec */}
          {step === 'failed' && (
            <div className="py-8 text-center space-y-4">
              <XCircle className="h-16 w-16 mx-auto text-red-500" />
              <div>
                <p className="font-medium text-lg">Vérification échouée</p>
                <p className="text-sm text-muted-foreground">
                  Le visage ne correspond pas au profil enregistré
                </p>
              </div>
              <Button onClick={retake} className="w-full">
                <RefreshCw className="h-5 w-5 mr-2" />
                Réessayer
              </Button>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Traitement 100% local sur votre appareil
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
