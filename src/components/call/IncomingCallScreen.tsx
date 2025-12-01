import { useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useRingtone, requestNotificationPermission, showCallNotification } from "@/hooks/useRingtone";
import { useEffect, useRef } from "react";

interface IncomingCallScreenProps {
  participantId: string;
  callId: string;
  habitationName: string;
  address: string;
  onDismiss: () => void;
}

const IncomingCallScreen = ({
  participantId,
  callId,
  habitationName,
  address,
  onDismiss,
}: IncomingCallScreenProps) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const { startRinging, stopRinging } = useRingtone();
  const notificationRef = useRef<Notification | null>(null);
  const isRingingRef = useRef(false);

  useEffect(() => {
    console.log("[IncomingCallScreen] 🎬 Screen mounted for call:", callId);
    requestNotificationPermission();
    
    if (!isRingingRef.current) {
      console.log("[IncomingCallScreen] 🔔 Starting ringtone and alerts");
      isRingingRef.current = true;
      startRinging();
      notificationRef.current = showCallNotification(habitationName, address);
      
      if ("vibrate" in navigator) {
        navigator.vibrate([500, 200, 500, 200, 500]);
        console.log("[IncomingCallScreen] 📳 Vibration started");
      }
    }

    return () => {
      console.log("[IncomingCallScreen] 🛑 Screen unmounting, stopping alerts");
      stopRinging();
      if (notificationRef.current) {
        notificationRef.current.close();
      }
      if ("vibrate" in navigator) {
        navigator.vibrate(0);
      }
    };
  }, [startRinging, stopRinging, habitationName, address, callId]);

  const handleAnswer = async () => {
    console.log("[IncomingCallScreen] ✅ ANSWER clicked for call:", callId);
    if (isProcessing) {
      console.log("[IncomingCallScreen] ⚠️ Already processing, ignoring");
      return;
    }
    setIsProcessing(true);
    stopRinging();

    try {
      console.log("[IncomingCallScreen] 📝 Updating participant status to answered:", participantId);
      await supabase
        .from("call_participants")
        .update({ status: "answered", joined_at: new Date().toISOString() })
        .eq("id", participantId);

      console.log("[IncomingCallScreen] 🚀 Navigating to call interface");
      onDismiss();
      navigate(`/call/${callId}?resident=true`);
    } catch (err) {
      console.error("[IncomingCallScreen] ❌ Answer error:", err);
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    console.log("[IncomingCallScreen] ❌ DECLINE clicked for call:", callId);
    if (isProcessing) {
      console.log("[IncomingCallScreen] ⚠️ Already processing, ignoring");
      return;
    }
    setIsProcessing(true);
    stopRinging();

    try {
      console.log("[IncomingCallScreen] 📝 Updating participant status to declined:", participantId);
      await supabase
        .from("call_participants")
        .update({ status: "declined", left_at: new Date().toISOString() })
        .eq("id", participantId);

      console.log("[IncomingCallScreen] ✅ Call declined, dismissing screen");
      onDismiss();
    } catch (err) {
      console.error("[IncomingCallScreen] ❌ Decline error:", err);
    }
    setIsProcessing(false);
  };

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
        {habitationName}
      </p>
      
      <p style={{ 
        fontSize: '16px', 
        color: '#94a3b8', 
        marginBottom: '48px',
        textAlign: 'center'
      }}>
        {address}
      </p>

      <div style={{ display: 'flex', gap: '64px' }}>
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

export default IncomingCallScreen;
