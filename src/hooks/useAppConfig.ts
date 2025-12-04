import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface AppConfig {
  id: string;
  key: string;
  value: any;
  description: string | null;
  category: string;
  updated_at: string;
}

export const useAppConfig = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['app_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .order('category', { ascending: true });
      
      if (error) throw error;
      return data as AppConfig[];
    },
  });

  const getConfig = (key: string): any => {
    const config = configs?.find(c => c.key === key);
    if (!config) return null;
    
    // Parse JSONB value
    try {
      return typeof config.value === 'string' ? JSON.parse(config.value) : config.value;
    } catch {
      return config.value;
    }
  };

  const updateConfig = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      // Log the action
      const oldConfig = configs?.find(c => c.key === key);
      
      const { error } = await supabase
        .from('app_config')
        .update({ 
          value: JSON.stringify(value),
          updated_by: user?.id,
        })
        .eq('key', key);
      
      if (error) throw error;

      // Log audit
      await supabase.from('admin_audit_logs').insert({
        user_id: user?.id,
        action: 'config_update',
        entity_type: 'config',
        entity_id: key,
        old_value: oldConfig?.value,
        new_value: value,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_config'] });
    },
  });

  return {
    configs,
    isLoading,
    getConfig,
    updateConfig: updateConfig.mutate,
    isUpdating: updateConfig.isPending,
  };
};
