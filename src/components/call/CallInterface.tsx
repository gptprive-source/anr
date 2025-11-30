import { useState, useEffect, useRef, memo } from "react";
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

const CallInterface = memo(({ 
  isResident = false, 
  callerName = "Visiteur", 
  anrAddress = "Adresse",
  callId = `call-${Date.now()}`,
  habitationId = "",
  userId,
}: CallInterfaceProps) => {
  const [callState, setCallState] = useState<CallState>("ringing");
  const [hasAnswered, setHasAnswered] = useState(false);
  const hasStartedRef = useRef(false);

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
    onCallConnected: () => setCallState("connected"),
    onCallEnded: () => setCallState("ended"),
  });

  const {
    participants,
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
  } = useMultiResidentCall({ callId, habitationId, userId, isVisitor: !isResident });

  // Auto-join on mount
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    joinMultiResident(isResident ? "resident" : "visitor");
    if (!isResident) joinCall();
  }, []);

  // Update call state
  useEffect(() => {
    if (isResident) {
      if (hasAnswered && isJoined) setCallState("connected");
      else if (hasAnswered && isLoading) setCallState("connecting");
      else if (!hasAnswered) setCallState("ringing");
    } else {
      if (isJoined) setCallState("connected");
      else if (isLoading) setCallState("connecting");
    }
  }, [isJoined, isLoading, hasAnswered, isResident]);

  // Sync status
  useEffect(() => { updateMuteStatus(isMuted); }, [isMuted]);
  useEffect(() => { updateVideoStatus(isVideoEnabled); }, [isVideoEnabled]);

  const handleAnswer = async () => {
    setHasAnswered(true);
    setCallState("connecting");
    await answerMultiResident();
    await joinCall();
  };

  const handleDecline = async () => {
    await declineCall();
    setCallState("ended");
  };

  const handleHangup = async () => {
    await leaveMultiResident();
    await leaveCall();
    setCallState("ended");
  };

  const handleTransfer = async (targetUserId: string) => {
    await transferCall(targetUserId);
    await leaveCall();
    setCallState("transferred");
  };

  const handleToggleVideo = async () => {
    if (!isVideoEnabled && isResident) await enableVideo();
    else toggleVideo();
  };

  // Build streams from tracks
  const localStream = (localVideoTrack || localAudioTrack)
    ? new MediaStream([localVideoTrack, localAudioTrack].filter(Boolean) as MediaStreamTrack[])
    : null;
  
  const remoteStream = (remoteVideoTrack || remoteAudioTrack)
    ? new MediaStream([remoteVideoTrack, remoteAudioTrack].filter(Boolean) as MediaStreamTrack[])
    : null;

  const anotherResidentAnswered = isResident && answeredBy && answeredBy.user_id !== userId && !hasAnswered;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <VideoCall
        localStream={localStream}
        remoteStream={remoteStream}
        showLocalVideo={isVideoEnabled && hasAnswered}
        callerName={callerName}
        isConnected={isJoined && !!remoteStream}
        isAudioEnabled={!isResident || hasAnswered}
      />

      {isGroupCall && <GroupCallPanel participants={participants} currentUserId={userId} />}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-background/80 to-transparent z-10">
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-1">
            {isResident ? "Appel entrant" : "Appel vers"}
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
      {callState === "ringing" && !anotherResidentAnswered && (
        <StatusOverlay text={isResident ? "Appel entrant..." : "Appel en cours..."} />
      )}
      {callState === "connecting" && <StatusOverlay text="Connexion..." />}
      {anotherResidentAnswered && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20">
          <div className="px-6 py-4 rounded-lg bg-secondary border border-border text-center">
            <p className="text-foreground font-medium mb-2">Appel pris en charge</p>
            <p className="text-sm text-muted-foreground">Un autre résident a répondu</p>
            {isGroupCall && (
              <Button variant="default" size="sm" className="mt-3" onClick={async () => {
                await joinGroupCall();
                setHasAnswered(true);
                await joinCall();
              }}>
                Rejoindre
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
          <Controls type="ringing" isResident={isResident} onAnswer={handleAnswer} onHangup={isResident ? handleDecline : handleHangup} />
        ) : callState === "connecting" ? (
          <Controls type="connecting" onHangup={handleHangup} />
        ) : callState === "connected" ? (
          <Controls
            type="connected"
            isResident={isResident}
            isMuted={isMuted}
            isVideoEnabled={isVideoEnabled}
            isGroupCall={isGroupCall}
            availableResidents={availableResidents}
            onToggleMute={toggleMute}
            onToggleVideo={handleToggleVideo}
            onTransfer={handleTransfer}
            onStartGroupCall={startGroupCall}
            onHangup={handleHangup}
          />
        ) : (callState === "transferred" || callState === "ended") ? (
          <Controls type="ended" isTransferred={callState === "transferred"} />
        ) : anotherResidentAnswered ? (
          <Controls type="another" onClose={() => window.history.back()} />
        ) : null}
      </div>
    </div>
  );
});

