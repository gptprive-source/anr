// Cryptographic utilities for offline proof validation and sealing
// SÉCURITÉ: QR chiffré localement, déchiffrable uniquement après NFC valide

/**
 * Generate SHA-256 hash of data
 */
export async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a unique device key for local signing
 */
export async function getDeviceKey(): Promise<string> {
  let deviceKey = localStorage.getItem('anr_delivery_device_key');
  
  if (!deviceKey) {
    // Generate new device key
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    deviceKey = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('anr_delivery_device_key', deviceKey);
  }
  
  return deviceKey;
}

/**
 * Seal a proof locally with SHA-256 hash
 */
export async function sealProofLocally(proof: {
  parcel_id: string;
  qr_token: string;
  nfc_serial: string;
  nfc_anr_code: string;
  nfc_scanned_at: string;
  qr_scanned_at: string;
  driver_id: string;
  geo?: { lat: number; lng: number };
}): Promise<string> {
  const deviceKey = await getDeviceKey();
  
  // Create deterministic string from proof data
  const proofString = JSON.stringify({
    parcel_id: proof.parcel_id,
    qr_token: proof.qr_token,
    nfc_serial: proof.nfc_serial,
    nfc_anr_code: proof.nfc_anr_code,
    nfc_scanned_at: proof.nfc_scanned_at,
    qr_scanned_at: proof.qr_scanned_at,
    driver_id: proof.driver_id,
    geo: proof.geo,
    device_key: deviceKey
  });
  
  return generateHash(proofString);
}

/**
 * Verify a QR token signature offline using public key
 * Note: This is a simplified implementation. In production,
 * you would use proper JWT verification with the public key.
 */
export function verifyQRToken(token: string, publicKey: string): {
  valid: boolean;
  payload: QRTokenPayload | null;
  error?: string;
} {
  try {
    // Decode JWT parts (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, payload: null, error: 'Format de token invalide' };
    }

    // Decode payload (Base64URL)
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson) as QRTokenPayload;

    // Check expiration
    if (payload.exp && Date.now() > payload.exp * 1000) {
      return { valid: false, payload, error: 'Token expiré' };
    }

    // In a full implementation, we would verify the signature here
    // using the public key. For now, we trust the structure.
    
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, payload: null, error: 'Erreur de décodage du token' };
  }
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);

    if (!payload.exp) return false;
    return Date.now() > payload.exp * 1000;
  } catch {
    return true;
  }
}

/**
 * Get remaining time before token expires (in seconds)
 */
export function getTokenRemainingTime(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 0;

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);

    if (!payload.exp) return Infinity;
    
    const remaining = (payload.exp * 1000 - Date.now()) / 1000;
    return Math.max(0, remaining);
  } catch {
    return 0;
  }
}

/**
 * Generate a unique proof ID
 */
export function generateProofId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `proof_${timestamp}_${randomPart}`;
}

export interface QRTokenPayload {
  parcel_id: string;
  tracking_number: string;
  expected_anr_code: string;
  driver_id: string;
  route_id: string;
  iat: number;  // Issued at
  exp: number;  // Expiration
}

// ============ CHIFFREMENT QR TOKEN ============
// Le QR est chiffré avec l'ANR code attendu comme clé
// Il ne peut être déchiffré qu'après un scan NFC valide

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;

/**
 * Derive encryption key from ANR code
 */
async function deriveKeyFromAnrCode(anrCode: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(anrCode.toUpperCase().padEnd(32, '0')),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('anr_delivery_salt_v1'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt QR token with ANR code as key
 * Returns base64-encoded encrypted data
 */
export async function encryptQrToken(qrToken: string, expectedAnrCode: string): Promise<string> {
  const key = await deriveKeyFromAnrCode(expectedAnrCode);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  
  const encrypted = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    encoder.encode(qrToken)
  );
  
  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * RÈGLE NON NÉGOCIABLE: Decrypt QR token ONLY if NFC is valid
 * 
 * Conditions de déchiffrement:
 * 1. nfc_anr_code === expected_anr_code (case insensitive)
 * 2. nfc_serial non vide
 * 3. nfc_timestamp < now
 * 4. now - nfc_timestamp < 10 minutes (fenêtre stricte)
 * 
 * Si une condition échoue → null, aucun fallback
 */
export async function decryptQrToken(
  encryptedToken: string,
  nfcData: { serial: string; anrCode: string; timestamp: string } | null,
  expectedAnrCode: string
): Promise<{ token: string | null; error?: string }> {
  // === VALIDATION NFC STRICTE - AUCUN FALLBACK ===
  
  // 1. NFC data must exist
  if (!nfcData) {
    return { token: null, error: 'SCAN NFC REQUIS: Aucune donnée NFC' };
  }
  
  // 2. NFC serial must not be empty
  if (!nfcData.serial || nfcData.serial.trim() === '') {
    return { token: null, error: 'SCAN NFC REQUIS: Serial NFC vide' };
  }
  
  // 3. NFC ANR code must match expected (case insensitive)
  if (nfcData.anrCode.toUpperCase() !== expectedAnrCode.toUpperCase()) {
    return { token: null, error: `MAUVAISE ADRESSE: ${nfcData.anrCode} ≠ ${expectedAnrCode}` };
  }
  
  // 4. NFC timestamp must be in the past
  const nfcTime = new Date(nfcData.timestamp).getTime();
  const now = Date.now();
  
  if (nfcTime > now + 60000) { // Allow 1 minute tolerance for clock drift
    return { token: null, error: 'SCAN NFC INVALIDE: Timestamp dans le futur' };
  }
  
  // 5. NFC must be within 10 minute window (STRICT - NON NÉGOCIABLE)
  const TEN_MINUTES = 10 * 60 * 1000;
  if (now - nfcTime > TEN_MINUTES) {
    return { token: null, error: 'SCAN NFC EXPIRÉ: Fenêtre de 10 minutes dépassée' };
  }
  
  // === NFC VALIDÉ - DÉCHIFFREMENT AUTORISÉ ===
  try {
    const key = await deriveKeyFromAnrCode(expectedAnrCode);
    const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return { token: decoder.decode(decrypted) };
  } catch (error) {
    return { token: null, error: 'ERREUR DÉCHIFFREMENT: Token corrompu ou clé invalide' };
  }
}

/**
 * Check if NFC unlock is still valid (10 minute window)
 */
export function isNfcUnlockValid(nfcTimestamp: string): boolean {
  const nfcTime = new Date(nfcTimestamp).getTime();
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;
  return (now - nfcTime) < TEN_MINUTES && nfcTime <= now + 60000;
}

/**
 * Get remaining time for NFC unlock validity (in seconds)
 */
export function getNfcUnlockRemainingTime(nfcTimestamp: string): number {
  const nfcTime = new Date(nfcTimestamp).getTime();
  const now = Date.now();
  const TEN_MINUTES = 10 * 60 * 1000;
  const elapsed = now - nfcTime;
  const remaining = (TEN_MINUTES - elapsed) / 1000;
  return Math.max(0, Math.floor(remaining));
}
