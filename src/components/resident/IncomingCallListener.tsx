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

const POLL_INTERVAL = 2000; // Check every 2 seconds

const IncomingCallListener = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const notificationRef = useRef<Notification | null>(null);
  const { startRinging, stopRinging } = useRingtone();
  const isRingingRef = useRef(false);
  const pollIntervalRef = useRef<number | null>(null);

  // Start/stop ringtone based on call state
  const updateRingtone = useCallback((call: IncomingCall | null) => {
    if (call && !isRingingRef.current) {
      console.log("[IncomingCall] Starting ringtone for:", call.habitationName);
      isRingingRef.current = true;
      startRinging();
      
      // Show notification
      if (notificationRef.current) {
        notificationRef.current.close();
      }
      notificationRef.current = showCallNotification(call.habitationName, call.address);
      
      // Vibrate
      if ("vibrate" in navigator) {
        navigator.vibrate([500, 200, 500, 200, 500]);
      }
    } else if (!call && isRingingRef.current) {
      console.log("[IncomingCall] Stopping ringtone");
      isRingingRef.current = false;
      stopRinging();
      
      if (notificationRef.current) {
        notificationRef.current.close();
        notificationRef.current = null;
      }
      
      if ("vibrate" in navigator) {
        navigator.vibrate(0);
      }
    }
  }, [startRinging, stopRinging]);

  // Fetch call details from database
  const fetchCallDetails = useCallback(async (participantId: string, callId: string, habitationId: string): Promise<IncomingCall | null> => {
    try {
      const { data: habitation, error } = await supabase
        .from("habitations")
        .select("name, anrs(address)")
        .eq("id", habitationId)
        .single();

      if (error || !habitation) {
        console.error("[IncomingCall] Error fetching habitation:", error);
        return null;
      }

      return {
        participantId,
        callId,
        habitationId,
        habitationName: habitation.name,
        address: (habitation.anrs as any)?.address || "",
      };
    } catch (err) {
      console.error("[IncomingCall] Error:", err);
      return null;
    }
  }, []);

  // Check for ringing calls in database
  const checkForRingingCalls = useCallback(async () => {
    if (!user) return;

    try {
      const { data: participants, error } = await supabase
        .from("call_participants")
        .select("id, call_id, habitation_id, status")
        .eq("user_id", user.id)
        .eq("status", "ringing")
        .eq("role", "resident")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("[IncomingCall] Poll error:", error);
        return;
      }

      if (participants && participants.length > 0) {
        const participant = participants[0];
        
        // Check if we already have this call displayed
        if (incomingCall?.participantId === participant.id) {
          return; // Already showing this call
        }

        console.log("[IncomingCall] Found ringing call:", participant.id);
        const callDetails = await fetchCallDetails(participant.id, participant.call_id, participant.habitation_id);
        
        if (callDetails) {
          setIncomingCall(callDetails);
          updateRingtone(callDetails);
        }
      }
    } catch (err) {
      console.error("[IncomingCall] Poll error:", err);
    }
  }, [user, incomingCall?.participantId, fetchCallDetails, updateRingtone]);

  // Request notification permission
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Set up polling
  useEffect(() => {
    if (!user) {
      console.log("[IncomingCall] No user, skipping setup");
      return;
    }

    console.log("[IncomingCall] Setting up polling for user:", user.id);

    // Initial check
    checkForRingingCalls();

    // Start polling
    pollIntervalRef.current = window.setInterval(() => {
      checkForRingingCalls();
    }, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [user, checkForRingingCalls]);

  // Cleanup ringtone on unmount
  useEffect(() => {
    return () => {
      if (isRingingRef.current) {
        stopRinging();
        isRingingRef.current = false;
      }
      if (notificationRef.current) {
        notificationRef.current.close();
      }
    };
  }, [stopRinging]);

  const handleAnswer = async () => {
    if (!incomingCall) return;
    
    console.log("[IncomingCall] Answering call:", incomingCall.callId);
    
    // Stop ringtone immediately
    updateRingtone(null);
    
    // Update participant status in database
    await supabase
      .from("call_participants")
      .update({ status: "answered", joined_at: new Date().toISOString() })
      .eq("id", incomingCall.participantId);

    // Navigate to call page
    const callId = incomingCall.callId;
    setIncomingCall(null);
    navigate(`/call/${callId}?resident=true`);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;

    console.log("[IncomingCall] Declining call:", incomingCall.callId);
    
    // Stop ringtone immediately
    updateRingtone(null);

    // Update participant status in database
    await supabase
      .from("call_participants")
      .update({ status: "declined", left_at: new Date().toISOString() })
      .eq("id", incomingCall.participantId);

    setIncomingCall(null);
  };

  // Don't render anything if no incoming call
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
