import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Prevent double checking
    if (checked) return;
    setChecked(true);

    const processAuth = async () => {
      console.log("VerifyEmail - user:", user?.email, "authLoading:", authLoading);

      if (user) {
        // User is authenticated
        try {
          // Verify device token for additional security (signup flow)
          const storedDeviceToken = localStorage.getItem("anr_device_token");
          const userDeviceToken = user.user_metadata?.device_token;

          if (userDeviceToken && storedDeviceToken && storedDeviceToken !== userDeviceToken) {
            setStatus("error");
            setMessage("Ce lien doit être ouvert depuis le téléphone où vous avez créé votre compte.");
            return;
          }

          // Mark phone as verified if device tokens match
          if (userDeviceToken && storedDeviceToken === userDeviceToken) {
            await supabase
              .from("profiles")
              .update({ phone_verified: true })
              .eq("id", user.id);
          }

          setStatus("success");
          setMessage("Connexion réussie !");
          
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 1000);
        } catch (error) {
          console.error("Verification error:", error);
          // Even if profile update fails, user is still authenticated
          setStatus("success");
          setMessage("Connexion réussie !");
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 1000);
        }
      } else {
        // No user after auth loading completed - link might be expired
        setStatus("error");
        setMessage("Lien invalide ou expiré. Veuillez réessayer.");
      }
    };

    processAuth();
  }, [user, authLoading, checked, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-effect rounded-3xl p-8 card-shadow text-center">
          {(status === "loading" || authLoading) && (
            <div className="space-y-4">
              <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
              <h2 className="text-xl font-bold">Vérification en cours...</h2>
              <p className="text-muted-foreground">Veuillez patienter</p>
            </div>
          )}

          {status === "success" && !authLoading && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-green-500">Vérifié !</h2>
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">Redirection en cours...</p>
            </div>
          )}

          {status === "error" && !authLoading && (
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
