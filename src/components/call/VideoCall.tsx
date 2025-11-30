import { useEffect, useRef } from "react";
import { VideoOff } from "lucide-react";

interface VideoCallProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  showLocalVideo: boolean;
  callerName: string;
  isConnected: boolean;
  isAudioEnabled?: boolean;
}

const VideoCall = ({
  localStream,
  remoteStream,
  showLocalVideo,
  callerName,
  isAudioEnabled = false,
}: VideoCallProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream when it changes
  useEffect(() => {
    const video = localVideoRef.current;
    if (video && localStream) {
      console.log("[VideoCall] 📹 Attaching local stream");
      video.srcObject = localStream;
      video.play().catch(err => console.log("[VideoCall] Local autoplay issue:", err));
    }
  }, [localStream]);

  // Attach remote stream when it changes
  useEffect(() => {
    const video = remoteVideoRef.current;
    if (video && remoteStream) {
      console.log("[VideoCall] 📺 Attaching remote stream, isAudioEnabled:", isAudioEnabled);
      video.srcObject = remoteStream;
      video.muted = !isAudioEnabled;
      video.play().then(() => {
        console.log("[VideoCall] ▶️ Remote video playing, muted:", video.muted);
      }).catch(err => {
        console.log("[VideoCall] ⚠️ Remote autoplay blocked:", err);
      });
    }
  }, [remoteStream, isAudioEnabled]);

  // Update muted state when isAudioEnabled changes
  useEffect(() => {
    const video = remoteVideoRef.current;
    if (video) {
      video.muted = !isAudioEnabled;
      console.log("[VideoCall] 🔊 Audio enabled changed:", isAudioEnabled, "muted:", video.muted);
    }
  }, [isAudioEnabled]);

  return (
    <div className="flex-1 relative">
      {/* Remote video (main view) */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary to-background">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={!isAudioEnabled}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-4xl font-bold text-primary">
                {callerName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Local video (small overlay) */}
      {showLocalVideo && localStream && (
        <div className="absolute top-4 right-4 w-32 h-44 rounded-2xl bg-card border border-border overflow-hidden card-shadow z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
        </div>
      )}

      {/* Fallback when no local video but should show */}
      {showLocalVideo && !localStream && (
        <div className="absolute top-4 right-4 w-32 h-44 rounded-2xl bg-card border border-border overflow-hidden card-shadow z-10">
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <VideoOff className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
