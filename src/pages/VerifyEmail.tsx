import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
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
        try {
          // Check if profile is complete
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", user.id)
            .single();

          const profileComplete = profile?.first_name && profile?.last_name;

          // Check if user has a habitation (resident record)
          const { data: resident } = await supabase
            .from("residents")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          const hasHabitation = !!resident;

          setStatus("success");

          if (!profileComplete) {
            // Profile not complete - redirect to register at profile step
            setMessage("Email vérifié ! Complétez votre profil...");
            localStorage.setItem("anr_register_step", "profile");
            setTimeout(() => {
              navigate("/register", { replace: true });
            }, 1500);
          } else if (!hasHabitation) {
            // Profile complete but no habitation - redirect to register at address step
            setMessage("Email vérifié ! Ajoutez votre adresse...");
            localStorage.setItem("anr_register_step", "address");
            setTimeout(() => {
              navigate("/register", { replace: true });
            }, 1500);
          } else {
            // Everything complete - go to dashboard
            setMessage("Connexion réussie !");
            setTimeout(() => {
              navigate("/dashboard", { replace: true });
            }, 1000);
          }
        } catch (error) {
          console.error("Verification error:", error);
          // Even if profile check fails, user is still authenticated
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
        <div className={`glass-effect rounded-3xl p-8 card-shadow text-center border-2 ${
          status === "loading" || authLoading ? "border-blue-500" :
          status === "success" ? "border-green-500" : "border-destructive"
        }`}>
          {(status === "loading" || authLoading) && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto border-2 border-blue-500">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              </div>
              <h2 className="text-xl font-bold">Vérification en cours...</h2>
              <p className="text-muted-foreground">Veuillez patienter</p>
            </div>
          )}

          {status === "success" && !authLoading && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto border-2 border-green-500">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-green-500">Vérifié !</h2>
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">Redirection en cours...</p>
            </div>
          )}

          {status === "error" && !authLoading && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto border-2 border-destructive">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-destructive">Erreur</h2>
              <p className="text-muted-foreground">{message}</p>
              <div className="space-y-2 pt-4">
                <Button variant="secondary" onClick={() => navigate("/login")} className="w-full border-2 border-blue-500">
                  <Mail className="w-4 h-4 mr-2 text-blue-500" />
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