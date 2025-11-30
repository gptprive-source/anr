import { useState, useEffect, useRef, useCallback } from "react";
import { SignalingChannel, Signal } from "@/lib/webrtc/signaling";
import { PeerConnectionManager } from "@/lib/webrtc/peer-connection";
import { getLocalMediaStream, stopMediaStream, toggleAudioTrack, toggleVideoTrack, getStreamState } from "@/lib/webrtc/media";

interface UseWebRTCProps {
  callId: string;
  isInitiator: boolean;
  onCallConnected?: () => void;
  onCallEnded?: () => void;
  onError?: (error: string) => void;
}

export const useWebRTC = ({
  callId,
  isInitiator,
  onCallConnected,
  onCallEnded,
  onError,
}: UseWebRTCProps) => {
  // State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const signalingRef = useRef<SignalingChannel | null>(null);
  const peerConnectionRef = useRef<PeerConnectionManager | null>(null);
  const isInitializedRef = useRef(false);
  const isCleanedUpRef = useRef(false);

  // Gérer les erreurs
  const handleError = useCallback((err: string) => {
    console.error("[useWebRTC] ❌ Erreur:", err);
    setError(err);
    onError?.(err);
  }, [onError]);

  // Gérer les changements d'état de connexion
  const handleConnectionStateChange = useCallback((state: RTCPeerConnectionState) => {
    console.log("[useWebRTC] État connexion changé:", state);
    setConnectionState(state);
    
    if (state === "connected") {
      console.log("[useWebRTC] ✅ Connexion établie!");
      onCallConnected?.();
    } else if (state === "failed" || state === "disconnected") {
      handleError("Connexion perdue, tentative de reconnexion...");
    } else if (state === "closed") {
      console.log("[useWebRTC] Connexion fermée");
      onCallEnded?.();
    }
  }, [onCallConnected, onCallEnded, handleError]);

  // Fonction endCall déclarée en premier pour être utilisée dans handleSignal
  const endCall = useCallback(() => {
    console.log("[useWebRTC] 📞 Fin de l'appel");
    
    // Informer l'autre pair
    signalingRef.current?.send("call-ended", { reason: "user-ended" });
    
    stopMediaStream(localStream);
    stopMediaStream(remoteStream);
    
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    
    signalingRef.current?.disconnect();
    signalingRef.current = null;
    
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState("closed");
    setHasAnswered(false);
    setError(null);
    
    onCallEnded?.();
  }, [localStream, remoteStream, onCallEnded]);

  // Gérer les signaux entrants
  const handleSignal = useCallback(async (signal: Signal) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.log("[useWebRTC] Aucune connexion peer pour le signal:", signal.signal_type);
      return;
    }

    try {
      console.log("[useWebRTC] Traitement signal:", signal.signal_type);
      
      switch (signal.signal_type) {
        case "offer":
          await pc.handleOffer(signal.signal_data);
          break;
        case "answer":
          await pc.handleAnswer(signal.signal_data);
          break;
        case "renegotiate-offer":
          await pc.handleRenegotiateOffer(signal.signal_data);
          break;
        case "renegotiate-answer":
          await pc.handleRenegotiateAnswer(signal.signal_data);
          break;
        case "ice-candidate":
          await pc.handleIceCandidate(signal.signal_data);
          break;
        case "call-ended":
          console.log("[useWebRTC] Appel terminé par l'autre pair");
          endCall();
          break;
        default:
          console.warn("[useWebRTC] Type de signal inconnu:", signal.signal_type);
      }
    } catch (err: any) {
      console.error(`[useWebRTC] ❌ Erreur traitement ${signal.signal_type}:`, err);
      handleError(`Erreur signalisation: ${err.message}`);
    }
  }, [handleError, endCall]);

  // Démarrer l'appel (visiteur)
  const startCall = useCallback(async () => {
    if (!isInitiator) {
      console.log("[useWebRTC] Le résident doit utiliser listenForCall");
      return;
    }

    if (isInitializedRef.current) {
      console.log("[useWebRTC] Déjà initialisé");
      return;
    }

    console.log("[useWebRTC] 🚀 Démarrage appel en tant que visiteur");
    setIsLoading(true);
    setError(null);
    isInitializedRef.current = true;
    isCleanedUpRef.current = false;

    try {
      // Obtenir le média local
      console.log("[useWebRTC] Accès aux médias locaux...");
      const stream = await getLocalMediaStream();
      
      if (isCleanedUpRef.current) {
        stopMediaStream(stream);
        return;
      }
      
      setLocalStream(stream);
      console.log("[useWebRTC] ✅ Médias locaux obtenus");

      // Configurer la signalisation
      const signaling = new SignalingChannel(callId, handleSignal);
      signalingRef.current = signaling;
      await signaling.connect();
      console.log("[useWebRTC] ✅ Signalisation connectée");

      // Configurer la connexion peer
      const pc = new PeerConnectionManager(
        signaling,
        {
          onRemoteStream: (stream) => {
            console.log("[useWebRTC] 📹 Stream distant reçu dans hook");
            setRemoteStream(stream);
          },
          onConnectionStateChange: handleConnectionStateChange,
          onIceConnectionStateChange: (state) => console.log("[useWebRTC] État ICE:", state),
          onError: handleError,
        },
        "send"
      );
      peerConnectionRef.current = pc;
      pc.initialize(stream);
      console.log("[useWebRTC] ✅ PeerConnection initialisée");

      // Attendre que le channel soit prêt, puis créer l'offre
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isCleanedUpRef.current) return;
      
      await pc.createOffer();
      console.log("[useWebRTC] ✅ Offre créée et envoyée");
      
    } catch (err: any) {
      console.error("[useWebRTC] ❌ Erreur démarrage appel:", err);
      handleError(err.message || "Erreur démarrage appel");
    } finally {
      setIsLoading(false);
    }
  }, [callId, isInitiator, handleSignal, handleConnectionStateChange, handleError]);

  // Écouter l'appel (résident - réception seulement)
  const listenForCall = useCallback(async () => {
    if (isInitiator) {
      console.log("[useWebRTC] Le visiteur doit utiliser startCall");
      return;
    }

    if (isInitializedRef.current) {
      console.log("[useWebRTC] Déjà initialisé");
      return;
    }

    console.log("[useWebRTC] 👂 Écoute de l'appel en tant que résident");
    setIsLoading(true);
    setError(null);
    isInitializedRef.current = true;

    try {
      // Configurer la signalisation
      const signaling = new SignalingChannel(callId, handleSignal);
      signalingRef.current = signaling;
      await signaling.connect();
      console.log("[useWebRTC] ✅ Signalisation connectée");

      // Configurer la connexion peer en mode réception
      const pc = new PeerConnectionManager(
        signaling,
        {
          onRemoteStream: (stream) => {
            console.log("[useWebRTC] 📹 Stream distant reçu dans hook");
            setRemoteStream(stream);
          },
          onConnectionStateChange: handleConnectionStateChange,
          onIceConnectionStateChange: (state) => console.log("[useWebRTC] État ICE:", state),
          onError: handleError,
        },
        "receive"
      );
      peerConnectionRef.current = pc;
      pc.initialize();
      console.log("[useWebRTC] ✅ PeerConnection initialisée (receive)");

      // Vérifier les signaux existants
      const existingSignals = await signaling.fetchExistingSignals();
      console.log(`[useWebRTC] Traitement ${existingSignals.length} signaux existants`);
      
      for (const signal of existingSignals) {
        await handleSignal(signal);
      }

    } catch (err: any) {
      console.error("[useWebRTC] ❌ Erreur écoute appel:", err);
      handleError(err.message || "Erreur écoute appel");
    } finally {
      setIsLoading(false);
    }
  }, [callId, isInitiator, handleSignal, handleConnectionStateChange, handleError]);

  // Répondre à l'appel (résident active caméra)
  const answerCall = useCallback(async () => {
    console.log("[useWebRTC] 📞 Réponse à l'appel - activation médias locaux");
    setHasAnswered(true);
    setIsLoading(true);

    try {
      const stream = await getLocalMediaStream();
      setLocalStream(stream);

      // Ajouter les tracks et renégocier
      const pc = peerConnectionRef.current;
      if (pc) {
        await pc.addTracksAndRenegotiate(stream);
        console.log("[useWebRTC] ✅ Renégociation avec médias locaux");
      }
    } catch (err: any) {
      console.error("[useWebRTC] ❌ Erreur activation médias locaux:", err);
      handleError("Impossible d'activer la caméra/micro");
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // Basculer mute
  const toggleMute = useCallback(() => {
    const newMuted = toggleAudioTrack(localStream);
    setIsMuted(newMuted);
    console.log("[useWebRTC] Audio:", newMuted ? "muté" : "activé");
  }, [localStream]);

  // Basculer vidéo
  const toggleVideo = useCallback(() => {
    const newEnabled = toggleVideoTrack(localStream);
    setIsVideoEnabled(newEnabled);
    console.log("[useWebRTC] Vidéo:", newEnabled ? "activée" : "désactivée");
  }, [localStream]);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      console.log("[useWebRTC] Nettoyage au démontage");
      isCleanedUpRef.current = true;
      isInitializedRef.current = false;
      
      stopMediaStream(localStream);
      stopMediaStream(remoteStream);
      peerConnectionRef.current?.close();
      signalingRef.current?.disconnect();
    };
  }, []);

  // Déboguer l'état des streams
  useEffect(() => {
    if (localStream) {
      console.log("[useWebRTC] État stream local:", getStreamState(localStream));
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream) {
      console.log("[useWebRTC] État stream distant:", getStreamState(remoteStream));
    }
  }, [remoteStream]);

  return {
    // State
    localStream,
    remoteStream,
    connectionState,
    error,
    isMuted,
    isVideoEnabled,
    hasAnswered,
    isLoading,
    
    // Actions
    startCall,
    listenForCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
    
    // États dérivés
    isConnected: connectionState === "connected",
    isConnecting: connectionState === "connecting",
    isFailed: connectionState === "failed",
  };
};
