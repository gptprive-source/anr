import { useState, useEffect } from "react";
import { Phone, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";

const phoneSchema = z.string().regex(/^\+?[0-9]{10,15}$/, "Numéro de téléphone invalide");

const Login = () => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const formatPhone = (value: string) => {
    return value.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  };

  const handlePhoneSubmit = async () => {
    const formattedPhone = formatPhone(phone);
    const validation = phoneSchema.safeParse(formattedPhone);
    
    if (!validation.success) {
      toast({
        title: "Erreur",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Chercher si un utilisateur existe avec ce numéro
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone_number", formattedPhone)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        toast({
          title: "Compte non trouvé",
          description: "Aucun compte avec ce numéro. Inscrivez-vous d'abord.",
          variant: "destructive",
        });
        return;
      }

      // Connexion anonyme (temporaire - sera remplacée par vérification appel OVH)
      const { error } = await supabase.auth.signInAnonymously();

      if (error) throw error;

      toast({
        title: "Connecté",
        description: "Connexion réussie !",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur de connexion",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-effect rounded-3xl p-8 card-shadow">
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Connexion</h2>
              <p className="text-muted-foreground">
                Entrez votre numéro de téléphone
              </p>
            </div>

            <div className="space-y-4">
              <Input
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-center text-lg"
                disabled={loading}
              />
              <Button
                variant="hero"
                className="w-full"
                onClick={handlePhoneSubmit}
                disabled={!phone.trim() || loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuer"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              La vérification sera effectuée par appel téléphonique
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Pas encore inscrit ?{" "}
          <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/register")}>
            Créer un compte
          </Button>
        </p>
      </div>
    </div>
  );
};

export default Login;
