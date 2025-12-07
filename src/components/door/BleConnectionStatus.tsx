import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bluetooth, 
  BluetoothConnected, 
  BluetoothOff,
  BluetoothSearching,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface BleConnectionStatusProps {
  anrCode: string;
}

type ConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected';

export function BleConnectionStatus({ anrCode }: BleConnectionStatusProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [rssi, setRssi] = useState<number | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [bleSupported, setBleSupported] = useState(true);

  useEffect(() => {
    // Vérifier le support BLE
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      setBleSupported(true);
    } else {
      setBleSupported(false);
    }
  }, []);

  const getSignalIcon = () => {
    if (rssi === null) return <Signal className="h-4 w-4" />;
    if (rssi >= -50) return <SignalHigh className="h-4 w-4 text-green-500" />;
    if (rssi >= -70) return <SignalMedium className="h-4 w-4 text-yellow-500" />;
    return <SignalLow className="h-4 w-4 text-red-500" />;
  };

  const getConnectionIcon = () => {
    switch (connectionState) {
      case 'connected':
        return <BluetoothConnected className="h-5 w-5 text-blue-500" />;
      case 'connecting':
      case 'scanning':
        return <BluetoothSearching className="h-5 w-5 text-blue-500 animate-pulse" />;
      default:
        return <BluetoothOff className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (connectionState) {
      case 'connected':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Connecté</Badge>;
      case 'connecting':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Connexion...</Badge>;
      case 'scanning':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Recherche...</Badge>;
      default:
        return <Badge variant="secondary">Déconnecté</Badge>;
    }
  };

  const handleScan = async () => {
    if (!bleSupported) return;

    setConnectionState('scanning');

    try {
      const nav = navigator as any;
      // Web Bluetooth API
      const device = await nav.bluetooth.requestDevice({
        filters: [{ namePrefix: 'ANR_' }],
        optionalServices: ['0000a0a0-0000-1000-8000-00805f9b34fb']
      });

      setDeviceName(device.name || null);
      setConnectionState('connecting');

      const server = await device.gatt?.connect();
      if (server) {
        setConnectionState('connected');
        // Simuler RSSI (Web Bluetooth ne fournit pas le RSSI directement)
        setRssi(-65);
      }

      device.addEventListener('gattserverdisconnected', () => {
        setConnectionState('disconnected');
        setRssi(null);
        setDeviceName(null);
      });

    } catch (error) {
      console.error('Erreur BLE:', error);
      setConnectionState('disconnected');
    }
  };

  if (!bleSupported) {
    return (
      <Card className="bg-yellow-500/5 border-yellow-500/20">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <BluetoothOff className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-500">Bluetooth non disponible</p>
              <p className="text-sm text-muted-foreground">
                Votre navigateur ne supporte pas le Bluetooth. Utilisez Chrome ou Edge sur ordinateur, 
                ou l'application mobile pour ouvrir la porte.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={connectionState === 'connected' ? 'bg-green-500/5 border-green-500/20' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getConnectionIcon()}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Module de porte</span>
                {getStatusBadge()}
              </div>
              <p className="text-sm text-muted-foreground">
                {connectionState === 'connected' && deviceName
                  ? deviceName
                  : `Recherchez le module ANR_${anrCode.substring(0, 6)}`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {connectionState === 'connected' && rssi !== null && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {getSignalIcon()}
                <span>{rssi} dBm</span>
              </div>
            )}

            {connectionState === 'disconnected' && (
              <Button variant="outline" size="sm" onClick={handleScan}>
                <Bluetooth className="h-4 w-4 mr-2" />
                Scanner
              </Button>
            )}

            {(connectionState === 'scanning' || connectionState === 'connecting') && (
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            )}

            {connectionState === 'connected' && (
              <Button variant="ghost" size="sm" onClick={handleScan}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
