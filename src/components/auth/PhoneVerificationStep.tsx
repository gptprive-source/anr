import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { usePhoneVerification } from "@/hooks/usePhoneVerification";
import { cn } from "@/lib/utils";

interface PhoneVerificationStepProps {
  deviceId: string;
  onVerified: (phoneNumber: string) => void;
  onBack?: () => void;
}

const PhoneVerificationStep = ({ deviceId, onVerified, onBack }: PhoneVerificationStepProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const {
    status,
    ovhNumber,
    errorMessage,
    timeRemaining,
    isCapacitor,
    initVerification,
    startPolling,
    triggerCall,
    reset,
  } = usePhoneVerification();

  // Auto-start polling when restored from storage
  useEffect(() => {
    if (status === "waiting") {
      startPolling();
    }
  }, [status, startPolling]);

  // Auto-transition after verification
  useEffect(() => {
    if (status === "verified") {
      const timer = setTimeout(() => {
        onVerified(phoneNumber);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, phoneNumber, onVerified]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPhoneDisplay = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10 && cleaned.startsWith("0")) {
      return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5");
    }
    return phone;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    const success = await initVerification(phoneNumber.trim(), deviceId);
    if (success) {
      // Start polling BEFORE triggering call to ensure it runs even if page state changes
      startPolling();
      triggerCall();
    }
  };

  const handleRetry = () => {
    reset();
  };

  // Phone input form
  if (status === "idle" || status === "error") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Phone className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Vérification du téléphone</h2>
          <p className="text-muted-foreground">
            Pour sécuriser votre compte, nous devons vérifier votre numéro de téléphone.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="06 12 34 56 78"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="text-lg"
              autoComplete="tel"
            />
            <p className="text-xs text-muted-foreground">
              Format français : 06, 07 ou +33
            </p>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={!phoneNumber.trim()}>
            Vérifier mon numéro
          </Button>

          {onBack && (
            <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
              Retour
            </Button>
          )}
        </form>
      </div>
    );
  }

  // Initializing state
  if (status === "initializing") {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Préparation...</h2>
          <p className="text-muted-foreground mt-2">
            Configuration de la vérification en cours
          </p>
        </div>
      </div>
    );
  }

  // Calling / Waiting state
  if (status === "calling" || status === "waiting") {
    return (
      <div className="space-y-6 text-center">
        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center relative">
          <Phone className="w-10 h-10 text-primary" />
          <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            {status === "calling" ? "Lancez l'appel" : "En attente de votre appel..."}
          </h2>
          <p className="text-muted-foreground">
            Appelez le numéro ci-dessous depuis votre téléphone
          </p>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Numéro à appeler</p>
          <p className="text-2xl font-mono font-bold tracking-wider">
            {formatPhoneDisplay(ovhNumber)}
          </p>
        </div>

        {!isCapacitor && (
          <Button onClick={triggerCall} variant="outline" className="gap-2">
            <Phone className="w-4 h-4" />
            Appeler maintenant
          </Button>
        )}

        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Temps restant : {formatTime(timeRemaining)}</span>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Vérification automatique en cours...
          </span>
        </div>

        <Button variant="ghost" onClick={handleRetry} className="text-sm">
          Réessayer avec un autre numéro
        </Button>
      </div>
    );
  }

  // Verified state
  if (status === "verified") {
    return (
      <div className="space-y-6 text-center">
        <div className={cn(
          "w-20 h-20 mx-auto rounded-full flex items-center justify-center",
          "bg-green-500/20 animate-in zoom-in-50 duration-300"
        )}>
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-green-600">Numéro vérifié !</h2>
          <p className="text-muted-foreground">
            Vous pouvez raccrocher maintenant. Redirection en cours...
          </p>
        </div>
      </div>
    );
  }

  // Expired state
  if (status === "expired") {
    return (
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
          <Clock className="w-8 h-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-destructive">Délai expiré</h2>
          <p className="text-muted-foreground">
            Le temps imparti pour la vérification est écoulé.
          </p>
        </div>

        <Button onClick={handleRetry} className="w-full">
          Réessayer
        </Button>
      </div>
    );
  }

  return null;
};

export default PhoneVerificationStep;
