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
  console.log("[IncomingCallDetection] 🎬 Hook function called, userId:", userId);
  
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const mountedRef = useRef(true);
  const incomingCallRef = useRef<IncomingCall | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    console.log("[IncomingCallDetection] 🟢 Hook mounted, userId:", userId);
    console.log("[IncomingCallDetection] 🔍 Starting initial check...");
    return () => {
      mountedRef.current = false;
      console.log("[IncomingCallDetection] 🔴 Hook unmounted");
    };
  }, [userId]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
    if (incomingCall) {
      console.log("[IncomingCallDetection] 📞 Incoming call state updated:", {
        callId: incomingCall.callId,
        habitation: incomingCall.habitationName,
        participantId: incomingCall.participantId
      });
    } else {
      console.log("[IncomingCallDetection] ❌ Incoming call cleared");
    }
  }, [incomingCall]);

  useEffect(() => {
    if (!userId) {
      console.log("[IncomingCallDetection] ⚠️ No userId, skipping polling");
      return;
    }

    console.log("[IncomingCallDetection] 🔄 Starting polling for userId:", userId);
    let intervalId: NodeJS.Timeout | null = null;

    const checkForIncomingCalls = async () => {
      pollCountRef.current++;
      const pollNum = pollCountRef.current;
      
      console.log(`[IncomingCallDetection] 🔍 Poll #${pollNum} - mounted:${mountedRef.current}, hasCall:${!!incomingCallRef.current}`);
      
      if (!mountedRef.current) {
        console.log(`[IncomingCallDetection] ⛔ Poll #${pollNum} - Component unmounted, skipping`);
        return;
      }
      
      if (incomingCallRef.current) {
        console.log(`[IncomingCallDetection] ⛔ Poll #${pollNum} - Already has call, STOPPING POLLING`);
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        return;
      }

      try {
        console.log(`[IncomingCallDetection] 📡 Poll #${pollNum} - Querying call_participants...`);
        
        const { data, error } = await supabase
          .from("call_participants")
          .select("id, call_id, habitation_id")
          .eq("user_id", userId)
          .eq("status", "ringing")
          .eq("role", "resident")
          .limit(1);

        console.log(`[IncomingCallDetection] 📊 Poll #${pollNum} - Query result:`, {
          error: error?.message,
          dataLength: data?.length,
          mounted: mountedRef.current
        });

        if (error) {
          console.error(`[IncomingCallDetection] ❌ Poll #${pollNum} - Query error:`, error);
          return;
        }
        
        if (!mountedRef.current) {
          console.log(`[IncomingCallDetection] ⛔ Poll #${pollNum} - Unmounted after query`);
          return;
        }

        if (data && data.length > 0) {
          const p = data[0];
          console.log(`[IncomingCallDetection] 🔔 Poll #${pollNum} - Ringing call found:`, {
            participantId: p.id,
            callId: p.call_id,
            habitationId: p.habitation_id
          });

          console.log(`[IncomingCallDetection] 📡 Poll #${pollNum} - Fetching habitation details...`);
          
          const { data: hab, error: habError } = await supabase
            .from("habitations")
            .select("name, anrs(address)")
            .eq("id", p.habitation_id)
            .single();

          console.log(`[IncomingCallDetection] 📊 Poll #${pollNum} - Habitation result:`, {
            error: habError?.message,
            hasData: !!hab,
            mounted: mountedRef.current,
            hasExistingCall: !!incomingCallRef.current
          });

          if (habError) {
            console.error(`[IncomingCallDetection] ❌ Poll #${pollNum} - Habitation error:`, habError);
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
            
            console.log(`[IncomingCallDetection] ✅ Poll #${pollNum} - Setting incoming call:`, newCall);
            setIncomingCall(newCall);
          } else {
            console.log(`[IncomingCallDetection] ⛔ Poll #${pollNum} - Cannot set call:`, {
              hasHab: !!hab,
              mounted: mountedRef.current,
              hasExistingCall: !!incomingCallRef.current
            });
          }
        } else {
          console.log(`[IncomingCallDetection] ℹ️ Poll #${pollNum} - No ringing calls found`);
        }
      } catch (err) {
        console.error(`[IncomingCallDetection] ❌ Poll #${pollNum} - Unexpected error:`, err);
      }
    };

    checkForIncomingCalls();
    intervalId = setInterval(checkForIncomingCalls, 2000);
    console.log("[IncomingCallDetection] ⏰ Polling interval started (2s)");

    return () => {
      console.log("[IncomingCallDetection] 🛑 Stopping polling interval");
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [userId]);

  const clearIncomingCall = () => {
    console.log("[IncomingCallDetection] 🧹 Clearing incoming call");
    setIncomingCall(null);
  };

  return { incomingCall, clearIncomingCall };
};
