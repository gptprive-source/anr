import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyDevice = async () => {
      // Get the device token from localStorage
      const storedToken = localStorage.getItem("anr_device_token");
      const urlToken = searchParams.get("token");

      // Check if this is the same device
      if (storedToken && urlToken && storedToken === urlToken) {
        // Same device - verification successful
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Mark phone as verified
            await supabase
              .from("profiles")
              .update({ phone_verified: true })
              .eq("id", user.id);

            setStatus("success");
            setMessage("Votre numéro de téléphone a été vérifié avec succès !");
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
              navigate("/dashboard");
            }, 2000);
          } else {
            setStatus("error");
            setMessage("Session expirée. Veuillez vous reconnecter.");
          }
        } catch (error) {
          console.error("Verification error:", error);
          setStatus("error");
          setMessage("Une erreur est survenue lors de la vérification.");
        }
      } else if (urlToken && storedToken !== urlToken) {
        // Different device
        setStatus("error");
        setMessage("Ce lien doit être ouvert depuis le téléphone où vous avez créé votre compte. Veuillez réessayer depuis le bon appareil.");
      } else {
        // No token - just handle the auth callback
        setStatus("success");
        setMessage("Vérification en cours...");
        
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          navigate("/dashboard");
        } else {
          navigate("/login");
        }
      }
    };

    verifyDevice();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-effect rounded-3xl p-8 card-shadow text-center">
          {status === "loading" && (
            <div className="space-y-4">
              <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
              <h2 className="text-xl font-bold">Vérification en cours...</h2>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-green-500">Vérifié !</h2>
              <p className="text-muted-foreground">{message}</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-destructive">Erreur</h2>
              <p className="text-muted-foreground">{message}</p>
              <Button variant="secondary" onClick={() => navigate("/login")}>
                Retour à la connexion
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
