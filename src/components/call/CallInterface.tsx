import { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebRTC } from "@/hooks/useWebRTC";
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
  const [showTwoWayVideo, setShowTwoWayVideo] = useState(false);

  // WebRTC hook
  const {
    localStream,
    remoteStream,
    connectionState,
    error,
    isMuted,
    isVideoEnabled,
    hasAnswered,
    startCall,
    listenForCall,
    answerCall: answerWebRTC,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC({
    callId,
    isInitiator: !isResident,
    onCallConnected: () => {
      console.log("[CallInterface] WebRTC connected!");
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
    joinCall,
    answerCall: answerMultiResident,
    declineCall,
    transferCall,
    startGroupCall,
    joinGroupCall,
    updateMuteStatus,
    updateVideoStatus,
    leaveCall,
  } = useMultiResidentCall({
    callId,
    habitationId,
    userId,
    isVisitor: !isResident,
  });

  // Track if we've already started the call (prevent double-mount issues)
  const hasStartedRef = useRef(false);

  // Auto-start: Visitor sends video, Resident listens
  useEffect(() => {
    if (hasStartedRef.current) {
      console.log("[CallInterface] Already started, skipping");
      return;
    }
    hasStartedRef.current = true;

    if (!isResident) {
      console.log("[CallInterface] Visitor auto-starting call");
      startCall();
      joinCall("visitor");
    } else {
      console.log("[CallInterface] Resident listening for incoming video");
      listenForCall();
      joinCall("resident");
    }
  }, []); // Empty deps - only run once on mount

  // Update call state based on connection and answer status
  useEffect(() => {
    if (isResident) {
      // Check if someone else answered
      if (answeredBy && answeredBy.user_id !== userId && !isGroupCall) {
        // Another resident answered - show "answered by" state
        if (currentParticipant?.status === "ringing") {
          // We're still ringing but someone else answered
        }
      }
      
      if (hasAnswered) {
        if (connectionState === "connected") {
          setCallState("connected");
        } else {
          setCallState("connecting");
        }
      } else {
        setCallState("ringing");
      }
    } else {
      // Visitor flow
      if (connectionState === "connected") {
        setCallState("connected");
      } else if (connectionState === "connecting") {
        setCallState("connecting");
      }
    }
  }, [connectionState, hasAnswered, isResident, answeredBy, userId, isGroupCall, currentParticipant]);

  // Sync mute status
  useEffect(() => {
    updateMuteStatus(isMuted);
  }, [isMuted, updateMuteStatus]);

  // Sync video status
  useEffect(() => {
    updateVideoStatus(showTwoWayVideo && isVideoEnabled);
  }, [showTwoWayVideo, isVideoEnabled, updateVideoStatus]);

  const handleAnswer = async () => {
    console.log("[CallInterface] Resident answering call");
    setCallState("connecting");
    await answerMultiResident();
    answerWebRTC();
  };

  const handleDecline = async () => {
    console.log("[CallInterface] Resident declining call");
    await declineCall();
    setCallState("ended");
  };

  const handleHangup = async () => {
    console.log("[CallInterface] Hanging up");
    await leaveCall();
    endCall();
    setCallState("ended");
  };

  const handleTransfer = async (targetUserId: string) => {
    console.log("[CallInterface] Transferring to", targetUserId);
    await transferCall(targetUserId);
    endCall();
    setCallState("transferred");
  };

  const handleStartGroupCall = async () => {
    console.log("[CallInterface] Starting group call");
    await startGroupCall();
  };

  const handleToggleTwoWayVideo = () => {
    const newState = !showTwoWayVideo;
    setShowTwoWayVideo(newState);
    // Only toggle if the video state doesn't match what we want
    if (newState !== isVideoEnabled) {
      toggleVideo();
    }
  };

  // Resident can see visitor's video even before answering
  const showRemoteVideo = remoteStream !== null;
  const showLocalVideoPreview = showTwoWayVideo && hasAnswered && localStream !== null;

  // Check if another resident answered (and we haven't)
  const anotherResidentAnswered = isResident && answeredBy && answeredBy.user_id !== userId && !hasAnswered;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Video area */}
      <VideoCall
        localStream={localStream}
        remoteStream={remoteStream}
        showLocalVideo={showLocalVideoPreview}
        callerName={callerName}
        isConnected={showRemoteVideo}
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
      {callState === "ringing" && !showRemoteVideo && !anotherResidentAnswered && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20">
          <div className="calling-animation px-6 py-3 rounded-full bg-primary/20 border border-primary/30">
            <span className="text-primary font-medium">
              {isResident ? "Connexion vidéo..." : "Appel en cours..."}
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

      {callState === "ringing" && isResident && showRemoteVideo && !anotherResidentAnswered && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-32 z-20">
          <div className="calling-animation px-6 py-3 rounded-full bg-primary/20 border border-primary/30">
            <span className="text-primary font-medium">Visiteur à votre porte</span>
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
                  answerWebRTC();
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
            showTwoWayVideo={showTwoWayVideo}
            isGroupCall={isGroupCall}
            availableResidents={availableResidents}
            onToggleMute={toggleMute}
            onToggleTwoWayVideo={handleToggleTwoWayVideo}
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
  showTwoWayVideo,
  isGroupCall,
  availableResidents,
  onToggleMute,
  onToggleTwoWayVideo,
  onTransfer,
  onStartGroupCall,
  onHangup,
}: {
  isResident: boolean;
  isMuted: boolean;
  showTwoWayVideo: boolean;
  isGroupCall: boolean;
  availableResidents: any[];
  onToggleMute: () => void;
  onToggleTwoWayVideo: () => void;
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
            variant={showTwoWayVideo ? "default" : "secondary"}
            size="icon-lg"
            onClick={onToggleTwoWayVideo}
          >
            {showTwoWayVideo ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
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
