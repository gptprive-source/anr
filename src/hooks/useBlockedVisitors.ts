import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface BlockedVisitor {
  id: string;
  user_id: string;
  visitor_identifier: string;
  visitor_name: string | null;
  reason: string | null;
  blocked_at: string;
}

export const useBlockedVisitors = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [blockedVisitors, setBlockedVisitors] = useState<BlockedVisitor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlockedVisitors = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("blocked_visitors")
        .select("*")
        .eq("user_id", user.id)
        .order("blocked_at", { ascending: false });

      if (error) throw error;
      setBlockedVisitors(data || []);
    } catch (error) {
      console.error("[useBlockedVisitors] Error fetching:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBlockedVisitors();
  }, [fetchBlockedVisitors]);

  const isBlocked = useCallback((visitorIdentifier: string): boolean => {
    return blockedVisitors.some(
      (b) => b.visitor_identifier === visitorIdentifier
    );
  }, [blockedVisitors]);

  const blockVisitor = async (
    visitorIdentifier: string,
    visitorName?: string,
    reason?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase.from("blocked_visitors").insert({
        user_id: user.id,
        visitor_identifier: visitorIdentifier,
        visitor_name: visitorName || null,
        reason: reason || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Déjà bloqué",
            description: "Ce visiteur est déjà bloqué",
          });
          return false;
        }
        throw error;
      }

      toast({
        title: "Visiteur bloqué",
        description: "Vous ne recevrez plus de messages de ce visiteur",
      });

      await fetchBlockedVisitors();
      return true;
    } catch (error: any) {
      console.error("[useBlockedVisitors] Error blocking:", error);
      toast({
        title: "Erreur",
        description: "Impossible de bloquer ce visiteur",
        variant: "destructive",
      });
      return false;
    }
  };

  const unblockVisitor = async (visitorIdentifier: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("blocked_visitors")
        .delete()
        .eq("user_id", user.id)
        .eq("visitor_identifier", visitorIdentifier);

      if (error) throw error;

      toast({
        title: "Visiteur débloqué",
        description: "Vous pouvez à nouveau recevoir des messages de ce visiteur",
      });

      await fetchBlockedVisitors();
      return true;
    } catch (error: any) {
      console.error("[useBlockedVisitors] Error unblocking:", error);
      toast({
        title: "Erreur",
        description: "Impossible de débloquer ce visiteur",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    blockedVisitors,
    loading,
    isBlocked,
    blockVisitor,
    unblockVisitor,
    refetch: fetchBlockedVisitors,
  };
};
