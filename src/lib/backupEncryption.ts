/**
 * Backup encryption utilities using AES-256-GCM with password-derived key
 */

// Derive a key from password using PBKDF2
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: "SHA-256"
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Generate random bytes
function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

// Encrypt data with password
export async function encryptBackup(data: object, password: string): Promise<ArrayBuffer> {
  const salt = generateRandomBytes(16);
  const iv = generateRandomBytes(12);
  const key = await deriveKeyFromPassword(password, salt);

  const encoder = new TextEncoder();
  const jsonData = JSON.stringify(data);
  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    encoder.encode(jsonData)
  );

  // Combine: salt (16) + iv (12) + encrypted data
  const result = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encryptedData), salt.length + iv.length);

  return result.buffer;
}

// Decrypt data with password
export async function decryptBackup(encryptedBuffer: ArrayBuffer, password: string): Promise<object> {
  const data = new Uint8Array(encryptedBuffer);
  
  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const encryptedData = data.slice(28);

  const key = await deriveKeyFromPassword(password, salt);

  const decryptedData = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedData
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decryptedData));
}

// Download encrypted backup file
export function downloadBackupFile(data: ArrayBuffer, filename: string): void {
  const blob = new Blob([data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Read backup file
export function readBackupFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}
