import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VisitorBusinessCard {
  id: string;
  card_type: "individual" | "company";
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  visitor_anr_code: string | null;
  avatar_url: string | null;
  device_id: string;
  created_at: string;
  updated_at: string;
}

const DEVICE_ID_KEY = "anr_visitor_device_id";

// Generate or retrieve device ID
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const useVisitorBusinessCard = () => {
  const [card, setCard] = useState<VisitorBusinessCard | null>(null);
  const [loading, setLoading] = useState(true);

  const deviceId = getDeviceId();

  const fetchCard = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("visitor_business_cards")
        .select("*")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCard(data as VisitorBusinessCard | null);
    } catch (err) {
      console.error("[useVisitorBusinessCard] Error fetching card:", err);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  const saveCard = async (
    cardData: Omit<VisitorBusinessCard, "id" | "device_id" | "created_at" | "updated_at">
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Always check if card exists for this device to prevent duplicates (race condition fix)
      const { data: existingCard } = await (supabase as any)
        .from("visitor_business_cards")
        .select("id")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingCard) {
        // Update existing card
        const { error } = await (supabase as any)
          .from("visitor_business_cards")
          .update({
            ...cardData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingCard.id);

        if (error) throw error;
      } else {
        // Create new card
        const { error } = await (supabase as any).from("visitor_business_cards").insert({
          ...cardData,
          device_id: deviceId,
        });

        if (error) throw error;
      }

      await fetchCard();
      return { success: true };
    } catch (err: any) {
      console.error("[useVisitorBusinessCard] Error saving card:", err);
      return { success: false, error: err.message };
    }
  };

  const deleteCard = async (): Promise<{ success: boolean; error?: string }> => {
    if (!card) return { success: false, error: "No card to delete" };

    try {
      const { error } = await (supabase as any)
        .from("visitor_business_cards")
        .delete()
        .eq("id", card.id);

      if (error) throw error;
      setCard(null);
      return { success: true };
    } catch (err: any) {
      console.error("[useVisitorBusinessCard] Error deleting card:", err);
      return { success: false, error: err.message };
    }
  };

  return {
    card,
    loading,
    deviceId,
    saveCard,
    deleteCard,
    refetch: fetchCard,
  };
};
