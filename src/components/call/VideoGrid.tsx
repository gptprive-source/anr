import { useRef, useEffect, memo, useMemo } from "react";
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
  hasVideo = true
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
  return <div className={`relative bg-muted rounded-lg overflow-hidden aspect-square ${isLocal ? "border-2 border-primary" : ""}`}>
      {stream && hasVideo ? <video ref={videoRef} autoPlay playsInline muted={isLocal} className={`w-full h-full object-cover ${isLocal ? "scale-x-[-1]" : ""}`} /> : <div className="w-full h-full flex flex-col items-center justify-center bg-secondary">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
            {hasVideo ? <User className="w-8 h-8 text-muted-foreground" /> : <VideoOff className="w-8 h-8 text-muted-foreground" />}
          </div>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>}
      <div className="absolute bottom-2 left-2 bg-background/70 px-2 py-1 rounded text-xs">
        {label}
      </div>
    </div>;
});
VideoTile.displayName = "VideoTile";

// OPTIMISÉ: Composant audio séparé et mémorisé
const AudioElement = memo(({
  audioTrack,
  sessionId
}: {
  audioTrack: MediaStreamTrack;
  sessionId: string;
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    if (audioRef.current && audioTrack) {
      // Réutiliser le stream si possible
      if (!streamRef.current || streamRef.current.getAudioTracks()[0]?.id !== audioTrack.id) {
        streamRef.current = new MediaStream([audioTrack]);
      }
      audioRef.current.srcObject = streamRef.current;
      audioRef.current.play().catch(e => console.warn("[AudioElement] Play error:", e));
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }
    };
  }, [audioTrack]);
  return <audio ref={audioRef} autoPlay playsInline style={{
    display: 'none'
  }} data-session={sessionId} />;
});
AudioElement.displayName = "AudioElement";
const VideoGrid = memo(({
  localStream,
  remoteParticipants,
  showLocalVideo,
  isConnected
}: VideoGridProps) => {
  // OPTIMISÉ: Mémoisation des participants avec tracks
  const participantsWithMedia = useMemo(() => remoteParticipants.filter(p => p.videoTrack || p.audioTrack), [remoteParticipants]);
  const totalTiles = participantsWithMedia.length + (showLocalVideo ? 1 : 0);
  const getGridClass = () => {
    if (totalTiles <= 1) return "grid-cols-1 grid-rows-1";
    if (totalTiles === 2) return "grid-cols-2 grid-rows-1";
    if (totalTiles <= 4) return "grid-cols-2 grid-rows-2";
    return "grid-cols-3 grid-rows-2";
  };

  // OPTIMISÉ: Mémoisation des streams vidéo
  const remoteStreams = useMemo(() => {
    return participantsWithMedia.map(p => ({
      ...p,
      stream: p.videoTrack ? new MediaStream([p.videoTrack]) : null
    }));
  }, [participantsWithMedia]);
  if (!isConnected && participantsWithMedia.length === 0) {
    return <div className="flex-1 flex items-center justify-center bg-secondary">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <User className="w-12 h-12 text-muted-foreground" />
          </div>
          
        </div>
      </div>;
  }
  return <div className="flex-1 flex items-center justify-center p-2">
      {/* OPTIMISÉ: Audio éléments séparés et mémorisés pour chaque participant */}
      {remoteParticipants.map(participant => participant.audioTrack ? <AudioElement key={`audio-${participant.sessionId}`} audioTrack={participant.audioTrack} sessionId={participant.sessionId} /> : null)}

      <div className={`grid ${getGridClass()} gap-2 w-full max-w-2xl`}>
        {remoteStreams.map((participant, index) => <VideoTile key={participant.sessionId} stream={participant.stream} label={participant.visitorVideo ? "Visiteur" : `Résident ${index + 1}`} hasVideo={!!participant.videoTrack} />)}

        {showLocalVideo && localStream && <VideoTile stream={localStream} label="Vous" isLocal hasVideo={true} />}
      </div>
    </div>;
});
VideoGrid.displayName = "VideoGrid";
export default VideoGrid;