import { useState } from "react";
import { MessageSquare, CheckCircle2, Loader2, AlertCircle, ExternalLink, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPhoneVerification, verifyCode } from "@/lib/smsVerification";

interface SMSVerificationStepProps {
  phone: string;
  onVerified: () => void;
  onBack: () => void;
}

const SMSVerificationStep = ({ phone, onVerified, onBack }: SMSVerificationStepProps) => {
  const [status, setStatus] = useState<'idle' | 'sms-sent' | 'verifying' | 'verified' | 'error'>('idle');
  const [smsUri, setSmsUri] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [inputCode, setInputCode] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const startVerification = async () => {
    setLoading(true);
    setError("");

    const result = await createPhoneVerification(phone);

    if (!result.success || !result.smsUri) {
      setStatus('error');
      setError(result.error || "Erreur lors de la création de la vérification");
      setLoading(false);
      return;
    }

    setSmsUri(result.smsUri);
    setStatus('sms-sent');
    setLoading(false);

    // Ouvre l'app SMS avec le message pré-rempli
    window.location.href = result.smsUri;
  };

  const handleVerifyCode = async () => {
    if (inputCode.length !== 6) return;

    setLoading(true);
    setStatus('verifying');

    const result = await verifyCode(phone, inputCode);

    if (!result.success) {
      setStatus('error');
      setError(result.error || "Code invalide");
      setLoading(false);
      return;
    }

    setStatus('verified');
    setLoading(false);
    
    // Petit délai pour montrer le succès
    setTimeout(onVerified, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
          status === 'verified' ? 'bg-green-500/10' : 
          status === 'error' ? 'bg-destructive/10' : 
          'bg-primary/10'
        }`}>
          {status === 'verified' ? (
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          ) : status === 'error' ? (
            <AlertCircle className="w-8 h-8 text-destructive" />
          ) : (
            <MessageSquare className="w-8 h-8 text-primary" />
          )}
        </div>
        
        <h2 className="text-2xl font-bold mb-2">
          {status === 'verified' ? 'Numéro vérifié !' :
           status === 'error' ? 'Erreur' :
           status === 'sms-sent' ? 'Entrez le code' :
           'Vérification SMS'}
        </h2>
        
        <p className="text-muted-foreground text-sm">
          {status === 'idle' && `Vérifiez que ${phone} est bien votre numéro`}
          {status === 'sms-sent' && "Envoyez le SMS puis entrez le code reçu"}
          {status === 'verifying' && "Vérification en cours..."}
          {status === 'verified' && "Votre numéro a été vérifié avec succès"}
          {status === 'error' && error}
        </p>
      </div>

      {status === 'idle' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-secondary/50 border border-border text-sm space-y-2">
            <p className="font-medium">Comment ça marche ?</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Cliquez sur "Envoyer le SMS"</li>
              <li>Votre app SMS s'ouvrira avec un message pré-rempli</li>
              <li>Envoyez ce SMS à vous-même</li>
              <li>Entrez le code reçu ci-dessous</li>
            </ol>
          </div>
          
          <Button
            variant="hero"
            className="w-full"
            onClick={startVerification}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer le SMS"}
            {!loading && <ExternalLink className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      )}

      {status === 'sms-sent' && (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-center">
            <p>Envoyez le SMS puis entrez le code reçu</p>
          </div>

          <Input
            type="text"
            placeholder="XXXXXX"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            className="text-center text-2xl tracking-[0.3em] font-mono"
            maxLength={6}
            disabled={loading}
          />
          
          <Button
            variant="hero"
            className="w-full"
            onClick={handleVerifyCode}
            disabled={inputCode.length !== 6 || loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vérifier le code"}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = smsUri}
          >
            Réouvrir l'app SMS
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3">
          <Button
            variant="hero"
            className="w-full"
            onClick={() => {
              setStatus('idle');
              setError("");
              setInputCode("");
            }}
          >
            Réessayer
          </Button>
        </div>
      )}

      {status === 'verified' && (
        <div className="flex items-center justify-center gap-2 text-green-600">
          <CheckCircle2 className="w-5 h-5" />
          <span>Redirection en cours...</span>
        </div>
      )}

      {(status === 'idle' || status === 'error') && (
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
