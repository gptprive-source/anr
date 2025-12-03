import { createContext, useContext, useRef, useEffect, ReactNode, useCallback } from "react";
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const checkForCalls = async () => {
      // Skip if screen already showing
      if (isCallScreenVisible()) return;

      try {
        // Check if muted
        const { data: resident } = await supabase
          .from("residents")
          .select("is_muted")
          .eq("user_id", user.id)
          .eq("status", "verified")
          .maybeSingle();

        if (resident?.is_muted) return;

        // Check for ringing calls
        const { data: calls } = await supabase
          .from("call_participants")
          .select("id, call_id, habitation_id")
          .eq("user_id", user.id)
          .eq("status", "ringing")
          .eq("role", "resident")
          .limit(1);

        if (!calls || calls.length === 0) return;

        const call = calls[0];

        // Get habitation info
        const { data: hab } = await supabase
          .from("habitations")
          .select("name, anrs(address)")
          .eq("id", call.habitation_id)
          .single();

        if (!hab) return;

        // Show the call screen
        showIncomingCall({
          participantId: call.id,
          callId: call.call_id,
          habitationName: hab.name,
          address: (hab.anrs as any)?.address || "",
        });
      } catch (err) {
        console.error("[IncomingCall] Error:", err);
      }
    };

    // Check immediately then every 2 seconds
    checkForCalls();
    intervalRef.current = setInterval(checkForCalls, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
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
