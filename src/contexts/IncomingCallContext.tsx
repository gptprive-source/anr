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
  const mountedRef = useRef(true);
  const isPollingRef = useRef(false);
  const currentCallIdRef = useRef<string | null>(null);

  console.log("[IncomingCallContext] 🔄 Provider render, userId:", user?.id || "NO_USER");

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      hideIncomingCall();
    };
  }, []);

  // Polling for incoming calls
  useEffect(() => {
    if (!user?.id) {
      console.log("[IncomingCallContext] ⚠️ No userId, not polling");
      return;
    }

    console.log("[IncomingCallContext] 🚀 Starting polling for userId:", user.id);

    const checkForIncomingCalls = async () => {
      // Skip if already have a call displayed or already polling
      if (isCallScreenVisible()) {
        console.log("[IncomingCallContext] ⏭️ Call screen visible, skipping poll");
        return;
      }

      if (!mountedRef.current) {
        console.log("[IncomingCallContext] ⏭️ Unmounted, skipping poll");
        return;
      }

      if (isPollingRef.current) {
        console.log("[IncomingCallContext] ⏭️ Already polling, skipping");
        return;
      }

      isPollingRef.current = true;

      try {
        const { data, error } = await supabase
          .from("call_participants")
          .select("id, call_id, habitation_id")
          .eq("user_id", user.id)
          .eq("status", "ringing")
          .eq("role", "resident")
          .limit(1);

        if (error) {
          console.error("[IncomingCallContext] ❌ Query error:", error);
          return;
        }

        if (!mountedRef.current || isCallScreenVisible()) return;

        if (data && data.length > 0) {
          const p = data[0];
          console.log("[IncomingCallContext] 🔔 Ringing call found:", p.call_id);

          // Avoid showing same call twice
          if (currentCallIdRef.current === p.call_id) {
            console.log("[IncomingCallContext] ⏭️ Same call, skipping");
            return;
          }

          const { data: hab, error: habError } = await supabase
            .from("habitations")
            .select("name, anrs(address)")
            .eq("id", p.habitation_id)
            .single();

          if (habError) {
            console.error("[IncomingCallContext] ❌ Habitation error:", habError);
            return;
          }

          if (hab && mountedRef.current && !isCallScreenVisible()) {
            currentCallIdRef.current = p.call_id;
            
            // Use vanilla JS renderer instead of React state
            showIncomingCall({
              participantId: p.id,
              callId: p.call_id,
              habitationName: hab.name,
              address: (hab.anrs as any)?.address || "",
            });
          }
        }
      } catch (err) {
        console.error("[IncomingCallContext] ❌ Unexpected error:", err);
      } finally {
        isPollingRef.current = false;
      }
    };

    // Initial check
    checkForIncomingCalls();

    // Setup interval
    intervalRef.current = setInterval(checkForIncomingCalls, 2000);

    return () => {
      console.log("[IncomingCallContext] 🛑 Stopping polling");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.id]);

  const clearIncomingCall = useCallback(() => {
    console.log("[IncomingCallContext] 🧹 Clearing incoming call");
    hideIncomingCall();
    currentCallIdRef.current = null;
  }, []);

  return (
    <IncomingCallContext.Provider value={{ clearIncomingCall }}>
      {children}
    </IncomingCallContext.Provider>
  );
};

export const useIncomingCall = () => {
  const context = useContext(IncomingCallContext);
  if (!context) {
    throw new Error("useIncomingCall must be used within an IncomingCallProvider");
  }
  return context;
};
