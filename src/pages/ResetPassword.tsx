import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import VisitorFooter from "@/components/layout/VisitorFooter";

const passwordSchema = z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères");

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user came from reset link
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    
    if (!accessToken) {
      toast({
        title: "Lien invalide",
        description: "Ce lien de réinitialisation est invalide ou expiré",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [navigate, toast]);

  const handleResetPassword = async () => {
    const passwordValidation = passwordSchema.safeParse(password);
    
    if (!passwordValidation.success) {
      toast({
        title: "Erreur",
        description: passwordValidation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Mot de passe modifié",
        description: "Vous pouvez maintenant vous connecter",
      });

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le mot de passe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4 pb-20">
          <div className="w-full max-w-md">
            <div className="glass-effect rounded-3xl p-8 card-shadow text-center border-2 border-green-500">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 border-2 border-green-500">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-green-500 mb-2">Mot de passe modifié !</h2>
              <p className="text-muted-foreground">Redirection vers la connexion...</p>
            </div>
          </div>
        </div>
        <VisitorFooter />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 pb-20">
        <div className="w-full max-w-md">
          <div className="glass-effect rounded-3xl p-8 card-shadow border-2 border-blue-500">
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4 border-2 border-blue-500">
                  <Lock className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Nouveau mot de passe</h2>
                <p className="text-muted-foreground">
                  Choisissez votre nouveau mot de passe
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nouveau mot de passe</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <Lock className="w-3 h-3 text-purple-500" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 caractères"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Lock className="w-3 h-3 text-orange-500" />
                    </div>
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirmez votre mot de passe"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-12 pr-10"
                      disabled={loading}
                      onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleResetPassword}
                  disabled={!password.trim() || !confirmPassword.trim() || loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Modifier le mot de passe"}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <VisitorFooter />
    </>
  );
};

export default ResetPassword;