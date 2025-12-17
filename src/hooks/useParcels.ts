import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Parcel {
  id: string;
  tracking_number: string;
  carrier_id: string | null;
  external_tracking_id: string | null;
  recipient_user_id: string | null;
  recipient_anr_id: string | null;
  recipient_name: string;
  recipient_phone: string | null;
  recipient_email: string | null;
  relay_point_id: string | null;
  delivery_driver_id: string | null;
  delivery_driver_name: string | null;
  parcel_type: string;
  weight_kg: number | null;
  dimensions_cm: string | null;
  description: string | null;
  declared_value: number | null;
  status: string;
  created_at: string;
  estimated_delivery_at: string | null;
  deposited_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  max_storage_until: string | null;
  metadata: Record<string, any>;
  updated_at: string;
}

export interface ParcelProof {
  id: string;
  parcel_id: string;
  proof_type: string;
  actor_user_id: string | null;
  actor_relay_id: string | null;
  actor_carrier_id: string | null;
  actor_driver_id: string | null;
  actor_name: string | null;
  recipient_user_id: string | null;
  recipient_name: string | null;
  geo_latitude: number | null;
  geo_longitude: number | null;
  geo_accuracy_m: number | null;
  timestamp_utc: string;
  timestamp_device: string | null;
  timezone: string;
  device_id_hash: string | null;
  device_info: Record<string, any>;
  scan_method: string;
  proof_hash: string;
  signature: string | null;
  proof_data: Record<string, any>;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

export const useParcels = (options?: { relayPointId?: string; recipientUserId?: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get parcels for relay point
  const { data: relayParcels, isLoading: relayLoading } = useQuery({
    queryKey: ['parcels', 'relay', options?.relayPointId],
    queryFn: async () => {
      if (!options?.relayPointId) return [];

      const { data, error } = await supabase
        .from('parcels')
        .select('*')
        .eq('relay_point_id', options.relayPointId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Parcel[];
    },
    enabled: !!options?.relayPointId,
  });

  // Get parcels for recipient
  const { data: recipientParcels, isLoading: recipientLoading } = useQuery({
    queryKey: ['parcels', 'recipient', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('parcels')
        .select(`
          *,
          relay_point:relay_point_id (
            id,
            display_name,
            phone,
            anrs:anr_id (
              address,
              latitude,
              longitude
            )
          )
        `)
        .eq('recipient_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get proofs for a parcel
  const getParcelProofs = async (parcelId: string): Promise<ParcelProof[]> => {
    const { data, error } = await supabase
      .from('parcel_proofs')
      .select('*')
      .eq('parcel_id', parcelId)
      .order('timestamp_utc', { ascending: true });

    if (error) throw error;
    return data as ParcelProof[];
  };

  // Update parcel status
  const updateParcelStatus = useMutation({
    mutationFn: async ({ parcelId, status }: { parcelId: string; status: string }) => {
      const updates: Partial<Parcel> = { status };
      
      if (status === 'deposited_at_relay') {
        updates.deposited_at = new Date().toISOString();
      } else if (status === 'available_for_pickup') {
        updates.picked_up_at = new Date().toISOString();
      } else if (status === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('parcels')
        .update(updates)
        .eq('id', parcelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
    },
  });

  // Get pending parcels count for relay
  const pendingCount = relayParcels?.filter(p => 
    ['deposited_at_relay', 'available_for_pickup'].includes(p.status)
  ).length || 0;

  return {
    relayParcels,
    recipientParcels,
    isLoading: relayLoading || recipientLoading,
    pendingCount,
    getParcelProofs,
    updateParcelStatus: updateParcelStatus.mutateAsync,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
    },
  };
};
