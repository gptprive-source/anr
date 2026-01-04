import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type RelayStatus = 'draft' | 'identity_verified' | 'contract_signed' | 'anr_assigned' | 'training_validated' | 'active' | 'suspended';
export type RelayType = 'professional' | 'individual';

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
  // New fields from machine state migration
  status: RelayStatus;
  relay_type: RelayType;
  company_name: string | null;
  legal_form: string | null;
  siret: string | null;
  legal_representative_name: string | null;
  id_document_url: string | null;
  id_document_verso_url?: string | null;
  address_proof_url: string | null;
  contract_signed_at: string | null;
  training_completed_at: string | null;
  training_score: number | null;
  deposit_earnings: number;
  pickup_earnings: number;
  rate_per_deposit: number;
  rate_per_pickup: number;
  suspended_at: string | null;
  suspended_reason: string | null;
  suspended_by: string | null;
}

export interface CreateRelayPointData {
  anr_id: string;
  display_name: string;
  phone?: string;
  max_capacity?: number;
  accepted_parcel_types?: string[];
  availability_schedule?: Record<string, { from: string; to: string }>;
  iban?: string;
  relay_address?: string;
  // New KYC fields
  relay_type?: RelayType;
  company_name?: string;
  legal_form?: string;
  siret?: string;
  legal_representative_name?: string;
  id_document_url?: string;
  id_document_verso_url?: string;
  address_proof_url?: string;
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

      // Create the relay point
      const { data: result, error } = await supabase
        .from('relay_points')
        .insert({
          user_id: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      // Automatically create a free relay badge doming order
      const { error: domingError } = await supabase
        .from('doming_orders')
        .insert({
          user_id: user.id,
          anr_id: data.anr_id,
          quantity: 1,
          unit_price: 0,
          total_price: 0,
          is_free: true,
          status: 'paid',
          order_type: 'relay_badge',
          shipping_address: null, // Will be filled from ANR address
        });

      if (domingError) {
        console.error('Error creating relay badge:', domingError);
        // Don't throw - relay point was created successfully
      }

      // Notify admin and applicant of new relay application
      try {
        // Get ANR address for the notification
        const { data: anrData } = await supabase
          .from('anrs')
          .select('address')
          .eq('id', data.anr_id)
          .single();

        // Get admin email from config
        const { data: configData } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'support_email')
          .single();

        const adminEmail = configData?.value ? String(configData.value).replace(/"/g, '') : null;

        // 1. Notify admin
        if (adminEmail) {
          await supabase.functions.invoke('notify-relay-carrier', {
            body: {
              type: 'relay_application_received',
              data: {
                email: adminEmail,
                relay_name: data.display_name,
                phone: data.phone || 'Non renseigné',
                address: anrData?.address || 'Adresse inconnue',
                max_capacity: data.max_capacity || 50,
                created_at: new Date().toLocaleDateString('fr-FR'),
                dashboard_url: `${window.location.origin}/admin/relay`,
              }
            }
          });
        }

        // 2. Send confirmation to the applicant
        await supabase.functions.invoke('notify-relay-carrier', {
          body: {
            type: 'relay_registration_confirmation',
            data: {
              user_id: user.id,
              relay_name: data.display_name,
              address: anrData?.address || 'Adresse inconnue',
              relay_type: data.relay_type === 'professional' ? 'Professionnel' : 'Particulier',
              max_capacity: data.max_capacity || 50,
              created_at: new Date().toLocaleDateString('fr-FR'),
            }
          }
        });
      } catch (notifyError) {
        console.error('Error sending notification emails:', notifyError);
        // Don't throw - relay point was created successfully
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relay_point'] });
      queryClient.invalidateQueries({ queryKey: ['admin-doming-orders'] });
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
