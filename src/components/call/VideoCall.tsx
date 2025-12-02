import { useEffect, useRef, memo } from "react";
import { Video, VideoOff, User, Mic, MicOff } from "lucide-react";

interface VideoCallProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  showLocalVideo: boolean;
  callerName: string;
  isConnected: boolean;
  isVideoEnabled?: boolean;
  isMuted?: boolean;
}

const VideoCall = memo(({
  localStream,
  remoteStream,
  showLocalVideo,
  callerName,
  isConnected,
  isVideoEnabled = true,
  isMuted = false,
}: VideoCallProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Handle local stream
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video || !localStream) return;

    video.srcObject = localStream;
    video.play().catch(() => {});
  }, [localStream]);

  // Handle remote stream with audio
  useEffect(() => {
    const video = remoteVideoRef.current;
    if (!video || !remoteStream) return;

    video.srcObject = remoteStream;
    // IMPORTANT: Never mute the video element for remote audio
    video.muted = false;
    video.volume = 1.0;
    
    // Try to play with error handling for autoplay restrictions
    const playVideo = async () => {
      try {
        await video.play();
        console.log("[VideoCall] Remote video/audio playing");
      } catch (err) {
        console.log("[VideoCall] Play failed, trying unmuted:", err);
        // If autoplay fails, try again on user interaction
        const unlockPlay = () => {
          video.play().catch(() => {});
          document.removeEventListener('click', unlockPlay);
          document.removeEventListener('touchstart', unlockPlay);
        };
        document.addEventListener('click', unlockPlay, { once: true });
        document.addEventListener('touchstart', unlockPlay, { once: true });
      }
    };
    
    playVideo();
  }, [remoteStream]);

  return (
    <div className="flex-1 relative bg-black rounded-lg overflow-hidden">
      {/* Remote video (main view) */}
      <div className="absolute inset-0">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <div className="animate-pulse">
                {isConnected ? (
                  <User className="w-12 h-12 text-primary" />
                ) : (
                  <Video className="w-12 h-12 text-gray-400" />
                )}
              </div>
            </div>
            <div className="text-center">
              <p className="text-white text-lg font-semibold">
                {isConnected ? "Connexion établie" : "En attente..."}
              </p>
              <p className="text-gray-400 mt-2">{callerName}</p>
            </div>
          </div>
        )}
      </div>

      {/* Status indicators */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
        {!isVideoEnabled && (
          <div className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm flex items-center gap-1">
            <VideoOff className="w-3 h-3" />
            <span>Mode vocal</span>
          </div>
        )}
      </div>

      {/* Local video (overlay) */}
      {showLocalVideo && (
        <div className="absolute top-4 right-4 w-40 h-52 rounded-xl bg-gray-900 border-2 border-white/20 overflow-hidden shadow-2xl z-10">
          {localStream?.getVideoTracks().some(t => t.enabled) ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <VideoOff className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <div className="absolute bottom-2 left-2">
            {isMuted ? (
              <MicOff className="w-4 h-4 text-red-500" />
            ) : (
              <Mic className="w-4 h-4 text-green-500" />
            )}
          </div>
        </div>
      )}

      {/* Connection indicator */}
      <div className={`absolute bottom-4 left-4 px-3 py-1 rounded-full text-sm font-medium ${
        isConnected ? "bg-green-500 text-white" : "bg-yellow-500 text-black"
      }`}>
        {isConnected ? "Connecté" : "Connexion..."}
      </div>
    </div>
  );
});

VideoCall.displayName = "VideoCall";

export default VideoCall;
