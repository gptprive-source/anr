import { useState, useEffect, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { PhoneOff, Mic, MicOff, Eye, Users2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDaily } from "@/hooks/useDaily";
import { supabase } from "@/integrations/supabase/client";
import VideoCall from "./VideoCall";
import { logger } from "@/lib/logger";

type CallState = "ringing" | "connecting" | "connected" | "ended";

interface CallInterfaceProps {
  isResident?: boolean;
  callerName?: string;
  anrAddress?: string;
  callId?: string;
  habitationId?: string;
  userId?: string;
}

const CallInterface = memo(({ 
  isResident = false, 
  callerName = "Visiteur", 
  anrAddress = "Adresse",
  callId = `call-${Date.now()}`,
  habitationId = "",
  userId,
}: CallInterfaceProps) => {
  const navigate = useNavigate();
  const [callState, setCallState] = useState<CallState>(isResident ? "ringing" : "connecting");
  const hasJoinedRef = useRef(false);
  const channelRef = useRef<any>(null);

  const {
    isJoined,
    isLoading,
    error,
    isMuted,
    isVideoEnabled,
    videoMode,
    localVideoTrack,
    remoteVideoTrack,
    localAudioTrack,
    remoteAudioTrack,
    joinCall,
    leaveCall,
    toggleMute,
    setVideoMode,
  } = useDaily({
    callId,
    isResident,
    onCallConnected: () => {
      logger.log("[CallInterface] Connected to Daily room");
      setCallState("connected");
    },
    onCallEnded: () => {
      logger.log("[CallInterface] Daily call ended");
      setCallState("ended");
    },
  });

  // Visitor: auto-join on mount
  useEffect(() => {
    if (!isResident && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      logger.log("[CallInterface] Visitor auto-joining");
      joinCall();
    }
  }, [isResident, joinCall]);

  // Resident: auto-join since they already clicked "answer" from IncomingCallListener
  useEffect(() => {
    if (isResident && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      logger.log("[CallInterface] Resident auto-joining");
      joinCall();
    }
  }, [isResident, joinCall]);

  // Subscribe to call status changes
  useEffect(() => {
    if (!callId) return;

    const channel = supabase
      .channel(`call-interface-${callId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_logs",
          filter: `id=eq.${callId}`,
        },
        (payload) => {
          const callLog = payload.new as any;
          if (callLog.status === "ended") {
            logger.log("[CallInterface] Call ended by other party");
            setCallState("ended");
            leaveCall();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId, leaveCall]);

  // Update call state based on Daily connection
  useEffect(() => {
    if (isJoined && callState !== "ended") {
      setCallState("connected");
    } else if (isLoading && callState !== "ended") {
      setCallState("connecting");
    }
  }, [isJoined, isLoading, callState]);

  // Auto-navigate back when call ends
  useEffect(() => {
    if (callState === "ended") {
      const timeout = setTimeout(() => {
        navigate(-1);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [callState, navigate]);

  const handleHangup = async () => {
    logger.log("[CallInterface] Hanging up");
    
    if (callId) {
      await supabase
        .from("call_logs")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", callId);

      await supabase
        .from("call_participants")
        .update({ status: "ended", left_at: new Date().toISOString() })
        .eq("call_id", callId);
    }

    await leaveCall();
    setCallState("ended");
  };

  // Resident toggles video mode: off -> simple (see visitor) -> off
  const handleVisioSimple = () => {
    if (videoMode === "simple") {
      setVideoMode("off");
    } else {
      setVideoMode("simple");
    }
  };

  // Note: "Visio double" is NOT implemented because resident NEVER sends video
  // This is a one-way intercom: visitor is always seen, resident is never seen

  // Build streams from tracks
  const localStream = (localVideoTrack || localAudioTrack)
    ? new MediaStream([localVideoTrack, localAudioTrack].filter(Boolean) as MediaStreamTrack[])
    : null;
  
  const remoteStream = (remoteVideoTrack || remoteAudioTrack)
    ? new MediaStream([remoteVideoTrack, remoteAudioTrack].filter(Boolean) as MediaStreamTrack[])
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <VideoCall
        localStream={localStream}
        remoteStream={remoteStream}
        showLocalVideo={false} // Resident never shows their own video
        callerName={callerName}
        isConnected={isJoined && callState === "connected"}
        isVideoEnabled={videoMode === "simple" || !isResident} // Show remote video when in simple mode or if visitor
        isMuted={isMuted}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-background/80 to-transparent z-10">
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-1">
            {isResident ? "Appel avec visiteur" : "Appel vers"}
          </p>
          <h2 className="text-2xl font-bold mb-1">{callerName}</h2>
          <p className="text-muted-foreground text-sm">{anrAddress}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="absolute top-24 left-4 right-4 z-20">
          <div className="bg-destructive/20 border border-destructive/50 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        </div>
      )}

      {/* Status overlay */}
      {callState === "connecting" && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20">
          <div className="calling-animation px-6 py-3 rounded-full bg-primary/20 border border-primary/30">
            <span className="text-primary font-medium">Connexion...</span>
          </div>
        </div>
      )}

      {callState === "ended" && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20">
          <div className="px-6 py-4 rounded-lg bg-secondary border border-border text-center">
            <p className="text-foreground font-medium mb-4">Appel terminé</p>
            <Button variant="glass" onClick={() => window.history.back()}>
              Retour
            </Button>
          </div>
        </div>
      )}

      {/* Controls */}
      {callState !== "ended" && (
        <div className="glass-effect border-t border-border p-6 relative z-30">
          <div className="flex justify-center gap-3 flex-wrap">
            {/* RESIDENT CONTROLS */}
            {isResident && (
              <>
                {/* Visio Simple: voir le visiteur */}
                <Button 
                  variant={videoMode === "simple" ? "default" : "secondary"} 
                  size="sm"
                  onClick={handleVisioSimple}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  <span>Visio simple</span>
                </Button>

                {/* Visio Double: désactivé car le résident n'est jamais vu */}
                <Button 
                  variant="secondary" 
                  size="sm"
                  disabled
                  className="flex items-center gap-2 opacity-50"
                  title="Le résident n'est jamais visible par le visiteur"
                >
                  <Users2 className="w-5 h-5" />
                  <span>Visio double</span>
                </Button>

                {/* Mute */}
                <Button 
                  variant={isMuted ? "destructive" : "secondary"} 
                  size="sm"
                  onClick={toggleMute}
                  className="flex items-center gap-2"
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  <span>{isMuted ? "Unmute" : "Mute"}</span>
                </Button>
              </>
            )}

            {/* Raccrocher - pour tous */}
            <Button variant="hangup" size="sm" onClick={handleHangup} className="flex items-center gap-2">
              <PhoneOff className="w-5 h-5" />
              <span>Raccrocher</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

CallInterface.displayName = "CallInterface";

export default CallInterface;