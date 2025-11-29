import { useState } from "react";
import { MessageSquare, CheckCircle2, Loader2, ExternalLink, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SMSVerificationStepProps {
  phone: string;
  onVerified: () => void;
  onBack: () => void;
}

const SMSVerificationStep = ({ phone, onVerified, onBack }: SMSVerificationStepProps) => {
  const [status, setStatus] = useState<'idle' | 'waiting' | 'verified'>('idle');
  const [loading, setLoading] = useState(false);

  // Construit l'URI SMS vers son propre numéro
  const getSmsUri = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    const message = "ANR - Vérification de mon numéro";
    return `sms:${phone}${separator}body=${encodeURIComponent(message)}`;
  };

  const handleSendSMS = () => {
    setLoading(true);
    // Ouvre l'app SMS
    window.location.href = getSmsUri();
    
    // Après un court délai, afficher l'étape de confirmation
    setTimeout(() => {
      setStatus('waiting');
      setLoading(false);
    }, 500);
  };

  const handleConfirmReceived = () => {
    setStatus('verified');
    setTimeout(onVerified, 800);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
          status === 'verified' ? 'bg-green-500/10' : 'bg-primary/10'
        }`}>
          {status === 'verified' ? (
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          ) : (
            <MessageSquare className="w-8 h-8 text-primary" />
          )}
        </div>
        
        <h2 className="text-2xl font-bold mb-2">
          {status === 'verified' ? 'Numéro vérifié !' :
           status === 'waiting' ? 'SMS reçu ?' :
           'Vérification du numéro'}
        </h2>
        
        <p className="text-muted-foreground text-sm">
          {status === 'idle' && `Vérifions que ${phone} est bien votre numéro`}
          {status === 'waiting' && "Avez-vous reçu le SMS sur ce téléphone ?"}
          {status === 'verified' && "Votre numéro est confirmé"}
        </p>
      </div>

      {status === 'idle' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-secondary/50 border border-border text-sm">
            <p className="text-muted-foreground">
              Un SMS va s'envoyer <strong>vers votre propre numéro</strong>. 
              Si vous le recevez, c'est que le numéro est bien celui de ce téléphone.
            </p>
          </div>
          
          <Button
            variant="hero"
            className="w-full"
            onClick={handleSendSMS}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer le SMS"}
            {!loading && <ExternalLink className="w-4 h-4 ml-2" />}
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
