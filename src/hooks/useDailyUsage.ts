import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppConfig } from "@/hooks/useAppConfig";

export interface DailyUsageLog {
  id: string;
  call_id: string | null;
  room_name: string;
  duration_seconds: number;
  participant_count: number;
  participant_minutes: number;
  is_video: boolean;
  is_group_call: boolean;
  estimated_cost_usd: number;
  started_at: string | null;
  ended_at: string | null;
  synced_at: string;
}

export interface DailyUsageStats {
  totalCalls: number;
  totalMinutes: number;
  totalParticipantMinutes: number;
  totalCostUsd: number;
  videoCalls: number;
  audioCalls: number;
  groupCalls: number;
  averageDuration: number;
}

export const useDailyUsage = (period: "day" | "week" | "month" | "all" = "month") => {
  const [logs, setLogs] = useState<DailyUsageLog[]>([]);
  const [stats, setStats] = useState<DailyUsageStats>({
    totalCalls: 0,
    totalMinutes: 0,
    totalParticipantMinutes: 0,
    totalCostUsd: 0,
    videoCalls: 0,
    audioCalls: 0,
    groupCalls: 0,
    averageDuration: 0,
  });
  const [loading, setLoading] = useState(true);
  const { getConfig } = useAppConfig();

  const alertThreshold = parseFloat(getConfig("daily_cost_alert_threshold") || "50");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from("daily_usage_logs")
        .select("*")
        .order("started_at", { ascending: false });

      // Apply date filter
      const now = new Date();
      let startDate: Date | null = null;

      if (period === "day") {
        startDate = new Date(now.setHours(0, 0, 0, 0));
      } else if (period === "week") {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (period === "month") {
        startDate = new Date(now.setMonth(now.getMonth() - 1));
      }

      if (startDate) {
        query = query.gte("started_at", startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const typedLogs = (data || []) as DailyUsageLog[];
      setLogs(typedLogs);

      // Calculate stats
      const calculatedStats: DailyUsageStats = {
        totalCalls: typedLogs.length,
        totalMinutes: typedLogs.reduce((sum, log) => sum + (log.duration_seconds / 60), 0),
        totalParticipantMinutes: typedLogs.reduce((sum, log) => sum + log.participant_minutes, 0),
        totalCostUsd: typedLogs.reduce((sum, log) => sum + log.estimated_cost_usd, 0),
        videoCalls: typedLogs.filter((log) => log.is_video).length,
        audioCalls: typedLogs.filter((log) => !log.is_video).length,
        groupCalls: typedLogs.filter((log) => log.is_group_call).length,
        averageDuration: typedLogs.length > 0
          ? typedLogs.reduce((sum, log) => sum + log.duration_seconds, 0) / typedLogs.length / 60
          : 0,
      };

      setStats(calculatedStats);
    } catch (err) {
      console.error("[useDailyUsage] Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Log a call (called from useDaily when call ends)
  const logCall = async (callData: {
    callId: string;
    roomName: string;
    durationSeconds: number;
    participantCount: number;
    isVideo: boolean;
    isGroupCall: boolean;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const videoCost = parseFloat(getConfig("daily_cost_per_video_minute") || "0.004");
      const audioCost = parseFloat(getConfig("daily_cost_per_audio_minute") || "0.002");

      const participantMinutes = (callData.durationSeconds / 60) * callData.participantCount;
      const costPerMinute = callData.isVideo ? videoCost : audioCost;
      const estimatedCost = participantMinutes * costPerMinute;

      const { error } = await (supabase as any).from("daily_usage_logs").insert({
        call_id: callData.callId,
        room_name: callData.roomName,
        duration_seconds: callData.durationSeconds,
        participant_count: callData.participantCount,
        participant_minutes: participantMinutes,
        is_video: callData.isVideo,
        is_group_call: callData.isGroupCall,
        estimated_cost_usd: estimatedCost,
        started_at: new Date(Date.now() - callData.durationSeconds * 1000).toISOString(),
        ended_at: new Date().toISOString(),
      });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("[useDailyUsage] Error logging call:", err);
      return { success: false, error: err.message };
    }
  };

  const isOverBudget = stats.totalCostUsd > alertThreshold;

  return {
    logs,
    stats,
    loading,
    alertThreshold,
    isOverBudget,
    logCall,
    refetch: fetchLogs,
  };
};
