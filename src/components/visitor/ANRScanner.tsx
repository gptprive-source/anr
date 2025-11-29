import { useState } from "react";
import { QrCode, Nfc, Hash, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

type ScanMode = "qr" | "nfc" | "manual";

const ANRScanner = () => {
  const [mode, setMode] = useState<ScanMode>("qr");
  const [anrCode, setAnrCode] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (anrCode.trim()) {
      navigate(`/call/${anrCode.trim()}`);
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
          {mode === "qr" && <QRScannerContent />}
          {mode === "nfc" && <NFCScannerContent />}
          {mode === "manual" && (
            <ManualEntryContent
              value={anrCode}
              onChange={setAnrCode}
              onSubmit={handleSubmit}
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

const QRScannerContent = () => (
  <div className="text-center">
    <div className="relative w-64 h-64 mx-auto mb-6 rounded-2xl border-2 border-dashed border-primary/50 overflow-hidden bg-secondary/30">
      {/* Simulated scanner frame */}
      <div className="absolute inset-4 border-2 border-primary rounded-lg" />
      <div className="absolute inset-0 flex items-center justify-center">
        <QrCode className="w-16 h-16 text-muted-foreground/30" />
      </div>
      {/* Scan line animation */}
      <div className="absolute left-4 right-4 h-0.5 bg-primary scan-line" />
    </div>
    <p className="text-muted-foreground text-sm">
      Pointez la caméra vers le QR code sur le doming
    </p>
  </div>
);

const NFCScannerContent = () => (
  <div className="text-center py-8">
    <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center pulse-ring">
      <Nfc className="w-16 h-16 text-primary" />
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
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
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
      />
    </div>
    <Button
      variant="hero"
      className="w-full"
      onClick={onSubmit}
      disabled={!value.trim()}
    >
      Appeler
      <ArrowRight className="w-4 h-4" />
    </Button>
  </div>
);

export default ANRScanner;
