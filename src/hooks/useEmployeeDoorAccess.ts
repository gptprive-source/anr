import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SessionInfo {
  id: string;
  status: 'active' | 'completed' | 'pending';
  entry_at: string;
  exit_at: string | null;
  duration_seconds: number | null;
  anr_id: string;
  schedule_id: string | null;
  assignment_id: string | null;
}

interface CheckSessionResponse {
  action: 'ENTRY' | 'EXIT';
  session?: SessionInfo;
  schedule?: {
    id: string;
    name: string;
    instructions_for_visitor: string | null;
    require_face_recognition_entry: boolean;
    require_face_recognition_exit: boolean;
  };
  assignment?: {
    id: string;
    mission_notes: string | null;
    client_signature_required: boolean;
  };
  require_face: boolean;
  require_signature: boolean;
}

interface DoorResult {
  success: boolean;
  action: 'ENTRY' | 'EXIT';
  session_id?: string;
  relay_duration_ms?: number;
  error?: string;
}

export function useEmployeeDoorAccess() {
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<CheckSessionResponse | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionInfo | null>(null);
  const { toast } = useToast();

  // Vérifier si c'est une entrée ou sortie
  const checkSession = useCallback(async (anrId: string, deviceId?: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('check-door-session', {
        body: {
          anr_id: anrId,
          device_id: deviceId,
        },
      });

      if (response.error) throw new Error(response.error.message);

      const result = response.data as CheckSessionResponse;
      setSessionInfo(result);
      
      if (result.session) {
        setCurrentSession(result.session);
      }

      return result;
    } catch (error) {
      console.error('Erreur check session:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de vérifier la session",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Effectuer l'entrée
  const performEntry = useCallback(async (
    anrId: string,
    options?: {
      gps_latitude?: number;
      gps_longitude?: number;
      face_verified?: boolean; // Nouveau: indique si la vérification faciale a été faite côté client
      schedule_id?: string;
      assignment_id?: string;
    }
  ): Promise<DoorResult | null> => {
    setLoading(true);
    try {
      // Générer un token d'accès
      const tokenResponse = await supabase.functions.invoke('generate-door-token', {
        body: {
          anr_id: anrId,
          mode: 'SCHEDULED',
          scope: 'ENTRY_ONLY',
          schedule_id: options?.schedule_id,
        },
      });

      if (tokenResponse.error) throw new Error(tokenResponse.error.message);

      // Valider le token (simule l'ouverture de porte)
      const validateResponse = await supabase.functions.invoke('validate-door-token', {
        body: {
          token_id: tokenResponse.data.token.id,
          token_hash: tokenResponse.data.jws_token.split('.')[2],
          gps_latitude: options?.gps_latitude,
          gps_longitude: options?.gps_longitude,
          action: 'ENTRY',
          face_verified: options?.face_verified, // Transmettre le résultat de la vérification locale
        },
      });

      if (validateResponse.error) throw new Error(validateResponse.error.message);

      toast({
        title: "Entrée enregistrée",
        description: "Porte ouverte. Bonne journée !",
      });

      return {
        success: true,
        action: 'ENTRY',
        session_id: validateResponse.data.session_id,
        relay_duration_ms: validateResponse.data.relay_duration_ms,
      };
    } catch (error) {
      console.error('Erreur entrée:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'enregistrer l'entrée",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Effectuer la sortie
  const performExit = useCallback(async (
    anrId: string,
    sessionId: string,
    options?: {
      gps_latitude?: number;
      gps_longitude?: number;
      face_verified?: boolean; // Nouveau: indique si la vérification faciale a été faite côté client
      client_signature?: string;
      client_signature_name?: string;
      employee_report?: string;
    }
  ): Promise<DoorResult | null> => {
    setLoading(true);
    try {
      // Générer un token de sortie
      const tokenResponse = await supabase.functions.invoke('generate-door-token', {
        body: {
          anr_id: anrId,
          mode: 'SCHEDULED',
          scope: 'EXIT_ONLY',
        },
      });

      if (tokenResponse.error) throw new Error(tokenResponse.error.message);

      // Valider le token
      const validateResponse = await supabase.functions.invoke('validate-door-token', {
        body: {
          token_id: tokenResponse.data.token.id,
          token_hash: tokenResponse.data.jws_token.split('.')[2],
          gps_latitude: options?.gps_latitude,
          gps_longitude: options?.gps_longitude,
          action: 'EXIT',
          session_id: sessionId,
          face_verified: options?.face_verified, // Transmettre le résultat de la vérification locale
        },
      });

      if (validateResponse.error) throw new Error(validateResponse.error.message);

      // Mettre à jour l'assignment si signature client
      if (options?.client_signature) {
        const { data: session } = await supabase
          .from('door_access_sessions')
          .select('assignment_id')
          .eq('id', sessionId)
          .single();

        if (session?.assignment_id) {
          await supabase
            .from('pro_employee_assignments')
            .update({
              client_signature: options.client_signature,
              client_signature_name: options.client_signature_name,
              client_signature_at: new Date().toISOString(),
              employee_report: options.employee_report,
              status: 'completed',
            })
            .eq('id', session.assignment_id);
        }
      }

      setCurrentSession(null);
      
      toast({
        title: "Sortie enregistrée",
        description: "À bientôt !",
      });

      return {
        success: true,
        action: 'EXIT',
        session_id: sessionId,
        relay_duration_ms: validateResponse.data.relay_duration_ms,
      };
    } catch (error) {
      console.error('Erreur sortie:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'enregistrer la sortie",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    sessionInfo,
    currentSession,
    checkSession,
    performEntry,
    performExit,
  };
}
