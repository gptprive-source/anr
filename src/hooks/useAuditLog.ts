import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_value: any;
  new_value: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface AuditLogFilters {
  action?: string;
  entity_type?: string;
  user_id?: string;
  from_date?: string;
  to_date?: string;
}

export const useAuditLog = (filters?: AuditLogFilters) => {
  const { user } = useAuth();

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['audit_logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters?.from_date) {
        query = query.gte('created_at', filters.from_date);
      }
      if (filters?.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLogEntry[];
    },
  });

  const logAction = useMutation({
    mutationFn: async ({
      action,
      entity_type,
      entity_id,
      old_value,
      new_value,
    }: {
      action: string;
      entity_type?: string;
      entity_id?: string;
      old_value?: any;
      new_value?: any;
    }) => {
      const { error } = await supabase.from('admin_audit_logs').insert({
        user_id: user?.id,
        action,
        entity_type,
        entity_id,
        old_value,
        new_value,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;
    },
  });

  return {
    logs,
    isLoading,
    refetch,
    logAction: logAction.mutate,
  };
};
