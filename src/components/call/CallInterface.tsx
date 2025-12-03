import { useState, useEffect, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { PhoneOff, Mic, MicOff, Eye, Users2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDaily } from "@/hooks/useDaily";
import { useMultiResidentCall } from "@/hooks/useMultiResidentCall";
import { supabase } from "@/integrations/supabase/client";
import VideoCall from "./VideoCall";
import GroupCallPanel from "./GroupCallPanel";
import InviteResidentsPanel from "./InviteResidentsPanel";
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

  // Multi-resident call management
  const {
    participants,
    activeParticipants,
    availableResidents,
    startGroupCall,
  } = useMultiResidentCall({
    callId,
    habitationId,
    userId,
    isVisitor: !isResident,
  });

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

  // Individual hangup - only ends call if no other residents are active
  const handleHangup = async () => {
    logger.log("[CallInterface] Hanging up");
    
    // Leave Daily first
    await leaveCall();
    
    if (callId && userId && isResident) {
      // Update MY participant to "left"
      await supabase
        .from("call_participants")
        .update({ status: "left", left_at: new Date().toISOString() })
        .eq("call_id", callId)
        .eq("user_id", userId);
      
      // Check if there are other active residents
      const { data: activeResidents } = await supabase
        .from("call_participants")
        .select("id")
        .eq("call_id", callId)
        .eq("role", "resident")
        .in("status", ["answered", "in_group"]);
      
      // Only end the call if NO other residents are active
      if (!activeResidents || activeResidents.length === 0) {
        logger.log("[CallInterface] No other active residents, ending call");
        await supabase
          .from("call_logs")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("id", callId);
        
        // End visitor participant too
        await supabase
          .from("call_participants")
          .update({ status: "ended", left_at: new Date().toISOString() })
          .eq("call_id", callId)
          .eq("role", "visitor");
      } else {
        logger.log("[CallInterface] Other residents still in call:", activeResidents.length);
      }
    } else if (callId && !isResident) {
      // Visitor hanging up - end the entire call
      await supabase
        .from("call_logs")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", callId);

      await supabase
        .from("call_participants")
        .update({ status: "ended", left_at: new Date().toISOString() })
        .eq("call_id", callId);
    }

    setCallState("ended");
  };


  // Visio simple: résident voit visiteur (résident pas vu)
  const handleVisioSimple = () => {
    if (videoMode === "simple") {
      setVideoMode("off");
    } else {
      setVideoMode("simple");
    }
  };

  // Visio double: résident ET visiteur se voient
  const handleVisioDouble = () => {
    if (videoMode === "double") {
      setVideoMode("off");
    } else {
      setVideoMode("double");
    }
  };

  // Build streams from tracks
  const localStream = (localVideoTrack || localAudioTrack)
    ? new MediaStream([localVideoTrack, localAudioTrack].filter(Boolean) as MediaStreamTrack[])
    : null;
  
  const remoteStream = (remoteVideoTrack || remoteAudioTrack)
    ? new MediaStream([remoteVideoTrack, remoteAudioTrack].filter(Boolean) as MediaStreamTrack[])
    : null;

  const [isInviting, setIsInviting] = useState(false);

  // Invite other residents to group call
  const handleInviteAll = async () => {
    setIsInviting(true);
    try {
      await startGroupCall();
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <VideoCall
        localStream={localStream}
        remoteStream={remoteStream}
        showLocalVideo={isResident && videoMode === "double"}
        callerName={callerName}
        isConnected={isJoined && callState === "connected"}
        isVideoEnabled={videoMode === "simple" || videoMode === "double" || !isResident}
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

      {/* Invite Residents Panel - show available residents with names */}
      {isResident && availableResidents.length > 0 && (
        <InviteResidentsPanel
          availableResidents={availableResidents}
          participants={participants}
          onInviteAll={handleInviteAll}
          isInviting={isInviting}
        />
      )}

      {/* Group Call Panel - show when multiple active participants */}
      {isResident && activeParticipants.length > 1 && (
        <GroupCallPanel 
          participants={participants} 
          currentUserId={userId || ""} 
        />
      )}

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

                {/* Visio Double: résident et visiteur se voient */}
                <Button 
                  variant={videoMode === "double" ? "default" : "secondary"} 
                  size="sm"
                  onClick={handleVisioDouble}
                  className="flex items-center gap-2"
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
