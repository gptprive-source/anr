import { useState, useEffect, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { PhoneOff, Mic, MicOff, Eye, Users2, AlertCircle, DoorOpen, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDaily } from "@/hooks/useDaily";
import { useMultiResidentCall } from "@/hooks/useMultiResidentCall";
import { useChats } from "@/hooks/useChats";
import { supabase } from "@/integrations/supabase/client";
import VideoGrid from "./VideoGrid";
import InviteResidentsPanel from "./InviteResidentsPanel";
import { BleOpenDoorButton } from "@/components/door/BleOpenDoorButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { forceStopAllAlerts } from "@/lib/incomingCallRenderer";
type CallState = "ringing" | "connecting" | "connected" | "ended";

interface CallInterfaceProps {
  isResident?: boolean;
  callerName?: string;
  anrAddress?: string;
  callId?: string;
  habitationId?: string;
  userId?: string;
  anrId?: string;
  anrCode?: string;
  targetUserId?: string | null; // For private calls - recipient of the message
}

const CallInterface = memo(({ 
  isResident = false, 
  callerName = "Visiteur", 
  anrAddress = "Adresse",
  callId = `call-${Date.now()}`,
  habitationId = "",
  userId,
  anrId = "",
  anrCode = "",
  targetUserId = null,
}: CallInterfaceProps) => {
  const navigate = useNavigate();
  const [callState, setCallState] = useState<CallState>(isResident ? "ringing" : "connecting");
  const [callWasAnswered, setCallWasAnswered] = useState(false);
  const [callWasDeclined, setCallWasDeclined] = useState(false);
  const [showDoorDialog, setShowDoorDialog] = useState(false);
  const [showLeaveMessagePrompt, setShowLeaveMessagePrompt] = useState(false);
  const [shouldRedirectToConversation, setShouldRedirectToConversation] = useState(false);
  const hasJoinedRef = useRef(false);
  const channelRef = useRef<any>(null);
  const callStartTimeRef = useRef<number>(Date.now());
  const missedCallSentRef = useRef(false); // Track if missed call message was already sent
  
  // Ringing timeout: 30 seconds before showing message dialog
  const RINGING_TIMEOUT_MS = 30000;

  // Chat functions for missed/ended call messages
  const { sendMissedCall, sendCallEnded } = useChats();

  // Multi-resident call management
  const {
    participants,
    activeParticipants,
    availableResidents,
    inviteResident,
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
    localAudioTrack,
    remoteParticipants,
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

  // Stop any lingering ringtones on mount and unmount
  useEffect(() => {
    // Stop ringtone immediately when entering call interface
    forceStopAllAlerts();
    
    return () => {
      // Also stop on unmount just in case
      forceStopAllAlerts();
    };
  }, []);

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

  // Track if we've already processed the call ending
  const callEndedRef = useRef(false);

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
          logger.log("[CallInterface] Received call status update:", callLog.status);
          
          // Prevent double processing
          if (callEndedRef.current) {
            logger.log("[CallInterface] Call already ended, ignoring subscription update");
            return;
          }
          
          // Handle declined status - redirect to conversation
          if (callLog.status === "declined" && !isResident) {
            logger.log("[CallInterface] Call was declined by all residents - redirecting to conversation");
            callEndedRef.current = true;
            setCallWasDeclined(true);
            setShouldRedirectToConversation(true);
            setCallState("ended");
            leaveCall();
            return;
          }
          
          if (callLog.status === "ended") {
            logger.log("[CallInterface] Call ended by other party");
            
            // If visitor and call ended without being answered - redirect to conversation
            if (!isResident && !callLog.answered_by && !callWasAnswered) {
              logger.log("[CallInterface] Call ended without answer - redirecting to conversation");
              callEndedRef.current = true;
              setShouldRedirectToConversation(true);
            }
            
            setCallState("ended");
            // Only call leaveCall if we haven't already ended
            if (!callEndedRef.current) {
              callEndedRef.current = true;
              leaveCall();
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId, leaveCall, isResident, callWasAnswered]);

  // Ringing timeout - redirect to conversation after 30 seconds without answer
  useEffect(() => {
    if (isResident || callWasAnswered || callState === "ended") return;

    const timeout = setTimeout(async () => {
      if (!callWasAnswered && habitationId && !missedCallSentRef.current) {
        logger.log("[CallInterface] 30s timeout - creating missed call message and redirecting");
        
        // Get visitor's user_id from Supabase Auth
        const { data: { user: visitorUser } } = await supabase.auth.getUser();
        const visitorUserId = visitorUser?.id;
        
        if (visitorUserId) {
          // Get the first resident of this habitation to send the missed call message to
          const { data: residents } = await supabase
            .from("residents")
            .select("user_id")
            .eq("habitation_id", habitationId)
            .eq("status", "verified")
            .limit(1);
          
          const recipientId = targetUserId || residents?.[0]?.user_id;
          
          if (recipientId) {
            // Send missed call message using the chat system
            missedCallSentRef.current = true;
            await sendMissedCall(recipientId);
            logger.log("[CallInterface] Missed call message sent to", recipientId);
          }
        }
        
        setShouldRedirectToConversation(true);
      }
    }, RINGING_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [isResident, callWasAnswered, callState, habitationId, targetUserId, sendMissedCall]);

  // Update call state based on Daily connection
  useEffect(() => {
    if (isJoined && callState !== "ended") {
      setCallState("connected");
      // Track if call was ever connected (answered)
      if (remoteParticipants.length > 0) {
        setCallWasAnswered(true);
      }
    } else if (isLoading && callState !== "ended") {
      setCallState("connecting");
    }
  }, [isJoined, isLoading, callState, remoteParticipants.length]);

  // Auto-navigate when call ends
  useEffect(() => {
    if (callState === "ended") {
      // If visitor should go to conversation, show the "leave message" prompt instead of auto-redirecting
      if (!isResident && shouldRedirectToConversation && !callWasAnswered) {
        // Show the prompt to leave a message
        setShowLeaveMessagePrompt(true);
        return;
      }
      
      // If call was answered (normal end), just navigate back after a delay
      const timeout = setTimeout(() => {
        logger.log("[CallInterface] Auto-navigating back after call ended");
        navigate(-1);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [callState, navigate, isResident, shouldRedirectToConversation, callWasAnswered]);

  // Handle redirect to chat when user chooses to leave a message
  const handleLeaveMessage = async () => {
    let recipientId = targetUserId;
    
    // If no specific targetUserId, get the first resident of this habitation
    if (!recipientId && habitationId) {
      const { data: residents } = await supabase
        .from("residents")
        .select("user_id")
        .eq("habitation_id", habitationId)
        .eq("status", "verified")
        .limit(1);
      
      recipientId = residents?.[0]?.user_id;
    }
    
    if (recipientId) {
      logger.log("[CallInterface] User chose to leave message, redirecting to chat:", recipientId);
      navigate(`/chat/${recipientId}`, { replace: true });
    } else {
      logger.log("[CallInterface] No recipient found, navigating back");
      navigate(-1);
    }
  };

  const handleSkipMessage = () => {
    logger.log("[CallInterface] User skipped leaving message");
    navigate(-1);
  };

  // Individual hangup - only ends call if no other residents are active
  const handleHangup = async () => {
    logger.log("[CallInterface] Hanging up, callEndedRef:", callEndedRef.current);
    
    // Mark as ended to prevent subscription from re-processing
    callEndedRef.current = true;
    
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
      // Visitor hanging up
      const { data: { user: visitorUser } } = await supabase.auth.getUser();
      const visitorUserId = visitorUser?.id;
      
      if (visitorUserId) {
        // Get the first resident of this habitation to send the message to
        const { data: residents } = await supabase
          .from("residents")
          .select("user_id")
          .eq("habitation_id", habitationId)
          .eq("status", "verified")
          .limit(1);
        
        const recipientId = targetUserId || residents?.[0]?.user_id;
        
        if (recipientId) {
          if (!callWasAnswered && !missedCallSentRef.current) {
            // Call wasn't answered - create missed call message (only if not already sent by timeout)
            logger.log("[CallInterface] Visitor hangup without answer - creating missed call message");
            missedCallSentRef.current = true;
            await sendMissedCall(recipientId);
            logger.log("[CallInterface] Missed call message sent to", recipientId);
          } else if (callWasAnswered) {
            // Call was answered - create call ended message with duration
            const callDuration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
            logger.log("[CallInterface] Call ended, duration:", callDuration, "seconds");
            await sendCallEnded(recipientId, callDuration);
            logger.log("[CallInterface] Call ended message sent to", recipientId);
          }
        }
      }
        
      // Redirect visitor to conversation
      setShouldRedirectToConversation(true);
      
      // End the entire call
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

  // Build local stream from tracks
  const localStream = (localVideoTrack || localAudioTrack)
    ? new MediaStream([localVideoTrack, localAudioTrack].filter(Boolean) as MediaStreamTrack[])
    : null;

  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);

  // Invite a single resident to the call
  const handleInviteResident = async (targetUserId: string) => {
    setInvitingUserId(targetUserId);
    try {
      await inviteResident(targetUserId);
    } finally {
      setInvitingUserId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <VideoGrid
        localStream={localStream}
        remoteParticipants={remoteParticipants}
        showLocalVideo={isResident && videoMode === "double"}
        isConnected={isJoined && callState === "connected"}
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
          onInviteResident={handleInviteResident}
          invitingUserId={invitingUserId}
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

      {callState === "ended" && !showLeaveMessagePrompt && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20">
          <div className="px-6 py-4 rounded-lg bg-secondary border border-border text-center">
            <p className="text-foreground font-medium mb-4">
              {callWasDeclined ? "Appel refusé" : "Appel terminé"}
            </p>
            <Button variant="glass" onClick={() => window.history.back()}>
              Retour
            </Button>
          </div>
        </div>
      )}

      {/* Leave message prompt for visitors when call wasn't answered */}
      {showLeaveMessagePrompt && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20">
          <div className="px-6 py-6 rounded-xl bg-card border-2 border-primary/30 text-center max-w-sm mx-4 shadow-xl">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <p className="text-foreground font-semibold text-lg mb-2">
              Pas de réponse
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              Le résident n'a pas pu répondre. Souhaitez-vous lui laisser un message ?
            </p>
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleLeaveMessage}
                className="w-full"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Laisser un message
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleSkipMessage}
                className="w-full text-muted-foreground"
              >
                Non merci
              </Button>
            </div>
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
                {/* Ouvrir la porte */}
                <Button 
                  variant="default"
                  size="sm"
                  onClick={() => setShowDoorDialog(true)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <DoorOpen className="w-5 h-5" />
                  <span>Ouvrir</span>
                </Button>

                {/* Visio Simple: voir le visiteur */}
                <Button 
                  variant={videoMode === "simple" ? "default" : "secondary"} 
                  size="sm"
                  onClick={handleVisioSimple}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  <span>Visio</span>
                </Button>

                {/* Visio Double: résident et visiteur se voient */}
                <Button 
                  variant={videoMode === "double" ? "default" : "secondary"} 
                  size="sm"
                  onClick={handleVisioDouble}
                  className="flex items-center gap-2"
                >
                  <Users2 className="w-5 h-5" />
                  <span>Visio 2</span>
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


      {/* Door Open Dialog for Residents */}
      <Dialog open={showDoorDialog} onOpenChange={setShowDoorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DoorOpen className="w-5 h-5" />
              Ouvrir la porte
            </DialogTitle>
          </DialogHeader>
          {anrId && anrCode ? (
            <BleOpenDoorButton
              anrId={anrId}
              anrCode={anrCode}
              onSuccess={() => {
                toast.success("Porte ouverte !");
                setShowDoorDialog(false);
              }}
              onError={(error) => {
                toast.error(`Erreur: ${error}`);
              }}
            />
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Information ANR non disponible
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});

CallInterface.displayName = "CallInterface";

export default CallInterface;
