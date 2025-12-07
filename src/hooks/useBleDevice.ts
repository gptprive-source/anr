import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

// UUIDs BLE selon specs ChatGPT
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

interface UseBleDeviceReturn {
  isSupported: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  rssi: number | null;
  lastResult: BleResult | null;
  scan: () => Promise<void>;
  disconnect: () => void;
  writeToken: (token: string) => Promise<BleResult | null>;
  syncTime: () => Promise<void>;
}

export function useBleDevice(): UseBleDeviceReturn {
  const [isSupported] = useState(() => 
    typeof navigator !== 'undefined' && 'bluetooth' in navigator
  );
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [rssi, setRssi] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<BleResult | null>(null);

  const deviceRef = useRef<any>(null);
  const serverRef = useRef<any>(null);
  const serviceRef = useRef<any>(null);

  const { toast } = useToast();

  const scan = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Bluetooth non supporté",
        description: "Votre navigateur ne supporte pas le Bluetooth",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);

    try {
      const nav = navigator as any;
      const device = await nav.bluetooth.requestDevice({
        filters: [{ namePrefix: 'ANR_' }],
        optionalServices: [ANR_SERVICE_UUID]
      });

      deviceRef.current = device;
      setDeviceName(device.name || 'ANR Device');

      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setRssi(null);
        serverRef.current = null;
        serviceRef.current = null;
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error('Impossible de se connecter');

      serverRef.current = server;
      const service = await server.getPrimaryService(ANR_SERVICE_UUID);
      serviceRef.current = service;

      const resultChar = await service.getCharacteristic(ANR_RESULT_CHAR_UUID);
      await resultChar.startNotifications();
      resultChar.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        if (value) {
          const decoder = new TextDecoder();
          try {
            const result: BleResult = JSON.parse(decoder.decode(value));
            setLastResult(result);
          } catch (e) {
            console.error('Erreur parsing BLE:', e);
          }
        }
      });

      setIsConnected(true);
      setRssi(-65);

    } catch (error) {
      console.error('Erreur scan BLE:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [isSupported, toast]);

  const disconnect = useCallback(() => {
    if (serverRef.current?.connected) {
      serverRef.current.disconnect();
    }
    deviceRef.current = null;
    serverRef.current = null;
    serviceRef.current = null;
    setIsConnected(false);
    setRssi(null);
    setDeviceName(null);
  }, []);

  const writeToken = useCallback(async (token: string): Promise<BleResult | null> => {
    if (!serviceRef.current) return null;

    try {
      const tokenChar = await serviceRef.current.getCharacteristic(ANR_TOKEN_CHAR_UUID);
      const encoder = new TextEncoder();
      await tokenChar.writeValue(encoder.encode(token));
      return lastResult;
    } catch (error) {
      console.error('Erreur écriture token:', error);
      return null;
    }
  }, [lastResult]);

  const syncTime = useCallback(async () => {
    if (!serviceRef.current) return;
    try {
      const timeSyncChar = await serviceRef.current.getCharacteristic(ANR_TIME_SYNC_CHAR_UUID);
      const now = Math.floor(Date.now() / 1000);
      await timeSyncChar.writeValue(new TextEncoder().encode(now.toString()));
    } catch (error) {
      console.error('Erreur sync time:', error);
    }
  }, []);

  return {
    isSupported,
    isConnected,
    isConnecting,
    deviceName,
    rssi,
    lastResult,
    scan,
    disconnect,
    writeToken,
    syncTime,
  };
}
