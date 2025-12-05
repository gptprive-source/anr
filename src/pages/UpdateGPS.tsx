import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Wifi, Loader2, MapPin, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";
import BottomNav from "@/components/layout/BottomNav";
type ScanMode = "qr" | "nfc";
const UpdateGPS = () => {
  const [mode, setMode] = useState<ScanMode>("qr");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);
  const extractAnrCode = (input: string): string => {
    // Check if it's a URL containing /anr/CODE
    const urlMatch = input.match(/\/anr\/([A-Z0-9-]+)/i);
    if (urlMatch) {
      return urlMatch[1].toUpperCase();
    }
    // Otherwise return the raw input (assuming it's already the code)
    return input.trim().toUpperCase();
  };
  const handleScan = async (scannedCode: string) => {
    if (loading) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const anrCode = extractAnrCode(scannedCode);
      console.log("[UpdateGPS] Scanned ANR code:", anrCode);

      // Verify that the user is owner of this ANR
      const {
        data: ownership,
        error: ownerError
      } = await supabase.from("residents").select(`
          is_owner,
          habitations!inner (
            anrs!inner (
              id,
              code,
              latitude,
              longitude
            )
          )
        `).eq("user_id", user?.id).eq("is_owner", true).eq("status", "verified").eq("habitations.anrs.code", anrCode).maybeSingle();
      if (ownerError) throw ownerError;
      if (!ownership) {
        setErrorMessage("Cet ANR ne vous appartient pas ou vous n'êtes pas propriétaire.");
        setLoading(false);
        return;
      }
      const anrData = (ownership.habitations as any).anrs;
      console.log("[UpdateGPS] ANR found:", anrData);

      // Get current GPS position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });
      const newLat = position.coords.latitude;
      const newLon = position.coords.longitude;
      console.log("[UpdateGPS] New position:", newLat, newLon);

      // Update ANR position
      const {
        error: updateError
      } = await supabase.from("anrs").update({
        latitude: newLat,
        longitude: newLon
      }).eq("id", anrData.id);
      if (updateError) throw updateError;

      // Calculate distance moved
      const oldLat = anrData.latitude;
      const oldLon = anrData.longitude;
      const distance = calculateDistance(oldLat, oldLon, newLat, newLon);
      setSuccess(true);
      toast({
        title: "✅ Position GPS mise à jour !",
        description: `Déplacement de ${Math.round(distance)} mètres`
      });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error: any) {
      console.error("[UpdateGPS] Error:", error);
      if (error.code === 1) {
        setErrorMessage("Vous devez autoriser l'accès à votre position GPS");
      } else if (error.code === 2) {
        setErrorMessage("Position GPS non disponible");
      } else if (error.code === 3) {
        setErrorMessage("La requête GPS a expiré, réessayez");
      } else {
        setErrorMessage(error.message || "Une erreur est survenue");
      }
    } finally {
      setLoading(false);
    }
  };

  // Haversine formula for distance calculation
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  const toRad = (deg: number): number => deg * (Math.PI / 180);
  const startQRScanner = async () => {
    try {
      setScanning(true);
      setErrorMessage(null);
      const scanner = new Html5Qrcode("qr-reader-gps");
      scannerRef.current = scanner;
      await scanner.start({
        facingMode: "environment"
      }, {
        fps: 10,
        qrbox: {
          width: 250,
          height: 250
        }
      }, decodedText => {
        scanner.stop().then(() => {
          setScanning(false);
          handleScan(decodedText);
        });
      }, () => {} // Ignore errors during scanning
      );
    } catch (error: any) {
      console.error("[UpdateGPS] Camera error:", error);
      setScanning(false);
      setErrorMessage("Impossible d'accéder à la caméra");
    }
  };
  const stopQRScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };
  const startNFCScanner = async () => {
    if (!("NDEFReader" in window)) {
      setErrorMessage("NFC non supporté sur cet appareil");
      return;
    }
    try {
      setScanning(true);
      setErrorMessage(null);
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      ndef.addEventListener("reading", ({
        message
      }: any) => {
        for (const record of message.records) {
          if (record.recordType === "text" || record.recordType === "url") {
            const decoder = new TextDecoder();
            const text = decoder.decode(record.data);
            setScanning(false);
            handleScan(text);
            return;
          }
        }
      });
      ndef.addEventListener("readingerror", () => {
        setErrorMessage("Erreur de lecture NFC");
        setScanning(false);
      });
    } catch (error: any) {
      console.error("[UpdateGPS] NFC error:", error);
      setScanning(false);
      if (error.name === "NotAllowedError") {
        setErrorMessage("Vous devez autoriser l'accès NFC");
      } else {
        setErrorMessage("Erreur NFC: " + error.message);
      }
    }
  };
  if (success) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-4 pb-20">
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Position mise à jour !</h1>
          <p className="text-muted-foreground">Redirection vers le dashboard...</p>
        </div>
        <BottomNav />
      </div>;
  }
  return <div className="min-h-screen pb-20">
      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 pt-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Actualiser la localisation de mon ANR   

  
 
   
 
          </h1>
            <p className="text-sm text-muted-foreground">Scan depuis l'emplacement du badge</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="glass-effect rounded-2xl p-4 card-shadow">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-1">Instructions :</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Placez-vous devant votre badge ANR installé</li>
                <li>Scannez le QR code ou la puce NFC</li>
                <li>La position GPS exacte sera enregistrée</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="flex gap-2">
          <Button variant={mode === "qr" ? "default" : "outline"} onClick={() => {
          stopQRScanner();
          setMode("qr");
        }} className="flex-1">
            <Camera className="w-4 h-4 mr-2" />
            QR Code
          </Button>
          <Button variant={mode === "nfc" ? "default" : "outline"} onClick={() => {
          stopQRScanner();
          setMode("nfc");
        }} className="flex-1">
            <Wifi className="w-4 h-4 mr-2" />
            NFC
          </Button>
        </div>

        {/* Error Message */}
        {errorMessage && <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
            {errorMessage}
          </div>}

        {/* Scanner Area */}
        <div className="glass-effect rounded-2xl p-4 card-shadow">
          {mode === "qr" ? <div className="space-y-4">
              <div id="qr-reader-gps" className="w-full aspect-square rounded-xl overflow-hidden bg-secondary" />
              
              {!scanning ? <Button onClick={startQRScanner} className="w-full" disabled={loading}>
                  {loading ? <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mise à jour en cours...
                    </> : <>
                      <Camera className="w-4 h-4 mr-2" />
                      Activer la caméra
                    </>}
                </Button> : <Button onClick={stopQRScanner} variant="outline" className="w-full">
                  Arrêter le scan
                </Button>}
            </div> : <div className="space-y-4">
              <div className="w-full aspect-square rounded-xl bg-secondary flex items-center justify-center">
                {scanning ? <div className="text-center space-y-4">
                    <Wifi className="w-16 h-16 text-primary mx-auto animate-pulse" />
                    <p className="text-muted-foreground">Approchez votre téléphone du badge NFC...</p>
                  </div> : <div className="text-center space-y-4">
                    <Wifi className="w-16 h-16 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">NFC prêt</p>
                  </div>}
              </div>
              
              {!scanning ? <Button onClick={startNFCScanner} className="w-full" disabled={loading}>
                  {loading ? <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mise à jour en cours...
                    </> : <>
                      <Wifi className="w-4 h-4 mr-2" />
                      Activer NFC
                    </>}
                </Button> : <Button onClick={() => setScanning(false)} variant="outline" className="w-full">
                  Arrêter le scan
                </Button>}
            </div>}
        </div>
      </div>
      
      <BottomNav />
    </div>;
};
export default UpdateGPS;