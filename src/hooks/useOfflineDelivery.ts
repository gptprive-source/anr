import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, PreparedRoute, PendingProof, NfcUnlock } from '@/lib/offlineStorage';
import { sealProofLocally, generateProofId, decryptQrToken, isNfcUnlockValid, getNfcUnlockRemainingTime } from '@/lib/offlineCrypto';
import { toast } from 'sonner';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncResult {
  validated: number;
  rejected: number;
  conflicts: string[];
}

export interface DecryptedQrResult {
  token: string | null;
  error?: string;
  remainingSeconds?: number;
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

      toast.success(`Tournée préparée: ${route.parcels.length} colis chargés (QR chiffrés)`);
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
      // Validation stricte des données NFC
      if (!nfcSerial || nfcSerial.trim() === '') {
        toast.error('NFC serial invalide');
        return false;
      }
      
      if (!nfcAnrCode || nfcAnrCode.trim() === '') {
        toast.error('Code ANR NFC invalide');
        return false;
      }
      
      const unlock: NfcUnlock = {
        parcel_id: parcelId,
        nfc_serial: nfcSerial.trim(),
        nfc_anr_code: nfcAnrCode.trim().toUpperCase(),
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

  /**
   * RÈGLE NON NÉGOCIABLE #1: DÉCHIFFRER LE QR UNIQUEMENT APRÈS NFC VALIDE
   * 
   * Cette fonction est le SEUL point d'accès au QR token déchiffré.
   * Elle applique toutes les validations NFC strictes:
   * - NFC serial non vide
   * - NFC ANR code == expected ANR code
   * - Fenêtre temporelle de 10 minutes
   * 
   * AUCUN FALLBACK. AUCUNE EXCEPTION.
   */
  const getDecryptedQrToken = useCallback(async (parcelId: string): Promise<DecryptedQrResult> => {
    // 1. Récupérer le colis de la route active
    if (!activeRoute) {
      return { token: null, error: 'Aucune tournée active' };
    }
    
    const parcel = activeRoute.parcels.find(p => p.parcel_id === parcelId);
    if (!parcel) {
      return { token: null, error: 'Colis non trouvé dans la tournée' };
    }
    
    // 2. Récupérer les données NFC
    const nfcUnlock = await offlineStorage.getNfcUnlock(parcelId);
    
    // 3. Transformer pour le décryptage
    const nfcData = nfcUnlock ? {
      serial: nfcUnlock.nfc_serial,
      anrCode: nfcUnlock.nfc_anr_code,
      timestamp: nfcUnlock.scanned_at
    } : null;
    
    // 4. Calculer le temps restant si NFC valide
    let remainingSeconds: number | undefined;
    if (nfcUnlock && isNfcUnlockValid(nfcUnlock.scanned_at)) {
      remainingSeconds = getNfcUnlockRemainingTime(nfcUnlock.scanned_at);
    }
    
    // 5. Décrypter avec validation stricte
    const result = await decryptQrToken(
      parcel.encrypted_qr_token,
      nfcData,
      parcel.expected_anr_code
    );
    
    return {
      token: result.token,
      error: result.error,
      remainingSeconds
    };
  }, [activeRoute]);

  // Capture proof (works offline)
  const captureProof = useCallback(async (
    parcelId: string,
    trackingNumber: string,
    driverId: string,
    geo?: { lat: number; lng: number }
  ): Promise<boolean> => {
    try {
      // 1. Récupérer les données NFC (preuve primaire obligatoire)
      const nfcUnlock = await offlineStorage.getNfcUnlock(parcelId);
      if (!nfcUnlock) {
        toast.error('SCAN NFC REQUIS: Aucun scan NFC trouvé');
        return false;
      }
      
      // 2. Valider que le NFC est encore dans la fenêtre de 10 minutes
      if (!isNfcUnlockValid(nfcUnlock.scanned_at)) {
        toast.error('SCAN NFC EXPIRÉ: Fenêtre de 10 minutes dépassée');
        return false;
      }
      
      // 3. Obtenir le QR token déchiffré (validation stricte interne)
      const decryptResult = await getDecryptedQrToken(parcelId);
      if (!decryptResult.token) {
        toast.error(decryptResult.error || 'Impossible de déchiffrer le QR');
        return false;
      }

      // 4. Create proof data avec données NFC obligatoires
      const proofData = {
        parcel_id: parcelId,
        qr_token: decryptResult.token,
        nfc_serial: nfcUnlock.nfc_serial,
        nfc_anr_code: nfcUnlock.nfc_anr_code,
        nfc_scanned_at: nfcUnlock.scanned_at,
        qr_scanned_at: new Date().toISOString(),
        driver_id: driverId,
        geo: geo || nfcUnlock.geo
      };

      // 5. Seal proof locally (hash composite local)
      const localHash = await sealProofLocally(proofData);

      const proof: PendingProof = {
        id: generateProofId(),
        ...proofData,
        tracking_number: trackingNumber,
        local_proof_hash: localHash,
        created_at: new Date().toISOString(),
        synced: false
      };

      // 6. Save to IndexedDB
      await offlineStorage.savePendingProof(proof);
      
      // 7. Update parcel status in route
      if (activeRoute) {
        await offlineStorage.updateParcelStatus(activeRoute.route_id, parcelId, 'delivered');
        // Update local state
        const updatedRoute = await offlineStorage.getRoute(activeRoute.route_id);
        setActiveRoute(updatedRoute);
      }

      // 8. Clear NFC unlock
      await offlineStorage.clearNfcUnlock(parcelId);

      // 9. Update pending count
      await loadPendingCount();

      toast.success('Preuve composite NFC+QR enregistrée');
      return true;
    } catch (error) {
      console.error('Error capturing proof:', error);
      toast.error('Erreur lors de l\'enregistrement');
      return false;
    }
  }, [activeRoute, getDecryptedQrToken]);

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
      toast.success(`Synchronisation: ${syncResult.validated} validée(s), ${syncResult.rejected} rejetée(s)`);
      
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
    getDecryptedQrToken, // NOUVEAU: Accès sécurisé au QR déchiffré
    captureProof,
    syncProofs,
    clearAllData,
    
    // Utilities
    loadPendingCount
  };
}
