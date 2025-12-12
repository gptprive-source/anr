import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2, Home, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VisitorFooter from "@/components/layout/VisitorFooter";

const RegistrationSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already_processed">("loading");
  const [habitationName, setHabitationName] = useState<string>("");
  const [anrCode, setAnrCode] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const isVerifyingRef = useRef(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    
    console.log("[RegistrationSuccess] Mount - sessionId:", sessionId);
    
    if (!sessionId) {
      // Check localStorage for pending session
      const pendingSessionId = localStorage.getItem("anr_pending_session_id");
      if (pendingSessionId) {
        console.log("[RegistrationSuccess] Using pending session from localStorage:", pendingSessionId);
        verifyPayment(pendingSessionId);
      } else {
        setStatus("error");
        setErrorMessage("Session de paiement non trouvée");
      }
      return;
    }

    verifyPayment(sessionId);
  }, [searchParams]);

  const verifyPayment = async (sessionId: string) => {
    // Prevent duplicate calls
    if (isVerifyingRef.current) {
      console.log("[RegistrationSuccess] Already verifying, skipping");
      return;
    }
    isVerifyingRef.current = true;

    console.log("[RegistrationSuccess] Starting payment verification for:", sessionId);
    
    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { sessionId }
      });

      console.log("[RegistrationSuccess] verify-payment response:", { data, error });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Success!
      if (data?.alreadyProcessed) {
        setStatus("already_processed");
      } else {
        setStatus("success");
      }
      
      setHabitationName(data?.habitationName || "");
      setAnrCode(data?.anrCode || "");

      // Clear localStorage
      localStorage.removeItem("anr_pending_session_id");
      localStorage.removeItem("anr_register_address_data");
      localStorage.removeItem("anr_register_step");
      sessionStorage.removeItem("anr_referral_code");

      toast({
        title: data?.alreadyProcessed ? "Inscription déjà finalisée" : "Inscription réussie !",
        description: "Votre compte est maintenant actif"
      });

    } catch (error: any) {
      console.error("[RegistrationSuccess] Verification error:", error);
      setStatus("error");
      setErrorMessage(error.message || "Erreur lors de la vérification du paiement");
      
      // Keep session ID for retry
      localStorage.setItem("anr_pending_session_id", sessionId);
    } finally {
      isVerifyingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <h1 className="text-lg font-semibold text-center">Confirmation d'inscription</h1>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {status === "loading" && (
            <Card className="border-primary/20">
              <CardContent className="p-8 text-center">
                <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Vérification en cours...</h2>
                <p className="text-muted-foreground">
                  Nous finalisons votre inscription, veuillez patienter.
                </p>
              </CardContent>
            </Card>
          )}

          {(status === "success" || status === "already_processed") && (
            <Card className="border-green-500">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                
                <h2 className="text-2xl font-bold text-green-600 mb-2">
                  {status === "already_processed" ? "Inscription déjà finalisée" : "Bienvenue !"}
                </h2>
                
                <p className="text-muted-foreground mb-4">
                  {status === "already_processed" 
                    ? "Votre compte est déjà actif."
                    : "Votre inscription a été finalisée avec succès."}
                </p>

                {habitationName && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-center gap-2 text-lg font-medium">
                      <Home className="w-5 h-5 text-primary" />
                      <span>{habitationName}</span>
                    </div>
                    {anrCode && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Code ANR: <span className="font-mono font-medium">{anrCode}</span>
                      </p>
                    )}
                  </div>
                )}

                <p className="text-sm text-muted-foreground mb-6">
                  Un email de confirmation avec tous les détails vous a été envoyé.
                </p>

                <div className="space-y-3">
                  <Button 
                    onClick={() => navigate("/dashboard", { replace: true })}
                    className="w-full bg-green-500 hover:bg-green-600"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Accéder à mon tableau de bord
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {status === "error" && (
            <Card className="border-destructive">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-12 h-12 text-destructive" />
                </div>
                
                <h2 className="text-2xl font-bold text-destructive mb-2">Erreur</h2>
                
                <p className="text-muted-foreground mb-4">
                  {errorMessage || "Une erreur est survenue lors de la vérification."}
                </p>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-200 text-left">
                      <p className="font-medium">Votre paiement a été effectué</p>
                      <p className="mt-1">
                        Si votre paiement a été débité, ne vous inquiétez pas. 
                        Contactez le support avec votre email pour finaliser votre inscription.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={() => window.location.reload()}
                    className="w-full"
                  >
                    Réessayer
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigate("/contact")}
                    className="w-full"
                  >
                    Contacter le support
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <VisitorFooter />
    </div>
  );
};

export default RegistrationSuccess;
