// IndexedDB storage for offline-first delivery system
const DB_NAME = 'anr_delivery_offline';
const DB_VERSION = 1;

export interface PreparedRoute {
  route_id: string;
  driver_id: string;
  route_date: string;
  parcels: PreparedParcel[];
  public_key: string;
  downloaded_at: string;
}

export interface PreparedParcel {
  parcel_id: string;
  tracking_number: string;
  qr_token: string;
  expected_anr_code: string;
  expected_nfc_serial?: string;
  recipient_name: string;
  recipient_address: string;
  status: 'pending' | 'delivered' | 'failed';
}

export interface NfcUnlock {
  parcel_id: string;
  nfc_serial: string;
  nfc_anr_code: string;
  scanned_at: string;
  geo?: { lat: number; lng: number };
}

export interface PendingProof {
  id: string;
  parcel_id: string;
  tracking_number: string;
  qr_token: string;
  nfc_serial: string;
  nfc_anr_code: string;
  nfc_scanned_at: string;
  qr_scanned_at: string;
  geo?: { lat: number; lng: number };
  driver_id: string;
  local_proof_hash: string;
  created_at: string;
  synced: boolean;
  sync_result?: 'validated' | 'rejected' | 'conflict';
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Routes préparées
        if (!db.objectStoreNames.contains('delivery_routes')) {
          const routeStore = db.createObjectStore('delivery_routes', { keyPath: 'route_id' });
          routeStore.createIndex('driver_id', 'driver_id', { unique: false });
          routeStore.createIndex('route_date', 'route_date', { unique: false });
        }

        // Déverrouillages NFC
        if (!db.objectStoreNames.contains('nfc_unlocks')) {
          const nfcStore = db.createObjectStore('nfc_unlocks', { keyPath: 'parcel_id' });
          nfcStore.createIndex('scanned_at', 'scanned_at', { unique: false });
        }

        // Preuves en attente
        if (!db.objectStoreNames.contains('pending_proofs')) {
          const proofStore = db.createObjectStore('pending_proofs', { keyPath: 'id' });
          proofStore.createIndex('synced', 'synced', { unique: false });
          proofStore.createIndex('parcel_id', 'parcel_id', { unique: false });
        }

        // État de synchronisation
        if (!db.objectStoreNames.contains('sync_status')) {
          db.createObjectStore('sync_status', { keyPath: 'key' });
        }
      };
    });
  }

  private async ensureDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  // ============ ROUTES ============

  async saveRoute(route: PreparedRoute): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('delivery_routes', 'readwrite');
      const store = tx.objectStore('delivery_routes');
      const request = store.put(route);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getRoute(routeId: string): Promise<PreparedRoute | null> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('delivery_routes', 'readonly');
      const store = tx.objectStore('delivery_routes');
      const request = store.get(routeId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getActiveRoute(driverId: string): Promise<PreparedRoute | null> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('delivery_routes', 'readonly');
      const store = tx.objectStore('delivery_routes');
      const index = store.index('driver_id');
      const request = index.getAll(driverId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const routes = request.result as PreparedRoute[];
        // Return most recent route
        const sorted = routes.sort((a, b) => 
          new Date(b.downloaded_at).getTime() - new Date(a.downloaded_at).getTime()
        );
        resolve(sorted[0] || null);
      };
    });
  }

  async updateParcelStatus(routeId: string, parcelId: string, status: 'pending' | 'delivered' | 'failed'): Promise<void> {
    const route = await this.getRoute(routeId);
    if (!route) return;

    const parcel = route.parcels.find(p => p.parcel_id === parcelId);
    if (parcel) {
      parcel.status = status;
      await this.saveRoute(route);
    }
  }

  async clearRoute(routeId: string): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('delivery_routes', 'readwrite');
      const store = tx.objectStore('delivery_routes');
      const request = store.delete(routeId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ============ NFC UNLOCKS ============

  async saveNfcUnlock(unlock: NfcUnlock): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('nfc_unlocks', 'readwrite');
      const store = tx.objectStore('nfc_unlocks');
      const request = store.put(unlock);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getNfcUnlock(parcelId: string): Promise<NfcUnlock | null> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('nfc_unlocks', 'readonly');
      const store = tx.objectStore('nfc_unlocks');
      const request = store.get(parcelId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async isQrUnlocked(parcelId: string): Promise<boolean> {
    const unlock = await this.getNfcUnlock(parcelId);
    if (!unlock) return false;
    
    // Check if unlock is still valid (10 minutes max)
    const unlockTime = new Date(unlock.scanned_at).getTime();
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    
    return (now - unlockTime) < tenMinutes;
  }

  async clearNfcUnlock(parcelId: string): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('nfc_unlocks', 'readwrite');
      const store = tx.objectStore('nfc_unlocks');
      const request = store.delete(parcelId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ============ PENDING PROOFS ============

  async savePendingProof(proof: PendingProof): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_proofs', 'readwrite');
      const store = tx.objectStore('pending_proofs');
      const request = store.put(proof);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getPendingProofs(): Promise<PendingProof[]> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_proofs', 'readonly');
      const store = tx.objectStore('pending_proofs');
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const all = request.result as PendingProof[];
        resolve(all.filter(p => !p.synced));
      };
    });
  }

  async getAllProofs(): Promise<PendingProof[]> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_proofs', 'readonly');
      const store = tx.objectStore('pending_proofs');
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async markProofSynced(proofId: string, result: 'validated' | 'rejected' | 'conflict'): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_proofs', 'readwrite');
      const store = tx.objectStore('pending_proofs');
      const getRequest = store.get(proofId);
      
      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const proof = getRequest.result as PendingProof;
        if (proof) {
          proof.synced = true;
          proof.sync_result = result;
          const putRequest = store.put(proof);
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => resolve();
        } else {
          resolve();
        }
      };
    });
  }

  async clearSyncedProofs(): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_proofs', 'readwrite');
      const store = tx.objectStore('pending_proofs');
      const request = store.openCursor();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const proof = cursor.value as PendingProof;
          if (proof.synced === true) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  // ============ SYNC STATUS ============

  async getLastSyncTime(): Promise<Date | null> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_status', 'readonly');
      const store = tx.objectStore('sync_status');
      const request = store.get('last_sync');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? new Date(result.value) : null);
      };
    });
  }

  async setLastSyncTime(time: Date): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_status', 'readwrite');
      const store = tx.objectStore('sync_status');
      const request = store.put({ key: 'last_sync', value: time.toISOString() });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // ============ UTILITY ============

  async clearAll(): Promise<void> {
    const db = await this.ensureDb();
    const stores = ['delivery_routes', 'nfc_unlocks', 'pending_proofs', 'sync_status'];
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, 'readwrite');
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();
      
      stores.forEach(storeName => {
        tx.objectStore(storeName).clear();
      });
    });
  }
}

export const offlineStorage = new OfflineStorage();
