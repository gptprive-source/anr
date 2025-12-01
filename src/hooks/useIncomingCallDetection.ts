import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface IncomingCall {
  participantId: string;
  callId: string;
  habitationId: string;
  habitationName: string;
  address: string;
}

export const useIncomingCallDetection = (userId: string | undefined) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const mountedRef = useRef(true);
  const incomingCallRef = useRef<IncomingCall | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    if (!userId) return;

    const checkForIncomingCalls = async () => {
      if (!mountedRef.current || incomingCallRef.current) return;

      try {
        const { data, error } = await supabase
          .from("call_participants")
          .select("id, call_id, habitation_id")
          .eq("user_id", userId)
          .eq("status", "ringing")
          .eq("role", "resident")
          .limit(1);

        if (error || !mountedRef.current) return;

        if (data && data.length > 0) {
          const p = data[0];

          const { data: hab } = await supabase
            .from("habitations")
            .select("name, anrs(address)")
            .eq("id", p.habitation_id)
            .single();

          if (hab && mountedRef.current && !incomingCallRef.current) {
            setIncomingCall({
              participantId: p.id,
              callId: p.call_id,
              habitationId: p.habitation_id,
              habitationName: hab.name,
              address: (hab.anrs as any)?.address || "",
            });
          }
        }
      } catch (err) {
        console.error("[IncomingCallDetection] Error:", err);
      }
    };

    checkForIncomingCalls();
    const interval = setInterval(checkForIncomingCalls, 2000);

    return () => clearInterval(interval);
  }, [userId]);

  const clearIncomingCall = () => {
    setIncomingCall(null);
  };

  return { incomingCall, clearIncomingCall };
};
