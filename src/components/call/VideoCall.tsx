import { useEffect, useRef } from "react";
import { Video, VideoOff, User } from "lucide-react";

interface VideoCallProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  showLocalVideo: boolean;
  callerName: string;
  isConnected: boolean;
}

const VideoCall = ({
  localStream,
  remoteStream,
  showLocalVideo,
  callerName,
  isConnected,
}: VideoCallProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream to video element
  useEffect(() => {
    console.log("[VideoCall] 📹 Local stream effect:", {
      hasRef: !!localVideoRef.current,
      hasStream: !!localStream,
      streamActive: localStream?.active,
      videoTracks: localStream?.getVideoTracks().length,
    });
    if (localVideoRef.current && localStream) {
      console.log("[VideoCall] ✅ Attaching local stream to video element");
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    console.log("[VideoCall] 📺 Remote stream effect:", {
      hasRef: !!remoteVideoRef.current,
      hasStream: !!remoteStream,
      streamActive: remoteStream?.active,
      videoTracks: remoteStream?.getVideoTracks().map(t => ({
        id: t.id,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState,
      })),
      audioTracks: remoteStream?.getAudioTracks().map(t => ({
        id: t.id,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState,
      })),
    });
    if (remoteVideoRef.current && remoteStream) {
      console.log("[VideoCall] ✅ Attaching remote stream to video element");
      remoteVideoRef.current.srcObject = remoteStream;
      // Force play in case autoplay is blocked
      remoteVideoRef.current.play().then(() => {
        console.log("[VideoCall] ▶️ Remote video playing");
      }).catch(err => {
        console.log("[VideoCall] ⚠️ Autoplay blocked, user interaction needed:", err);
      });
    }
  }, [remoteStream]);

  return (
    <div className="flex-1 relative">
      {/* Remote video (main view) */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary to-background">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            onClick={(e) => {
              // Click to unmute if needed
              const video = e.currentTarget;
              if (video.muted) {
                video.muted = false;
                video.play();
              }
            }}
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
