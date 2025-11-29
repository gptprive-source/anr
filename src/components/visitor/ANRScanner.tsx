import { useState } from "react";
import { QrCode, Nfc, Hash, ArrowRight, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import { supabase } from "@/integrations/supabase/client";
import { isWithinProximity, calculateDistance } from "@/lib/geocoding";

type ScanMode = "qr" | "nfc" | "manual";

const MAX_DISTANCE_METERS = 30;

const ANRScanner = () => {
  const [mode, setMode] = useState<ScanMode>("qr");
  const [anrCode, setAnrCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getCurrentPosition } = useGeolocation();

  const handleSubmit = async (code?: string) => {
    const targetCode = code || anrCode.trim();
    if (!targetCode) return;

    setLoading(true);
    try {
      // 1. Get visitor's current position
      const visitorPosition = await getCurrentPosition();

      // 2. Look up ANR in database
      const { data: anr, error } = await supabase
        .from("anrs")
        .select("id, latitude, longitude, address")
        .eq("code", targetCode)
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

      // 3. Check proximity
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

      // 4. Check if multi-habitat
      const { data: habitations } = await supabase
        .from("habitations")
        .select("id, name")
        .eq("anr_id", anr.id);

      if (habitations && habitations.length > 1) {
        // Multi-habitat: redirect to selector
        navigate(`/multi-habitat/${targetCode}`, { 
          state: { 
            visitorLat: visitorPosition.latitude, 
            visitorLon: visitorPosition.longitude 
          } 
        });
      } else {
        // Single habitat: go directly to call
        navigate(`/call/${targetCode}`, { 
          state: { 
            visitorLat: visitorPosition.latitude, 
            visitorLon: visitorPosition.longitude 
          } 
        });
      }
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Scanner l'ANR</h1>
          <p className="text-muted-foreground">
            Choisissez votre méthode pour contacter le résident
          </p>
        </div>

        {/* Proximity notice */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 mb-6">
          <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
          <p className="text-sm text-foreground">
            Vous devez être à moins de {MAX_DISTANCE_METERS}m de l'adresse pour appeler
          </p>
        </div>

        {/* Mode selector */}
        <div className="glass-effect rounded-2xl p-2 mb-6 flex gap-2">
          <ModeButton
            active={mode === "qr"}
            onClick={() => setMode("qr")}
            icon={<QrCode className="w-5 h-5" />}
            label="QR Code"
          />
          <ModeButton
            active={mode === "nfc"}
            onClick={() => setMode("nfc")}
            icon={<Nfc className="w-5 h-5" />}
            label="NFC"
          />
          <ModeButton
            active={mode === "manual"}
            onClick={() => setMode("manual")}
            icon={<Hash className="w-5 h-5" />}
            label="Numéro"
          />
        </div>

        {/* Content based on mode */}
        <div className="glass-effect rounded-2xl p-6 card-shadow">
          {mode === "qr" && <QRScannerContent onScan={handleSubmit} loading={loading} />}
          {mode === "nfc" && <NFCScannerContent loading={loading} />}
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
  );
};

const ModeButton = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center gap-2 py-3 px-4 rounded-xl transition-all ${
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
    }`}
  >
    {icon}
    <span className="text-xs font-medium">{label}</span>
  </button>
);

const QRScannerContent = ({ onScan, loading }: { onScan: (code: string) => void; loading: boolean }) => (
  <div className="text-center">
    <div className="relative w-64 h-64 mx-auto mb-6 rounded-2xl border-2 border-dashed border-primary/50 overflow-hidden bg-secondary/30">
      {/* Simulated scanner frame */}
      <div className="absolute inset-4 border-2 border-primary rounded-lg" />
      <div className="absolute inset-0 flex items-center justify-center">
        {loading ? (
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
        ) : (
          <QrCode className="w-16 h-16 text-muted-foreground/30" />
        )}
      </div>
      {/* Scan line animation */}
      {!loading && <div className="absolute left-4 right-4 h-0.5 bg-primary scan-line" />}
    </div>
    <p className="text-muted-foreground text-sm">
      Pointez la caméra vers le QR code sur le doming
    </p>
    {/* Demo button for testing */}
    <Button
      variant="outline"
      size="sm"
      className="mt-4"
      onClick={() => onScan("ANR-DEMO123")}
      disabled={loading}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
      Tester avec un code démo
    </Button>
  </div>
);

const NFCScannerContent = ({ loading }: { loading: boolean }) => (
  <div className="text-center py-8">
    <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center pulse-ring">
      {loading ? (
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
      ) : (
        <Nfc className="w-16 h-16 text-primary" />
      )}
    </div>
    <p className="text-muted-foreground text-sm">
      Approchez votre téléphone de la puce NFC sur le doming
    </p>
  </div>
);

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
        onChange={(e) => onChange(e.target.value)}
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
          Appeler
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </Button>
  </div>
);

export default ANRScanner;
