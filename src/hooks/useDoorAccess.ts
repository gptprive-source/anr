import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DoorToken {
  id: string;
  anr_id: string;
  valid_from: string;
  valid_until: string;
  ttl_seconds: number;
  mode: string;
  scope: string;
}

interface BleConfig {
  service_uuid: string;
  token_char_uuid: string;
  result_char_uuid: string;
  time_sync_char_uuid: string;
}

interface GenerateTokenResponse {
  success: boolean;
  jws_token: string;
  token: DoorToken;
  ble: BleConfig;
}

interface DoorAccessLog {
  id: string;
  action: string;
  result: string;
  method: string | null;
  timestamp_server: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_distance_meters: number | null;
  visitor_user_id: string | null;
  employee_id: string | null;
  error_code: string | null;
  error_details: string | null;
  face_verified: boolean | null;
  face_confidence: number | null;
}

interface ScheduledAccess {
  id: string;
  name: string;
  description: string | null;
  time_from: string;
  time_to: string;
  days_of_week: number[] | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  beneficiary_first_name: string | null;
  beneficiary_last_name: string | null;
  beneficiary_anr_code: string | null;
  forward_calls_to_beneficiary: boolean | null;
  require_face_recognition_entry: boolean | null;
  require_face_recognition_exit: boolean | null;
}

