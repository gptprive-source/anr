import { useState, useEffect } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Users, ArrowLeftRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebRTC } from "@/hooks/useWebRTC";
import VideoCall from "./VideoCall";

type CallState = "ringing" | "connecting" | "connected" | "ended";

interface CallInterfaceProps {
  isResident?: boolean;
  callerName?: string;
  anrAddress?: string;
  callId?: string;
}

const CallInterface = ({ 
  isResident = false, 
  callerName = "Visiteur", 
  anrAddress = "12 Rue des Lilas, Paris",
  callId = `call-${Date.now()}`,
}: CallInterfaceProps) => {
  const [callState, setCallState] = useState<CallState>("ringing");
  const [showTwoWayVideo, setShowTwoWayVideo] = useState(false);

  const {
    localStream,
    remoteStream,
    connectionState,
    error,
    isMuted,
    isVideoEnabled,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useWebRTC({
    callId,
    isInitiator: !isResident, // Visitor initiates the call
    onCallConnected: () => {
      console.log("[CallInterface] Call connected!");
      setCallState("connected");
    },
    onCallEnded: () => {
      console.log("[CallInterface] Call ended");
      setCallState("ended");
    },
  });

  // Auto-start for visitor (they initiate)
  useEffect(() => {
    if (!isResident) {
      console.log("[CallInterface] Visitor auto-starting call");
      startCall();
    }
  }, [isResident, startCall]);

  // Monitor connection state
  useEffect(() => {
    if (connectionState === "connecting") {
      setCallState("connecting");
    } else if (connectionState === "connected") {
      setCallState("connected");
    } else if (connectionState === "failed" || connectionState === "closed") {
      if (callState !== "ended") {
        // Don't override "ended" state
      }
    }
  }, [connectionState, callState]);

  const handleAnswer = () => {
    console.log("[CallInterface] Resident answering call");
    setCallState("connecting");
    startCall();
  };

  const handleHangup = () => {
    console.log("[CallInterface] Hanging up");
    endCall();
    setCallState("ended");
  };

  const handleToggleTwoWayVideo = () => {
    setShowTwoWayVideo(!showTwoWayVideo);
    if (!showTwoWayVideo) {
      toggleVideo(); // Enable video when turning on two-way
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Video area */}
      <VideoCall
        localStream={localStream}
        remoteStream={remoteStream}
        showLocalVideo={showTwoWayVideo && callState === "connected"}
        callerName={callerName}
        isConnected={callState === "connected"}
      />

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

      {/* Status indicator for ringing/connecting */}
      {(callState === "ringing" || callState === "connecting") && (
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20">
          <div className="calling-animation px-6 py-3 rounded-full bg-primary/20 border border-primary/30">
            <span className="text-primary font-medium">
              {callState === "ringing" 
                ? (isResident ? "Appel entrant..." : "Appel en cours...")
                : "Connexion..."
              }
            </span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="glass-effect border-t border-border p-6 relative z-30">
        {callState === "ringing" ? (
          <RingingControls 
            isResident={isResident} 
            onAnswer={handleAnswer} 
            onHangup={handleHangup} 
          />
        ) : callState === "connecting" ? (
          <ConnectingControls onHangup={handleHangup} />
        ) : callState === "connected" ? (
          <ConnectedControls
            isResident={isResident}
            isMuted={isMuted}
            showTwoWayVideo={showTwoWayVideo}
            onToggleMute={toggleMute}
            onToggleTwoWayVideo={handleToggleTwoWayVideo}
            onHangup={handleHangup}
          />
        ) : (
          <EndedControls />
        )}
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
  onToggleMute,
  onToggleTwoWayVideo,
  onHangup,
}: {
  isResident: boolean;
  isMuted: boolean;
  showTwoWayVideo: boolean;
  onToggleMute: () => void;
  onToggleTwoWayVideo: () => void;
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
          
          <Button variant="secondary" size="icon-lg">
            <ArrowLeftRight className="w-6 h-6" />
          </Button>
          
          <Button variant="secondary" size="icon-lg">
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
        <span className="px-3 py-1 rounded-full bg-secondary">Transférer</span>
        <span className="px-3 py-1 rounded-full bg-secondary">Appel groupé</span>
      </div>
    )}
  </div>
);

const EndedControls = () => (
  <div className="text-center">
    <p className="text-muted-foreground mb-4">Appel terminé</p>
    <Button variant="glass" onClick={() => window.history.back()}>
      Retour
    </Button>
  </div>
);

export default CallInterface;
