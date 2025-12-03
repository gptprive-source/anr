import { createContext, useContext, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { showIncomingCall, hideIncomingCall, isCallScreenVisible } from "@/lib/incomingCallRenderer";

interface IncomingCallContextType {
  clearIncomingCall: () => void;
}

const IncomingCallContext = createContext<IncomingCallContextType>({
  clearIncomingCall: () => {},
});

export const IncomingCallProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      console.log("[POLL] No user, skipping");
      return;
    }

    console.log("[POLL] Starting polling for user:", user.id);

    const checkForCalls = async () => {
      // Skip if already showing
      if (isCallScreenVisible()) {
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
          console.log("[POLL] User is muted");
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
    
    // Then every 2 seconds
    const interval = setInterval(checkForCalls, 2000);

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
