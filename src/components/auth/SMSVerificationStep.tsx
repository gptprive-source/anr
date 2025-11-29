import { useState, useEffect, useRef } from "react";
import { MessageSquare, CheckCircle2, Loader2, ExternalLink, ArrowLeft, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendVerificationSMS, startListeningForSMS, isNativePlatform } from "@/lib/nativeSMS";

interface SMSVerificationStepProps {
  phone: string;
  onVerified: () => void;
  onBack: () => void;
}

const SMSVerificationStep = ({ phone, onVerified, onBack }: SMSVerificationStepProps) => {
  const [status, setStatus] = useState<'idle' | 'sending' | 'waiting' | 'listening' | 'verified'>('idle');
  const [isNative, setIsNative] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setIsNative(isNativePlatform());
    
    return () => {
      // Cleanup listener on unmount
      cleanupRef.current?.();
    };
  }, []);

  const handleSendSMS = async () => {
    setStatus('sending');
    
    const result = await sendVerificationSMS(phone);
    
    if (result.method === 'native' && result.success) {
      // Mode natif : on écoute automatiquement la réception
      setStatus('listening');
      
      const { listening, cleanup } = await startListeningForSMS(phone, () => {
        setStatus('verified');
        setTimeout(onVerified, 800);
      });
      
      cleanupRef.current = cleanup;
      
      if (!listening) {
        // Fallback si l'écoute échoue
        setStatus('waiting');
      }
    } else {
      // Mode web : attente confirmation manuelle
      setTimeout(() => setStatus('waiting'), 500);
    }
  };

  const handleConfirmReceived = () => {
    setStatus('verified');
    setTimeout(onVerified, 800);
  };

  // Construit l'URI SMS pour le mode web
  const getSmsUri = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    const message = "ANR - Vérification de mon numéro";
    return `sms:${phone}${separator}body=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
          status === 'verified' ? 'bg-green-500/10' : 
          status === 'listening' ? 'bg-orange-500/10' :
          'bg-primary/10'
        }`}>
          {status === 'verified' ? (
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          ) : status === 'listening' ? (
            <Smartphone className="w-8 h-8 text-orange-500 animate-pulse" />
          ) : (
            <MessageSquare className="w-8 h-8 text-primary" />
          )}
        </div>
        
        <h2 className="text-2xl font-bold mb-2">
          {status === 'verified' ? 'Numéro vérifié !' :
           status === 'listening' ? 'Vérification...' :
           status === 'waiting' ? 'SMS reçu ?' :
           status === 'sending' ? 'Envoi...' :
           'Vérification du numéro'}
        </h2>
        
        <p className="text-muted-foreground text-sm">
          {status === 'idle' && `Vérifions que ${phone} est bien votre numéro`}
          {status === 'sending' && "Envoi du SMS en cours..."}
          {status === 'listening' && "En attente de réception du SMS..."}
          {status === 'waiting' && "Avez-vous reçu le SMS sur ce téléphone ?"}
          {status === 'verified' && "Votre numéro est confirmé"}
        </p>
      </div>

      {status === 'idle' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-secondary/50 border border-border text-sm">
            <p className="text-muted-foreground">
              {isNative ? (
                <>Un SMS va s'envoyer et se vérifier <strong>automatiquement</strong>.</>
              ) : (
                <>Un SMS va s'envoyer <strong>vers votre propre numéro</strong>. 
                Si vous le recevez, c'est que le numéro est bien celui de ce téléphone.</>
              )}
            </p>
          </div>
          
          <Button
            variant="hero"
            className="w-full"
            onClick={handleSendSMS}
          >
            Vérifier mon numéro
            {!isNative && <ExternalLink className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      )}

      {status === 'sending' && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {status === 'listening' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Détection automatique du SMS en cours...
            </p>
          </div>
          
          <Button
            variant="ghost"
            className="w-full"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Annuler
          </Button>
        </div>
      )}

      {status === 'waiting' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
            <p className="text-sm text-muted-foreground mb-1">SMS envoyé à</p>
            <p className="font-mono font-bold">{phone}</p>
          </div>

          <Button
            variant="hero"
            className="w-full"
            onClick={handleConfirmReceived}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Oui, j'ai reçu le SMS
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = getSmsUri()}
          >
            Renvoyer le SMS
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Modifier le numéro
          </Button>
        </div>
      )}

      {status === 'verified' && (
        <div className="flex items-center justify-center gap-2 text-green-600">
          <CheckCircle2 className="w-5 h-5" />
          <span>Redirection...</span>
        </div>
      )}

      {status === 'idle' && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Modifier le numéro
        </Button>
      )}
    </div>
  );
};

export default SMSVerificationStep;
