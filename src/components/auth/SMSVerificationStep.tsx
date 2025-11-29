import { useState, useEffect } from "react";
import { MessageSquare, CheckCircle2, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPhoneVerification, pollVerificationStatus } from "@/lib/smsVerification";

interface SMSVerificationStepProps {
  phone: string;
  onVerified: () => void;
  onBack: () => void;
}

const SMSVerificationStep = ({ phone, onVerified, onBack }: SMSVerificationStepProps) => {
  const [status, setStatus] = useState<'idle' | 'waiting' | 'verified' | 'expired' | 'error'>('idle');
  const [smsUri, setSmsUri] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");

  const startVerification = async () => {
    setStatus('waiting');
    setError("");

    const result = await createPhoneVerification(phone);

    if (!result.success || !result.smsUri) {
      setStatus('error');
      setError(result.error || "Erreur lors de la création de la vérification");
      return;
    }

    setSmsUri(result.smsUri);
    setVerificationCode(result.verificationCode || "");

    // Ouvre l'app SMS avec le message pré-rempli
    window.location.href = result.smsUri;
  };

  useEffect(() => {
    if (status !== 'waiting') return;

    // Poll pour vérifier si le SMS a été reçu
    const stopPolling = pollVerificationStatus(
      phone,
      () => {
        setStatus('verified');
        setTimeout(onVerified, 1500); // Petit délai pour montrer le succès
      },
      () => {
        setStatus('expired');
      }
    );

    return () => stopPolling();
  }, [status, phone, onVerified]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
          status === 'verified' ? 'bg-green-500/10' : 
          status === 'error' || status === 'expired' ? 'bg-destructive/10' : 
          'bg-primary/10'
        }`}>
          {status === 'verified' ? (
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          ) : status === 'error' || status === 'expired' ? (
            <AlertCircle className="w-8 h-8 text-destructive" />
          ) : (
            <MessageSquare className="w-8 h-8 text-primary" />
          )}
        </div>
        
        <h2 className="text-2xl font-bold mb-2">
          {status === 'verified' ? 'Numéro vérifié !' :
           status === 'error' ? 'Erreur' :
           status === 'expired' ? 'Vérification expirée' :
           'Vérification SMS'}
        </h2>
        
        <p className="text-muted-foreground">
          {status === 'idle' && `Vérifiez que ${phone} est bien votre numéro`}
          {status === 'waiting' && "En attente de votre SMS..."}
          {status === 'verified' && "Votre numéro a été vérifié avec succès"}
          {status === 'expired' && "Le délai de vérification a expiré"}
          {status === 'error' && error}
        </p>
      </div>

      {status === 'idle' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-secondary/50 border border-border text-sm space-y-2">
            <p className="font-medium">Comment ça marche ?</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Cliquez sur "Envoyer le SMS"</li>
              <li>Votre app SMS s'ouvrira automatiquement</li>
              <li>Envoyez le message pré-rempli (ne le modifiez pas)</li>
              <li>Revenez ici, votre numéro sera vérifié automatiquement</li>
            </ol>
          </div>
          
          <Button
            variant="hero"
            className="w-full"
            onClick={startVerification}
          >
            Envoyer le SMS
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {status === 'waiting' && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm">Vérification en cours...</span>
          </div>
          
          {verificationCode && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Code de vérification :</p>
              <p className="font-mono text-lg font-bold tracking-wider">{verificationCode}</p>
            </div>
          )}
          
          {smsUri && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = smsUri}
            >
              Réouvrir l'app SMS
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}

      {(status === 'expired' || status === 'error') && (
        <div className="space-y-3">
          <Button
            variant="hero"
            className="w-full"
            onClick={() => {
              setStatus('idle');
              setError("");
            }}
          >
            Réessayer
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={onBack}
          >
            Modifier le numéro
          </Button>
        </div>
      )}

      {status === 'verified' && (
        <div className="flex items-center justify-center gap-2 text-green-600">
          <CheckCircle2 className="w-5 h-5" />
          <span>Redirection en cours...</span>
        </div>
      )}

      {status === 'idle' && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={onBack}
        >
          Modifier le numéro
        </Button>
      )}
    </div>
  );
};

export default SMSVerificationStep;
