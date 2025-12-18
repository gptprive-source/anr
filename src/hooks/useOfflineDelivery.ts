import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, PreparedRoute, PendingProof, NfcUnlock } from '@/lib/offlineStorage';
import { sealProofLocally, generateProofId } from '@/lib/offlineCrypto';
import { toast } from 'sonner';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncResult {
  validated: number;
  rejected: number;
  conflicts: string[];
}

export function useOfflineDelivery() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeRoute, setActiveRoute] = useState<PreparedRoute | null>(null);
  const [pendingProofsCount, setPendingProofsCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connexion rétablie');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Mode hors-ligne activé');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending proofs count on mount
  useEffect(() => {
    loadPendingCount();
    loadLastSyncTime();
  }, []);

  const loadPendingCount = async () => {
    try {
      const proofs = await offlineStorage.getPendingProofs();
      setPendingProofsCount(proofs.length);
    } catch (error) {
      console.error('Error loading pending proofs count:', error);
    }
  };

  const loadLastSyncTime = async () => {
    try {
      const time = await offlineStorage.getLastSyncTime();
      setLastSyncTime(time);
    } catch (error) {
      console.error('Error loading last sync time:', error);
    }
  };

  // Prepare route (requires online)
  const prepareRoute = useCallback(async (driverId: string, parcelIds: string[]): Promise<PreparedRoute | null> => {
    if (!isOnline) {
      toast.error('Connexion requise pour préparer la tournée');
      return null;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('prepare-delivery-route', {
        body: {
          driver_id: driverId,
          parcel_ids: parcelIds,
          route_date: new Date().toISOString().split('T')[0]
        }
      });

      if (error) throw error;

      const route: PreparedRoute = {
        ...data,
        downloaded_at: new Date().toISOString()
      };

      // Save to IndexedDB
      await offlineStorage.saveRoute(route);
      setActiveRoute(route);

      toast.success(`Tournée préparée: ${route.parcels.length} colis chargés`);
      return route;
    } catch (error: any) {
      console.error('Error preparing route:', error);
      toast.error('Erreur lors de la préparation: ' + error.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  // Load existing route from IndexedDB
  const loadActiveRoute = useCallback(async (driverId: string): Promise<PreparedRoute | null> => {
    try {
      const route = await offlineStorage.getActiveRoute(driverId);
      setActiveRoute(route);
      return route;
    } catch (error) {
      console.error('Error loading active route:', error);
      return null;
    }
  }, []);

  // Record NFC unlock
  const recordNfcUnlock = useCallback(async (
    parcelId: string,
    nfcSerial: string,
    nfcAnrCode: string,
    geo?: { lat: number; lng: number }
  ): Promise<boolean> => {
    try {
      const unlock: NfcUnlock = {
        parcel_id: parcelId,
        nfc_serial: nfcSerial,
        nfc_anr_code: nfcAnrCode,
        scanned_at: new Date().toISOString(),
        geo
      };

      await offlineStorage.saveNfcUnlock(unlock);
      return true;
    } catch (error) {
      console.error('Error recording NFC unlock:', error);
      return false;
    }
  }, []);

  // Check if QR is unlocked for a parcel
  const isQrUnlocked = useCallback(async (parcelId: string): Promise<boolean> => {
    return offlineStorage.isQrUnlocked(parcelId);
  }, []);

  // Get NFC unlock data
  const getNfcUnlock = useCallback(async (parcelId: string): Promise<NfcUnlock | null> => {
    return offlineStorage.getNfcUnlock(parcelId);
  }, []);

  // Capture proof (works offline)
  const captureProof = useCallback(async (
    parcelId: string,
    trackingNumber: string,
    qrToken: string,
    driverId: string,
    geo?: { lat: number; lng: number }
  ): Promise<boolean> => {
    try {
      // Get NFC unlock data
      const nfcUnlock = await offlineStorage.getNfcUnlock(parcelId);
      if (!nfcUnlock) {
        toast.error('Scan NFC requis avant validation');
        return false;
      }

      // Create proof data
      const proofData = {
        parcel_id: parcelId,
        qr_token: qrToken,
        nfc_serial: nfcUnlock.nfc_serial,
        nfc_anr_code: nfcUnlock.nfc_anr_code,
        nfc_scanned_at: nfcUnlock.scanned_at,
        qr_scanned_at: new Date().toISOString(),
        driver_id: driverId,
        geo: geo || nfcUnlock.geo
      };

      // Seal proof locally
      const localHash = await sealProofLocally(proofData);

      const proof: PendingProof = {
        id: generateProofId(),
        ...proofData,
        tracking_number: trackingNumber,
        local_proof_hash: localHash,
        created_at: new Date().toISOString(),
        synced: false
      };

      // Save to IndexedDB
      await offlineStorage.savePendingProof(proof);
      
      // Update parcel status in route
      if (activeRoute) {
        await offlineStorage.updateParcelStatus(activeRoute.route_id, parcelId, 'delivered');
        // Update local state
        const updatedRoute = await offlineStorage.getRoute(activeRoute.route_id);
        setActiveRoute(updatedRoute);
      }

      // Clear NFC unlock
      await offlineStorage.clearNfcUnlock(parcelId);

      // Update pending count
      await loadPendingCount();

      toast.success('Preuve enregistrée localement');
      return true;
    } catch (error) {
      console.error('Error capturing proof:', error);
      toast.error('Erreur lors de l\'enregistrement');
      return false;
    }
  }, [activeRoute]);

  // Sync proofs (requires online)
  const syncProofs = useCallback(async (): Promise<SyncResult | null> => {
    if (!isOnline) {
      toast.error('Connexion requise pour synchroniser');
      return null;
    }

    setSyncStatus('syncing');
    
    try {
      const pendingProofs = await offlineStorage.getPendingProofs();
      
      if (pendingProofs.length === 0) {
        toast.info('Aucune preuve à synchroniser');
        setSyncStatus('idle');
        return { validated: 0, rejected: 0, conflicts: [] };
      }

      const { data, error } = await supabase.functions.invoke('sync-delivery-proofs', {
        body: {
          proofs: pendingProofs.map(p => ({
            qr_token: p.qr_token,
            nfc_serial: p.nfc_serial,
            nfc_anr_code: p.nfc_anr_code,
            nfc_scanned_at: p.nfc_scanned_at,
            qr_scanned_at: p.qr_scanned_at,
            geo: p.geo,
            local_proof_hash: p.local_proof_hash,
            proof_id: p.id
          }))
        }
      });

      if (error) throw error;

      // Mark proofs as synced based on results
      for (const result of data.results || []) {
        await offlineStorage.markProofSynced(
          result.proof_id,
          result.status as 'validated' | 'rejected' | 'conflict'
        );
      }

      // Update sync time
      await offlineStorage.setLastSyncTime(new Date());
      setLastSyncTime(new Date());

      // Clear validated proofs
      await offlineStorage.clearSyncedProofs();
      await loadPendingCount();

      const syncResult: SyncResult = {
        validated: data.validated || 0,
        rejected: data.rejected || 0,
        conflicts: data.conflicts || []
      };

      setSyncStatus('success');
      toast.success(`Synchronisation terminée: ${syncResult.validated} validée(s)`);
      
      return syncResult;
    } catch (error: any) {
      console.error('Error syncing proofs:', error);
      setSyncStatus('error');
      toast.error('Erreur de synchronisation: ' + error.message);
      return null;
    }
  }, [isOnline]);

  // Clear all data
  const clearAllData = useCallback(async () => {
    try {
      await offlineStorage.clearAll();
      setActiveRoute(null);
      setPendingProofsCount(0);
      setLastSyncTime(null);
      toast.success('Données locales effacées');
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Erreur lors de l\'effacement');
    }
  }, []);

  return {
    // State
    isOnline,
    activeRoute,
    pendingProofsCount,
    syncStatus,
    lastSyncTime,
    isLoading,
    
    // Actions
    prepareRoute,
    loadActiveRoute,
    recordNfcUnlock,
    isQrUnlocked,
    getNfcUnlock,
    captureProof,
    syncProofs,
    clearAllData,
    
    // Utilities
    loadPendingCount
  };
}
