// Cryptographic utilities for offline proof validation and sealing

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
