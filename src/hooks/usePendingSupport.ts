import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePendingSupport = () => {
  const queryClient = useQueryClient();

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending_support_count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('support_conversations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'open']);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Real-time subscription for new support requests
  useEffect(() => {
    const channel = supabase
      .channel('support-conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_conversations',
        },
        () => {
          // Invalidate query to refetch count
          queryClient.invalidateQueries({ queryKey: ['pending_support_count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { pendingCount };
};