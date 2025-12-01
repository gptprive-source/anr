import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRingtone, requestNotificationPermission, showCallNotification } from "@/hooks/useRingtone";

interface IncomingCall {
  participantId: string;
  callId: string;
  habitationId: string;
  habitationName: string;
  address: string;
}

const POLL_INTERVAL = 2000;

const IncomingCallListener = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const incomingCallRef = useRef<IncomingCall | null>(null);
  const notificationRef = useRef<Notification | null>(null);
  const { startRinging, stopRinging } = useRingtone();
  const isRingingRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Start ringtone when call appears
  useEffect(() => {
    if (incomingCall && !isRingingRef.current) {
      console.log("[IncomingCall] Starting ringtone");
      isRingingRef.current = true;
      startRinging();
      notificationRef.current = showCallNotification(incomingCall.habitationName, incomingCall.address);
      if ("vibrate" in navigator) {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
    }
  }, [incomingCall, startRinging]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRingingRef.current) {
        stopRinging();
      }
      if (notificationRef.current) {
        notificationRef.current.close();
      }
    };
  }, [stopRinging]);

  // Polling for ringing calls
  useEffect(() => {
    if (!user) return;

    console.log("[IncomingCall] Starting poll for user:", user.id);

    const checkCalls = async () => {
      // Skip if already showing a call
      if (incomingCallRef.current) {
        console.log("[IncomingCall] Already showing call, skip poll");
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
          console.error("[IncomingCall] Poll error:", error);
          return;
        }

        if (data && data.length > 0) {
          const p = data[0];
          console.log("[IncomingCall] Found ringing participant:", p.id);

          // Fetch habitation details
          const { data: hab } = await supabase
            .from("habitations")
            .select("name, anrs(address)")
            .eq("id", p.habitation_id)
            .single();

          if (hab) {
            const callData: IncomingCall = {
              participantId: p.id,
              callId: p.call_id,
              habitationId: p.habitation_id,
              habitationName: hab.name,
              address: (hab.anrs as any)?.address || "",
            };
            console.log("[IncomingCall] Setting call:", callData);
            setIncomingCall(callData);
          }
        }
      } catch (err) {
        console.error("[IncomingCall] Error:", err);
      }
    };

    // Check immediately
    checkCalls();

    // Then poll
    const interval = setInterval(checkCalls, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  const stopCall = useCallback(() => {
    if (isRingingRef.current) {
      stopRinging();
      isRingingRef.current = false;
    }
    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }
    if ("vibrate" in navigator) {
      navigator.vibrate(0);
    }
    setIncomingCall(null);
  }, [stopRinging]);

  const handleAnswer = async () => {
    if (!incomingCall) return;
    
    console.log("[IncomingCall] Answering:", incomingCall.callId);
    const callId = incomingCall.callId;
    const participantId = incomingCall.participantId;
    
    stopCall();

    await supabase
      .from("call_participants")
      .update({ status: "answered", joined_at: new Date().toISOString() })
      .eq("id", participantId);

    navigate(`/call/${callId}?resident=true`);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;

    console.log("[IncomingCall] Declining:", incomingCall.callId);
    const participantId = incomingCall.participantId;
    
    stopCall();

    await supabase
      .from("call_participants")
      .update({ status: "declined", left_at: new Date().toISOString() })
      .eq("id", participantId);
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-6">
      <div className="relative mb-8">
        <div className="absolute inset-0 w-40 h-40 rounded-full bg-green-500/30 animate-ping" style={{ animationDuration: '1.5s' }} />
        <div className="absolute inset-0 w-40 h-40 rounded-full bg-green-500/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
        <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-2xl shadow-green-500/50">
          <Phone className="w-16 h-16 text-white animate-bounce" />
        </div>
      </div>

      <h2 className="text-3xl font-bold mb-2 text-white">📞 Appel entrant</h2>
      <p className="text-xl text-white mb-1">{incomingCall.habitationName}</p>
      <p className="text-slate-300 mb-12">{incomingCall.address}</p>

      <div className="flex gap-16">
        <div className="flex flex-col items-center gap-3">
          <Button 
            onClick={handleDecline}
            className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/50"
          >
            <PhoneOff className="w-10 h-10" />
          </Button>
          <span className="text-sm text-slate-300">Refuser</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Button 
            onClick={handleAnswer}
            className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-xl shadow-green-500/50 animate-pulse"
          >
            <Phone className="w-10 h-10" />
          </Button>
          <span className="text-sm text-slate-300">Répondre</span>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallListener;
