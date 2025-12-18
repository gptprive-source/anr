import { useState, useEffect, useCallback } from 'react';
import { Nfc, CheckCircle, XCircle, Loader2, Smartphone, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface NFCProofScannerProps {
  expectedAnrCode: string;
  onUnlock: (nfcData: {
    serial: string;
    anrCode: string;
    timestamp: string;
  }) => void;
  onMismatch: (scannedCode: string, expectedCode: string) => void;
  onCancel: () => void;
}

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error' | 'mismatch';

export const NFCProofScanner = ({
  expectedAnrCode,
  onUnlock,
  onMismatch,
  onCancel
}: NFCProofScannerProps) => {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<{ serial: string; anrCode: string } | null>(null);
  const [isNfcSupported, setIsNfcSupported] = useState<boolean | null>(null);

  // Check NFC support
  useEffect(() => {
    const checkNfcSupport = () => {
      if ('NDEFReader' in window) {
        setIsNfcSupported(true);
      } else {
        setIsNfcSupported(false);
      }
    };
    checkNfcSupport();
  }, []);

  const extractAnrCode = (records: any[]): string | null => {
    for (const record of records) {
      if (record.recordType === 'text') {
        const textDecoder = new TextDecoder();
        const text = textDecoder.decode(record.data);
        // Look for ANR code pattern
        const match = text.match(/ANR[A-Z0-9-]+/i);
        if (match) return match[0].toUpperCase();
      }
      if (record.recordType === 'url') {
        const textDecoder = new TextDecoder();
        const url = textDecoder.decode(record.data);
        // Extract from URL pattern /anr/CODE
        const match = url.match(/\/anr\/([A-Z0-9-]+)/i);
        if (match) return match[1].toUpperCase();
      }
    }
    return null;
  };

  const startScanning = useCallback(async () => {
    if (!isNfcSupported) {
      setError('NFC non supporté sur cet appareil');
      setStatus('error');
      return;
    }

    setStatus('scanning');
    setError(null);
    setScannedData(null);

    try {
      // @ts-ignore - NDEFReader is not in TypeScript types yet
      const ndef = new NDEFReader();
      await ndef.scan();

      ndef.onreading = (event: any) => {
        const { serialNumber, message } = event;
        
        // Extract ANR code from NFC records
        const anrCode = extractAnrCode(message.records);
        
        if (!anrCode) {
          setError('Code ANR non trouvé sur le tag NFC');
          setStatus('error');
          return;
        }

        setScannedData({
          serial: serialNumber || 'unknown',
          anrCode
        });

        // Verify ANR code matches expected
        if (anrCode.toUpperCase() === expectedAnrCode.toUpperCase()) {
          setStatus('success');
          
          // Vibrate on success
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }

          // Notify parent
          onUnlock({
            serial: serialNumber || 'unknown',
            anrCode: anrCode.toUpperCase(),
            timestamp: new Date().toISOString()
          });
        } else {
          setStatus('mismatch');
          
          // Vibrate on error
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
          }

          onMismatch(anrCode, expectedAnrCode);
        }
      };

      ndef.onreadingerror = () => {
        setError('Erreur de lecture NFC');
        setStatus('error');
      };
    } catch (err: any) {
      console.error('NFC error:', err);
      
      if (err.name === 'NotAllowedError') {
        setError('Permission NFC refusée. Autorisez l\'accès NFC.');
      } else if (err.name === 'NotSupportedError') {
        setError('NFC non supporté sur cet appareil');
      } else {
        setError(err.message || 'Erreur NFC');
      }
      setStatus('error');
    }
  }, [isNfcSupported, expectedAnrCode, onUnlock, onMismatch]);

  // Auto-start scanning on mount
  useEffect(() => {
    if (isNfcSupported === true) {
      startScanning();
    }
  }, [isNfcSupported, startScanning]);

  // Render based on NFC support
  if (isNfcSupported === null) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="py-8 text-center">
          <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Vérification NFC...</p>
        </CardContent>
      </Card>
    );
  }

  if (isNfcSupported === false) {
    return (
      <Card className="border-2 border-destructive/50 bg-destructive/5">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h3 className="font-semibold text-destructive mb-2">NFC non disponible</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Votre appareil ne supporte pas le NFC ou l'accès est bloqué.
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Le NFC est requis pour valider votre présence physique.
          </p>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 transition-colors ${
      status === 'scanning' ? 'border-primary animate-pulse' :
      status === 'success' ? 'border-green-500 bg-green-50' :
      status === 'mismatch' ? 'border-orange-500 bg-orange-50' :
      status === 'error' ? 'border-destructive bg-destructive/5' :
      'border-dashed'
    }`}>
      <CardContent className="py-8 text-center">
        {status === 'idle' && (
          <>
            <Nfc className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Scanner le tag NFC ANR</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Approchez votre téléphone du tag NFC de l'adresse
            </p>
            <Button onClick={startScanning}>
              Commencer le scan
            </Button>
          </>
        )}

        {status === 'scanning' && (
          <>
            <div className="relative w-24 h-24 mx-auto mb-4">
              <Smartphone className="w-24 h-24 text-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            <h3 className="font-semibold text-primary mb-2">Scan NFC en cours...</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Approchez votre téléphone du tag NFC
            </p>
            <p className="text-xs text-muted-foreground">
              ANR attendu: <span className="font-mono font-bold">{expectedAnrCode}</span>
            </p>
            <Button variant="outline" onClick={onCancel} className="mt-4">
              Annuler
            </Button>
          </>
        )}

        {status === 'success' && scannedData && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h3 className="font-semibold text-green-900 mb-2">Présence confirmée !</h3>
            <p className="text-sm text-green-700 mb-2">
              Tag NFC validé avec succès
            </p>
            <div className="bg-white rounded-lg p-3 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ANR:</span>
                <span className="font-mono font-medium">{scannedData.anrCode}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Serial:</span>
                <span className="font-mono text-xs">{scannedData.serial.substring(0, 16)}...</span>
              </div>
            </div>
          </>
        )}

        {status === 'mismatch' && scannedData && (
          <>
            <XCircle className="w-16 h-16 mx-auto mb-4 text-orange-600" />
            <h3 className="font-semibold text-orange-900 mb-2">Mauvaise adresse !</h3>
            <p className="text-sm text-orange-700 mb-4">
              Le tag NFC ne correspond pas à l'adresse du colis
            </p>
            <div className="bg-white rounded-lg p-3 text-left text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scanné:</span>
                <span className="font-mono font-medium text-orange-600">{scannedData.anrCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Attendu:</span>
                <span className="font-mono font-medium text-green-600">{expectedAnrCode}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={onCancel}>
                Annuler
              </Button>
              <Button onClick={startScanning}>
                Réessayer
              </Button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h3 className="font-semibold text-destructive mb-2">Erreur NFC</h3>
            <p className="text-sm text-destructive/80 mb-4">
              {error || 'Une erreur est survenue'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={onCancel}>
                Annuler
              </Button>
              <Button onClick={startScanning}>
                Réessayer
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default NFCProofScanner;
