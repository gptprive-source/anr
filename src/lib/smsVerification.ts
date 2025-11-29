import { supabase } from "@/integrations/supabase/client";

// Numéro ANR pour recevoir les SMS de vérification
// Ce numéro doit être configuré avec un service d'inbound SMS qui forward vers l'edge function
const ANR_VERIFICATION_NUMBER = "+33700000000"; // À remplacer par votre numéro

// Génère un code de vérification aléatoire
function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclut les caractères ambigus
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Génère une signature simple basée sur le code et le timestamp
// Note: En production, utilisez une vraie signature cryptographique Ed25519
async function generateSignature(code: string, timestamp: number, phone: string): Promise<string> {
  const data = `${code}:${timestamp}:${phone}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Utilise SubtleCrypto pour générer un hash SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  
  return hashBase64.slice(0, 32); // Tronque pour le SMS
}

// Crée une demande de vérification et retourne le SMS pré-rempli
export async function createPhoneVerification(phone: string): Promise<{
  success: boolean;
  smsUri?: string;
  verificationCode?: string;
  error?: string;
}> {
  try {
    const normalizedPhone = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    const verificationCode = generateVerificationCode();
    const timestamp = Date.now();
    const signature = await generateSignature(verificationCode, timestamp, normalizedPhone);
    
    // Expiration dans 5 minutes
    const expiresAt = new Date(timestamp + 5 * 60 * 1000).toISOString();
    
    // Sauvegarde la demande en base
    const { error: insertError } = await supabase
      .from('phone_verifications')
      .insert({
        phone_number: normalizedPhone,
        verification_code: verificationCode,
        signature: signature,
        expires_at: expiresAt,
        status: 'pending'
      });
    
    if (insertError) {
      console.error("Failed to create verification:", insertError);
      return { success: false, error: "Impossible de créer la demande de vérification" };
    }
    
    // Construit le message SMS
    const smsBody = `ANR-VFY:${verificationCode}:${timestamp}:${signature}`;
    
    // Construit l'URI SMS pour ouvrir l'app SMS native
    // Format: sms:number?body=message (Android) ou sms:number&body=message (iOS)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    const smsUri = `sms:${ANR_VERIFICATION_NUMBER}${separator}body=${encodeURIComponent(smsBody)}`;
    
    return {
      success: true,
      smsUri,
      verificationCode
    };
    
  } catch (error: any) {
    console.error("Verification creation error:", error);
    return { success: false, error: error.message };
  }
}

// Vérifie le statut de la vérification
export async function checkVerificationStatus(phone: string): Promise<{
  verified: boolean;
  status: string;
}> {
  const normalizedPhone = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  
  const { data, error } = await supabase
    .from('phone_verifications')
    .select('status, verified_at')
    .eq('phone_number', normalizedPhone)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) {
    return { verified: false, status: 'not_found' };
  }
  
  return {
    verified: data.status === 'verified',
    status: data.status
  };
}

// Poll pour vérifier si le SMS a été reçu et validé
export function pollVerificationStatus(
  phone: string,
  onVerified: () => void,
  onExpired: () => void,
  intervalMs: number = 3000,
  maxAttempts: number = 100 // 5 minutes max
): () => void {
  let attempts = 0;
  
  const interval = setInterval(async () => {
    attempts++;
    
    const { verified, status } = await checkVerificationStatus(phone);
    
    if (verified) {
      clearInterval(interval);
      onVerified();
    } else if (status === 'expired' || attempts >= maxAttempts) {
      clearInterval(interval);
      onExpired();
    }
  }, intervalMs);
  
  // Retourne une fonction pour arrêter le polling
  return () => clearInterval(interval);
}
