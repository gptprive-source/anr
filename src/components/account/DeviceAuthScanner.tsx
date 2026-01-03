import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Html5Qrcode } from "html5-qrcode";
import { Loader2, Monitor, CheckCircle2, XCircle, QrCode, Camera } from "lucide-react";
import { toast } from "sonner";

interface DeviceAuthScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PendingAuth {
  id: string;
  new_device_name: string;
  created_at: string;
  expires_at: string;
}

const DeviceAuthScanner = ({ open, onOpenChange }: DeviceAuthScannerProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const initScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("device-auth-qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          console.log("[DeviceAuthScanner] Decoded:", decodedText);
          
          // Check if it's a device auth QR code
          if (decodedText.startsWith("anr://device-auth/")) {
            const token = decodedText.replace("anr://device-auth/", "");
            await stopScanning();
            await handleScan(token);
          } else {
            toast.error("QR code invalide");
          }
        },
        () => {
          // Ignore continuous scan errors
        }
      );
      setCameraReady(true);
    } catch (err: any) {
      console.error("[DeviceAuthScanner] Error:", err);
      setScanning(false);
      setCameraReady(false);
      if (err.name === "NotAllowedError") {
        setError("Accès à la caméra refusé. Veuillez autoriser l'accès dans les paramètres.");
      } else {
        setError("Impossible d'accéder à la caméra: " + (err.message || err));
      }
    }
  };

  const startScanning = () => {
    setError(null);
    setScanning(true);
  };

  // Initialize scanner after DOM is ready
  useEffect(() => {
    if (open && scanning && !scannerRef.current) {
      const timer = setTimeout(() => {
        initScanner();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, scanning]);

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.log("[DeviceAuthScanner] Stop error:", e);
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setCameraReady(false);
  };

  // Cleanup on unmount or close
  useEffect(() => {
    if (!open) {
      stopScanning();
      setPendingAuth(null);
      setError(null);
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open]);

  const handleScan = async (token: string) => {
    if (!user) return;

    // Fetch the auth session
    const { data, error } = await supabase
      .from("device_auth_sessions")
      .select("*")
      .eq("session_token", token)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    if (error || !data) {
      toast.error("Session d'autorisation invalide ou expirée");
      setScanning(false);
      return;
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      toast.error("Cette session a expiré");
      setScanning(false);
      return;
    }

    setPendingAuth(data);
  };

  const handleApprove = async () => {
    if (!pendingAuth || !user) return;

    setProcessing(true);

    try {
      const myDeviceId = localStorage.getItem("anr_device_id");

      // Update the session to approved
      const { error } = await supabase
        .from("device_auth_sessions")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by_device_id: myDeviceId,
        })
        .eq("id", pendingAuth.id);

      if (error) throw error;

      toast.success("Appareil autorisé avec succès !");
      onOpenChange(false);
      
      // Redirect to dashboard after successful approval
      navigate("/dashboard");
    } catch (error) {
      console.error("[DeviceAuthScanner] Error approving:", error);
      toast.error("Erreur lors de l'autorisation");
    } finally {
      setProcessing(false);
      setPendingAuth(null);
    }
  };

  const handleReject = async () => {
    if (!pendingAuth) return;

    setProcessing(true);

    try {
      const { error } = await supabase
        .from("device_auth_sessions")
        .update({ status: "rejected" })
        .eq("id", pendingAuth.id);

      if (error) throw error;

      toast.info("Autorisation refusée");
      onOpenChange(false);
    } catch (error) {
      console.error("[DeviceAuthScanner] Error rejecting:", error);
      toast.error("Erreur lors du refus");
    } finally {
      setProcessing(false);
      setPendingAuth(null);
    }
  };

  const handleClose = () => {
    stopScanning();
    setPendingAuth(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Autoriser un appareil
          </DialogTitle>
          <DialogDescription>
            {!pendingAuth
              ? "Scannez le QR code affiché sur le nouvel appareil"
              : "Confirmez l'autorisation de cet appareil"}
          </DialogDescription>
        </DialogHeader>

        {!pendingAuth && (
          <div className="text-center">
            <div className="relative w-full aspect-square max-w-[300px] mx-auto mb-4 rounded-2xl overflow-hidden bg-secondary/30">
              {scanning ? (
                <>
                  <div id="device-auth-qr-reader" className="w-full h-full" />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
                      <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-primary/50 rounded-2xl">
                  <Camera className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Appuyez pour scanner
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {error}
              </div>
            )}

            {!scanning ? (
              <Button onClick={startScanning} variant="default">
                <Camera className="w-4 h-4 mr-2" />
                Activer la caméra
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="outline">
                <XCircle className="w-4 h-4 mr-2" />
                Arrêter le scan
              </Button>
            )}
          </div>
        )}

        {pendingAuth && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Monitor className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{pendingAuth.new_device_name}</CardTitle>
                  <CardDescription>
                    Demande à {new Date(pendingAuth.created_at).toLocaleTimeString("fr-FR")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Voulez-vous autoriser cet appareil à accéder à votre compte ?
              </p>

              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Refuser
                    </>
                  )}
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleApprove}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Autoriser
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeviceAuthScanner;
