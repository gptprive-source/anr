import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ReferralCode {
  id: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export function useReferralCode() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate a unique code like "KHALID-7X3K"
  const generateCode = (firstName: string): string => {
    const name = firstName.toUpperCase().slice(0, 6).replace(/[^A-Z]/g, '') || 'USER';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${name}-${random}`;
  };

  const fetchOrCreateCode = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First try to fetch existing code
      const { data: existingCode, error: fetchError } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingCode) {
        setReferralCode(existingCode);
        return;
      }

      // No code exists, create one
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();

      const code = generateCode(profile?.first_name || "USER");

      const { data: newCode, error: insertError } = await supabase
        .from("referral_codes")
        .insert({
          user_id: user.id,
          code,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setReferralCode(newCode);
    } catch (err: any) {
      console.error("Error fetching/creating referral code:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrCreateCode();
  }, [user]);

  const getReferralLink = () => {
    if (!referralCode) return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/register?ref=${referralCode.code}`;
  };

  const getShareMessage = () => {
    if (!referralCode) return "";
    return `🏠 Découvre ANR, l'interphone intelligent !

📱 Inscris-toi avec mon lien et profite de l'appli :
${getReferralLink()}

Je gagne 5€ par inscription, et toi tu obtiens le meilleur interphone !`;
  };

  return {
    referralCode,
    loading,
    error,
    getReferralLink,
    getShareMessage,
    refetch: fetchOrCreateCode,
  };
}
