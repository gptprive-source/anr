import { useEffect, useState, useRef } from "react";
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
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const incomingCallRef = useRef<IncomingCall | null>(null);
  const notificationRef = useRef<Notification | null>(null);
  const { startRinging, stopRinging } = useRingtone();
  const isRingingRef = useRef(false);
  const showTimeRef = useRef<number>(0);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[IncomingCall] ${msg}`);
    setDebugLog(prev => [...prev.slice(-10), `${timestamp}: ${msg}`]);
  };

  // Keep ref in sync
  useEffect(() => {
    incomingCallRef.current = incomingCall;
    if (incomingCall) {
      showTimeRef.current = Date.now();
    }
  }, [incomingCall]);

  // Request notification permission
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Start ringtone when call appears
  useEffect(() => {
    if (incomingCall && !isRingingRef.current) {
      addLog("Démarrage sonnerie");
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

    addLog(`Démarrage polling pour ${user.id.slice(0, 8)}...`);

    const checkCalls = async () => {
      // Skip if already showing a call
      if (incomingCallRef.current) {
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
          addLog(`Erreur: ${error.message}`);
          return;
        }

        if (data && data.length > 0) {
          const p = data[0];
          addLog(`Appel trouvé: ${p.id.slice(0, 8)}...`);

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
            addLog(`Affichage appel: ${hab.name}`);
            setIncomingCall(callData);
          }
        }
      } catch (err: any) {
        addLog(`Exception: ${err.message}`);
      }
    };

    checkCalls();
    const interval = setInterval(checkCalls, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  // Cleanup on unmount only
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
    // Prevent accidental clicks - must be shown for at least 1 second
    if (Date.now() - showTimeRef.current < 1000) {
      addLog("Clic trop rapide, ignoré");
      return;
    }
    
    if (!incomingCall) return;
    
    addLog("RÉPONDRE cliqué");
    
    const callId = incomingCall.callId;
    const participantId = incomingCall.participantId;
    
    // Stop ringtone
    if (isRingingRef.current) {
      stopRinging();
      isRingingRef.current = false;
    }
    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }
    if ("vibrate" in navigator) navigator.vibrate(0);

    await supabase
      .from("call_participants")
      .update({ status: "answered", joined_at: new Date().toISOString() })
      .eq("id", participantId);

    setIncomingCall(null);
    navigate(`/call/${callId}?resident=true`);
  };

  const handleDecline = async () => {
    // Prevent accidental clicks - must be shown for at least 1 second
    if (Date.now() - showTimeRef.current < 1000) {
      addLog("Clic trop rapide, ignoré");
      return;
    }
    
    if (!incomingCall) return;

    addLog("REFUSER cliqué");
    
    const participantId = incomingCall.participantId;
    
    // Stop ringtone
    if (isRingingRef.current) {
      stopRinging();
      isRingingRef.current = false;
    }
    if (notificationRef.current) {
      notificationRef.current.close();
      notificationRef.current = null;
    }
    if ("vibrate" in navigator) navigator.vibrate(0);

    await supabase
      .from("call_participants")
      .update({ status: "declined", left_at: new Date().toISOString() })
      .eq("id", participantId);

    setIncomingCall(null);
  };

  // Debug panel (always visible at bottom)
  const DebugPanel = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-green-400 text-xs p-2 font-mono max-h-32 overflow-auto z-[10000]">
      <div className="font-bold mb-1">Debug IncomingCall:</div>
      {debugLog.length === 0 ? (
        <div>En attente...</div>
      ) : (
        debugLog.map((log, i) => <div key={i}>{log}</div>)
      )}
    </div>
  );

  // Show debug panel even when no call
  if (!incomingCall) {
    return <DebugPanel />;
  }

  return (
    <>
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
      <DebugPanel />
    </>
  );
};

export default IncomingCallListener;
