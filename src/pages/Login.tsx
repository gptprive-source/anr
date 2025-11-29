import { useState } from "react";
import { Phone, ArrowRight, Shield, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type Step = "phone" | "otp";

const phoneSchema = z.string().regex(/^\+?[0-9]{10,15}$/, "Numéro de téléphone invalide");
const otpSchema = z.string().length(6, "Le code doit contenir 6 chiffres");

const Login = () => {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) {
        throw error;
      }

      setPhone(formattedPhone);
      setStep("otp");
      toast({
        title: "Code envoyé",
        description: "Un code de vérification a été envoyé par SMS",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le SMS",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    const validation = otpSchema.safeParse(otp);
    
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
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Connecté",
        description: "Connexion réussie !",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Code de vérification invalide",
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
          {step === "phone" && (
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
                <Shield className="w-3 h-3 inline mr-1" />
                Un code de vérification sera envoyé par SMS
              </p>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Vérification</h2>
                <p className="text-muted-foreground">
                  Entrez le code envoyé au {phone}
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  disabled={loading}
                />
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleOtpSubmit}
                  disabled={otp.length !== 6 || loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Se connecter"}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setStep("phone")} disabled={loading}>
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </Button>
                <Button variant="ghost" className="flex-1" onClick={handlePhoneSubmit} disabled={loading}>
                  Renvoyer le code
                </Button>
              </div>
            </div>
          )}
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
