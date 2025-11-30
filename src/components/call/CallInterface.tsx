import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDaily } from "@/hooks/useDaily";
import { useMultiResidentCall } from "@/hooks/useMultiResidentCall";
import VideoCall from "./VideoCall";
import TransferCallDialog from "./TransferCallDialog";
import GroupCallPanel from "./GroupCallPanel";

type CallState = "ringing" | "connecting" | "connected" | "ended" | "transferred";

interface CallInterfaceProps {
  isResident?: boolean;
  callerName?: string;
  anrAddress?: string;
  callId?: string;
  habitationId?: string;
  userId?: string;
}

const CallInterface = ({ 
  isResident = false, 
  callerName = "Visiteur", 
  anrAddress = "12 Rue des Lilas, Paris",
  callId = `call-${Date.now()}`,
  habitationId = "",
  userId,
}: CallInterfaceProps) => {
  const [callState, setCallState] = useState<CallState>("ringing");
  const [hasAnswered, setHasAnswered] = useState(false);

  // Daily.co hook for audio/video calls
  const {
    isJoined,
    isLoading,
    error,
    isMuted,
    isVideoEnabled,
    localVideoTrack,
    remoteVideoTrack,
    localAudioTrack,
    remoteAudioTrack,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    enableVideo,
  } = useDaily({
    callId,
    isResident,
    onCallConnected: () => {
      console.log("[CallInterface] Daily connected!");
      setCallState("connected");
    },
    onCallEnded: () => {
      console.log("[CallInterface] Call ended");
      setCallState("ended");
    },
  });

  // Multi-resident hook
  const {
    participants,
    activeParticipants,
    currentParticipant,
    answeredBy,
    isGroupCall,
    availableResidents,
    joinCall: joinMultiResident,
    answerCall: answerMultiResident,
    declineCall,
    transferCall,
    startGroupCall,
    joinGroupCall,
    updateMuteStatus,
    updateVideoStatus,
    leaveCall: leaveMultiResident,
  } = useMultiResidentCall({
    callId,
    habitationId,
    userId,
    isVisitor: !isResident,
  });

  // Track if we've already started
  const hasStartedRef = useRef(false);

  // Auto-join: Visitor joins immediately, Resident waits
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    joinMultiResident(isResident ? "resident" : "visitor");

    if (!isResident) {
      // Visitor joins call immediately with video
      console.log("[CallInterface] Visitor auto-joining call");
      joinCall();
    }
  }, []);

  // Update call state based on connection status
  useEffect(() => {
    if (isResident) {
      if (hasAnswered && isJoined) {
        setCallState("connected");
      } else if (hasAnswered && isLoading) {
        setCallState("connecting");
      } else if (!hasAnswered) {
        setCallState("ringing");
      }
    } else {
      // Visitor flow
      if (isJoined) {
        setCallState("connected");
      } else if (isLoading) {
        setCallState("connecting");
      }
    }
  }, [isJoined, isLoading, hasAnswered, isResident]);

  // Sync mute/video status
  useEffect(() => {
    updateMuteStatus(isMuted);
  }, [isMuted, updateMuteStatus]);

  useEffect(() => {
    updateVideoStatus(isVideoEnabled);
  }, [isVideoEnabled, updateVideoStatus]);

  const handleAnswer = async () => {
    console.log("[CallInterface] Resident answering call");
    setHasAnswered(true);
    setCallState("connecting");
    await answerMultiResident();
    // Join call - audio only initially
    await joinCall();
  };

  const handleDecline = async () => {
    console.log("[CallInterface] Resident declining call");
    await declineCall();
    setCallState("ended");
  };

  const handleHangup = async () => {
    console.log("[CallInterface] Hanging up");
    await leaveMultiResident();
    await leaveCall();
    setCallState("ended");
  };

  const handleTransfer = async (targetUserId: string) => {
    console.log("[CallInterface] Transferring to", targetUserId);
    await transferCall(targetUserId);
    await leaveCall();
    setCallState("transferred");
  };

  const handleStartGroupCall = async () => {
    console.log("[CallInterface] Starting group call");
    await startGroupCall();
  };

  const handleToggleVideo = async () => {
    if (!isVideoEnabled && isResident) {
      // First time enabling video for resident
      await enableVideo();
    } else {
      toggleVideo();
    }
  };

  // Convert tracks to MediaStream for VideoCall component
  const localStream = localVideoTrack || localAudioTrack 
    ? new MediaStream([localVideoTrack, localAudioTrack].filter(Boolean) as MediaStreamTrack[])
    : null;
  
  const remoteStream = remoteVideoTrack || remoteAudioTrack
    ? new MediaStream([remoteVideoTrack, remoteAudioTrack].filter(Boolean) as MediaStreamTrack[])
    : null;

  // Check if another resident answered
  const anotherResidentAnswered = isResident && answeredBy && answeredBy.user_id !== userId && !hasAnswered;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Video area */}
      <VideoCall
        localStream={localStream}
        remoteStream={remoteStream}
        showLocalVideo={isVideoEnabled && hasAnswered}
        callerName={callerName}
        isConnected={isJoined && !!remoteStream}
        isAudioEnabled={!isResident || hasAnswered}
      />

      {/* Group call panel */}
      {isGroupCall && (
        <GroupCallPanel 
          participants={participants} 
          currentUserId={userId} 
        />
      )}

      {/* Call info overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-background/80 to-transparent z-10">
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-1">
            {isResident ? "Appel entrant" : "Appel vers"}
          </p>
          <h2 className="text-2xl font-bold mb-1">{callerName}</h2>
          <p className="text-muted-foreground text-sm">{anrAddress}</p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="absolute top-24 left-4 right-4 z-20">
          <div className="bg-destructive/20 border border-destructive/50 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        </div>
      )}

      {/* Status indicators */}
      {callState === "ringing" && !anotherResidentAnswered && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20">
          <div className="calling-animation px-6 py-3 rounded-full bg-primary/20 border border-primary/30">
            <span className="text-primary font-medium">
              {isResident ? "Appel entrant..." : "Appel en cours..."}
            </span>
          </div>
        </div>
      )}

      {callState === "connecting" && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20">
          <div className="calling-animation px-6 py-3 rounded-full bg-primary/20 border border-primary/30">
            <span className="text-primary font-medium">Connexion...</span>
          </div>
        </div>
      )}

      {/* Another resident answered indicator */}
      {anotherResidentAnswered && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20">
          <div className="px-6 py-4 rounded-lg bg-secondary border border-border text-center">
            <p className="text-foreground font-medium mb-2">Appel pris en charge</p>
            <p className="text-sm text-muted-foreground">
              Un autre résident a répondu
            </p>
            {isGroupCall && (
              <Button 
                variant="default" 
                size="sm" 
                className="mt-3"
                onClick={async () => {
                  await joinGroupCall();
                  setHasAnswered(true);
                  await joinCall();
                }}
              >
                Rejoindre l'appel
              </Button>
            )}
          </div>
        </div>
      )}

      {callState === "transferred" && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20">
          <div className="px-6 py-4 rounded-lg bg-secondary border border-border text-center">
            <p className="text-foreground font-medium">Appel transféré</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="glass-effect border-t border-border p-6 relative z-30">
        {callState === "ringing" && !anotherResidentAnswered ? (
          <RingingControls 
            isResident={isResident} 
            onAnswer={handleAnswer} 
            onHangup={isResident ? handleDecline : handleHangup} 
          />
        ) : callState === "connecting" ? (
          <ConnectingControls onHangup={handleHangup} />
        ) : callState === "connected" ? (
          <ConnectedControls
            isResident={isResident}
            isMuted={isMuted}
            isVideoEnabled={isVideoEnabled}
            isGroupCall={isGroupCall}
            availableResidents={availableResidents}
            onToggleMute={toggleMute}
            onToggleVideo={handleToggleVideo}
            onTransfer={handleTransfer}
            onStartGroupCall={handleStartGroupCall}
            onHangup={handleHangup}
          />
        ) : callState === "transferred" || callState === "ended" ? (
          <EndedControls isTransferred={callState === "transferred"} />
        ) : anotherResidentAnswered ? (
          <AnotherAnsweredControls onClose={() => window.history.back()} />
        ) : null}
      </div>
    </div>
  );
};

