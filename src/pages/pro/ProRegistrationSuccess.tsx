import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ProRegistrationSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get("session_id");
      
      if (!sessionId) {
        toast({
          title: "Erreur",
          description: "Session de paiement invalide",
          variant: "destructive"
        });
        navigate("/register");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-pro-payment", {
          body: { sessionId }
        });

        if (error) throw error;

        if (data?.success) {
          setSuccess(true);
          setCompanyName(data.companyId ? "Votre entreprise" : "");
          toast({
            title: "Inscription réussie !",
            description: "Votre compte PRO a été activé"
          });
        } else {
          throw new Error("Verification failed");
        }
      } catch (error: any) {
        console.error("Verification error:", error);
        toast({
          title: "Erreur de vérification",
          description: error.message || "Impossible de vérifier le paiement",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Vérification du paiement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        {success ? (
          <>
            <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold">Bienvenue dans ANR PRO !</h1>
              <p className="text-muted-foreground mt-2">
                Votre compte entreprise a été créé avec succès
              </p>
            </div>

            <div className="glass-effect rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                <span className="text-lg font-medium">{companyName}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Vous pouvez maintenant accéder à votre espace PRO pour gérer vos employés,
                planifier les missions et suivre les horodatages.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => navigate("/pro")}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Accéder à l'espace PRO
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="w-full"
              >
                Aller au tableau de bord
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
              <Building2 className="h-10 w-10 text-destructive" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold">Erreur</h1>
              <p className="text-muted-foreground mt-2">
                Impossible de finaliser l'inscription
              </p>
            </div>

            <Button 
              onClick={() => navigate("/register")}
              variant="outline"
            >
              Réessayer
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProRegistrationSuccess;
