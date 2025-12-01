import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Phone, PhoneOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
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
  const channelRef = useRef<any>(null);
  const notificationRef = useRef<Notification | null>(null);
  const { startRinging, stopRinging } = useRingtone();
  const mountedRef = useRef(true);

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
      // Start ringing
      startRinging();
      
      // Show notification
      notificationRef.current = showCallNotification(
        incomingCall.habitationName,
        incomingCall.address
      );
      
      // Try to vibrate if supported
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200, 100, 200]);
      }
    } else {
      // Stop ringing
      stopRinging();
      
      // Close notification
      if (notificationRef.current) {
        notificationRef.current.close();
        notificationRef.current = null;
      }
      
      // Stop vibration
      if ("vibrate" in navigator) {
        navigator.vibrate(0);
      }
    }
  }, [incomingCall, startRinging, stopRinging]);

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

    const loadCallDetails = async (participantId: string, callId: string, habitationId: string) => {
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
          console.log("[IncomingCall] Incoming call details loaded:", habitation);
          setIncomingCall({
            participantId,
            callId,
            habitationId,
            habitationName: habitation.name,
            address: (habitation.anrs as any)?.address || "",
          });
          setError(null);
        }
      } catch (err) {
        console.error("[IncomingCall] Error loading details:", err);
        if (mountedRef.current) setError("Erreur de chargement");
      }
    };

    checkExistingCalls();

    // Subscribe to ALL call_participants changes (filter on client side for reliability)
    const channel = supabase
      .channel(`incoming-calls-${user.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_participants",
        },
        async (payload) => {
          console.log("[IncomingCall] Participant change detected:", payload.eventType, payload);
          
          if (payload.eventType === "INSERT") {
            const participant = payload.new as any;
            console.log("[IncomingCall] INSERT - user_id:", participant.user_id, "current user:", user.id);
            if (participant.user_id === user.id && participant.status === "ringing" && participant.role === "resident") {
              console.log("[IncomingCall] This is for us! Loading call details...");
              await loadCallDetails(participant.id, participant.call_id, participant.habitation_id);
            }
          } else if (payload.eventType === "UPDATE") {
            const participant = payload.new as any;
            if (participant.user_id === user.id && incomingCall?.participantId === participant.id && participant.status !== "ringing") {
              console.log("[IncomingCall] Our call no longer ringing, dismissing");
              if (mountedRef.current) setIncomingCall(null);
            }
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as any;
            if (incomingCall?.participantId === deleted.id) {
              console.log("[IncomingCall] Our participant deleted");
              if (mountedRef.current) setIncomingCall(null);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[IncomingCall] Channel subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("[IncomingCall] ✅ Successfully subscribed to realtime changes");
        } else if (status === "CHANNEL_ERROR") {
          console.error("[IncomingCall] ❌ Channel error - realtime may not work");
        }
      });

    channelRef.current = channel;

    // Also subscribe to call_logs status changes
    const callChannel = supabase
      .channel(`call-status-${user.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_logs",
        },
        (payload) => {
          console.log("[IncomingCall] Call log changed:", payload.eventType, payload);
          if (payload.eventType === "UPDATE") {
            const callLog = payload.new as any;
            if (incomingCall?.callId === callLog.id && callLog.status === "ended") {
              console.log("[IncomingCall] Call ended by caller");
              if (mountedRef.current) setIncomingCall(null);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[IncomingCall] Call logs channel status:", status);
      });

    return () => {
      console.log("[IncomingCall] Cleaning up subscriptions");
      supabase.removeChannel(channel);
      supabase.removeChannel(callChannel);
    };
  }, [user]);

  const handleAnswer = async () => {
    if (!incomingCall) return;
    
    console.log("[IncomingCall] Answering call:", incomingCall.callId);
    // Stop ringing immediately
    stopRinging();
    
    // Update participant status
    const { error: updateError } = await supabase
      .from("call_participants")
      .update({ status: "answered", joined_at: new Date().toISOString() })
      .eq("id", incomingCall.participantId);

    if (updateError) {
      console.error("[IncomingCall] Error updating status:", updateError);
    }

    // Navigate to call
    navigate(`/call/${incomingCall.callId}?resident=true`);
    setIncomingCall(null);
  };

  const handleDecline = async () => {
    if (!incomingCall || !user) return;

    console.log("[IncomingCall] Declining call:", incomingCall.callId);
    // Stop ringing immediately
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
      {/* Pulsing rings effect */}
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
