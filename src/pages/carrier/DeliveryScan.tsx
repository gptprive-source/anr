import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, QrCode, MapPin, CheckCircle, Truck, User, Signature, Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useGeolocation } from "@/hooks/useGeolocation";
import { ClientSignatureDialog } from "@/components/door/ClientSignatureDialog";
import { Html5Qrcode } from "html5-qrcode";

type ScanMode = "identify" | "deposit" | "delivery" | "success";

interface DeliveryProof {
  type: "deposit" | "delivery";
  tracking_number: string;
  anr_code?: string;
  relay_code?: string;
  recipient_name?: string;
  signature?: string;
  timestamp: string;
  location: {
    latitude: number | null;
    longitude: number | null;
  };
  driver_id: string;
}

const DeliveryScan = () => {
  const navigate = useNavigate();
  const { latitude, longitude, getCurrentPosition } = useGeolocation();
  
  const [mode, setMode] = useState<ScanMode>("identify");
  const [driverId, setDriverId] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [scannedCode, setScannedCode] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastProof, setLastProof] = useState<DeliveryProof | null>(null);

  useEffect(() => {
    // Load driver ID from localStorage
    const savedDriverId = localStorage.getItem("anr_driver_id");
    if (savedDriverId) {
      setDriverId(savedDriverId);
    }
  }, []);

  const handleIdentify = () => {
    if (!driverId.trim()) {
      toast.error("Veuillez entrer votre identifiant");
      return;
    }
    localStorage.setItem("anr_driver_id", driverId.trim());
    getCurrentPosition();
    setMode("deposit");
    toast.success("Identifié comme: " + driverId);
  };

  const handleScanResult = (code: string) => {
    setScannedCode(code);
    setShowScanner(false);
    toast.success("Code scanné: " + code);
  };

  const handleSubmitDeposit = async () => {
    if (!trackingNumber.trim() || !scannedCode.trim()) {
      toast.error("Veuillez scanner un code relais et entrer le numéro de suivi");
      return;
    }

    setIsSubmitting(true);

    try {
      const proof: DeliveryProof = {
        type: "deposit",
        tracking_number: trackingNumber.trim(),
        relay_code: scannedCode,
        timestamp: new Date().toISOString(),
        location: { latitude, longitude },
        driver_id: driverId
      };

      // In a real implementation, this would call the carrier-api
      console.log("Proof de dépôt:", proof);
      
      setLastProof(proof);
      setMode("success");
      toast.success("Dépôt enregistré avec succès");
      
      // Reset form
      setTrackingNumber("");
      setScannedCode("");
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDelivery = async () => {
    if (!trackingNumber.trim() || !scannedCode.trim()) {
      toast.error("Veuillez scanner l'ANR et entrer le numéro de suivi");
      return;
    }

    if (!signature) {
      setShowSignature(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const proof: DeliveryProof = {
        type: "delivery",
        tracking_number: trackingNumber.trim(),
        anr_code: scannedCode,
        recipient_name: recipientName || "Non renseigné",
        signature: signature,
        timestamp: new Date().toISOString(),
        location: { latitude, longitude },
        driver_id: driverId
      };

      // In a real implementation, this would call the carrier-api
      console.log("Proof de livraison:", proof);
      
      setLastProof(proof);
      setMode("success");
      toast.success("Livraison enregistrée avec succès");
      
      // Reset form
      setTrackingNumber("");
      setScannedCode("");
      setRecipientName("");
      setSignature(null);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignatureComplete = (sig: string, name: string) => {
    setSignature(sig);
    setRecipientName(name);
    setShowSignature(false);
    // Auto-submit after signature
    setTimeout(() => handleSubmitDelivery(), 100);
  };

  const resetToMenu = () => {
    setMode("deposit");
    setLastProof(null);
  };

  // Identify screen
  if (mode === "identify") {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
          <div className="flex items-center gap-4 max-w-4xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Truck className="w-6 h-6" />
              <h1 className="text-xl font-semibold">Scanner Livreur</h1>
            </div>
          </div>
        </header>

        <main className="p-4 max-w-md mx-auto mt-8">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-orange-600" />
              </div>
              <CardTitle>Identification</CardTitle>
              <CardDescription>
                Entrez votre identifiant livreur ou clé équipe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="driverId">Identifiant / Clé équipe</Label>
                <Input
                  id="driverId"
                  placeholder="Ex: LIVREUR-001 ou CLÉ-EQUIPE"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="text-center text-lg"
                />
              </div>
              <Button onClick={handleIdentify} className="w-full" size="lg">
                Commencer
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Success screen
  if (mode === "success" && lastProof) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-green-600 text-white p-4 shadow-md">
          <div className="flex items-center gap-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              <h1 className="text-xl font-semibold">
                {lastProof.type === "deposit" ? "Dépôt confirmé" : "Livraison confirmée"}
              </h1>
            </div>
          </div>
        </header>

        <main className="p-4 max-w-md mx-auto mt-8">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-green-900">Preuve enregistrée</h2>
                <p className="text-green-700 text-sm mt-1">
                  {new Date(lastProof.timestamp).toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">N° suivi:</span>
                  <span className="font-mono font-medium">{lastProof.tracking_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{lastProof.type === "deposit" ? "Dépôt relais" : "Livraison"}</span>
                </div>
                {lastProof.location.latitude && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GPS:</span>
                    <span className="text-xs">{lastProof.location.latitude.toFixed(5)}, {lastProof.location.longitude?.toFixed(5)}</span>
                  </div>
                )}
              </div>
              <Button onClick={resetToMenu} className="w-full" size="lg">
                Scanner un autre colis
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Main scan interface
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setMode("identify")} className="text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Truck className="w-6 h-6" />
              <h1 className="text-xl font-semibold">Scanner Livreur</h1>
            </div>
          </div>
          <span className="text-sm bg-primary-foreground/20 px-3 py-1 rounded-full">
            {driverId}
          </span>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-4">
        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={mode === "deposit" ? "default" : "outline"}
            onClick={() => { setMode("deposit"); setScannedCode(""); setTrackingNumber(""); }}
            className="h-16 flex-col gap-1"
          >
            <Package className="w-5 h-5" />
            <span className="text-xs">Dépôt relais</span>
          </Button>
          <Button
            variant={mode === "delivery" ? "default" : "outline"}
            onClick={() => { setMode("delivery"); setScannedCode(""); setTrackingNumber(""); }}
            className="h-16 flex-col gap-1"
          >
            <MapPin className="w-5 h-5" />
            <span className="text-xs">Livraison ANR</span>
          </Button>
        </div>

        {/* Scanner */}
        {showScanner ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Scanner {mode === "deposit" ? "badge relais" : "ANR"}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowScanner(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <QRScannerSimple onScan={handleScanResult} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                {mode === "deposit" ? "Dépôt en point relais" : "Livraison directe"}
              </CardTitle>
              <CardDescription>
                {mode === "deposit" 
                  ? "Scannez le badge du point relais puis le colis"
                  : "Scannez l'ANR du destinataire pour valider la livraison"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Scan button */}
              <Button 
                variant="outline" 
                onClick={() => setShowScanner(true)}
                className="w-full h-24 border-dashed border-2 flex-col gap-2"
              >
                <Camera className="w-8 h-8 text-muted-foreground" />
                <span>{scannedCode ? `Code: ${scannedCode}` : `Scanner ${mode === "deposit" ? "badge relais" : "ANR"}`}</span>
              </Button>

              {/* Tracking number */}
              <div className="space-y-2">
                <Label htmlFor="tracking">Numéro de suivi</Label>
                <Input
                  id="tracking"
                  placeholder="Ex: COLIS-123456"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="font-mono"
                />
              </div>

              {/* Recipient name (delivery only) */}
              {mode === "delivery" && (
                <div className="space-y-2">
                  <Label htmlFor="recipient">Nom du destinataire</Label>
                  <Input
                    id="recipient"
                    placeholder="Nom de la personne qui reçoit"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
              )}

              {/* GPS status */}
              <div className={`flex items-center gap-2 text-sm p-2 rounded-lg ${latitude ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                <MapPin className="w-4 h-4" />
                {latitude 
                  ? `GPS: ${latitude.toFixed(5)}, ${longitude?.toFixed(5)}`
                  : "Localisation en cours..."
                }
              </div>

              {/* Submit button */}
              <Button 
                onClick={mode === "deposit" ? handleSubmitDeposit : handleSubmitDelivery}
                disabled={isSubmitting || !scannedCode || !trackingNumber}
                className="w-full gap-2"
                size="lg"
              >
                {mode === "delivery" && <Signature className="w-5 h-5" />}
                {isSubmitting 
                  ? "Enregistrement..." 
                  : mode === "deposit" 
                    ? "Confirmer le dépôt" 
                    : "Signature & validation"
                }
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Signature dialog */}
      <ClientSignatureDialog
        open={showSignature}
        onOpenChange={setShowSignature}
        onComplete={handleSignatureComplete}
      />
    </div>
  );
};

// Simple QR Scanner component
const QRScannerSimple = ({ onScan }: { onScan: (code: string) => void }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const extractAnrCode = (input: string): string => {
    const urlMatch = input.match(/\/anr\/([A-Z0-9-]+)/i);
    if (urlMatch) return urlMatch[1].toUpperCase();
    return input.trim().toUpperCase();
  };

  const startScanning = async () => {
    setError(null);
    setScanning(true);

    try {
      const html5QrCode = new Html5Qrcode("delivery-qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const code = extractAnrCode(decodedText);
          stopScanning();
          onScan(code);
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
          <div id="delivery-qr-reader" className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}
      </div>
      {error && (
        <p className="text-destructive text-sm mt-2">{error}</p>
      )}
    </div>
  );
};

export default DeliveryScan;
