import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface RelayPoint {
  id: string;
  user_id: string;
  anr_id: string;
  display_name: string;
  phone: string | null;
  max_capacity: number;
  current_capacity: number;
  accepted_parcel_types: string[];
  availability_schedule: Record<string, { from: string; to: string }>;
  iban: string | null;
  total_earnings: number;
  pending_earnings: number;
  is_active: boolean;
  is_verified: boolean;
  verified_at: string | null;
  total_parcels_handled: number;
  average_rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRelayPointData {
  anr_id: string;
  display_name: string;
  phone?: string;
  max_capacity?: number;
  accepted_parcel_types?: string[];
  availability_schedule?: Record<string, { from: string; to: string }>;
  iban?: string;
}

export const useRelayPoint = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get current user's relay point
  const { data: relayPoint, isLoading, refetch } = useQuery({
    queryKey: ['relay_point', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('relay_points')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data ? {
        ...data,
        availability_schedule: (data.availability_schedule || {}) as Record<string, { from: string; to: string }>,
      } as RelayPoint : null;
    },
    enabled: !!user?.id,
  });

  // Get all active relay points (for finding nearby relays)
  const { data: activeRelayPoints } = useQuery({
    queryKey: ['active_relay_points'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relay_points')
        .select(`
          *,
          anrs:anr_id (
            id,
            code,
            address,
            latitude,
            longitude
          )
        `)
        .eq('is_active', true)
        .eq('is_verified', true);
      
      if (error) throw error;
      return data;
    },
  });

  // Create relay point
  const createRelayPoint = useMutation({
    mutationFn: async (data: CreateRelayPointData) => {
      if (!user?.id) throw new Error('Non authentifié');

      const { data: result, error } = await supabase
        .from('relay_points')
        .insert({
          user_id: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relay_point'] });
    },
  });

  // Update relay point
  const updateRelayPoint = useMutation({
    mutationFn: async (data: Partial<RelayPoint>) => {
      if (!relayPoint?.id) throw new Error('Point relais non trouvé');

      const { data: result, error } = await supabase
        .from('relay_points')
        .update(data)
        .eq('id', relayPoint.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relay_point'] });
    },
  });

  // Toggle active status
  const toggleActive = useMutation({
    mutationFn: async () => {
      if (!relayPoint?.id) throw new Error('Point relais non trouvé');

      const { error } = await supabase
        .from('relay_points')
        .update({ is_active: !relayPoint.is_active })
        .eq('id', relayPoint.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relay_point'] });
    },
  });

  return {
    relayPoint,
    activeRelayPoints,
    isLoading,
    isRelayPoint: !!relayPoint,
    createRelayPoint: createRelayPoint.mutateAsync,
    updateRelayPoint: updateRelayPoint.mutateAsync,
    toggleActive: toggleActive.mutateAsync,
    isCreating: createRelayPoint.isPending,
    isUpdating: updateRelayPoint.isPending,
    refetch,
  };
};
