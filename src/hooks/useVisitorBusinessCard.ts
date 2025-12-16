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
      
      // Auto-create business card for authenticated users if they don't have one
      if (!data && user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .maybeSingle();
        
        const { data: newCard, error: insertError } = await (supabase as any)
          .from("visitor_business_cards")
          .insert({
            user_id: user.id,
            device_id: deviceId,
            first_name: profile?.first_name || "Utilisateur",
            last_name: profile?.last_name || "",
            card_type: "individual",
          })
          .select()
          .single();
        
        if (insertError) {
          console.error("[useVisitorBusinessCard] Error creating card:", insertError);
        } else {
          setCard(newCard as VisitorBusinessCard);
          return;
        }
      }
      
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

      if (existingCard) {
        // Update existing card
        const { error } = await (supabase as any)
          .from("visitor_business_cards")
          .update({
            ...cardData,
            user_id: user?.id || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingCard.id);

        if (error) throw error;
      } else {
        // Create new card
        const { error } = await (supabase as any).from("visitor_business_cards").insert({
          ...cardData,
          device_id: deviceId,
          user_id: user?.id || null,
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
