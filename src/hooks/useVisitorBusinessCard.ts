import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface VisitorBusinessCard {
  id: string;
  card_type: "individual" | "company";
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  device_id: string;
  user_id: string | null;
  show_email: boolean;
  show_phone: boolean;
  anr_code: string | null;
  created_at: string;
  updated_at: string;
}

const DEVICE_ID_KEY = "anr_visitor_device_id";

// Generate or retrieve device ID (fallback for non-authenticated users)
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
  const { user } = useAuth();

  const deviceId = getDeviceId();

  const fetchCard = useCallback(async () => {
    try {
      let query = (supabase as any)
        .from("visitor_business_cards")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1);

      // For authenticated users, fetch by user_id; otherwise by device_id
      if (user?.id) {
        query = query.eq("user_id", user.id);
      } else {
        query = query.eq("device_id", deviceId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      
      // Don't auto-create business card - users must explicitly fill the form
      // This ensures the onboarding flow is properly completed
      
      setCard(data as VisitorBusinessCard | null);
    } catch (err) {
      console.error("[useVisitorBusinessCard] Error fetching card:", err);
    } finally {
      setLoading(false);
    }
  }, [deviceId, user?.id]);

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  const saveCard = async (
    cardData: Omit<VisitorBusinessCard, "id" | "device_id" | "user_id" | "created_at" | "updated_at">
  ): Promise<{ success: boolean; error?: string }> => {
    console.log("[useVisitorBusinessCard] saveCard called with avatar_url:", cardData.avatar_url);
    try {
      // Check if card exists for this user (authenticated) or device (guest)
      let existingQuery = (supabase as any)
        .from("visitor_business_cards")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1);

      if (user?.id) {
        existingQuery = existingQuery.eq("user_id", user.id);
      } else {
        existingQuery = existingQuery.eq("device_id", deviceId);
      }

      const { data: existingCard } = await existingQuery.maybeSingle();
      console.log("[useVisitorBusinessCard] Existing card:", existingCard);

      if (existingCard) {
        // Update existing card
        const updateData = {
          ...cardData,
          user_id: user?.id || null,
          updated_at: new Date().toISOString(),
        };
        console.log("[useVisitorBusinessCard] Updating card with:", updateData);
        
        const { error, data } = await (supabase as any)
          .from("visitor_business_cards")
          .update(updateData)
          .eq("id", existingCard.id)
          .select();

        console.log("[useVisitorBusinessCard] Update result:", { error, data });
        if (error) throw error;
      } else {
        // Create new card
        const insertData = {
          ...cardData,
          device_id: deviceId,
          user_id: user?.id || null,
        };
        console.log("[useVisitorBusinessCard] Inserting new card:", insertData);
        
        const { error, data } = await (supabase as any)
          .from("visitor_business_cards")
          .insert(insertData)
          .select();

        console.log("[useVisitorBusinessCard] Insert result:", { error, data });
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