export function useDoorAccess(anrId: string | null) {
  const [loading, setLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<GenerateTokenResponse | null>(null);
  const [accessLogs, setAccessLogs] = useState<DoorAccessLog[]>([]);
  const [scheduledAccess, setScheduledAccess] = useState<ScheduledAccess[]>([]);
  const { toast } = useToast();

  // Générer un token d'accès ponctuel
  const generateToken = useCallback(async (options?: {
    mode?: 'SINGLE' | 'SCHEDULED' | 'EMERGENCY';
    scope?: 'OPEN_DOOR' | 'ENTRY_ONLY' | 'EXIT_ONLY';
    ttl_seconds?: number;
    granted_to_user?: string;
    granted_to_company?: string;
    granted_to_employee?: string;
    call_id?: string;
  }) => {
    if (!anrId) {
      toast({
        title: "Erreur",
        description: "ANR non spécifié",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Non authentifié');
      }

      const response = await supabase.functions.invoke('generate-door-token', {
        body: {
          anr_id: anrId,
          mode: options?.mode || 'SINGLE',
          scope: options?.scope || 'OPEN_DOOR',
          ttl_seconds: options?.ttl_seconds,
          granted_to_user: options?.granted_to_user,
          granted_to_company: options?.granted_to_company,
          granted_to_employee: options?.granted_to_employee,
          call_id: options?.call_id,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data as GenerateTokenResponse;
      setGeneratedToken(result);

      toast({
        title: "Token généré",
        description: `Valide pendant ${result.token.ttl_seconds} secondes`,
      });

      return result;
    } catch (error) {
      console.error('Erreur génération token:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de générer le token",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [anrId, toast]);

  // Récupérer l'historique des accès
  const fetchAccessLogs = useCallback(async (limit = 50) => {
    if (!anrId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('door_access_logs')
        .select('*')
        .eq('anr_id', anrId)
        .order('timestamp_server', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setAccessLogs(data || []);
    } catch (error) {
      console.error('Erreur récupération logs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des accès",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [anrId, toast]);

  // Récupérer les accès programmés
  const fetchScheduledAccess = useCallback(async () => {
    if (!anrId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('door_scheduled_access')
        .select('*')
        .eq('anr_id', anrId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScheduledAccess(data || []);
    } catch (error) {
      console.error('Erreur récupération accès programmés:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les accès programmés",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [anrId, toast]);

  // Notifier le bénéficiaire
  const notifyBeneficiary = useCallback(async (accessId: string, action: 'created' | 'updated' | 'deleted') => {
    try {
      await supabase.functions.invoke('notify-scheduled-access', {
        body: { access_id: accessId, action },
      });
    } catch (error) {
      console.error('Erreur notification:', error);
      // Ne pas bloquer si la notification échoue
    }
  }, []);

  // Créer un accès programmé
  const createScheduledAccess = useCallback(async (access: {
    name: string;
    description?: string;
    time_from: string;
    time_to: string;
    days_of_week?: number[];
    valid_from?: string;
    valid_until?: string;
    beneficiary_first_name: string;
    beneficiary_last_name: string;
    beneficiary_anr_code: string;
    forward_calls_to_beneficiary?: boolean;
    require_face_recognition_entry?: boolean;
    require_face_recognition_exit?: boolean;
    max_entries_per_day?: number;
    instructions_for_visitor?: string;
  }) => {
    if (!anrId) return null;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('door_scheduled_access')
        .insert({
          anr_id: anrId,
          granted_by: user.id,
          name: access.name,
          description: access.description,
          time_from: access.time_from,
          time_to: access.time_to,
          days_of_week: access.days_of_week,
          valid_from: access.valid_from,
          valid_until: access.valid_until,
          beneficiary_first_name: access.beneficiary_first_name,
          beneficiary_last_name: access.beneficiary_last_name,
          beneficiary_anr_code: access.beneficiary_anr_code,
          forward_calls_to_beneficiary: access.forward_calls_to_beneficiary || false,
          require_face_recognition_entry: access.require_face_recognition_entry,
          require_face_recognition_exit: access.require_face_recognition_exit,
          max_entries_per_day: access.max_entries_per_day,
          instructions_for_visitor: access.instructions_for_visitor,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Notifier le bénéficiaire par email
      await notifyBeneficiary(data.id, 'created');

      toast({
        title: "Accès programmé créé",
        description: `${access.name} ajouté - Le bénéficiaire a été notifié par email`,
      });

      await fetchScheduledAccess();
      return data;
    } catch (error) {
      console.error('Erreur création accès programmé:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'accès programmé",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [anrId, toast, fetchScheduledAccess, notifyBeneficiary]);

  // Modifier un accès programmé
  const updateScheduledAccess = useCallback(async (accessId: string, updates: Partial<ScheduledAccess>) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('door_scheduled_access')
        .update(updates)
        .eq('id', accessId);

      if (error) throw error;

      // Notifier le bénéficiaire de la modification
      await notifyBeneficiary(accessId, 'updated');

      toast({
        title: "Accès modifié",
        description: "Le bénéficiaire a été notifié par email",
      });

      await fetchScheduledAccess();
    } catch (error) {
      console.error('Erreur modification accès:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'accès",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, fetchScheduledAccess, notifyBeneficiary]);

  // Supprimer un accès programmé
  const deleteScheduledAccess = useCallback(async (accessId: string) => {
    setLoading(true);
    try {
      // Notifier avant suppression
      await notifyBeneficiary(accessId, 'deleted');

      const { error } = await supabase
        .from('door_scheduled_access')
        .delete()
        .eq('id', accessId);

      if (error) throw error;

      toast({
        title: "Accès supprimé",
        description: "Le bénéficiaire a été notifié par email",
      });

      await fetchScheduledAccess();
    } catch (error) {
      console.error('Erreur suppression accès:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'accès",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, fetchScheduledAccess, notifyBeneficiary]);

  // Activer/désactiver un accès programmé
  const toggleScheduledAccess = useCallback(async (accessId: string, isActive: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('door_scheduled_access')
        .update({ is_active: isActive })
        .eq('id', accessId);

      if (error) throw error;

      toast({
        title: isActive ? "Accès activé" : "Accès désactivé",
      });

      await fetchScheduledAccess();
    } catch (error) {
      console.error('Erreur toggle accès:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'accès",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, fetchScheduledAccess]);

  return {
    loading,
    generatedToken,
    accessLogs,
    scheduledAccess,
    generateToken,
    fetchAccessLogs,
    fetchScheduledAccess,
    createScheduledAccess,
    updateScheduledAccess,
    deleteScheduledAccess,
    toggleScheduledAccess,
  };
}
