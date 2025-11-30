import { useEffect, useRef } from "react";
import { Video, VideoOff, User, Mic, MicOff } from "lucide-react";

interface VideoCallProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  showLocalVideo: boolean;
  callerName: string;
  isConnected: boolean;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isMuted?: boolean;
}

const VideoCall = ({
  localStream,
  remoteStream,
  showLocalVideo,
  callerName,
  isConnected,
  isAudioEnabled = true,
  isVideoEnabled = true,
  isMuted = false,
}: VideoCallProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Gérer le stream local
  useEffect(() => {
    const video = localVideoRef.current;
    if (video && localStream) {
      console.log("[VideoCall] 🔄 Mise à jour stream local:", {
        streamId: localStream.id,
        active: localStream.active,
        videoTracks: localStream.getVideoTracks().length,
        audioTracks: localStream.getAudioTracks().length,
      });
      
      video.srcObject = localStream;
      
      video.play().then(() => {
        console.log("[VideoCall] ✅ Lecture vidéo locale démarrée");
      }).catch(err => {
        console.error("[VideoCall] ❌ Erreur lecture vidéo locale:", err);
      });
    }
  }, [localStream]);

  // Gérer le stream distant
  useEffect(() => {
    const video = remoteVideoRef.current;
    if (video && remoteStream) {
      console.log("[VideoCall] 🔄 Mise à jour stream distant:", {
        streamId: remoteStream.id,
        active: remoteStream.active,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length,
        isAudioEnabled,
      });
      
      video.srcObject = remoteStream;
      video.muted = !isAudioEnabled;
      
      video.play().then(() => {
        console.log("[VideoCall] ✅ Lecture vidéo distante démarrée, muted:", video.muted);
      }).catch(err => {
        console.error("[VideoCall] ❌ Erreur lecture vidéo distante:", err);
        
        if (err.name === 'NotAllowedError') {
          console.log("[VideoCall] Autoplay bloqué, tentative avec interaction utilisateur");
        }
      });
    }
  }, [remoteStream, isAudioEnabled]);

  return (
    <div className="flex-1 relative bg-black rounded-lg overflow-hidden">
      {/* Vidéo distante (vue principale) */}
      <div className="absolute inset-0">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            controls={false}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              {isConnected ? (
                <div className="animate-pulse">
                  <User className="w-12 h-12 text-primary" />
                </div>
              ) : (
                <div className="animate-pulse">
                  <Video className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-white text-lg font-semibold">
                {isConnected ? "Connexion établie" : "En attente de connexion..."}
              </p>
              <p className="text-gray-400 mt-2">
                {callerName || "Appel en cours"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Indicateurs d'état */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
        {!isAudioEnabled && (
          <div className="bg-red-500 text-white px-2 py-1 rounded-md text-sm flex items-center gap-1">
            <MicOff className="w-3 h-3" />
            <span>Audio coupé</span>
          </div>
        )}
        {!isVideoEnabled && (
          <div className="bg-red-500 text-white px-2 py-1 rounded-md text-sm flex items-center gap-1">
            <VideoOff className="w-3 h-3" />
            <span>Vidéo coupée</span>
          </div>
        )}
      </div>

      {/* Vidéo locale (overlay) */}
      {showLocalVideo && (
        <div className="absolute top-4 right-4 w-40 h-52 rounded-xl bg-gray-900 border-2 border-white/20 overflow-hidden shadow-2xl z-10">
          {localStream && localStream.getVideoTracks().some(t => t.enabled) ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <div className="text-center">
                <VideoOff className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Caméra locale</p>
              </div>
            </div>
          )}
          
          {/* Indicateur audio local */}
          <div className="absolute bottom-2 left-2">
            {isMuted ? (
              <MicOff className="w-4 h-4 text-red-500" />
            ) : (
              <Mic className="w-4 h-4 text-green-500" />
            )}
          </div>
        </div>
      )}

      {/* Indicateur de connexion */}
      <div className={`absolute bottom-4 left-4 px-3 py-1 rounded-full text-sm font-medium ${
        isConnected 
          ? 'bg-green-500 text-white' 
          : 'bg-yellow-500 text-black'
      }`}>
        {isConnected ? 'Connecté' : 'Connexion...'}
      </div>
    </div>
  );
};

export default VideoCall;
