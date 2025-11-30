import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Phone, PhoneOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IncomingCall {
  callId: string;
  habitationId: string;
  habitationName: string;
  address: string;
  startedAt: string;
}

const IncomingCallListener = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!user) return;

    // Subscribe to call_participants for this user
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
          console.log("[IncomingCall] New participant:", payload);
          
          const participant = payload.new as any;
          if (participant.status !== "ringing" || participant.role !== "resident") return;

          // Fetch call details
          try {
            const { data: callLog } = await supabase
              .from("call_logs")
              .select("id, habitation_id, started_at")
              .eq("id", participant.call_id)
              .single();

            if (!callLog) return;

            const { data: habitation } = await supabase
              .from("habitations")
              .select("name, anrs(address)")
              .eq("id", callLog.habitation_id)
              .single();

            if (habitation) {
              setIncomingCall({
                callId: callLog.id,
                habitationId: callLog.habitation_id,
                habitationName: habitation.name,
                address: (habitation.anrs as any)?.address || "",
                startedAt: callLog.started_at,
              });
            }
          } catch (err) {
            console.error("[IncomingCall] Error fetching details:", err);
          }
        }
      )
      .subscribe();

    // Also check for existing ringing calls on mount
    const checkExistingCalls = async () => {
      const { data: ringingParticipants } = await supabase
        .from("call_participants")
        .select("call_id, habitation_id")
        .eq("user_id", user.id)
        .eq("status", "ringing")
        .eq("role", "resident")
        .order("created_at", { ascending: false })
        .limit(1);

      if (ringingParticipants && ringingParticipants.length > 0) {
        const participant = ringingParticipants[0];
        
        const { data: callLog } = await supabase
          .from("call_logs")
          .select("id, habitation_id, started_at")
          .eq("id", participant.call_id)
          .single();

        if (callLog) {
          const { data: habitation } = await supabase
            .from("habitations")
            .select("name, anrs(address)")
            .eq("id", callLog.habitation_id)
            .single();

          if (habitation) {
            setIncomingCall({
              callId: callLog.id,
              habitationId: callLog.habitation_id,
              habitationName: habitation.name,
              address: (habitation.anrs as any)?.address || "",
              startedAt: callLog.started_at,
            });
          }
        }
      }
    };

    checkExistingCalls();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleAnswer = () => {
    if (!incomingCall) return;
    navigate(`/call/${incomingCall.callId}?resident=true`, {
      state: { 
        callId: incomingCall.callId,
        habitationId: incomingCall.habitationId,
      }
    });
    setIncomingCall(null);
  };

  const handleDecline = async () => {
    if (!incomingCall || !user) return;

    await supabase
      .from("call_participants")
      .update({ status: "declined", left_at: new Date().toISOString() })
      .eq("call_id", incomingCall.callId)
      .eq("user_id", user.id);

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