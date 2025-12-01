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

const IncomingCallListener = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notificationRef = useRef<Notification | null>(null);
  const { startRinging, stopRinging } = useRingtone();
  const mountedRef = useRef(true);
  
  // Use ref to track incoming call for realtime handlers (avoids stale closure)
  const incomingCallRef = useRef<IncomingCall | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  // Request notification permission on mount
  useEffect(() => {
    mountedRef.current = true;
    requestNotificationPermission();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Handle ringtone and notification when call state changes
  useEffect(() => {
    if (incomingCall) {
      console.log("[IncomingCall] Call detected, starting ringtone:", incomingCall);
      startRinging();
      
      notificationRef.current = showCallNotification(
        incomingCall.habitationName,
        incomingCall.address
      );
      
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200, 100, 200]);
      }
    } else {
      stopRinging();
      
      if (notificationRef.current) {
        notificationRef.current.close();
        notificationRef.current = null;
      }
      
      if ("vibrate" in navigator) {
        navigator.vibrate(0);
      }
    }
  }, [incomingCall, startRinging, stopRinging]);

  const loadCallDetails = useCallback(async (participantId: string, callId: string, habitationId: string) => {
    // Don't load if we already have this call
    if (incomingCallRef.current?.participantId === participantId) {
      console.log("[IncomingCall] Already showing this call, skipping");
      return;
    }

    try {
      console.log("[IncomingCall] Loading call details for:", { participantId, callId, habitationId });
      const { data: habitation, error: habError } = await supabase
        .from("habitations")
        .select("name, anrs(address)")
        .eq("id", habitationId)
        .single();

      if (habError) {
        console.error("[IncomingCall] Error fetching habitation:", habError);
        if (mountedRef.current) setError("Erreur lors du chargement des détails");
        return;
      }

      if (habitation && mountedRef.current) {
        console.log("[IncomingCall] Setting incoming call:", habitation.name);
        const callData = {
          participantId,
          callId,
          habitationId,
          habitationName: habitation.name,
          address: (habitation.anrs as any)?.address || "",
        };
        setIncomingCall(callData);
        setError(null);
      }
    } catch (err) {
      console.error("[IncomingCall] Error loading details:", err);
      if (mountedRef.current) setError("Erreur de chargement");
    }
  }, []);

  const dismissCall = useCallback((reason: string) => {
    console.log("[IncomingCall] Dismissing call:", reason);
    if (mountedRef.current) {
      setIncomingCall(null);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      console.log("[IncomingCall] No user, skipping listener setup");
      return;
    }

    console.log("[IncomingCall] Setting up listener for user:", user.id);

    // Check for existing ringing calls on mount
    const checkExistingCalls = async () => {
      try {
        console.log("[IncomingCall] Checking for existing ringing calls...");
        const { data: ringingParticipants, error: fetchError } = await supabase
          .from("call_participants")
          .select("id, call_id, habitation_id")
          .eq("user_id", user.id)
          .eq("status", "ringing")
          .eq("role", "resident")
          .order("created_at", { ascending: false })
          .limit(1);

        if (fetchError) {
          console.error("[IncomingCall] Error fetching participants:", fetchError);
          return;
        }

        console.log("[IncomingCall] Found ringing participants:", ringingParticipants);
        if (ringingParticipants && ringingParticipants.length > 0) {
          const participant = ringingParticipants[0];
          await loadCallDetails(participant.id, participant.call_id, participant.habitation_id);
        }
      } catch (err) {
        console.error("[IncomingCall] Error in checkExistingCalls:", err);
      }
    };

    checkExistingCalls();

    const channelId = `incoming-calls-${user.id}-${Date.now()}`;
    console.log("[IncomingCall] Creating channel:", channelId);

    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_participants",
        },
        async (payload) => {
          console.log("[IncomingCall] Participant change:", payload.eventType, payload.new);
          
          if (payload.eventType === "INSERT") {
            const participant = payload.new as any;
            if (participant.user_id === user.id && participant.status === "ringing" && participant.role === "resident") {
              console.log("[IncomingCall] New ringing call for us!");
              await loadCallDetails(participant.id, participant.call_id, participant.habitation_id);
            }
          } else if (payload.eventType === "UPDATE") {
            const participant = payload.new as any;
            const currentCall = incomingCallRef.current;
            if (currentCall && participant.id === currentCall.participantId && participant.status !== "ringing") {
              dismissCall(`Status changed to ${participant.status}`);
            }
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as any;
            const currentCall = incomingCallRef.current;
            if (currentCall && deleted.id === currentCall.participantId) {
              dismissCall("Participant deleted");
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[IncomingCall] Participants channel:", status);
      });

    const callChannelId = `call-status-${user.id}-${Date.now()}`;
    const callChannel = supabase
      .channel(callChannelId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_logs",
        },
        (payload) => {
          const callLog = payload.new as any;
          const currentCall = incomingCallRef.current;
          if (currentCall && callLog.id === currentCall.callId && callLog.status === "ended") {
            dismissCall("Call ended by caller");
          }
        }
      )
      .subscribe((status) => {
        console.log("[IncomingCall] Call logs channel:", status);
      });

    return () => {
      console.log("[IncomingCall] Cleaning up subscriptions");
      supabase.removeChannel(channel);
      supabase.removeChannel(callChannel);
    };
  }, [user, loadCallDetails, dismissCall]);

  const handleAnswer = async () => {
    if (!incomingCall) return;
    
    console.log("[IncomingCall] Answering call:", incomingCall.callId);
    stopRinging();
    
    const { error: updateError } = await supabase
      .from("call_participants")
      .update({ status: "answered", joined_at: new Date().toISOString() })
      .eq("id", incomingCall.participantId);

    if (updateError) {
      console.error("[IncomingCall] Error updating status:", updateError);
    }

    navigate(`/call/${incomingCall.callId}?resident=true`);
    setIncomingCall(null);
  };

  const handleDecline = async () => {
    if (!incomingCall || !user) return;

    console.log("[IncomingCall] Declining call:", incomingCall.callId);
    stopRinging();

    await supabase
      .from("call_participants")
      .update({ status: "declined", left_at: new Date().toISOString() })
      .eq("id", incomingCall.participantId);

    setIncomingCall(null);
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

      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}

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
