import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePendingMessages = () => {
  const queryClient = useQueryClient();

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["pending_messages_count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("contact_messages")
        .select("*", { count: "exact", head: true })
        .in("status", ["new", "read"]);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Real-time subscription for new contact messages
  useEffect(() => {
    const channel = supabase
      .channel("contact-messages-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contact_messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pending_messages_count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { pendingCount };
};
