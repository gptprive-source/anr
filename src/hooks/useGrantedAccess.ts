import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface GrantedAccess {
  id: string;
  name: string;
  description: string | null;
  time_from: string;
  time_to: string;
  days_of_week: number[] | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  forward_calls_to_beneficiary: boolean | null;
  require_face_recognition_entry: boolean | null;
  require_face_recognition_exit: boolean | null;
  instructions_for_visitor: string | null;
  created_at: string;
  anr: {
    code: string;
    address: string;
  };
  grantor: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export function useGrantedAccess() {
  const [loading, setLoading] = useState(true);
  const [grantedAccess, setGrantedAccess] = useState<GrantedAccess[]>([]);
  const { user } = useAuth();

  const fetchGrantedAccess = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get user's profile to find their ANR code
      const { data: residentData } = await supabase
        .from('residents')
        .select(`
          habitation_id,
          habitations (
            anrs (
              code
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'verified')
        .maybeSingle();

      if (!residentData?.habitations?.anrs?.code) {
        setLoading(false);
        return;
      }

      const userAnrCode = (residentData.habitations.anrs as any).code;

      // Find all scheduled access where this user is the beneficiary (NOT the grantor)
      const { data: accessData, error } = await supabase
        .from('door_scheduled_access')
        .select(`
          id,
          name,
          description,
          time_from,
          time_to,
          days_of_week,
          valid_from,
          valid_until,
          is_active,
          forward_calls_to_beneficiary,
          require_face_recognition_entry,
          require_face_recognition_exit,
          instructions_for_visitor,
          created_at,
          granted_by,
          anr_id
        `)
        .eq('beneficiary_anr_code', userAnrCode)
        .neq('granted_by', user.id) // Exclude access the user granted themselves
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch ANR and grantor details for each access
      const enrichedAccess: GrantedAccess[] = await Promise.all(
        (accessData || []).map(async (access) => {
          // Get ANR info
          const { data: anrData } = await supabase
            .from('anrs')
            .select('code, address')
            .eq('id', access.anr_id)
            .single();

          // Get grantor profile
          const { data: grantorProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', access.granted_by)
            .single();

          return {
            id: access.id,
            name: access.name,
            description: access.description,
            time_from: access.time_from,
            time_to: access.time_to,
            days_of_week: access.days_of_week,
            valid_from: access.valid_from,
            valid_until: access.valid_until,
            is_active: access.is_active,
            forward_calls_to_beneficiary: access.forward_calls_to_beneficiary,
            require_face_recognition_entry: access.require_face_recognition_entry,
            require_face_recognition_exit: access.require_face_recognition_exit,
            instructions_for_visitor: access.instructions_for_visitor,
            created_at: access.created_at,
            anr: anrData || { code: '', address: '' },
            grantor: grantorProfile,
          };
        })
      );

      setGrantedAccess(enrichedAccess);
    } catch (error) {
      console.error('Error fetching granted access:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGrantedAccess();
  }, [fetchGrantedAccess]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('granted-access-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'door_scheduled_access',
        },
        () => {
          fetchGrantedAccess();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchGrantedAccess]);

  return {
    loading,
    grantedAccess,
    refetch: fetchGrantedAccess,
  };
}
