import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Referral {
  id: string;
  referred_id: string;
  status: string;
  reward_amount: number;
  subscription_paid_at: string | null;
  created_at: string;
  referred_profile?: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface ReferralPayout {
  id: string;
  amount: number;
  referrals_count: number;
  status: string;
  processed_at: string | null;
  created_at: string;
}

interface ReferralStats {
  totalReferrals: number;
  paidReferrals: number;
  pendingReferrals: number;
  totalEarned: number;
  currentBalance: number;
  progressToNextPayout: number;
}

export function useReferrals() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<ReferralPayout[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    paidReferrals: 0,
    pendingReferrals: 0,
    totalEarned: 0,
    currentBalance: 0,
    progressToNextPayout: 0,
  });
  const [iban, setIban] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      if (referralsError) throw referralsError;

      // Fetch referred profiles
      const referredIds = referralsData?.map((r) => r.referred_id) || [];
      let profilesMap: Record<string, { first_name: string | null; last_name: string | null }> = {};

      if (referredIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", referredIds);

        if (profiles) {
          profiles.forEach((p) => {
            profilesMap[p.id] = { first_name: p.first_name, last_name: p.last_name };
          });
        }
      }

      const enrichedReferrals = (referralsData || []).map((r) => ({
        ...r,
        referred_profile: profilesMap[r.referred_id],
      }));

      setReferrals(enrichedReferrals);

      // Fetch payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from("referral_payouts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (payoutsError) throw payoutsError;
      setPayouts(payoutsData || []);

      // Fetch profile for balance and IBAN
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("referral_balance, iban")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setIban(profile?.iban || null);

      // Calculate stats
      const paidReferrals = enrichedReferrals.filter((r) => r.status === "paid" || r.status === "credited");
      const pendingReferrals = enrichedReferrals.filter((r) => r.status === "pending");
      const totalEarned = paidReferrals.reduce((sum, r) => sum + Number(r.reward_amount), 0);
      const currentBalance = Number(profile?.referral_balance || 0);
      const progressToNextPayout = Math.min((currentBalance / 50) * 100, 100);

      setStats({
        totalReferrals: enrichedReferrals.length,
        paidReferrals: paidReferrals.length,
        pendingReferrals: pendingReferrals.length,
        totalEarned,
        currentBalance,
        progressToNextPayout,
      });
    } catch (err: any) {
      console.error("Error fetching referrals:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateIban = async (newIban: string) => {
    if (!user) return { success: false, error: "Non connecté" };

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ iban: newIban })
        .eq("id", user.id);

      if (error) throw error;

      setIban(newIban);
      return { success: true, error: null };
    } catch (err: any) {
      console.error("Error updating IBAN:", err);
      return { success: false, error: err.message };
    }
  };

  return {
    referrals,
    payouts,
    stats,
    iban,
    loading,
    error,
    updateIban,
    refetch: fetchData,
  };
}
