import { useState, useEffect } from "react";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";

const emailSchema = z.string().email("Email invalide");

const Login = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleEmailSubmit = async () => {
    const validation = emailSchema.safeParse(email);
    
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
      // Send magic link
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Email envoyé",
        description: "Cliquez sur le lien dans votre email pour vous connecter",
      });
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

  const handleResendEmail = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });

      if (error) throw error;

      toast({
        title: "Email renvoyé",
        description: "Vérifiez votre boîte de réception",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-effect rounded-3xl p-8 card-shadow">
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Vérifiez votre email</h2>
                <p className="text-muted-foreground">
                  Un lien de connexion a été envoyé à <strong>{email}</strong>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm space-y-2">
                <p className="font-semibold text-primary">⚠️ Important</p>
                <p className="text-muted-foreground">
                  Pour une sécurité optimale, ouvrez l'email <strong>depuis votre téléphone</strong>.
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleResendEmail}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Renvoyer l'email"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setEmailSent(false)}
                >
                  Changer d'email
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-effect rounded-3xl p-8 card-shadow">
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Connexion</h2>
              <p className="text-muted-foreground">
                Entrez votre email pour recevoir un lien de connexion
              </p>
            </div>

            <div className="space-y-4">
              <Input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-center text-lg"
                disabled={loading}
                onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
              />
              <Button
                variant="hero"
                className="w-full"
                onClick={handleEmailSubmit}
                disabled={!email.trim() || loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuer"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Connexion sécurisée par email
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
