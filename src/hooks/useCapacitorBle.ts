import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

// UUIDs BLE selon specs firmware
const ANR_SERVICE_UUID = '0000a0a0-0000-1000-8000-00805f9b34fb';
const ANR_TOKEN_CHAR_UUID = '0000a0a1-0000-1000-8000-00805f9b34fb';
const ANR_RESULT_CHAR_UUID = '0000a0a2-0000-1000-8000-00805f9b34fb';
const ANR_TIME_SYNC_CHAR_UUID = '0000a0a3-0000-1000-8000-00805f9b34fb';

interface BleResult {
  result: 'OK' | 'SIGN_ERR' | 'EXPIRED' | 'NOT_YET' | 'REPLAY' | 'ANR_ID_MISMATCH' | 'RSSI_FAIL';
  code: number;
  timestamp: number;
  token_id?: string;
  relay_duration_ms?: number;
  error_details?: string;
}

type ConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'writing' | 'success' | 'error';

interface UseCapacitorBleReturn {
  isSupported: boolean;
  isNative: boolean;
  connectionState: ConnectionState;
  deviceName: string | null;
  rssi: number | null;
  lastResult: BleResult | null;
  errorMessage: string | null;
  scan: (devicePrefix?: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  writeTokenAndWaitResult: (token: string, timeoutMs?: number) => Promise<BleResult | null>;
  syncTime: () => Promise<boolean>;
  openDoor: (jwsToken: string) => Promise<BleResult | null>;
}

export function useCapacitorBle(): UseCapacitorBleReturn {
  const isNative = Capacitor.isNativePlatform();
  const [isSupported] = useState(() => {
    if (isNative) return true; // Capacitor BLE plugin
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  });

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [rssi, setRssi] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<BleResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deviceRef = useRef<any>(null);
  const serverRef = useRef<any>(null);
  const serviceRef = useRef<any>(null);
  const resultCharRef = useRef<any>(null);
  const blePluginRef = useRef<any>(null);
  const nativeDeviceIdRef = useRef<string | null>(null);

  const { toast } = useToast();

  // Initialize Capacitor BLE plugin
  useEffect(() => {
    if (isNative) {
      import('@capacitor-community/bluetooth-le').then((module) => {
        blePluginRef.current = module.BleClient;
        // Initialize the plugin
        blePluginRef.current.initialize().catch((err: Error) => {
          console.error('BLE init error:', err);
        });
      });
    }
  }, [isNative]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isNative && nativeDeviceIdRef.current && blePluginRef.current) {
        blePluginRef.current.disconnect(nativeDeviceIdRef.current).catch(() => {});
      } else if (serverRef.current?.connected) {
        serverRef.current.disconnect();
      }
    };
  }, [isNative]);

  const scan = useCallback(async (devicePrefix = 'ANR_'): Promise<boolean> => {
    if (!isSupported) {
      setErrorMessage('Bluetooth non supporté sur cet appareil');
      toast({
        title: "Bluetooth non supporté",
        description: "Votre appareil ne supporte pas le Bluetooth LE",
        variant: "destructive",
      });
      return false;
    }

    setConnectionState('scanning');
    setErrorMessage(null);

    try {
      if (isNative && blePluginRef.current) {
        // Capacitor Native BLE
        const BleClient = blePluginRef.current;
        
        // Request permissions on Android
        await BleClient.requestLEScan(
          { services: [ANR_SERVICE_UUID] },
          (result: any) => {
            console.log('BLE scan result:', result);
          }
        );

        // Stop scan after 10 seconds
        setTimeout(() => BleClient.stopLEScan(), 10000);

        // For now, use direct device connection with scan
        const device = await BleClient.requestDevice({
          services: [ANR_SERVICE_UUID],
          namePrefix: devicePrefix,
        });

        if (!device) {
          throw new Error('Aucun appareil trouvé');
        }

        nativeDeviceIdRef.current = device.deviceId;
        setDeviceName(device.name || 'ANR Device');
        setConnectionState('connecting');

        // Connect
        await BleClient.connect(device.deviceId, (deviceId: string) => {
          console.log('Device disconnected:', deviceId);
          setConnectionState('disconnected');
          setRssi(null);
          nativeDeviceIdRef.current = null;
        });

        // Start notifications for result characteristic
        await BleClient.startNotifications(
          device.deviceId,
          ANR_SERVICE_UUID,
          ANR_RESULT_CHAR_UUID,
          (value: DataView) => {
            const decoder = new TextDecoder();
            const text = decoder.decode(value.buffer);
            try {
              const result: BleResult = JSON.parse(text);
              console.log('BLE result received:', result);
              setLastResult(result);
            } catch (e) {
              console.error('Error parsing BLE result:', e);
            }
          }
        );

        setConnectionState('connected');
        setRssi(-65); // Placeholder, would need RSSI reading
        return true;

      } else {
        // Web Bluetooth API fallback
        const nav = navigator as any;
        const device = await nav.bluetooth.requestDevice({
          filters: [{ namePrefix: devicePrefix }],
          optionalServices: [ANR_SERVICE_UUID]
        });

        deviceRef.current = device;
        setDeviceName(device.name || 'ANR Device');
        setConnectionState('connecting');

        device.addEventListener('gattserverdisconnected', () => {
          setConnectionState('disconnected');
          setRssi(null);
          serverRef.current = null;
          serviceRef.current = null;
          resultCharRef.current = null;
        });

        const server = await device.gatt?.connect();
        if (!server) throw new Error('Impossible de se connecter au GATT server');

        serverRef.current = server;
        const service = await server.getPrimaryService(ANR_SERVICE_UUID);
        serviceRef.current = service;

        // Subscribe to result notifications
        const resultChar = await service.getCharacteristic(ANR_RESULT_CHAR_UUID);
        resultCharRef.current = resultChar;
        await resultChar.startNotifications();
        
        resultChar.addEventListener('characteristicvaluechanged', (event: any) => {
          const value = event.target.value;
          if (value) {
            const decoder = new TextDecoder();
            try {
              const result: BleResult = JSON.parse(decoder.decode(value));
              console.log('BLE result received:', result);
              setLastResult(result);
            } catch (e) {
              console.error('Error parsing BLE result:', e);
            }
          }
        });

        setConnectionState('connected');
        setRssi(-65);
        return true;
      }

    } catch (error) {
      console.error('BLE scan/connect error:', error);
      const message = error instanceof Error ? error.message : 'Erreur Bluetooth';
      setErrorMessage(message);
      setConnectionState('error');
      toast({
        title: "Erreur Bluetooth",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  }, [isSupported, isNative, toast]);

  const disconnect = useCallback(async () => {
    try {
      if (isNative && nativeDeviceIdRef.current && blePluginRef.current) {
        await blePluginRef.current.disconnect(nativeDeviceIdRef.current);
        nativeDeviceIdRef.current = null;
      } else if (serverRef.current?.connected) {
        serverRef.current.disconnect();
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      deviceRef.current = null;
      serverRef.current = null;
      serviceRef.current = null;
      resultCharRef.current = null;
      setConnectionState('disconnected');
      setRssi(null);
      setDeviceName(null);
      setLastResult(null);
    }
  }, [isNative]);

  const writeTokenAndWaitResult = useCallback(async (
    token: string,
    timeoutMs = 5000
  ): Promise<BleResult | null> => {
    setConnectionState('writing');
    setLastResult(null);

    return new Promise(async (resolve) => {
      const timeout = setTimeout(() => {
        setConnectionState('error');
        setErrorMessage('Timeout: pas de réponse du module');
        resolve(null);
      }, timeoutMs);

      // Watch for result
      const checkResult = setInterval(() => {
        if (lastResult) {
          clearInterval(checkResult);
          clearTimeout(timeout);
          if (lastResult.result === 'OK') {
            setConnectionState('success');
          } else {
            setConnectionState('error');
            setErrorMessage(`Erreur: ${lastResult.result}`);
          }
          resolve(lastResult);
        }
      }, 100);

      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(token);

        if (isNative && nativeDeviceIdRef.current && blePluginRef.current) {
          await blePluginRef.current.write(
            nativeDeviceIdRef.current,
            ANR_SERVICE_UUID,
            ANR_TOKEN_CHAR_UUID,
            new DataView(data.buffer)
          );
        } else if (serviceRef.current) {
          const tokenChar = await serviceRef.current.getCharacteristic(ANR_TOKEN_CHAR_UUID);
          await tokenChar.writeValue(data);
        } else {
          clearInterval(checkResult);
          clearTimeout(timeout);
          setConnectionState('error');
          setErrorMessage('Non connecté');
          resolve(null);
        }
      } catch (error) {
        clearInterval(checkResult);
        clearTimeout(timeout);
        console.error('Write token error:', error);
        setConnectionState('error');
        setErrorMessage(error instanceof Error ? error.message : 'Erreur écriture');
        resolve(null);
      }
    });
  }, [isNative, lastResult]);

  const syncTime = useCallback(async (): Promise<boolean> => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const encoder = new TextEncoder();
      const data = encoder.encode(now.toString());

      if (isNative && nativeDeviceIdRef.current && blePluginRef.current) {
        await blePluginRef.current.write(
          nativeDeviceIdRef.current,
          ANR_SERVICE_UUID,
          ANR_TIME_SYNC_CHAR_UUID,
          new DataView(data.buffer)
        );
      } else if (serviceRef.current) {
        const timeSyncChar = await serviceRef.current.getCharacteristic(ANR_TIME_SYNC_CHAR_UUID);
        await timeSyncChar.writeValue(data);
      } else {
        return false;
      }
      
      console.log('Time synced to:', now);
      return true;
    } catch (error) {
      console.error('Time sync error:', error);
      return false;
    }
  }, [isNative]);

  // High-level function: complete door opening flow
  const openDoor = useCallback(async (jwsToken: string): Promise<BleResult | null> => {
    // Step 1: Scan and connect if not already connected
    if (connectionState !== 'connected') {
      const connected = await scan();
      if (!connected) return null;
      
      // Small delay for connection to stabilize
      await new Promise(r => setTimeout(r, 500));
      
      // Sync time after connection
      await syncTime();
    }

    // Step 2: Write token and wait for result
    const result = await writeTokenAndWaitResult(jwsToken);
    
    if (result?.result === 'OK') {
      toast({
        title: "Porte ouverte !",
        description: `Relais activé pendant ${result.relay_duration_ms || 1000}ms`,
      });
      
      // Haptic feedback on native
      if (isNative && 'Haptics' in window) {
        try {
          (window as any).Haptics?.impact({ style: 'medium' });
        } catch {}
      }
    }

    return result;
  }, [connectionState, scan, syncTime, writeTokenAndWaitResult, toast, isNative]);

  return {
    isSupported,
    isNative,
    connectionState,
    deviceName,
    rssi,
    lastResult,
    errorMessage,
    scan,
    disconnect,
    writeTokenAndWaitResult,
    syncTime,
    openDoor,
  };
}
