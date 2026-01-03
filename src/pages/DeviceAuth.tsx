import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, Smartphone, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const DeviceAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "pending" | "approved" | "rejected" | "expired">("loading");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300);

  // Generate a unique session token
  const generateToken = () => {
    return crypto.randomUUID() + "-" + Date.now().toString(36);
  };

  // Get device name from user agent
  const getDeviceName = () => {
    const ua = navigator.userAgent;
    if (ua.includes("Windows")) return "Windows PC";
    if (ua.includes("Macintosh")) return "Mac";
    if (ua.includes("Linux")) return "Linux PC";
    if (ua.includes("iPhone")) return "iPhone";
    if (ua.includes("iPad")) return "iPad";
    if (ua.includes("Android")) return "Android";
    return "Appareil inconnu";
  };

  // Create auth session
  const createSession = useCallback(async () => {
    if (!user) return;

    setStatus("loading");
    const token = generateToken();
    const deviceId = localStorage.getItem("anr_device_id") || crypto.randomUUID();
    localStorage.setItem("anr_device_id", deviceId);

    const { data, error } = await supabase
      .from("device_auth_sessions")
      .insert({
        user_id: user.id,
        session_token: token,
        new_device_id: deviceId,
        new_device_name: getDeviceName(),
        status: "pending",
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[DeviceAuth] Error creating session:", error);
      return;
    }

    setSessionToken(token);
    setSessionId(data.id);
    setExpiresAt(new Date(data.expires_at));
    setStatus("pending");
    setTimeLeft(300);
  }, [user]);

  // Initialize session on mount
  useEffect(() => {
    if (!authLoading && user) {
      createSession();
    } else if (!authLoading && !user) {
      navigate("/login");
    }
  }, [authLoading, user, createSession, navigate]);

  // Listen for session updates via Supabase Realtime
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`device-auth-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "device_auth_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log("[DeviceAuth] Session updated:", payload);
          const newStatus = payload.new.status as string;
          
          if (newStatus === "approved") {
            setStatus("approved");
            // Add this device to user_devices
            const deviceId = localStorage.getItem("anr_device_id");
            if (deviceId && user) {
              supabase
                .from("user_devices")
                .insert({
                  user_id: user.id,
                  device_id: deviceId,
                  device_name: getDeviceName(),
                  is_primary: false,
                })
                .then(() => {
                  // Redirect after short delay
                  setTimeout(() => navigate("/dashboard"), 1500);
                });
            }
          } else if (newStatus === "rejected") {
            setStatus("rejected");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, user, navigate]);

  // Countdown timer
  useEffect(() => {
    if (status !== "pending" || !expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        setStatus("expired");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, expiresAt]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
            {status === "approved" ? (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            ) : status === "rejected" ? (
              <XCircle className="w-8 h-8 text-destructive" />
            ) : (
              <QrCode className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle>
            {status === "approved" && "Appareil autorisé !"}
            {status === "rejected" && "Autorisation refusée"}
            {status === "expired" && "Session expirée"}
            {status === "pending" && "Autoriser cet appareil"}
          </CardTitle>
          <CardDescription>
            {status === "approved" && "Redirection vers le tableau de bord..."}
            {status === "rejected" && "L'autorisation a été refusée depuis votre téléphone."}
            {status === "expired" && "Le QR code a expiré. Veuillez en générer un nouveau."}
            {status === "pending" && "Scannez ce QR code avec l'application ANR sur votre téléphone vérifié"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {status === "pending" && sessionToken && (
            <>
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-xl shadow-inner">
                  <QRCodeSVG
                    value={`anr://device-auth/${sessionToken}`}
                    size={200}
                    level="M"
                    fgColor="#1a1a2e"
                  />
                </div>
              </div>

              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Smartphone className="w-4 h-4" />
                  <span className="text-sm">
                    Ouvrez l'app sur votre téléphone → Compte → Appareils connectés
                  </span>
                </div>
                <p className="text-lg font-mono font-semibold text-primary">
                  {formatTime(timeLeft)}
                </p>
              </div>
            </>
          )}

          {(status === "expired" || status === "rejected") && (
            <Button onClick={createSession} className="w-full" variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Générer un nouveau QR code
            </Button>
          )}

          {status === "approved" && (
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceAuth;
