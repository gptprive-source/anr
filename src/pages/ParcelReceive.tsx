import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, QrCode, CheckCircle, Loader2, X, Camera, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import { verifyQRToken, QRTokenPayload } from "@/lib/offlineCrypto";

type ScanStatus = "idle" | "scanning" | "verifying" | "success" | "error";

const ParcelReceive = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [scannedPayload, setScannedPayload] = useState<QRTokenPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const handleScanResult = (qrToken: string) => {
    setShowScanner(false);
    setStatus("verifying");

    // Verify token offline (simplified - in production use public key)
    const result = verifyQRToken(qrToken, "");

    if (!result.valid || !result.payload) {
      setError(result.error || "Token invalide");
      setStatus("error");
      
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      return;
    }

    // Token is valid
    setScannedPayload(result.payload);
    setStatus("success");

    // Vibrate on success
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    toast.success("Colis reçu avec succès!");
  };

  const startScanning = () => {
    setShowScanner(true);
    setStatus("scanning");
    setError(null);
  };

  const resetScan = () => {
    setStatus("idle");
    setScannedPayload(null);
    setError(null);
    setShowScanner(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6" />
            <h1 className="text-xl font-semibold">Réception colis</h1>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto mt-4">
        {status === "idle" && (
          <Card>
            <CardHeader className="text-center">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <QrCode className="w-10 h-10 text-primary" />
              </div>
              <CardTitle>Scanner le QR du livreur</CardTitle>
              <CardDescription>
                Le livreur va vous présenter un QR code. Scannez-le pour confirmer la réception de votre colis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={startScanning} className="w-full gap-2" size="lg">
                <Camera className="w-5 h-5" />
                Ouvrir le scanner
              </Button>
            </CardContent>
          </Card>
        )}

        {showScanner && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Scanner QR</CardTitle>
                <Button variant="ghost" size="icon" onClick={resetScan}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <QRScannerReceive onScan={handleScanResult} />
            </CardContent>
          </Card>
        )}

        {status === "verifying" && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Vérification du QR code...</p>
            </CardContent>
          </Card>
        )}

        {status === "success" && scannedPayload && (
          <Card className="border-green-500 bg-green-50">
            <CardContent className="py-8 text-center">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-green-900 mb-2">Colis reçu !</h2>
              <p className="text-green-700 mb-4">
                La livraison a été confirmée avec succès
              </p>
              <div className="bg-white rounded-lg p-4 text-left space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">N° suivi:</span>
                  <span className="font-mono font-medium">{scannedPayload.tracking_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{new Date().toLocaleString("fr-FR")}</span>
                </div>
              </div>
              <Button onClick={resetScan} variant="outline" className="w-full">
                Scanner un autre colis
              </Button>
            </CardContent>
          </Card>
        )}

        {status === "error" && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="py-8 text-center">
              <div className="w-20 h-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-12 h-12 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-destructive mb-2">Erreur de validation</h2>
              <p className="text-destructive/80 mb-4">
                {error || "Le QR code n'a pas pu être validé"}
              </p>
              <div className="flex gap-2">
                <Button onClick={() => navigate(-1)} variant="outline" className="flex-1">
                  Retour
                </Button>
                <Button onClick={resetScan} className="flex-1">
                  Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

// QR Scanner component for recipient
const QRScannerReceive = ({ onScan }: { onScan: (token: string) => void }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const startScanning = async () => {
    setError(null);
    setScanning(true);

    try {
      const html5QrCode = new Html5Qrcode("receive-qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Check if it looks like a JWT token
          if (decodedText.includes(".") && decodedText.split(".").length === 3) {
            stopScanning();
            onScan(decodedText);
          }
        },
        () => {}
      );
    } catch (err: any) {
      setScanning(false);
      setError(err.message || "Erreur caméra");
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!scanning) {
      startScanning();
    }
  }, []);

  return (
    <div className="text-center">
      <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-xl overflow-hidden bg-secondary/30">
        {scanning ? (
          <div id="receive-qr-reader" className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-3">
        Scannez le QR affiché par le livreur
      </p>
      {error && (
        <p className="text-destructive text-sm mt-2">{error}</p>
      )}
    </div>
  );
};

export default ParcelReceive;
