import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import PhoneVerificationStep from "@/components/auth/PhoneVerificationStep";

const PhoneVerification = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [deviceId, setDeviceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  // Get or create device ID
  useEffect(() => {
    let id = localStorage.getItem("anr_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("anr_device_id", id);
    }
    setDeviceId(id);
  }, []);

  // Check if already verified
  useEffect(() => {
    const checkVerification = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_verified, device_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.phone_verified && profile?.device_id) {
        setAlreadyVerified(true);
        navigate("/dashboard", { replace: true });
      } else {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      checkVerification();
    } else if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleVerified = () => {
    navigate("/dashboard", { replace: true });
  };

  if (authLoading || loading || alreadyVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Sécurisation du compte</CardTitle>
            <CardDescription className="mt-2">
              Pour protéger votre compte, nous devons vérifier votre numéro de téléphone 
              et associer cet appareil à votre profil.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <PhoneVerificationStep deviceId={deviceId} onVerified={handleVerified} />
        </CardContent>
      </Card>
    </div>
  );
};

export default PhoneVerification;
