import { useState, useEffect, useRef, useCallback } from "react";
import { SignalingChannel, Signal } from "@/lib/webrtc/signaling";
import { PeerConnectionManager } from "@/lib/webrtc/peer-connection";
import { getLocalMediaStream, stopMediaStream, toggleAudioTrack, toggleVideoTrack } from "@/lib/webrtc/media";

interface UseWebRTCProps {
  callId: string;
  isInitiator: boolean; // true = visitor (sends video), false = resident (receives first)
  onCallConnected?: () => void;
  onCallEnded?: () => void;
}

export const useWebRTC = ({
  callId,
  isInitiator,
  onCallConnected,
  onCallEnded,
}: UseWebRTCProps) => {
  // State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [hasAnswered, setHasAnswered] = useState(false);

  // Refs
  const signalingRef = useRef<SignalingChannel | null>(null);
  const peerConnectionRef = useRef<PeerConnectionManager | null>(null);
  const isInitializedRef = useRef(false);
  const isCleanedUpRef = useRef(false);

  // Handle connection state changes
  const handleConnectionStateChange = useCallback((state: RTCPeerConnectionState) => {
    setConnectionState(state);
    
    if (state === "connected") {
      onCallConnected?.();
    } else if (state === "failed" || state === "disconnected") {
      setError("Connexion perdue");
    } else if (state === "closed") {
      onCallEnded?.();
    }
  }, [onCallConnected, onCallEnded]);

  // Handle incoming signals
  const handleSignal = useCallback(async (signal: Signal) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.log("[useWebRTC] No peer connection for signal:", signal.signal_type);
      return;
    }

    try {
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
      }
    } catch (err) {
      console.error(`[useWebRTC] Error handling ${signal.signal_type}:`, err);
      setError(`Erreur de signalisation: ${err}`);
    }
  }, []);

  // Start call (visitor)
  const startCall = useCallback(async () => {
    if (!isInitiator) {
      console.log("[useWebRTC] Resident should use listenForCall");
      return;
    }

    if (isInitializedRef.current) {
      console.log("[useWebRTC] Already initialized");
      return;
    }
    isInitializedRef.current = true;
    isCleanedUpRef.current = false;

    console.log("[useWebRTC] Starting call as visitor");
    setError(null);

    try {
      // Get local media
      const stream = await getLocalMediaStream();
      
      if (isCleanedUpRef.current) {
        stopMediaStream(stream);
        return;
      }
      
      setLocalStream(stream);

      // Set up signaling
      const signaling = new SignalingChannel(callId, handleSignal);
      signalingRef.current = signaling;
      await signaling.connect();

      // Set up peer connection
      const pc = new PeerConnectionManager(
        signaling,
        {
          onRemoteStream: setRemoteStream,
          onConnectionStateChange: handleConnectionStateChange,
          onIceConnectionStateChange: (state) => console.log("[useWebRTC] ICE state:", state),
        },
        "send"
      );
      peerConnectionRef.current = pc;
      pc.initialize(stream);

      // Wait for channel to be ready, then create offer
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isCleanedUpRef.current) return;
      
      await pc.createOffer();
    } catch (err: any) {
      console.error("[useWebRTC] Error starting call:", err);
      if (err.name === "NotAllowedError") {
        setError("Accès à la caméra/micro refusé");
      } else if (err.name === "NotFoundError") {
        setError("Aucune caméra ou microphone trouvé");
      } else {
        setError(`Erreur: ${err.message}`);
      }
    }
  }, [callId, isInitiator, handleSignal, handleConnectionStateChange]);

  // Listen for call (resident - receive only)
  const listenForCall = useCallback(async () => {
    if (isInitiator) {
      console.log("[useWebRTC] Visitor should use startCall");
      return;
    }

    if (isInitializedRef.current) {
      console.log("[useWebRTC] Already initialized");
      return;
    }
    isInitializedRef.current = true;

    console.log("[useWebRTC] Listening for call as resident");
    setError(null);

    try {
      // Set up signaling
      const signaling = new SignalingChannel(callId, handleSignal);
      signalingRef.current = signaling;
      await signaling.connect();

      // Set up peer connection in receive mode
      const pc = new PeerConnectionManager(
        signaling,
        {
          onRemoteStream: setRemoteStream,
          onConnectionStateChange: handleConnectionStateChange,
          onIceConnectionStateChange: (state) => console.log("[useWebRTC] ICE state:", state),
        },
        "receive"
      );
      peerConnectionRef.current = pc;
      pc.initialize();

      // Check for existing signals
      const existingSignals = await signaling.fetchExistingSignals();
      for (const signal of existingSignals) {
        await handleSignal(signal);
      }
    } catch (err: any) {
      console.error("[useWebRTC] Error listening for call:", err);
      setError(`Erreur: ${err.message}`);
    }
  }, [callId, isInitiator, handleSignal, handleConnectionStateChange]);

  // Answer call (resident enables camera)
  const answerCall = useCallback(async () => {
    console.log("[useWebRTC] Answering call - enabling local media");
    setHasAnswered(true);

    try {
      const stream = await getLocalMediaStream();
      setLocalStream(stream);

      // Add tracks and renegotiate
      const pc = peerConnectionRef.current;
      if (pc) {
        await pc.addTracksAndRenegotiate(stream);
      }
    } catch (err: any) {
      console.error("[useWebRTC] Error enabling local media:", err);
      setError("Impossible d'activer la caméra");
    }
  }, []);

  // End call
  const endCall = useCallback(() => {
    console.log("[useWebRTC] Ending call");
    
    stopMediaStream(localStream);
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    signalingRef.current?.disconnect();
    signalingRef.current = null;
    
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState("closed");
    setHasAnswered(false);
    
    onCallEnded?.();
  }, [localStream, onCallEnded]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMuted = toggleAudioTrack(localStream);
    setIsMuted(newMuted);
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const newEnabled = toggleVideoTrack(localStream);
    setIsVideoEnabled(newEnabled);
  }, [localStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("[useWebRTC] Cleanup on unmount");
      isCleanedUpRef.current = true;
      isInitializedRef.current = false;
      
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      signalingRef.current?.disconnect();
      signalingRef.current = null;
    };
  }, []);

  return {
    localStream,
    remoteStream,
    connectionState,
    error,
    isMuted,
    isVideoEnabled,
    hasAnswered,
    startCall,
    listenForCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
};
