import { useState } from "react";
import { QrCode, Users, Settings, History, Bell, Shield, MapPin, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ResidentDashboard = () => {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  
  // Mock data
  const anrData = {
    code: "ANR-847293",
    address: "12 Rue des Lilas, 75011 Paris",
    residents: [
      { name: "Jean Dupont", phone: "+33 6 12 34 56 78", isOwner: true },
      { name: "Marie Dupont", phone: "+33 6 98 76 54 32", isOwner: false },
    ],
    isMultiHabitat: false,
    gpsSet: true,
  };

  const copyCode = () => {
    navigator.clipboard.writeText(anrData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mon ANR</h1>
            <p className="text-muted-foreground">{anrData.address}</p>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* ANR Card */}
        <div className="glass-effect rounded-3xl p-6 card-shadow">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* QR Code display */}
            <div className="w-40 h-40 rounded-2xl bg-foreground p-3 flex-shrink-0">
              <div className="w-full h-full rounded-lg bg-background flex items-center justify-center">
                <QrCode className="w-24 h-24 text-foreground" />
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="text-2xl font-mono font-bold tracking-wider">{anrData.code}</span>
                <Button variant="ghost" size="sm" onClick={copyCode}>
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Validé
                </span>
                {anrData.gpsSet && (
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    GPS configuré
                  </span>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                Partagez ce code avec vos visiteurs ou commandez votre doming officiel
              </p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction
            icon={<Users className="w-6 h-6" />}
            label="Résidents"
            count={anrData.residents.length}
            onClick={() => {}}
          />
          <QuickAction
            icon={<History className="w-6 h-6" />}
            label="Historique"
            onClick={() => {}}
          />
          <QuickAction
            icon={<Bell className="w-6 h-6" />}
            label="Notifications"
            onClick={() => {}}
          />
          <QuickAction
            icon={<MapPin className="w-6 h-6" />}
            label="Position GPS"
            onClick={() => {}}
          />
        </div>

        {/* Residents list */}
        <div className="glass-effect rounded-2xl p-6 card-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Résidents ({anrData.residents.length}/5)</h2>
            <Button variant="outline" size="sm">
              Ajouter
            </Button>
          </div>
          
          <div className="space-y-3">
            {anrData.residents.map((resident, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="font-semibold text-primary">
                      {resident.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{resident.name}</p>
                    <p className="text-sm text-muted-foreground">{resident.phone}</p>
                  </div>
                </div>
                {resident.isOwner && (
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                    Propriétaire
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Test call button */}
        <Button 
          variant="hero" 
          className="w-full" 
          size="lg"
          onClick={() => navigate("/call/test?resident=true")}
        >
          Simuler un appel entrant
        </Button>
      </div>
    </div>
  );
};

const QuickAction = ({
  icon,
  label,
  count,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="glass-effect rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-primary/30 transition-colors"
  >
    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
      {icon}
    </div>
    <span className="text-sm font-medium">{label}</span>
    {count !== undefined && (
      <span className="text-xs text-muted-foreground">{count}</span>
    )}
  </button>
);

export default ResidentDashboard;
