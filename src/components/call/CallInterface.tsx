import { useState } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Users, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type CallState = "ringing" | "connected" | "ended";

interface CallInterfaceProps {
  isResident?: boolean;
  callerName?: string;
  anrAddress?: string;
}

const CallInterface = ({ 
  isResident = false, 
  callerName = "Visiteur", 
  anrAddress = "12 Rue des Lilas, Paris" 
}: CallInterfaceProps) => {
  const [callState, setCallState] = useState<CallState>("ringing");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isTwoWayVideo, setIsTwoWayVideo] = useState(false);

  const handleAnswer = () => setCallState("connected");
  const handleHangup = () => setCallState("ended");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Video area */}
      <div className="flex-1 relative">
        {/* Remote video (visitor) */}
        <div className="absolute inset-0 bg-gradient-to-b from-secondary to-background">
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-4xl font-bold text-primary">
                {callerName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Self video (small overlay when 2-way video is on) */}
        {isTwoWayVideo && callState === "connected" && (
          <div className="absolute top-4 right-4 w-32 h-44 rounded-2xl bg-card border border-border overflow-hidden card-shadow">
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <Video className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Call info overlay */}
        <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-background/80 to-transparent">
          <div className="text-center">
            <p className="text-muted-foreground text-sm mb-1">
              {isResident ? "Appel entrant" : "Appel vers"}
            </p>
            <h2 className="text-2xl font-bold mb-1">{callerName}</h2>
            <p className="text-muted-foreground text-sm">{anrAddress}</p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
          {callState === "ringing" && (
            <div className="calling-animation px-6 py-3 rounded-full bg-primary/20 border border-primary/30">
              <span className="text-primary font-medium">
                {isResident ? "Appel entrant..." : "Connexion..."}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="glass-effect border-t border-border p-6">
        {callState === "ringing" ? (
          <RingingControls 
            isResident={isResident} 
            onAnswer={handleAnswer} 
            onHangup={handleHangup} 
          />
        ) : callState === "connected" ? (
          <ConnectedControls
            isResident={isResident}
            isMuted={isMuted}
            isVideoOn={isVideoOn}
            isTwoWayVideo={isTwoWayVideo}
            onToggleMute={() => setIsMuted(!isMuted)}
            onToggleVideo={() => setIsVideoOn(!isVideoOn)}
            onToggleTwoWayVideo={() => setIsTwoWayVideo(!isTwoWayVideo)}
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

const ConnectedControls = ({
  isResident,
  isMuted,
  isVideoOn,
  isTwoWayVideo,
  onToggleMute,
  onToggleVideo,
  onToggleTwoWayVideo,
  onHangup,
}: {
  isResident: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  isTwoWayVideo: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
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
            variant={isTwoWayVideo ? "default" : "secondary"}
            size="icon-lg"
            onClick={onToggleTwoWayVideo}
          >
            {isTwoWayVideo ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
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