const RingingControls = ({ 
  isResident, 
  onAnswer, 
  onHangup 
}: { 
  isResident: boolean; 
  onAnswer: () => void; 
  onHangup: () => void; 
}) => (
  <div className="flex justify-center gap-8">
    <Button variant="hangup" size="icon-xl" onClick={onHangup}>
      <PhoneOff className="w-7 h-7" />
    </Button>
    {isResident && (
      <Button variant="call" size="icon-xl" onClick={onAnswer}>
        <Phone className="w-7 h-7" />
      </Button>
    )}
  </div>
);

const ConnectingControls = ({ onHangup }: { onHangup: () => void }) => (
  <div className="flex justify-center">
    <Button variant="hangup" size="icon-xl" onClick={onHangup}>
      <PhoneOff className="w-7 h-7" />
    </Button>
  </div>
);

const ConnectedControls = ({
  isResident,
  isMuted,
  isVideoEnabled,
  isGroupCall,
  availableResidents,
  onToggleMute,
  onToggleVideo,
  onTransfer,
  onStartGroupCall,
  onHangup,
}: {
  isResident: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isGroupCall: boolean;
  availableResidents: any[];
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onTransfer: (userId: string) => Promise<void>;
  onStartGroupCall: () => void;
  onHangup: () => void;
}) => (
  <div className="space-y-4">
    <div className="flex justify-center gap-4">
      <Button
        variant={isMuted ? "destructive" : "secondary"}
        size="icon-lg"
        onClick={onToggleMute}
      >
        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </Button>
      
      {isResident && (
        <>
          <Button
            variant={isVideoEnabled ? "default" : "secondary"}
            size="icon-lg"
            onClick={onToggleVideo}
          >
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>
          
          <TransferCallDialog 
            residents={availableResidents}
            onTransfer={onTransfer}
            disabled={isGroupCall}
          />
          
          <Button 
            variant={isGroupCall ? "default" : "secondary"} 
            size="icon-lg"
            onClick={onStartGroupCall}
            disabled={isGroupCall || availableResidents.length === 0}
          >
            <Users className="w-6 h-6" />
          </Button>
        </>
      )}
      
      <Button variant="hangup" size="icon-lg" onClick={onHangup}>
        <PhoneOff className="w-6 h-6" />
      </Button>
    </div>
    
    {isResident && (
      <div className="flex justify-center gap-2 text-xs text-muted-foreground">
        <span className="px-3 py-1 rounded-full bg-secondary">
          {isGroupCall ? "Appel groupé actif" : "Transférer"}
        </span>
        <span className="px-3 py-1 rounded-full bg-secondary">
          {availableResidents.length} résident(s) disponible(s)
        </span>
      </div>
    )}
  </div>
);

const EndedControls = ({ isTransferred }: { isTransferred: boolean }) => (
  <div className="text-center">
    <p className="text-muted-foreground mb-4">
      {isTransferred ? "Appel transféré" : "Appel terminé"}
    </p>
    <Button variant="glass" onClick={() => window.history.back()}>
      Retour
    </Button>
  </div>
);

const AnotherAnsweredControls = ({ onClose }: { onClose: () => void }) => (
  <div className="flex justify-center">
    <Button variant="secondary" onClick={onClose}>
      Fermer
    </Button>
  </div>
);

export default CallInterface;
