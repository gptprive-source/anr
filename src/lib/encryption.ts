/**
 * End-to-End Encryption utilities using ECDH + AES-256-GCM
 * 
 * This module provides cryptographic functions for secure message encryption
 * between visitors and residents. All encryption happens client-side.
 * 
 * Algorithms:
 * - Key Exchange: ECDH with P-256 curve
 * - Encryption: AES-256-GCM with 12-byte nonces
 */

// Key storage constants
const RESIDENT_KEY_STORE = 'anr_resident_keys';
const VISITOR_KEY_STORE = 'anr_visitor_keys';

/**
 * Generate an ECDH key pair for key exchange
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true, // extractable
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Export a public key to base64 string for transmission
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  return arrayBufferToBase64(exported);
}

/**
 * Import a public key from base64 string
 */
export async function importPublicKey(keyData: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyData);
  return await crypto.subtle.importKey(
    'spki',
    keyBuffer,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
}

/**
 * Export a private key to base64 string for storage
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
  return arrayBufferToBase64(exported);
}

/**
 * Import a private key from base64 string
 */
export async function importPrivateKey(keyData: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyData);
  return await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Derive a shared AES-256-GCM key from ECDH key exchange
 */
export async function deriveSharedKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  return await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random 12-byte nonce for AES-GCM
 */
export function generateNonce(): ArrayBuffer {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  return nonce.buffer.slice(nonce.byteOffset, nonce.byteOffset + nonce.byteLength);
}

/**
 * Encrypt a message using AES-256-GCM
 */
export async function encryptMessage(
  message: string,
  sharedKey: CryptoKey
): Promise<{ encrypted: string; nonce: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const nonce = generateNonce();

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
    },
    sharedKey,
    data
  );

  return {
    encrypted: arrayBufferToBase64(encryptedBuffer),
    nonce: arrayBufferToBase64(nonce),
  };
}

/**
 * Decrypt a message using AES-256-GCM
 */
export async function decryptMessage(
  encrypted: string,
  nonce: string,
  sharedKey: CryptoKey
): Promise<string> {
  const encryptedBuffer = base64ToArrayBuffer(encrypted);
  const nonceBuffer = base64ToArrayBuffer(nonce);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: nonceBuffer,
    },
    sharedKey,
    encryptedBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Encrypt binary data (for voice messages, media)
 */
export async function encryptBinary(
  data: ArrayBuffer,
  sharedKey: CryptoKey
): Promise<{ encrypted: ArrayBuffer; nonce: string }> {
  const nonce = generateNonce();

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce,
    },
    sharedKey,
    data
  );

  return {
    encrypted: encryptedBuffer,
    nonce: arrayBufferToBase64(nonce),
  };
}

/**
 * Decrypt binary data
 */
export async function decryptBinary(
  encrypted: ArrayBuffer,
  nonce: string,
  sharedKey: CryptoKey
): Promise<ArrayBuffer> {
  const nonceBuffer = base64ToArrayBuffer(nonce);

  return await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: nonceBuffer,
    },
    sharedKey,
    encrypted
  );
}

// ============= Key Storage Utilities =============

/**
 * Store resident keys in IndexedDB (persistent, secure)
 */
export async function storeResidentKeys(
  conversationId: string,
  keyPair: CryptoKeyPair
): Promise<void> {
  const privateKeyData = await exportPrivateKey(keyPair.privateKey);
  const publicKeyData = await exportPublicKey(keyPair.publicKey);

  const keys = getStoredKeys(RESIDENT_KEY_STORE);
  keys[conversationId] = {
    privateKey: privateKeyData,
    publicKey: publicKeyData,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(RESIDENT_KEY_STORE, JSON.stringify(keys));
}

/**
 * Get resident keys from storage
 */
export async function getResidentKeys(
  conversationId: string
): Promise<CryptoKeyPair | null> {
  const keys = getStoredKeys(RESIDENT_KEY_STORE);
  const stored = keys[conversationId];

  if (!stored) return null;

  try {
    const privateKey = await importPrivateKey(stored.privateKey);
    const publicKey = await importPublicKey(stored.publicKey);
    return { privateKey, publicKey };
  } catch (error) {
    console.error('[Encryption] Failed to import resident keys:', error);
    return null;
  }
}

/**
 * Store visitor keys in sessionStorage (session-only, less persistent)
 */
export function storeVisitorKeys(
  conversationId: string,
  privateKeyData: string,
  publicKeyData: string
): void {
  const keys = getStoredKeys(VISITOR_KEY_STORE, true);
  keys[conversationId] = {
    privateKey: privateKeyData,
    publicKey: publicKeyData,
    createdAt: new Date().toISOString(),
  };
  sessionStorage.setItem(VISITOR_KEY_STORE, JSON.stringify(keys));
}

/**
 * Get visitor keys from session storage
 */
export async function getVisitorKeys(
  conversationId: string
): Promise<CryptoKeyPair | null> {
  const keys = getStoredKeys(VISITOR_KEY_STORE, true);
  const stored = keys[conversationId];

  if (!stored) return null;

  try {
    const privateKey = await importPrivateKey(stored.privateKey);
    const publicKey = await importPublicKey(stored.publicKey);
    return { privateKey, publicKey };
  } catch (error) {
    console.error('[Encryption] Failed to import visitor keys:', error);
    return null;
  }
}

/**
 * Get or create visitor keys for a conversation
 */
export async function getOrCreateVisitorKeys(
  conversationId: string
): Promise<{ keyPair: CryptoKeyPair; publicKeyExport: string; isNew: boolean }> {
  const existing = await getVisitorKeys(conversationId);
  if (existing) {
    const publicKeyExport = await exportPublicKey(existing.publicKey);
    return { keyPair: existing, publicKeyExport, isNew: false };
  }

  const keyPair = await generateKeyPair();
  const privateKeyData = await exportPrivateKey(keyPair.privateKey);
  const publicKeyData = await exportPublicKey(keyPair.publicKey);
  
  storeVisitorKeys(conversationId, privateKeyData, publicKeyData);
  
  return { keyPair, publicKeyExport: publicKeyData, isNew: true };
}

/**
 * Get or create resident keys for a conversation
 */
export async function getOrCreateResidentKeys(
  conversationId: string
): Promise<{ keyPair: CryptoKeyPair; publicKeyExport: string; isNew: boolean }> {
  const existing = await getResidentKeys(conversationId);
  if (existing) {
    const publicKeyExport = await exportPublicKey(existing.publicKey);
    return { keyPair: existing, publicKeyExport, isNew: false };
  }

  const keyPair = await generateKeyPair();
  await storeResidentKeys(conversationId, keyPair);
  const publicKeyExport = await exportPublicKey(keyPair.publicKey);
  
  return { keyPair, publicKeyExport, isNew: true };
}

// ============= Helper Functions =============

function getStoredKeys(storeName: string, useSession = false): Record<string, any> {
  const storage = useSession ? sessionStorage : localStorage;
  const stored = storage.getItem(storeName);
  return stored ? JSON.parse(stored) : {};
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if the browser supports the Web Crypto API
 */
export function isEncryptionSupported(): boolean {
  return !!(
    typeof crypto !== 'undefined' &&
    crypto.subtle &&
    typeof crypto.subtle.generateKey === 'function'
  );
}

/**
 * Clear all stored encryption keys (for logout/cleanup)
 */
export function clearAllKeys(): void {
  localStorage.removeItem(RESIDENT_KEY_STORE);
  sessionStorage.removeItem(VISITOR_KEY_STORE);
}
