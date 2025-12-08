import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCapacitorBle } from '@/hooks/useCapacitorBle';
import { useDoorAccess } from '@/hooks/useDoorAccess';
import {
  DoorOpen,
  Bluetooth,
  BluetoothConnected,
  BluetoothSearching,
  Loader2,
  CheckCircle,
  XCircle,
  Smartphone,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BleOpenDoorButtonProps {
  anrId: string;
  anrCode: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

const connectionStateLabels: Record<string, string> = {
  disconnected: 'Appuyez pour ouvrir',
  scanning: 'Recherche du module...',
  connecting: 'Connexion...',
  connected: 'Connecté',
  writing: 'Envoi du token...',
  success: 'Porte ouverte !',
  error: 'Erreur',
};

const connectionStateProgress: Record<string, number> = {
  disconnected: 0,
  scanning: 20,
  connecting: 40,
  connected: 60,
  writing: 80,
  success: 100,
  error: 0,
};

export function BleOpenDoorButton({
  anrId,
  anrCode,
  onSuccess,
  onError,
  className,
}: BleOpenDoorButtonProps) {
  const [isOpening, setIsOpening] = useState(false);
  
  const {
    isSupported,
    isNative,
    connectionState,
    deviceName,
    lastResult,
    errorMessage,
    openDoor,
    disconnect,
  } = useCapacitorBle();

  const { generateToken, loading: tokenLoading } = useDoorAccess(anrId);

  const handleOpenDoor = async () => {
    if (isOpening) return;
    
    setIsOpening(true);

    try {
      // Step 1: Generate token from backend
      const tokenResponse = await generateToken({
        mode: 'SINGLE',
        scope: 'OPEN_DOOR',
        ttl_seconds: 60,
      });

      if (!tokenResponse?.jws_token) {
        throw new Error('Impossible de générer le token');
      }

      // Step 2: Open door via BLE
      const result = await openDoor(tokenResponse.jws_token);

      if (result?.result === 'OK') {
        onSuccess?.();
      } else {
        const errorMsg = result?.error_details || result?.result || 'Échec ouverture';
        onError?.(errorMsg);
      }

    } catch (error) {
      console.error('Open door error:', error);
      onError?.(error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setIsOpening(false);
    }
  };

  const getButtonIcon = () => {
    switch (connectionState) {
      case 'scanning':
        return <BluetoothSearching className="h-6 w-6 animate-pulse" />;
      case 'connecting':
      case 'writing':
        return <Loader2 className="h-6 w-6 animate-spin" />;
      case 'connected':
        return <BluetoothConnected className="h-6 w-6" />;
      case 'success':
        return <CheckCircle className="h-6 w-6" />;
      case 'error':
        return <XCircle className="h-6 w-6" />;
      default:
        return <DoorOpen className="h-6 w-6" />;
    }
  };

  const getButtonVariant = () => {
    if (connectionState === 'success') return 'default';
    if (connectionState === 'error') return 'destructive';
    return 'default';
  };

  if (!isSupported) {
    return (
      <div className="text-center py-4">
        <Bluetooth className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Bluetooth non supporté</p>
        <p className="text-sm text-muted-foreground">
          Utilisez Chrome sur Android ou l'application native
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Platform indicator */}
      <div className="flex items-center justify-center gap-2">
        <Badge variant="outline" className="text-xs">
          {isNative ? (
            <>
              <Smartphone className="h-3 w-3 mr-1" />
              App native
            </>
          ) : (
            <>
              <Globe className="h-3 w-3 mr-1" />
              Web Bluetooth
            </>
          )}
        </Badge>
        <Badge variant="outline" className="text-xs">
          <Bluetooth className="h-3 w-3 mr-1" />
          {anrCode}
        </Badge>
      </div>

      {/* Main button */}
      <Button
        onClick={handleOpenDoor}
        disabled={isOpening || tokenLoading || connectionState === 'success'}
        variant={getButtonVariant()}
        size="lg"
        className={cn(
          "w-full h-24 text-lg transition-all duration-300",
          connectionState === 'success' && "bg-green-600 hover:bg-green-600",
          connectionState === 'error' && "bg-destructive hover:bg-destructive"
        )}
      >
        <div className="flex flex-col items-center gap-2">
          {getButtonIcon()}
          <span>{connectionStateLabels[connectionState]}</span>
        </div>
      </Button>

      {/* Progress bar */}
      {isOpening && connectionState !== 'success' && connectionState !== 'error' && (
        <Progress 
          value={connectionStateProgress[connectionState]} 
          className="h-2"
        />
      )}

      {/* Device info */}
      {deviceName && connectionState !== 'disconnected' && (
        <div className="text-center text-sm text-muted-foreground">
          Connecté à: <span className="font-medium">{deviceName}</span>
        </div>
      )}

      {/* Error message */}
      {errorMessage && connectionState === 'error' && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive text-center">{errorMessage}</p>
        </div>
      )}

      {/* Result details */}
      {lastResult && connectionState === 'success' && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Porte ouverte avec succès</span>
          </div>
          {lastResult.relay_duration_ms && (
            <p className="text-xs text-center text-muted-foreground mt-1">
              Relais activé pendant {lastResult.relay_duration_ms}ms
            </p>
          )}
        </div>
      )}

      {/* Disconnect button when connected */}
      {connectionState === 'connected' && !isOpening && (
        <Button
          variant="ghost"
          size="sm"
          onClick={disconnect}
          className="w-full"
        >
          Déconnecter
        </Button>
      )}

      {/* Retry button on error */}
      {connectionState === 'error' && (
        <Button
          variant="outline"
          onClick={handleOpenDoor}
          className="w-full"
        >
          Réessayer
        </Button>
      )}
    </div>
  );
}
