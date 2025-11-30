import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Phone, PhoneOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

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
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;

    logger.log("[IncomingCall] Setting up listener for user:", user.id);

    // Check for existing ringing calls on mount
    const checkExistingCalls = async () => {
      const { data: ringingParticipants } = await supabase
        .from("call_participants")
        .select("id, call_id, habitation_id")
        .eq("user_id", user.id)
        .eq("status", "ringing")
        .eq("role", "resident")
        .order("created_at", { ascending: false })
        .limit(1);

      if (ringingParticipants && ringingParticipants.length > 0) {
        const participant = ringingParticipants[0];
        await loadCallDetails(participant.id, participant.call_id, participant.habitation_id);
      }
    };

    const loadCallDetails = async (participantId: string, callId: string, habitationId: string) => {
      try {
        const { data: habitation } = await supabase
          .from("habitations")
          .select("name, anrs(address)")
          .eq("id", habitationId)
          .single();

        if (habitation) {
          logger.log("[IncomingCall] Incoming call detected:", callId);
          setIncomingCall({
            participantId,
            callId,
            habitationId,
            habitationName: habitation.name,
            address: (habitation.anrs as any)?.address || "",
          });
        }
      } catch (err) {
        logger.error("[IncomingCall] Error loading details:", err);
      }
    };

    checkExistingCalls();

    // Subscribe to new call_participants
    const channel = supabase
      .channel(`incoming-calls-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_participants",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          logger.log("[IncomingCall] New participant:", payload);
          const participant = payload.new as any;
          if (participant.status === "ringing" && participant.role === "resident") {
            await loadCallDetails(participant.id, participant.call_id, participant.habitation_id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_participants",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const participant = payload.new as any;
          // If our participant was updated to something other than ringing, dismiss
          if (incomingCall?.participantId === participant.id && participant.status !== "ringing") {
            logger.log("[IncomingCall] Call no longer ringing");
            setIncomingCall(null);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "call_participants",
        },
        (payload) => {
          const deleted = payload.old as any;
          if (incomingCall?.participantId === deleted.id) {
            logger.log("[IncomingCall] Participant deleted");
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Also subscribe to call_logs status changes
    const callChannel = supabase
      .channel(`call-status-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_logs",
        },
        (payload) => {
          const callLog = payload.new as any;
          if (incomingCall?.callId === callLog.id && callLog.status === "ended") {
            logger.log("[IncomingCall] Call ended by caller");
            setIncomingCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(callChannel);
    };
  }, [user, incomingCall?.participantId, incomingCall?.callId]);

  const handleAnswer = async () => {
    if (!incomingCall) return;
    
    // Update participant status
    await supabase
      .from("call_participants")
      .update({ status: "answered", joined_at: new Date().toISOString() })
      .eq("id", incomingCall.participantId);

    // Navigate to call
    navigate(`/call/${incomingCall.callId}?resident=true`);
    setIncomingCall(null);
  };

  const handleDecline = async () => {
    if (!incomingCall || !user) return;

    await supabase
      .from("call_participants")
      .update({ status: "declined", left_at: new Date().toISOString() })
      .eq("id", incomingCall.participantId);

    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6">
      <div className="calling-animation mb-8">
        <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="w-16 h-16 text-primary" />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2">Appel entrant</h2>
      <p className="text-muted-foreground mb-1">{incomingCall.habitationName}</p>
      <p className="text-sm text-muted-foreground mb-8">{incomingCall.address}</p>

      <div className="flex gap-8">
        <Button variant="hangup" size="icon-xl" onClick={handleDecline}>
          <PhoneOff className="w-7 h-7" />
        </Button>
        <Button variant="call" size="icon-xl" onClick={handleAnswer}>
          <Phone className="w-7 h-7" />
        </Button>
      </div>
    </div>
  );
};

export default IncomingCallListener;