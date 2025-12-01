import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useCallManager = () => {
  const endCall = useCallback(async (callId: string) => {
    try {
      await supabase
        .from("call_logs")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", callId);

      await supabase
        .from("call_participants")
        .update({ status: "ended", left_at: new Date().toISOString() })
        .eq("call_id", callId);
    } catch (err) {
      console.error("[CallManager] End call error:", err);
    }
  }, []);

  const answerCall = useCallback(async (participantId: string) => {
    try {
      await supabase
        .from("call_participants")
        .update({ status: "answered", joined_at: new Date().toISOString() })
        .eq("id", participantId);
    } catch (err) {
      console.error("[CallManager] Answer call error:", err);
    }
  }, []);

  const declineCall = useCallback(async (participantId: string) => {
    try {
      await supabase
        .from("call_participants")
        .update({ status: "declined", left_at: new Date().toISOString() })
        .eq("id", participantId);
    } catch (err) {
      console.error("[CallManager] Decline call error:", err);
    }
  }, []);

  return { endCall, answerCall, declineCall };
};
