import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double processing
    if (processedRef.current) return;

    const handleAuthCallback = async (session: any) => {
      if (processedRef.current) return;
      processedRef.current = true;

      try {
        if (session) {
          // User is authenticated - verify device token for additional security
          const storedDeviceToken = localStorage.getItem("anr_device_token");
          const userDeviceToken = session.user.user_metadata?.device_token;

          // If this is a signup verification (device token exists in metadata)
          if (userDeviceToken && storedDeviceToken) {
            if (storedDeviceToken === userDeviceToken) {
              // Same device - mark phone as verified
              await supabase
                .from("profiles")
                .update({ phone_verified: true })
                .eq("id", session.user.id);

              setStatus("success");
              setMessage("Votre compte a été vérifié avec succès !");
              
              setTimeout(() => {
                navigate("/dashboard", { replace: true });
              }, 1500);
            } else {
              // Different device - security warning
              setStatus("error");
              setMessage("Ce lien doit être ouvert depuis le téléphone où vous avez créé votre compte.");
            }
          } else {
            // No device token check needed (login flow)
            setStatus("success");
            setMessage("Connexion réussie !");
            
            setTimeout(() => {
              navigate("/dashboard", { replace: true });
            }, 1000);
          }
        } else {
          // No session
          setStatus("error");
          setMessage("Lien invalide ou expiré. Veuillez réessayer.");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage("Une erreur est survenue lors de la vérification.");
      }
    };

    // Listen for auth state changes (this handles the hash fragment tokens)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("VerifyEmail auth event:", event);
        
        if (event === "SIGNED_IN" && session) {
          handleAuthCallback(session);
        } else if (event === "TOKEN_REFRESHED" && session) {
          navigate("/dashboard", { replace: true });
        }
      }
    );

    // Check if already authenticated (in case the event already fired)
    const checkExistingSession = async () => {
      // Small delay to let Supabase process the hash fragment
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && !processedRef.current) {
        handleAuthCallback(session);
      } else if (!session && !processedRef.current) {
        // Wait a bit more for potential auth state change
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession && !processedRef.current) {
            handleAuthCallback(retrySession);
          } else if (!processedRef.current) {
            setStatus("error");
            setMessage("Lien invalide ou expiré. Veuillez réessayer.");
          }
        }, 2000);
      }
    };

    checkExistingSession();

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-effect rounded-3xl p-8 card-shadow text-center">
          {status === "loading" && (
            <div className="space-y-4">
              <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
              <h2 className="text-xl font-bold">Vérification en cours...</h2>
              <p className="text-muted-foreground">Veuillez patienter</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-green-500">Vérifié !</h2>
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">Redirection en cours...</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-destructive">Erreur</h2>
              <p className="text-muted-foreground">{message}</p>
              <div className="space-y-2 pt-4">
                <Button variant="secondary" onClick={() => navigate("/login")} className="w-full">
                  Retour à la connexion
                </Button>
                <Button variant="ghost" onClick={() => navigate("/register")} className="w-full">
                  Créer un nouveau compte
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
