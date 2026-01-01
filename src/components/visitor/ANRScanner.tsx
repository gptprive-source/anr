import { useState, useEffect, useRef } from "react";
import { QrCode, Nfc, Hash, ArrowRight, Loader2, MapPin, Camera, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isWithinProximity, calculateDistance } from "@/lib/geocoding";
import { Html5Qrcode } from "html5-qrcode";

type ScanMode = "qr" | "nfc" | "manual";

const MAX_DISTANCE_METERS = 30;

// Mode test pour le développement
const DEV_MODE = true;

// Fonction pour extraire le code ANR d'une URL ou retourner le code tel quel
const extractAnrCode = (input: string): string => {
  // Si c'est une URL ANR, extraire le code (ex: https://anr.lovable.app/anr/ANR-123456)
  const urlMatch = input.match(/\/anr\/([A-Z0-9-]+)/i);
  if (urlMatch) {
    return urlMatch[1].toUpperCase();
  }
  // Sinon retourner le code tel quel (nettoyé)
  return input.trim().toUpperCase();
};

const ANRScanner = () => {
  const [mode, setMode] = useState<ScanMode>("qr");
  const [anrCode, setAnrCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [testMode, setTestMode] = useState(DEV_MODE);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getCurrentPosition } = useGeolocation();
  const { user, loading: authLoading } = useAuth();

  // Check if visitor needs to login or complete business card
  useEffect(() => {
    const checkVisitorStatus = async () => {
      if (authLoading) return;
      
      if (!user) {
        // Visitor not logged in - redirect to visitor login
        navigate("/visitor-login?redirect=/visitor", { replace: true });
        return;
      }

      // Check if business card is complete
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_card_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.business_card_completed) {
        // Business card not complete - redirect to visitor card
        navigate("/visitor-card?redirect=/visitor", { replace: true });
        return;
      }

      setCheckingAuth(false);
    };

    checkVisitorStatus();
  }, [user, authLoading, navigate]);

  const handleSubmit = async (code?: string) => {
    const targetCode = code || anrCode.trim();
    if (!targetCode) return;

    setLoading(true);
    try {
      let visitorPosition = { latitude: 0, longitude: 0 };

      // En mode test, on skip la vérification GPS
      if (!testMode) {
        visitorPosition = await getCurrentPosition();
      }

      // Look up ANR in database (case-insensitive)
      const { data: anr, error } = await supabase
        .from("anrs")
        .select("id, latitude, longitude, address")
        .ilike("code", targetCode)
        .maybeSingle();

      if (error) throw error;

      if (!anr) {
        toast({
          title: "ANR non trouvé",
          description: "Ce code ANR n'existe pas. Vérifiez le code.",
          variant: "destructive",
        });
        return;
      }

      // Check proximity (skip in test mode)
      if (!testMode) {
        const anrLat = Number(anr.latitude);
        const anrLon = Number(anr.longitude);
        const distance = calculateDistance(
          visitorPosition.latitude,
          visitorPosition.longitude,
          anrLat,
          anrLon
        );

        if (!isWithinProximity(visitorPosition.latitude, visitorPosition.longitude, anrLat, anrLon, MAX_DISTANCE_METERS)) {
          toast({
            title: "Trop éloigné",
            description: `Vous êtes à ${Math.round(distance)}m de l'adresse. Approchez-vous à moins de ${MAX_DISTANCE_METERS}m pour utiliser l'interphone.`,
            variant: "destructive",
          });
          return;
        }
      }

      // Redirect to ANRLanding page which shows navigation/call options
      navigate(`/anr/${targetCode}`, { 
        state: { 
          visitorLat: visitorPosition.latitude, 
          visitorLon: visitorPosition.longitude 
        } 
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de vérifier votre position",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading || checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-20 bg-background">
      {/* Blue Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-xl font-bold">Scanner l'ANR</h1>
          <p className="text-sm text-primary-foreground/70">
            Choisissez votre méthode pour contacter le résident
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Proximity notice */}
        {!testMode && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 mb-6">
            <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-sm text-foreground">
              Vous devez être à moins de {MAX_DISTANCE_METERS}m de l'adresse pour appeler
            </p>
          </div>
        )}

        {/* Mode selector */}
        <div className="glass-effect rounded-2xl p-2 mb-6 flex gap-2 border border-primary">
          <ModeButton
            active={mode === "qr"}
            onClick={() => setMode("qr")}
            icon={<QrCode className="w-5 h-5" />}
            label="QR Code"
            color="blue"
          />
          <ModeButton
            active={mode === "nfc"}
            onClick={() => setMode("nfc")}
            icon={<Nfc className="w-5 h-5" />}
            label="NFC"
            color="orange"
          />
          <ModeButton
            active={mode === "manual"}
            onClick={() => setMode("manual")}
            icon={<Hash className="w-5 h-5" />}
            label="Numéro"
            color="green"
          />
        </div>

        {/* Content based on mode */}
        <div className={`glass-effect rounded-2xl p-6 card-shadow border ${
          mode === "qr" ? "border-blue-500" : mode === "nfc" ? "border-orange-500" : "border-green-500"
        }`}>
          {mode === "qr" && <QRScannerContent onScan={handleSubmit} loading={loading} />}
          {mode === "nfc" && <NFCScannerContent onScan={handleSubmit} loading={loading} />}
          {mode === "manual" && (
            <ManualEntryContent
              value={anrCode}
              onChange={setAnrCode}
              onSubmit={() => handleSubmit()}
              loading={loading}
            />
          )}
        </div>
      </div>
      </div>

      {/* Test mode toggle - fixed at bottom */}
      {DEV_MODE && (
        <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto">
          <div className="flex items-center justify-between p-3 rounded-xl bg-warning/10 border border-warning/20 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-sm">Mode test (sans GPS)</span>
            </div>
            <Switch checked={testMode} onCheckedChange={setTestMode} />
          </div>
        </div>
      )}
    </div>
  );
};

const ModeButton = ({
  active,
  onClick,
  icon,
  label,
  color = "blue",
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color?: "blue" | "orange" | "green";
}) => {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-500",
    orange: "bg-orange-500/10 text-orange-500",
    green: "bg-green-500/10 text-green-500",
  };
  
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-2 py-3 px-4 rounded-xl transition-all ${
        active
          ? "bg-primary text-primary-foreground"
          : `${colorClasses[color]} hover:opacity-80`
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

const QRScannerContent = ({ onScan, loading }: { onScan: (code: string) => void; loading: boolean }) => {
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const initScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          console.log("[QR Scanner] Decoded:", decodedText);
          const anrCode = extractAnrCode(decodedText);
          console.log("[QR Scanner] Extracted ANR code:", anrCode);
          stopScanning();
          onScan(anrCode);
        },
        () => {
          // Ignore continuous scan errors
        }
      );
      setCameraReady(true);
    } catch (err: any) {
      console.error("[QR Scanner] Error:", err);
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
    if (scanning && !scannerRef.current) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        initScanner();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scanning]);

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.log("[QR Scanner] Stop error:", e);
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setCameraReady(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="text-center">
      <div 
        className="relative w-full aspect-square max-w-[300px] mx-auto mb-6 rounded-2xl overflow-hidden bg-secondary/30"
      >
        {scanning ? (
          <>
            <div id="qr-reader" className="w-full h-full" />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-primary/50 rounded-2xl">
            {loading ? (
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
            ) : (
              <>
                <Camera className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Appuyez pour scanner
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {!scanning ? (
        <Button onClick={startScanning} disabled={loading} variant="hero">
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
  );
};

const NFCScannerContent = ({ onScan, loading }: { onScan: (code: string) => void; loading: boolean }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if NFC is supported
    const isSupported = "NDEFReader" in window;
    setSupported(isSupported);
    console.log("[NFC] Supported:", isSupported);
  }, []);

  const startNFCScan = async () => {
    if (!("NDEFReader" in window)) {
      setError("NFC non supporté sur cet appareil");
      return;
    }

    setError(null);
    setScanning(true);

    try {
      // @ts-ignore - NDEFReader is not in TypeScript types yet
      const ndef = new NDEFReader();
      await ndef.scan();
      console.log("[NFC] Scan started");

      ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
        console.log("[NFC] Tag read:", serialNumber);
        
        // Try to find ANR code in records
        for (const record of message.records) {
          if (record.recordType === "text") {
            const decoder = new TextDecoder(record.encoding);
            const text = decoder.decode(record.data);
            console.log("[NFC] Text record:", text);
            
            // Check if it looks like an ANR code
            if (text.includes("ANR") || text.startsWith("ANR-")) {
              setScanning(false);
              onScan(text);
              return;
            }
          }
          if (record.recordType === "url") {
            const decoder = new TextDecoder();
            const url = decoder.decode(record.data);
            console.log("[NFC] URL record:", url);
            
            // Extract ANR code from URL
            const match = url.match(/ANR-[A-Z0-9]+/i);
            if (match) {
              setScanning(false);
              onScan(match[0]);
              return;
            }
          }
        }
        
        // If no ANR found, use serial number
        setScanning(false);
        onScan(`NFC-${serialNumber}`);
      });

      ndef.addEventListener("readingerror", () => {
        console.log("[NFC] Read error");
        setError("Erreur de lecture NFC");
      });
    } catch (err: any) {
      console.error("[NFC] Error:", err);
      setScanning(false);
      if (err.name === "NotAllowedError") {
        setError("Accès NFC refusé. Veuillez autoriser l'accès.");
      } else {
        setError(err.message || "Erreur NFC");
      }
    }
  };

  if (supported === false) {
    return (
      <div className="text-center py-8">
        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
          <Nfc className="w-16 h-16 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          NFC non disponible sur cet appareil
        </p>
        <p className="text-xs text-muted-foreground">
          Utilisez le scanner QR ou entrez le numéro manuellement
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className={`w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center ${
        scanning ? "bg-primary/20 pulse-ring" : "bg-primary/10"
      }`}>
        {loading ? (
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
        ) : (
          <Nfc className={`w-16 h-16 ${scanning ? "text-primary" : "text-primary/70"}`} />
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {scanning ? (
        <p className="text-primary font-medium animate-pulse">
          Approchez votre téléphone de la puce NFC...
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Appuyez pour activer le lecteur NFC
          </p>
          <Button onClick={startNFCScan} disabled={loading} variant="hero">
            <Nfc className="w-4 h-4 mr-2" />
            Activer NFC
          </Button>
        </div>
      )}
    </div>
  );
};

const ManualEntryContent = ({
  value,
  onChange,
  onSubmit,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) => (
  <div className="space-y-4">
    <div>
      <label className="text-sm font-medium mb-2 block">
        Numéro d'identification ANR
      </label>
      <Input
        placeholder="Ex: ANR-123456"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="text-center text-lg tracking-wider"
        disabled={loading}
      />
    </div>
    <Button
      variant="hero"
      className="w-full"
      onClick={onSubmit}
      disabled={!value.trim() || loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          Accéder
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </Button>
  </div>
);

export default ANRScanner;
