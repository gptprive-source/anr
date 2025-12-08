import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  anr_id: string | null;
}

interface UseRealtimeDoorLogsOptions {
  anrId: string | null;
  limit?: number;
  showNotifications?: boolean;
}

export function useRealtimeDoorLogs({
  anrId,
  limit = 50,
  showNotifications = true,
}: UseRealtimeDoorLogsOptions) {
  const [logs, setLogs] = useState<DoorAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLogCount, setNewLogCount] = useState(0);
  const { toast } = useToast();

  // Fetch initial logs
  const fetchLogs = useCallback(async () => {
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
      setLogs(data || []);
      setNewLogCount(0);
    } catch (error) {
      console.error('Error fetching door logs:', error);
    } finally {
      setLoading(false);
    }
  }, [anrId, limit]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!anrId) return;

    fetchLogs();

    // Create realtime subscription
    const channel: RealtimeChannel = supabase
      .channel(`door-logs-${anrId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'door_access_logs',
          filter: `anr_id=eq.${anrId}`,
        },
        (payload) => {
          console.log('New door access log:', payload);
          
          const newLog = payload.new as DoorAccessLog;
          
          // Add to logs list
          setLogs((prev) => [newLog, ...prev].slice(0, limit));
          setNewLogCount((prev) => prev + 1);

          // Show notification
          if (showNotifications) {
            const isSuccess = newLog.result === 'success';
            const actionLabel = newLog.action === 'ENTRY' ? 'Entrée' : 
                               newLog.action === 'EXIT' ? 'Sortie' : 
                               newLog.action;

            toast({
              title: isSuccess ? `${actionLabel} détectée` : `${actionLabel} échouée`,
              description: isSuccess 
                ? `Accès ${actionLabel.toLowerCase()} via ${newLog.method || 'BLE'}`
                : `Erreur: ${newLog.error_code || 'Inconnue'}`,
              variant: isSuccess ? 'default' : 'destructive',
            });

            // Vibrate on mobile
            if ('vibrate' in navigator) {
              navigator.vibrate(isSuccess ? [100] : [100, 50, 100]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [anrId, limit, showNotifications, fetchLogs, toast]);

  const markAsRead = useCallback(() => {
    setNewLogCount(0);
  }, []);

  return {
    logs,
    loading,
    newLogCount,
    refresh: fetchLogs,
    markAsRead,
  };
}
