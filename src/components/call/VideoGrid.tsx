import { useRef, useEffect, memo } from "react";
import { User, VideoOff } from "lucide-react";
import { RemoteParticipant } from "@/hooks/useDaily";

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteParticipants: RemoteParticipant[];
  showLocalVideo: boolean;
  isConnected: boolean;
}

const VideoTile = memo(({ 
  stream, 
  label, 
  isLocal = false,
  hasVideo = true,
}: { 
  stream: MediaStream | null; 
  label: string; 
  isLocal?: boolean;
  hasVideo?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative bg-muted rounded-lg overflow-hidden ${isLocal ? "border-2 border-primary" : ""}`}>
      {stream && hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-secondary">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
            {hasVideo ? <User className="w-8 h-8 text-muted-foreground" /> : <VideoOff className="w-8 h-8 text-muted-foreground" />}
          </div>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-background/70 px-2 py-1 rounded text-xs">
        {label}
      </div>
    </div>
  );
});

VideoTile.displayName = "VideoTile";

const VideoGrid = memo(({ 
  localStream, 
  remoteParticipants, 
  showLocalVideo,
  isConnected,
}: VideoGridProps) => {
  // Filter participants with video
  const participantsWithVideo = remoteParticipants.filter(p => p.videoTrack || p.audioTrack);
  const totalTiles = participantsWithVideo.length + (showLocalVideo ? 1 : 0);

  // Determine grid layout
  const getGridClass = () => {
    if (totalTiles <= 1) return "grid-cols-1 grid-rows-1";
    if (totalTiles === 2) return "grid-cols-2 grid-rows-1";
    if (totalTiles <= 4) return "grid-cols-2 grid-rows-2";
    return "grid-cols-3 grid-rows-2"; // Max 6
  };

  // Create stream from tracks
  const createStream = (participant: RemoteParticipant): MediaStream | null => {
    const tracks = [participant.videoTrack, participant.audioTrack].filter(Boolean) as MediaStreamTrack[];
    if (tracks.length === 0) return null;
    return new MediaStream(tracks);
  };

  if (!isConnected && participantsWithVideo.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-secondary">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <User className="w-12 h-12 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">En attente de connexion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 grid ${getGridClass()} gap-2 p-2`}>
      {/* Remote participants */}
      {participantsWithVideo.map((participant, index) => (
        <VideoTile
          key={participant.sessionId}
          stream={createStream(participant)}
          label={participant.visitorVideo ? "Visiteur" : `Résident ${index + 1}`}
          hasVideo={!!participant.videoTrack}
        />
      ))}

      {/* Local video (only shown in double mode) */}
      {showLocalVideo && localStream && (
        <VideoTile
          stream={localStream}
          label="Vous"
          isLocal
          hasVideo={true}
        />
      )}
    </div>
  );
});

VideoGrid.displayName = "VideoGrid";

export default VideoGrid;