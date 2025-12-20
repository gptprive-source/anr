import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, QrCode, CheckCircle, Truck, User, Loader2, Wifi, WifiOff, RefreshCw, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useOfflineDelivery, DecryptedQrResult } from "@/hooks/useOfflineDelivery";
import { NFCProofScanner } from "@/components/carrier/NFCProofScanner";
import { PreparedParcel } from "@/lib/offlineStorage";
import { QRCodeSVG } from "qrcode.react";

type ScanMode = "identify" | "prepare" | "tour" | "nfc_scan" | "qr_display" | "success";

const DeliveryScan = () => {
  const navigate = useNavigate();
  const { latitude, longitude, getCurrentPosition } = useGeolocation();
  const { 
    isOnline, 
    activeRoute, 
    pendingProofsCount, 
    prepareRoute, 
    loadActiveRoute, 
    recordNfcUnlock, 
    isQrUnlocked, 
    getDecryptedQrToken,
    captureProof, 
    syncProofs 
  } = useOfflineDelivery();
  
  const [mode, setMode] = useState<ScanMode>("identify");
  const [driverId, setDriverId] = useState("");
  const [selectedParcel, setSelectedParcel] = useState<PreparedParcel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [qrUnlocked, setQrUnlocked] = useState(false);
  
  // État pour le QR déchiffré
  const [decryptedQr, setDecryptedQr] = useState<DecryptedQrResult>({ token: null });
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);

  useEffect(() => {
    const savedDriverId = localStorage.getItem("anr_driver_id");
    if (savedDriverId) {
      setDriverId(savedDriverId);
    }
  }, []);

  // Countdown timer pour l'expiration NFC
  useEffect(() => {
    if (mode === "qr_display" && countdownSeconds > 0) {
      const timer = setInterval(() => {
        setCountdownSeconds(prev => {
          if (prev <= 1) {
            // NFC expiré - retour au scan NFC
            toast.error('Délai NFC expiré - Rescannez le tag NFC');
            setMode("nfc_scan");
            setDecryptedQr({ token: null, error: 'Fenêtre de 10 minutes expirée' });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mode, countdownSeconds]);

  const handleIdentify = async () => {
    if (!driverId.trim()) {
      toast.error("Veuillez entrer votre identifiant");
      return;
    }
    localStorage.setItem("anr_driver_id", driverId.trim());
    getCurrentPosition();
    
    const existingRoute = await loadActiveRoute(driverId.trim());
    if (existingRoute && existingRoute.parcels.some(p => p.status === 'pending')) {
      setMode("tour");
    } else {
      setMode("prepare");
    }
    toast.success("Identifié: " + driverId);
  };

  const handlePrepareRoute = async () => {
    if (!isOnline) {
      toast.error("Connexion requise pour préparer la tournée");
      return;
    }
    setIsLoading(true);
    const route = await prepareRoute(driverId, []);
    setIsLoading(false);
    if (route) {
      setMode("tour");
    }
  };

  const handleSelectParcel = async (parcel: PreparedParcel) => {
    setSelectedParcel(parcel);
    setDecryptedQr({ token: null });
    setCountdownSeconds(0);
    
    const unlocked = await isQrUnlocked(parcel.parcel_id);
    setQrUnlocked(unlocked);
    
    if (unlocked) {
      // Tenter de déchiffrer le QR
      const result = await getDecryptedQrToken(parcel.parcel_id);
      if (result.token) {
        setDecryptedQr(result);
        setCountdownSeconds(result.remainingSeconds || 0);
        setMode("qr_display");
      } else {
        // NFC expiré ou invalide - forcer rescan
        setMode("nfc_scan");
      }
    } else {
      setMode("nfc_scan");
    }
  };

  const handleNfcUnlock = async (nfcData: { serial: string; anrCode: string; timestamp: string }) => {
    if (!selectedParcel) return;
    
    const success = await recordNfcUnlock(
      selectedParcel.parcel_id,
      nfcData.serial,
      nfcData.anrCode,
      latitude && longitude ? { lat: latitude, lng: longitude } : undefined
    );
    
    if (success) {
      // Tenter immédiatement le déchiffrement
      const result = await getDecryptedQrToken(selectedParcel.parcel_id);
      
      if (result.token) {
        setDecryptedQr(result);
        setCountdownSeconds(result.remainingSeconds || 600); // 10 minutes par défaut
        setQrUnlocked(true);
        setMode("qr_display");
      } else {
        // Erreur de déchiffrement - ne devrait pas arriver après un NFC valide
        toast.error(result.error || "Erreur de déchiffrement inattendue");
        setDecryptedQr(result);
      }
    }
  };

  const handleNfcMismatch = (scanned: string, expected: string) => {
    toast.error(`Mauvaise adresse! Scanné: ${scanned}, Attendu: ${expected}`);
  };

  const handleDeliveryComplete = async () => {
    if (!selectedParcel || !activeRoute) return;
    
    // captureProof gère désormais tout en interne (déchiffrement + validation)
    const success = await captureProof(
      selectedParcel.parcel_id,
      selectedParcel.tracking_number,
      driverId,
      latitude && longitude ? { lat: latitude, lng: longitude } : undefined
    );
    
    if (success) {
      setMode("success");
    }
  };

  const handleSync = async () => {
    await syncProofs();
  };

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              <CardDescription>Entrez votre identifiant livreur</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Identifiant</Label>
                <Input placeholder="Ex: LIVREUR-001" value={driverId} onChange={(e) => setDriverId(e.target.value)} className="text-center text-lg" />
              </div>
              <Button onClick={handleIdentify} className="w-full" size="lg">Commencer</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Prepare route screen
  if (mode === "prepare") {
    return (
      <div className="min-h-screen bg-background">
        <Header driverId={driverId} isOnline={isOnline} pendingCount={pendingProofsCount} onBack={() => setMode("identify")} />
        <main className="p-4 max-w-md mx-auto mt-4">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle>Préparer la tournée</CardTitle>
              <CardDescription>Téléchargez les QR codes chiffrés pour travailler hors-ligne</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isOnline && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  <WifiOff className="w-4 h-4 inline mr-2" />
                  Connexion requise pour préparer la tournée
                </div>
              )}
              <Button onClick={handlePrepareRoute} disabled={!isOnline || isLoading} className="w-full" size="lg">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {isLoading ? "Chargement..." : "Charger la tournée"}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Tour mode - list parcels
  if (mode === "tour") {
    const pendingParcels = activeRoute?.parcels.filter(p => p.status === 'pending') || [];
    const deliveredParcels = activeRoute?.parcels.filter(p => p.status === 'delivered') || [];

    return (
      <div className="min-h-screen bg-background">
        <Header driverId={driverId} isOnline={isOnline} pendingCount={pendingProofsCount} onBack={() => setMode("identify")} onSync={handleSync} />
        <main className="p-4 max-w-md mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">Colis à livrer ({pendingParcels.length})</h2>
            {pendingProofsCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <RefreshCw className="w-3 h-3" /> {pendingProofsCount} à sync
              </Badge>
            )}
          </div>
          
          {pendingParcels.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun colis en attente</CardContent></Card>
          ) : (
            pendingParcels.map(parcel => (
              <Card key={parcel.parcel_id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleSelectParcel(parcel)}>
                <CardContent className="py-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono font-medium">{parcel.tracking_number}</p>
                      <p className="text-sm text-muted-foreground">{parcel.recipient_name}</p>
                      <p className="text-xs text-muted-foreground">{parcel.recipient_address}</p>
                    </div>
                    <Badge>{parcel.expected_anr_code}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {deliveredParcels.length > 0 && (
            <>
              <h2 className="font-semibold text-green-700 mt-6">Livrés ({deliveredParcels.length})</h2>
              {deliveredParcels.map(parcel => (
                <Card key={parcel.parcel_id} className="bg-green-50 border-green-200">
                  <CardContent className="py-3">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-sm">{parcel.tracking_number}</span>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </main>
      </div>
    );
  }

  // NFC Scan screen
  if (mode === "nfc_scan" && selectedParcel) {
    return (
      <div className="min-h-screen bg-background">
        <Header driverId={driverId} isOnline={isOnline} pendingCount={pendingProofsCount} onBack={() => setMode("tour")} />
        <main className="p-4 max-w-md mx-auto mt-4 space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-3">
              <p className="text-sm font-medium text-blue-900">{selectedParcel.tracking_number}</p>
              <p className="text-xs text-blue-700">{selectedParcel.recipient_name} - {selectedParcel.expected_anr_code}</p>
            </CardContent>
          </Card>
          
          <NFCProofScanner
            expectedAnrCode={selectedParcel.expected_anr_code}
            onUnlock={handleNfcUnlock}
            onMismatch={handleNfcMismatch}
            onCancel={() => setMode("tour")}
          />
        </main>
      </div>
    );
  }

  // QR Display screen (after NFC unlock)
  if (mode === "qr_display" && selectedParcel) {
    // SÉCURITÉ: Si pas de QR déchiffré, bloquer l'affichage
    if (!decryptedQr.token) {
      return (
        <div className="min-h-screen bg-background">
          <Header driverId={driverId} isOnline={isOnline} pendingCount={pendingProofsCount} onBack={() => setMode("tour")} />
          <main className="p-4 max-w-md mx-auto mt-4 space-y-4">
            <Card className="bg-red-50 border-red-300">
              <CardContent className="py-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
                <h3 className="font-bold text-red-900 mb-2">QR Non Disponible</h3>
                <p className="text-sm text-red-700 mb-4">
                  {decryptedQr.error || "Scan NFC requis pour déverrouiller le QR"}
                </p>
                <Button onClick={() => setMode("nfc_scan")} variant="destructive" className="w-full">
                  Scanner le tag NFC
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background">
        <Header driverId={driverId} isOnline={isOnline} pendingCount={pendingProofsCount} onBack={() => setMode("tour")} />
        <main className="p-4 max-w-md mx-auto mt-4 space-y-4">
          <Card className="bg-green-50 border-green-300">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">NFC validé - QR déverrouillé</p>
                    <p className="text-sm text-green-700">{selectedParcel.expected_anr_code}</p>
                  </div>
                </div>
                {countdownSeconds > 0 && (
                  <div className="flex items-center gap-1 text-orange-600 bg-orange-100 px-2 py-1 rounded">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono text-sm">{formatCountdown(countdownSeconds)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Faites scanner par le destinataire</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="bg-white p-4 rounded-lg border-2 border-dashed mb-4 flex justify-center">
                <QRCodeSVG 
                  value={decryptedQr.token} 
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Le destinataire doit scanner ce QR pour confirmer la réception
              </p>
              <Button onClick={handleDeliveryComplete} className="w-full" size="lg">
                Confirmer la livraison
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Success screen
  if (mode === "success") {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-green-600 text-white p-4 shadow-md">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <CheckCircle className="w-6 h-6" />
            <h1 className="text-xl font-semibold">Livraison confirmée</h1>
          </div>
        </header>
        <main className="p-4 max-w-md mx-auto mt-8">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="py-8 text-center">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-green-900 mb-2">Preuve composite enregistrée</h2>
              <p className="text-green-700 text-sm mb-1">NFC + QR = Preuve juridique</p>
              <p className="text-green-600 text-xs mb-4">
                {isOnline ? "Synchronisée avec le serveur" : "Sera synchronisée au retour du réseau"}
              </p>
              <Button onClick={() => { setSelectedParcel(null); setQrUnlocked(false); setDecryptedQr({ token: null }); setMode("tour"); }} className="w-full" size="lg">
                Colis suivant
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return null;
};

// Header component
const Header = ({ driverId, isOnline, pendingCount, onBack, onSync }: { 
  driverId: string; 
  isOnline: boolean; 
  pendingCount: number;
  onBack: () => void;
  onSync?: () => void;
}) => (
  <header className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
    <div className="flex items-center justify-between max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-primary-foreground hover:bg-primary-foreground/10">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          <span className="font-medium">{driverId}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isOnline ? <Wifi className="w-4 h-4 text-green-300" /> : <WifiOff className="w-4 h-4 text-red-300" />}
        {pendingCount > 0 && onSync && (
          <Button variant="ghost" size="sm" onClick={onSync} className="text-primary-foreground hover:bg-primary-foreground/10 gap-1">
            <RefreshCw className="w-4 h-4" />
            {pendingCount}
          </Button>
        )}
      </div>
    </div>
  </header>
);

export default DeliveryScan;
