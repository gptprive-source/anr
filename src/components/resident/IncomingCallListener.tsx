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
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const incomingCallRef = useRef<IncomingCall | null>(null);
  const notificationRef = useRef<Notification | null>(null);
  const { startRinging, stopRinging } = useRingtone();
  const isRingingRef = useRef(false);
  const showTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[IncomingCall] ${msg}`);
    setDebugLog(prev => [...prev.slice(-15), `${timestamp}: ${msg}`]);
  }, []);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    addLog("Composant monté");
    return () => {
      mountedRef.current = false;
      addLog("Composant démonté");
    };
  }, [addLog]);

  // Keep ref in sync
  useEffect(() => {
    incomingCallRef.current = incomingCall;
    if (incomingCall) {
      showTimeRef.current = Date.now();
      addLog(`Appel affiché: ${incomingCall.habitationName}`);
    }
  }, [incomingCall, addLog]);

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
  }, [incomingCall, startRinging, addLog]);

  // Polling for ringing calls
  useEffect(() => {
    if (!user) return;

    addLog(`Polling démarré pour user`);

    const checkCalls = async () => {
      if (!mountedRef.current) return;
      if (incomingCallRef.current) return;

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
          addLog(`Appel ringing trouvé`);

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
        addLog(`Erreur: ${err.message}`);
      }
    };

    checkCalls();
    const interval = setInterval(checkCalls, 2000);

    return () => clearInterval(interval);
  }, [user, addLog]);

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

  const handleAnswer = useCallback(async () => {
    addLog(`RÉPONDRE cliqué`);
    
    if (isProcessing || !incomingCall) {
      addLog("Ignoré: déjà en cours ou pas d'appel");
      return;
    }
    
    setIsProcessing(true);
    addLog("Traitement réponse...");
    
    const callId = incomingCall.callId;
    const participantId = incomingCall.participantId;
    
    stopAllAlerts();

    try {
      await supabase
        .from("call_participants")
        .update({ status: "answered", joined_at: new Date().toISOString() })
        .eq("id", participantId);
      
      addLog("Status mis à jour, navigation...");
      setIncomingCall(null);
      navigate(`/call/${callId}?resident=true`);
    } catch (err: any) {
      addLog(`Erreur: ${err.message}`);
      setIsProcessing(false);
    }
  }, [incomingCall, isProcessing, navigate, stopAllAlerts, addLog]);

  const handleDecline = useCallback(async () => {
    addLog(`REFUSER cliqué`);
    
    if (isProcessing || !incomingCall) {
      addLog("Ignoré: déjà en cours ou pas d'appel");
      return;
    }
    
    setIsProcessing(true);
    addLog("Traitement refus...");
    
    const participantId = incomingCall.participantId;
    
    stopAllAlerts();

    try {
      await supabase
        .from("call_participants")
        .update({ status: "declined", left_at: new Date().toISOString() })
        .eq("id", participantId);
      
      addLog("Appel refusé");
      setIncomingCall(null);
    } catch (err: any) {
      addLog(`Erreur: ${err.message}`);
    }
    setIsProcessing(false);
  }, [incomingCall, isProcessing, stopAllAlerts, addLog]);

  // Debug panel
  const DebugPanel = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-black/95 text-green-400 text-xs p-2 font-mono max-h-40 overflow-auto z-[10001]">
      <div className="font-bold mb-1 text-yellow-400">🔍 Debug ({user ? "connecté" : "non connecté"}):</div>
      {debugLog.length === 0 ? (
        <div>En attente d'événements...</div>
      ) : (
        debugLog.map((log, i) => <div key={i}>{log}</div>)
      )}
    </div>
  );

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
        <p className="text-slate-300 mb-8">{incomingCall.address}</p>
        <div className="flex gap-16">
          <div className="flex flex-col items-center gap-3">
            <Button 
              variant="destructive"
              size="lg"
              onClick={handleDecline}
              disabled={isProcessing}
              className="w-20 h-20 rounded-full text-white shadow-xl flex items-center justify-center"
            >
              <PhoneOff className="w-10 h-10" />
            </Button>
            <span className="text-sm text-slate-300">Refuser</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Button 
              variant="default"
              size="lg"
              onClick={handleAnswer}
              disabled={isProcessing}
              className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-xl animate-pulse flex items-center justify-center"
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
