import { supabase } from "@/integrations/supabase/client";

// Génère un code de vérification aléatoire (6 caractères)
function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclut les caractères ambigus
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
    
    // Expiration dans 5 minutes
    const expiresAt = new Date(timestamp + 5 * 60 * 1000).toISOString();
    
    // Sauvegarde la demande en base
    const { error: insertError } = await supabase
      .from('phone_verifications')
      .insert({
        phone_number: normalizedPhone,
        verification_code: verificationCode,
        signature: `${timestamp}`, // Simple timestamp comme signature
        expires_at: expiresAt,
        status: 'pending'
      });
    
    if (insertError) {
      console.error("Failed to create verification:", insertError);
      return { success: false, error: "Impossible de créer la demande de vérification" };
    }
    
    // Construit le message SMS - envoyé à soi-même
    const smsBody = `ANR Verification: ${verificationCode}`;
    
    // Construit l'URI SMS pour ouvrir l'app SMS native
    // Le destinataire est le même numéro que l'expéditeur (soi-même)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const separator = isIOS ? '&' : '?';
    const smsUri = `sms:${normalizedPhone}${separator}body=${encodeURIComponent(smsBody)}`;
    
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

// Vérifie le code entré par l'utilisateur
export async function verifyCode(phone: string, code: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const normalizedPhone = phone.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
    const normalizedCode = code.toUpperCase().replace(/\s/g, "");
    
    // Cherche une vérification pendante avec ce code et ce numéro
    const { data, error } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('verification_code', normalizedCode)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error("Verification check error:", error);
      return { success: false, error: "Erreur lors de la vérification" };
    }
    
    if (!data) {
      return { success: false, error: "Code invalide ou expiré" };
    }
    
    // Marquer comme vérifié
    const { error: updateError } = await supabase
      .from('phone_verifications')
      .update({ 
        status: 'verified',
        verified_at: new Date().toISOString()
      })
      .eq('id', data.id);
    
    if (updateError) {
      console.error("Failed to update verification:", updateError);
      return { success: false, error: "Erreur lors de la mise à jour" };
    }
    
    return { success: true };
    
  } catch (error: any) {
    console.error("Code verification error:", error);
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
    .maybeSingle();
  
  if (error || !data) {
    return { verified: false, status: 'not_found' };
  }
  
  return {
    verified: data.status === 'verified',
    status: data.status
  };
}
