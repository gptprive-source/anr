import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SecurityAnomaly {
  id: string;
  anomaly_type: 'gps_distance_exceeded' | 'call_duration_exceeded' | 'nfc_outside_perimeter';
  severity: 'warning' | 'critical';
  call_id: string | null;
  anr_id: string | null;
  habitation_id: string | null;
  visitor_latitude: number | null;
  visitor_longitude: number | null;
  anr_latitude: number | null;
  anr_longitude: number | null;
  distance_meters: number | null;
  max_allowed_distance_meters: number | null;
  call_duration_seconds: number | null;
  max_allowed_duration_seconds: number | null;
  details: Record<string, any> | null;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
  // Joined data
  anr?: { code: string; address: string } | null;
  habitation?: { name: string } | null;
}

interface AnomalyStats {
  total: number;
  unacknowledged: number;
  gpsDistanceCount: number;
  callDurationCount: number;
  nfcPerimeterCount: number;
  last24Hours: number;
  last7Days: number;
}

export const useSecurityAnomalies = () => {
  const queryClient = useQueryClient();

  // Fetch all anomalies
  const { data: anomalies, isLoading: isLoadingAnomalies, refetch: refetchAnomalies } = useQuery({
    queryKey: ['security_anomalies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_anomalies')
        .select(`
          *,
          anr:anrs(code, address),
          habitation:habitations(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as unknown as SecurityAnomaly[];
    },
  });

  // Calculate stats
  const stats: AnomalyStats = {
    total: anomalies?.length || 0,
    unacknowledged: anomalies?.filter(a => !a.is_acknowledged).length || 0,
    gpsDistanceCount: anomalies?.filter(a => a.anomaly_type === 'gps_distance_exceeded').length || 0,
    callDurationCount: anomalies?.filter(a => a.anomaly_type === 'call_duration_exceeded').length || 0,
    nfcPerimeterCount: anomalies?.filter(a => a.anomaly_type === 'nfc_outside_perimeter').length || 0,
    last24Hours: anomalies?.filter(a => {
      const date = new Date(a.created_at);
      return date > new Date(Date.now() - 24 * 60 * 60 * 1000);
    }).length || 0,
    last7Days: anomalies?.filter(a => {
      const date = new Date(a.created_at);
      return date > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }).length || 0,
  };

  // Acknowledge anomaly
  const acknowledgeAnomaly = useMutation({
    mutationFn: async (anomalyId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('security_anomalies')
        .update({
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id
        })
        .eq('id', anomalyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security_anomalies'] });
    },
  });

  // Scan for new anomalies (calls the detection functions)
  const scanForAnomalies = useMutation({
    mutationFn: async () => {
      // Detect GPS distance anomalies
      const { data: gpsAnomalies, error: gpsError } = await supabase
        .rpc('detect_gps_distance_anomalies');

      if (gpsError) {
        console.error('GPS anomaly detection error:', gpsError);
      } else if (gpsAnomalies && gpsAnomalies.length > 0) {
        // Insert new GPS anomalies
        for (const anomaly of gpsAnomalies) {
          await supabase.from('security_anomalies').insert({
            anomaly_type: 'gps_distance_exceeded',
            severity: anomaly.distance_m > anomaly.max_distance_m * 3 ? 'critical' : 'warning',
            call_id: anomaly.call_id,
            anr_id: anomaly.anr_id,
            habitation_id: anomaly.habitation_id,
            visitor_latitude: anomaly.visitor_lat,
            visitor_longitude: anomaly.visitor_lon,
            anr_latitude: anomaly.anr_lat,
            anr_longitude: anomaly.anr_lon,
            distance_meters: anomaly.distance_m,
            max_allowed_distance_meters: anomaly.max_distance_m,
            details: { call_started_at: anomaly.call_started_at }
          });
        }
      }

      // Detect call duration anomalies
      const { data: durationAnomalies, error: durationError } = await supabase
        .rpc('detect_call_duration_anomalies');

      if (durationError) {
        console.error('Duration anomaly detection error:', durationError);
      } else if (durationAnomalies && durationAnomalies.length > 0) {
        // Insert new duration anomalies
        for (const anomaly of durationAnomalies) {
          const exceededBy = anomaly.duration_seconds / anomaly.max_duration_seconds;
          await supabase.from('security_anomalies').insert({
            anomaly_type: 'call_duration_exceeded',
            severity: exceededBy > 2 ? 'critical' : 'warning',
            call_id: anomaly.call_id,
            habitation_id: anomaly.habitation_id,
            call_duration_seconds: anomaly.duration_seconds,
            max_allowed_duration_seconds: anomaly.max_duration_seconds,
            details: { 
              call_started_at: anomaly.call_started_at,
              call_ended_at: anomaly.call_ended_at
            }
          });
        }
      }

      return {
        gpsCount: gpsAnomalies?.length || 0,
        durationCount: durationAnomalies?.length || 0
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security_anomalies'] });
    },
  });

  return {
    anomalies,
    stats,
    isLoading: isLoadingAnomalies,
    refetch: refetchAnomalies,
    acknowledgeAnomaly: acknowledgeAnomaly.mutate,
    isAcknowledging: acknowledgeAnomaly.isPending,
    scanForAnomalies: scanForAnomalies.mutate,
    isScanning: scanForAnomalies.isPending,
  };
};
