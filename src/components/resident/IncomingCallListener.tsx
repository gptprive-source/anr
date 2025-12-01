import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Phone, PhoneOff } from "lucide-react";
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
  const [isProcessing, setIsProcessing] = useState(false);
  const incomingCallRef = useRef<IncomingCall | null>(null);
  const notificationRef = useRef<Notification | null>(null);
  const { startRinging, stopRinging } = useRingtone();
  const isRingingRef = useRef(false);
  const mountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    console.log("[IncomingCall] Mounted");
    return () => {
      mountedRef.current = false;
      console.log("[IncomingCall] Unmounted");
    };
  }, []);

  // Keep ref in sync
  useEffect(() => {
    incomingCallRef.current = incomingCall;
    if (incomingCall) {
      console.log("[IncomingCall] Call displayed:", incomingCall.habitationName);
    }
  }, [incomingCall]);

  // Request notification permission
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

  // Polling for ringing calls
  useEffect(() => {
    if (!user) return;

    console.log("[IncomingCall] Polling started");

    const checkCalls = async () => {
      if (!mountedRef.current || incomingCallRef.current) return;

      try {
        const { data, error } = await supabase
          .from("call_participants")
          .select("id, call_id, habitation_id")
          .eq("user_id", user.id)
          .eq("status", "ringing")
          .eq("role", "resident")
          .limit(1);

        if (error || !mountedRef.current) return;

        if (data && data.length > 0) {
          const p = data[0];
          console.log("[IncomingCall] Ringing call found");

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
      } catch (err: any) {
        console.error("[IncomingCall] Error:", err.message);
      }
    };

    checkCalls();
    const interval = setInterval(checkCalls, 2000);
    return () => clearInterval(interval);
  }, [user]);

  // Cleanup on unmount
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

  const stopAllAlerts = useCallback(() => {
    if (isRingingRef.current) {
      stopRinging();
      isRingingRef.current = false;
    }
    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }
    if ("vibrate" in navigator) navigator.vibrate(0);
  }, [stopRinging]);

  const handleAnswer = async () => {
    console.log("[IncomingCall] ANSWER clicked");
    if (isProcessing || !incomingCall) return;
    
    setIsProcessing(true);
    const callId = incomingCall.callId;
    const participantId = incomingCall.participantId;
    
    stopAllAlerts();

    try {
      await supabase
        .from("call_participants")
        .update({ status: "answered", joined_at: new Date().toISOString() })
        .eq("id", participantId);
      
      setIncomingCall(null);
      navigate(`/call/${callId}?resident=true`);
    } catch (err: any) {
      console.error("[IncomingCall] Error:", err.message);
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    console.log("[IncomingCall] DECLINE clicked");
    if (isProcessing || !incomingCall) return;
    
    setIsProcessing(true);
    const participantId = incomingCall.participantId;
    
    stopAllAlerts();

    try {
      await supabase
        .from("call_participants")
        .update({ status: "declined", left_at: new Date().toISOString() })
        .eq("id", participantId);
      
      setIncomingCall(null);
    } catch (err: any) {
      console.error("[IncomingCall] Error:", err.message);
    }
    setIsProcessing(false);
  };

  if (!incomingCall) {
    return null;
  }

  // Style inline simple et compatible Android
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#1e293b',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '24px'
    }}>
      {/* Icon */}
      <div style={{
        width: '120px',
        height: '120px',
        borderRadius: '60px',
        backgroundColor: '#22c55e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '32px',
        boxShadow: '0 0 40px rgba(34, 197, 94, 0.5)'
      }}>
        <Phone style={{ width: '48px', height: '48px', color: 'white' }} />
      </div>

      {/* Text */}
      <h2 style={{ 
        fontSize: '28px', 
        fontWeight: 'bold', 
        color: 'white', 
        marginBottom: '8px',
        textAlign: 'center'
      }}>
        📞 Appel entrant
      </h2>
      <p style={{ 
        fontSize: '20px', 
        color: 'white', 
        marginBottom: '4px',
        textAlign: 'center'
      }}>
        {incomingCall.habitationName}
      </p>
      <p style={{ 
        fontSize: '16px', 
        color: '#94a3b8', 
        marginBottom: '48px',
        textAlign: 'center'
      }}>
        {incomingCall.address}
      </p>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '64px' }}>
        {/* Decline */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleDecline}
            disabled={isProcessing}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '40px',
              backgroundColor: '#ef4444',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: isProcessing ? 0.5 : 1,
              boxShadow: '0 10px 30px rgba(239, 68, 68, 0.4)'
            }}
          >
            <PhoneOff style={{ width: '40px', height: '40px', color: 'white' }} />
          </button>
          <span style={{ fontSize: '14px', color: '#94a3b8' }}>Refuser</span>
        </div>

        {/* Answer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleAnswer}
            disabled={isProcessing}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '40px',
              backgroundColor: '#22c55e',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: isProcessing ? 0.5 : 1,
              boxShadow: '0 10px 30px rgba(34, 197, 94, 0.4)'
            }}
          >
            <Phone style={{ width: '40px', height: '40px', color: 'white' }} />
          </button>
          <span style={{ fontSize: '14px', color: '#94a3b8' }}>Répondre</span>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallListener;
