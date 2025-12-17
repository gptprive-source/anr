import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Package, QrCode, Nfc, Check, X, Loader2, MapPin, Camera, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRelayPoint } from "@/hooks/useRelayPoint";
import { useParcels } from "@/hooks/useParcels";
import { useParcelProof } from "@/hooks/useParcelProof";
import { Html5Qrcode } from "html5-qrcode";

type ScanMode = 'deposit' | 'pickup';

const ParcelScan = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get('mode') as ScanMode) || 'deposit';
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { relayPoint } = useRelayPoint();
  const { relayParcels, updateParcelStatus } = useParcels({ relayPointId: relayPoint?.id });
  const { generating, generateProof } = useParcelProof();

  const [step, setStep] = useState<'select' | 'scan' | 'confirm'>('select');
  const [selectedParcels, setSelectedParcels] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanMethod, setScanMethod] = useState<'qr' | 'nfc'>('qr');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Filter parcels based on mode
  const availableParcels = relayParcels?.filter(p => {
    if (mode === 'deposit') {
      return p.status === 'in_transit';
    } else {
      return ['deposited_at_relay', 'available_for_pickup'].includes(p.status);
    }
  }) || [];

  const toggleParcel = (parcelId: string) => {
    setSelectedParcels(prev => 
      prev.includes(parcelId) 
        ? prev.filter(id => id !== parcelId)
        : [...prev, parcelId]
    );
  };

  const startScanning = () => {
    if (selectedParcels.length === 0) {
      toast({
        title: "Sélectionnez des colis",
        description: "Veuillez sélectionner au moins un colis",
        variant: "destructive"
      });
      return;
    }
    setStep('scan');
  };

  // QR Scanner
  const initQrScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode("parcel-qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          console.log("[ParcelScan] QR decoded:", decodedText);
          stopScanning();
          handleScanComplete('qr');
        },
        () => {}
      );
      setScanning(true);
    } catch (err: any) {
      console.error("[ParcelScan] QR error:", err);
      toast({
        title: "Erreur caméra",
        description: err.message || "Impossible d'accéder à la caméra",
        variant: "destructive"
      });
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.log("[ParcelScan] Stop error:", e);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // NFC Scanner
  const startNfcScan = async () => {
    if (!("NDEFReader" in window)) {
      toast({
        title: "NFC non supporté",
        description: "Utilisez le scanner QR",
        variant: "destructive"
      });
      return;
    }

    setScanning(true);
    try {
      // @ts-ignore
      const ndef = new NDEFReader();
      await ndef.scan();
      
      ndef.addEventListener("reading", () => {
        setScanning(false);
        handleScanComplete('nfc');
      });
    } catch (err: any) {
      setScanning(false);
      toast({
        title: "Erreur NFC",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  const handleScanComplete = (method: 'qr' | 'nfc') => {
    setScanMethod(method);
    setStep('confirm');
  };

  const confirmOperation = async () => {
    if (!relayPoint || !user) return;
    
    setProcessing(true);
    try {
      for (const parcelId of selectedParcels) {
        // Generate proof
        await generateProof({
          parcelId,
          proofType: mode === 'deposit' ? 'deposit' : 'pickup',
          actorType: 'relay',
          actorId: relayPoint.id,
          actorName: relayPoint.display_name,
          scanMethod,
          notes
        });

        // Update parcel status
        const newStatus = mode === 'deposit' ? 'deposited_at_relay' : 'delivered';
        await updateParcelStatus({ parcelId, status: newStatus });
      }

      toast({
        title: mode === 'deposit' ? "Dépôt confirmé" : "Retrait confirmé",
        description: `${selectedParcels.length} colis traité(s) avec preuve horodatée`
      });

      navigate('/relay');
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/relay')} className="text-primary-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">
              {mode === 'deposit' ? 'Réception colis' : 'Remise colis'}
            </h1>
            <p className="text-sm text-primary-foreground/70">
              {step === 'select' && 'Sélectionnez les colis'}
              {step === 'scan' && 'Scannez le badge'}
              {step === 'confirm' && 'Confirmez l\'opération'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Step 1: Select parcels */}
        {step === 'select' && (
          <>
            {availableParcels.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {mode === 'deposit' 
                      ? "Aucun colis en attente de dépôt"
                      : "Aucun colis disponible pour retrait"
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {selectedParcels.length} / {availableParcels.length} sélectionné(s)
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (selectedParcels.length === availableParcels.length) {
                        setSelectedParcels([]);
                      } else {
                        setSelectedParcels(availableParcels.map(p => p.id));
                      }
                    }}
                  >
                    {selectedParcels.length === availableParcels.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </Button>
                </div>

                {availableParcels.map(parcel => (
                  <Card 
                    key={parcel.id} 
                    className={`cursor-pointer transition-all ${
                      selectedParcels.includes(parcel.id) ? 'border-primary ring-2 ring-primary/20' : ''
                    }`}
                    onClick={() => toggleParcel(parcel.id)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <Checkbox 
                        checked={selectedParcels.includes(parcel.id)}
                        onCheckedChange={() => toggleParcel(parcel.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{parcel.tracking_number}</p>
                        <p className="text-sm text-muted-foreground">{parcel.recipient_name}</p>
                      </div>
                      <Badge variant="outline">{parcel.parcel_type}</Badge>
                    </CardContent>
                  </Card>
                ))}

                <Button 
                  className="w-full" 
                  onClick={startScanning}
                  disabled={selectedParcels.length === 0}
                >
                  Continuer ({selectedParcels.length} colis)
                </Button>
              </>
            )}
          </>
        )}

        {/* Step 2: Scan badge */}
        {step === 'scan' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Scanner le badge relais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode selector */}
              <div className="flex gap-2">
                <Button
                  variant={scanMethod === 'qr' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => {
                    setScanMethod('qr');
                    stopScanning();
                  }}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Code
                </Button>
                <Button
                  variant={scanMethod === 'nfc' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => {
                    setScanMethod('nfc');
                    stopScanning();
                  }}
                >
                  <Nfc className="w-4 h-4 mr-2" />
                  NFC
                </Button>
              </div>

              {/* Scanner area */}
              <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary/30">
                {scanMethod === 'qr' ? (
                  <>
                    <div id="parcel-qr-reader" className="w-full h-full" />
                    {!scanning && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Camera className="w-16 h-16 text-muted-foreground mb-4" />
                        <Button onClick={initQrScanner}>
                          <Camera className="w-4 h-4 mr-2" />
                          Activer la caméra
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${
                      scanning ? 'bg-primary/20 animate-pulse' : 'bg-primary/10'
                    }`}>
                      <Nfc className="w-12 h-12 text-primary" />
                    </div>
                    {scanning ? (
                      <p className="text-primary animate-pulse">Approchez le badge NFC...</p>
                    ) : (
                      <Button onClick={startNfcScan}>
                        <Nfc className="w-4 h-4 mr-2" />
                        Activer NFC
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {scanning && (
                <Button variant="outline" className="w-full" onClick={stopScanning}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              )}

              <Button variant="ghost" className="w-full" onClick={() => setStep('select')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la sélection
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                Confirmer l'opération
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-center">
                  <strong>{selectedParcels.length}</strong> colis seront{' '}
                  {mode === 'deposit' ? 'déposés' : 'remis'} avec preuve horodatée et géolocalisée
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Position GPS incluse dans la preuve</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {scanMethod === 'qr' ? <QrCode className="w-4 h-4" /> : <Nfc className="w-4 h-4" />}
                <span>Scan {scanMethod.toUpperCase()} validé</span>
              </div>

              <Textarea
                placeholder="Notes optionnelles..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setStep('scan')}
                  disabled={processing}
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
                <Button 
                  className="flex-1"
                  onClick={confirmOperation}
                  disabled={processing || generating}
                >
                  {processing || generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Confirmer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ParcelScan;
