import { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface IncomingCall {
  participantId: string;
  callId: string;
  habitationId: string;
  habitationName: string;
  address: string;
}

interface IncomingCallContextType {
  incomingCall: IncomingCall | null;
  clearIncomingCall: () => void;
}

const IncomingCallContext = createContext<IncomingCallContextType>({
  incomingCall: null,
  clearIncomingCall: () => {},
});

export const IncomingCallProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const incomingCallRef = useRef<IncomingCall | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  console.log("[IncomingCallContext] 🔄 Provider render, userId:", user?.id || "NO_USER", "hasCall:", !!incomingCall);

  // Sync ref with state
  useEffect(() => {
    incomingCallRef.current = incomingCall;
    console.log("[IncomingCallContext] 📞 Call state updated:", incomingCall?.callId || "null");
  }, [incomingCall]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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
      // Skip if already have a call
      if (incomingCallRef.current) {
        console.log("[IncomingCallContext] ⏭️ Already have call, skipping poll");
        return;
      }

      if (!mountedRef.current) {
        console.log("[IncomingCallContext] ⏭️ Unmounted, skipping poll");
        return;
      }

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

        if (!mountedRef.current || incomingCallRef.current) return;

        if (data && data.length > 0) {
          const p = data[0];
          console.log("[IncomingCallContext] 🔔 Ringing call found:", p.call_id);

          const { data: hab, error: habError } = await supabase
            .from("habitations")
            .select("name, anrs(address)")
            .eq("id", p.habitation_id)
            .single();

          if (habError) {
            console.error("[IncomingCallContext] ❌ Habitation error:", habError);
            return;
          }

          if (hab && mountedRef.current && !incomingCallRef.current) {
            const newCall = {
              participantId: p.id,
              callId: p.call_id,
              habitationId: p.habitation_id,
              habitationName: hab.name,
              address: (hab.anrs as any)?.address || "",
            };
            console.log("[IncomingCallContext] ✅ Setting incoming call:", newCall.callId);
            setIncomingCall(newCall);
          }
        }
      } catch (err) {
        console.error("[IncomingCallContext] ❌ Unexpected error:", err);
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
    setIncomingCall(null);
    incomingCallRef.current = null;
  }, []);

  return (
    <IncomingCallContext.Provider value={{ incomingCall, clearIncomingCall }}>
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