CallInterface.displayName = "CallInterface";

// Status overlay component
const StatusOverlay = ({ text }: { text: string }) => (
  <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20">
    <div className="calling-animation px-6 py-3 rounded-full bg-primary/20 border border-primary/30">
      <span className="text-primary font-medium">{text}</span>
    </div>
  </div>
);

// Controls component
interface ControlsProps {
  type: "ringing" | "connecting" | "connected" | "ended" | "another";
  isResident?: boolean;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
  isGroupCall?: boolean;
  availableResidents?: any[];
  isTransferred?: boolean;
  onAnswer?: () => void;
  onHangup?: () => void;
  onClose?: () => void;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  onTransfer?: (userId: string) => Promise<void>;
  onStartGroupCall?: () => void;
}

const Controls = memo(({
  type,
  isResident,
  isMuted,
  isVideoEnabled,
  isGroupCall,
  availableResidents = [],
  isTransferred,
  onAnswer,
  onHangup,
  onClose,
  onToggleMute,
  onToggleVideo,
  onTransfer,
  onStartGroupCall,
}: ControlsProps) => {
  if (type === "ringing") {
    return (
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
  }

  if (type === "connecting") {
    return (
      <div className="flex justify-center">
        <Button variant="hangup" size="icon-xl" onClick={onHangup}>
          <PhoneOff className="w-7 h-7" />
        </Button>
      </div>
    );
  }

  if (type === "connected") {
    return (
      <div className="space-y-4">
        <div className="flex justify-center gap-4">
          <Button variant={isMuted ? "destructive" : "secondary"} size="icon-lg" onClick={onToggleMute}>
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>
          {isResident && (
            <>
              <Button variant={isVideoEnabled ? "default" : "secondary"} size="icon-lg" onClick={onToggleVideo}>
                {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </Button>
              <TransferCallDialog residents={availableResidents} onTransfer={onTransfer!} disabled={isGroupCall} />
              <Button variant={isGroupCall ? "default" : "secondary"} size="icon-lg" onClick={onStartGroupCall} disabled={isGroupCall || availableResidents.length === 0}>
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
              {isGroupCall ? "Appel groupé" : "Transférer"}
            </span>
            <span className="px-3 py-1 rounded-full bg-secondary">
              {availableResidents.length} résident(s)
            </span>
          </div>
        )}
      </div>
    );
  }

  if (type === "ended") {
    return (
      <div className="text-center">
        <p className="text-muted-foreground mb-4">
          {isTransferred ? "Appel transféré" : "Appel terminé"}
        </p>
        <Button variant="glass" onClick={() => window.history.back()}>Retour</Button>
      </div>
    );
  }

  if (type === "another") {
    return (
      <div className="flex justify-center">
        <Button variant="secondary" onClick={onClose}>Fermer</Button>
      </div>
    );
  }

  return null;
});

Controls.displayName = "Controls";

export default CallInterface;
