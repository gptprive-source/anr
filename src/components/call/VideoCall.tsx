import { useCallback } from "react";
import { Video, VideoOff, User } from "lucide-react";

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
  isConnected,
  isAudioEnabled = false,
}: VideoCallProps) => {
  // Use callback refs to attach streams immediately when elements are available
  const localVideoRef = useCallback((video: HTMLVideoElement | null) => {
    console.log("[VideoCall] 📹 Local video ref callback:", {
      hasElement: !!video,
      hasStream: !!localStream,
      streamActive: localStream?.active,
    });
    if (video && localStream) {
      console.log("[VideoCall] ✅ Attaching local stream to video element");
      video.srcObject = localStream;
      video.play().catch(err => console.log("[VideoCall] Local autoplay issue:", err));
    }
  }, [localStream]);

  const remoteVideoRef = useCallback((video: HTMLVideoElement | null) => {
    console.log("[VideoCall] 📺 Remote video ref callback:", {
      hasElement: !!video,
      hasStream: !!remoteStream,
      streamActive: remoteStream?.active,
      videoTracks: remoteStream?.getVideoTracks().length,
      audioTracks: remoteStream?.getAudioTracks().length,
    });
    if (video && remoteStream) {
      console.log("[VideoCall] ✅ Attaching remote stream to video element");
      video.srcObject = remoteStream;
      video.play().then(() => {
        console.log("[VideoCall] ▶️ Remote video playing");
      }).catch(err => {
        console.log("[VideoCall] ⚠️ Remote autoplay blocked:", err);
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
