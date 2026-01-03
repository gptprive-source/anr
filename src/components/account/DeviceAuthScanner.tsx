import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef } from "react";
import { Loader2, Monitor, CheckCircle2, XCircle, QrCode } from "lucide-react";
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
  const { user } = useAuth();
  const [scanning, setScanning] = useState(true);
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!open || !scanning) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const container = document.getElementById("device-auth-scanner");
      if (!container) return;

      scannerRef.current = new Html5QrcodeScanner(
        "device-auth-scanner",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        false
      );

      scannerRef.current.render(
        async (decodedText) => {
          console.log("[DeviceAuthScanner] Scanned:", decodedText);
          
          // Check if it's a device auth QR code
          if (decodedText.startsWith("anr://device-auth/")) {
            const token = decodedText.replace("anr://device-auth/", "");
            await handleScan(token);
          } else {
            toast.error("QR code invalide");
          }
        },
        (error) => {
          // Ignore scan errors
        }
      );
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, scanning]);

  const handleScan = async (token: string) => {
    if (!user) return;

    // Stop scanner
    if (scannerRef.current) {
      await scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);

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
      setScanning(true);
      return;
    }

    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      toast.error("Cette session a expiré");
      setScanning(true);
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
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(true);
    setPendingAuth(null);
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
            {scanning
              ? "Scannez le QR code affiché sur le nouvel appareil"
              : "Confirmez l'autorisation de cet appareil"}
          </DialogDescription>
        </DialogHeader>

        {scanning && !pendingAuth && (
          <div id="device-auth-scanner" className="w-full" />
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
