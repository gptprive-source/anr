import { createContext, useContext, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { showIncomingCall, hideIncomingCall, isCallScreenVisible, getCurrentCallData } from "@/lib/incomingCallRenderer";

interface IncomingCallContextType {
  clearIncomingCall: () => void;
}

const IncomingCallContext = createContext<IncomingCallContextType>({
  clearIncomingCall: () => {},
});

export const IncomingCallProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  // Realtime subscription to immediately stop ringing when call status changes
  useEffect(() => {
    if (!user?.id) return;

    console.log("[REALTIME] Setting up call status subscription for user:", user.id);

    // Subscribe to both call_logs AND call_participants for faster response
    const callChannel = supabase
      .channel('call-status-realtime-v2')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_logs',
        },
        (payload) => {
          console.log("[REALTIME] Received call_logs update:", payload.new);
          const callLog = payload.new as any;
          const currentCall = getCurrentCallData();
          
          console.log("[REALTIME] Current call data:", currentCall?.callId, "Updated call:", callLog.id);
          console.log("[REALTIME] Call screen visible:", isCallScreenVisible());
          
          // If we're showing an incoming call screen and this call just ended, hide it
          if (currentCall && isCallScreenVisible() && callLog.id === currentCall.callId) {
            console.log("[REALTIME] Call IDs match, checking status:", callLog.status);
            if (callLog.status === "ended" || callLog.status === "declined" || callLog.status === "missed") {
              console.log("[REALTIME] ✅ Hiding incoming call screen immediately");
              hideIncomingCall();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_participants',
        },
        (payload) => {
          console.log("[REALTIME] Received call_participants update:", payload.new);
          const participant = payload.new as any;
          const currentCall = getCurrentCallData();
          
          // If our participant status changed from ringing, hide the screen
          if (currentCall && isCallScreenVisible() && participant.id === currentCall.participantId) {
            console.log("[REALTIME] Participant status changed to:", participant.status);
            if (participant.status !== "ringing") {
              console.log("[REALTIME] ✅ Participant no longer ringing, hiding screen");
              hideIncomingCall();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[REALTIME] Subscription status:", status);
      });

    return () => {
      console.log("[REALTIME] Removing call status channel");
      supabase.removeChannel(callChannel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      console.log("[POLL] No user, skipping");
      return;
    }

    console.log("[POLL] Starting polling for user:", user.id);

    const checkForCalls = async () => {
      const currentCall = getCurrentCallData();
      const screenVisible = isCallScreenVisible();
      
      console.log("[POLL] Check - Screen visible:", screenVisible, "currentCall:", currentCall?.callId);
      
      // ALWAYS check if screen is visible - if so, verify the call is still active
      if (screenVisible) {
        // If we have currentCall data, check that specific call
        if (currentCall) {
          console.log("[POLL] Checking specific call:", currentCall.callId);
          
          // Check both call_logs status AND participant status
          const [{ data: callLog }, { data: participant }] = await Promise.all([
            supabase
              .from("call_logs")
              .select("status")
              .eq("id", currentCall.callId)
              .single(),
            supabase
              .from("call_participants")
              .select("status")
              .eq("id", currentCall.participantId)
              .single()
          ]);
          
          console.log("[POLL] Call status:", callLog?.status, "Participant status:", participant?.status);
          
          // If call ended (visitor hung up) or declined, or participant no longer ringing, hide screen
          const callEnded = !callLog || callLog.status === "ended" || callLog.status === "missed" || callLog.status === "declined";
          const notRinging = !participant || participant.status !== "ringing";
          const answeredByOther = participant?.status === "call_answered_by_other";
          
          if (callEnded || notRinging || answeredByOther) {
            console.log("[POLL] ✅ Hiding screen - callEnded:", callEnded, "notRinging:", notRinging, "answeredByOther:", answeredByOther);
            hideIncomingCall();
            return;
          }
        } else {
          // Screen is visible but no currentCall data - check if user has ANY ringing calls
          console.log("[POLL] Screen visible but no currentCall - checking for any ringing calls");
          const { data: ringingCalls } = await supabase
            .from("call_participants")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "ringing")
            .eq("role", "resident")
            .limit(1);
          
          if (!ringingCalls || ringingCalls.length === 0) {
            console.log("[POLL] ✅ No ringing calls found - hiding screen");
            hideIncomingCall();
            return;
          }
        }
        return;
      }

      try {
        // Check if muted
        const { data: resident } = await supabase
          .from("residents")
          .select("is_muted")
          .eq("user_id", user.id)
          .eq("status", "verified")
          .maybeSingle();

        if (resident?.is_muted) {
          return;
        }

        // Check for ringing calls
        const { data: calls, error } = await supabase
          .from("call_participants")
          .select("id, call_id, habitation_id")
          .eq("user_id", user.id)
          .eq("status", "ringing")
          .eq("role", "resident")
          .limit(1);

        if (error) {
          console.error("[POLL] Error:", error);
          return;
        }

        if (!calls || calls.length === 0) {
          return;
        }

        const call = calls[0];
        console.log("[POLL] Found ringing call:", call.call_id);

        // IMPORTANT: Vérifier que le call_logs n'est pas déjà terminé
        const { data: callLog } = await supabase
          .from("call_logs")
          .select("status")
          .eq("id", call.call_id)
          .single();
        
        if (!callLog || callLog.status === "ended" || callLog.status === "missed") {
          console.log("[POLL] Call already ended, updating stale participant");
          // Nettoyer le participant stale
          await supabase
            .from("call_participants")
            .update({ status: "ended", left_at: new Date().toISOString() })
            .eq("id", call.id);
          return;
        }

        // Get habitation info
        const { data: hab } = await supabase
          .from("habitations")
          .select("name, anrs(address)")
          .eq("id", call.habitation_id)
          .single();

        if (!hab) {
          console.log("[POLL] No habitation found");
          return;
        }

        console.log("[POLL] Calling showIncomingCall");
        
        // Show the call screen
        showIncomingCall({
          participantId: call.id,
          callId: call.call_id,
          habitationName: hab.name,
          address: (hab.anrs as any)?.address || "",
        });
      } catch (err) {
        console.error("[POLL] Error:", err);
      }
    };

    // Check immediately
    checkForCalls();
    
    // Poll every 1.5 seconds for faster detection when visitor hangs up
    const interval = setInterval(checkForCalls, 1000);

    return () => {
      console.log("[POLL] Stopping polling");
      clearInterval(interval);
    };
  }, [user?.id]);

  const clearIncomingCall = useCallback(() => {
    hideIncomingCall();
  }, []);

  return (
    <IncomingCallContext.Provider value={{ clearIncomingCall }}>
      {children}
    </IncomingCallContext.Provider>
  );
};

export const useIncomingCall = () => useContext(IncomingCallContext);
