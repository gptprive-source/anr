import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseWebRTCProps {
  callId: string;
  isInitiator: boolean;
  onCallConnected?: () => void;
  onCallEnded?: () => void;
}

interface SignalData {
  type: "offer" | "answer" | "ice-candidate";
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export const useWebRTC = ({
  callId,
  isInitiator,
  onCallConnected,
  onCallEnded,
}: UseWebRTCProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localIdRef = useRef<string>(`peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Send signaling data through Supabase
  const sendSignal = useCallback(async (signalType: string, signalData: any) => {
    console.log(`[WebRTC] Sending signal: ${signalType}`, signalData);
    try {
      const { error } = await supabase.from("call_signals").insert({
        call_id: callId,
        sender_id: localIdRef.current,
        signal_type: signalType,
        signal_data: signalData,
      });
      if (error) {
        console.error("[WebRTC] Error sending signal:", error);
      }
    } catch (err) {
      console.error("[WebRTC] Failed to send signal:", err);
    }
  }, [callId]);

  // Process pending ICE candidates
  const processPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    console.log(`[WebRTC] Processing ${pendingCandidatesRef.current.length} pending candidates`);
    
    for (const candidate of pendingCandidatesRef.current) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("[WebRTC] Added pending ICE candidate");
      } catch (err) {
        console.error("[WebRTC] Error adding pending ICE candidate:", err);
      }
    }
    pendingCandidatesRef.current = [];
  }, []);

  // Handle incoming signals
  const handleSignal = useCallback(async (signalType: string, signalData: any) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.log("[WebRTC] No peer connection, ignoring signal");
      return;
    }

    console.log(`[WebRTC] Handling signal: ${signalType}`);

    try {
      if (signalType === "offer") {
        console.log("[WebRTC] Received offer, setting remote description");
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        await processPendingCandidates();
        
        console.log("[WebRTC] Creating answer");
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal("answer", answer);
        
      } else if (signalType === "answer") {
        console.log("[WebRTC] Received answer, setting remote description");
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        await processPendingCandidates();
        
      } else if (signalType === "ice-candidate") {
        if (pc.remoteDescription) {
          console.log("[WebRTC] Adding ICE candidate");
          await pc.addIceCandidate(new RTCIceCandidate(signalData));
        } else {
          console.log("[WebRTC] Queuing ICE candidate (no remote description yet)");
          pendingCandidatesRef.current.push(signalData);
        }
      }
    } catch (err) {
      console.error(`[WebRTC] Error handling ${signalType}:`, err);
      setError(`Erreur de signalisation: ${err}`);
    }
  }, [sendSignal, processPendingCandidates]);

  // Initialize peer connection
  const initializePeerConnection = useCallback((stream: MediaStream) => {
    console.log("[WebRTC] Initializing peer connection");
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Add local tracks
    stream.getTracks().forEach((track) => {
      console.log(`[WebRTC] Adding local track: ${track.kind}`);
      pc.addTrack(track, stream);
    });

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log("[WebRTC] Received remote track:", event.track.kind);
      if (event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[WebRTC] New ICE candidate");
        sendSignal("ice-candidate", event.candidate.toJSON());
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", pc.connectionState);
      setConnectionState(pc.connectionState);
      
      if (pc.connectionState === "connected") {
        onCallConnected?.();
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setError("Connexion perdue");
      } else if (pc.connectionState === "closed") {
        onCallEnded?.();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE connection state:", pc.iceConnectionState);
    };

    return pc;
  }, [sendSignal, onCallConnected, onCallEnded]);

  // Start the call
  const startCall = useCallback(async () => {
    console.log("[WebRTC] Starting call, isInitiator:", isInitiator);
    setError(null);

    try {
      // Get local media
      console.log("[WebRTC] Requesting media access");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });
      
      console.log("[WebRTC] Got local stream");
      setLocalStream(stream);

      // Initialize peer connection
      const pc = initializePeerConnection(stream);

      // Subscribe to signaling channel
      console.log("[WebRTC] Subscribing to signaling channel");
      const channel = supabase
        .channel(`call-signals-${callId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "call_signals",
            filter: `call_id=eq.${callId}`,
          },
          (payload) => {
            const signal = payload.new as {
              sender_id: string;
              signal_type: string;
              signal_data: any;
            };
            
            // Ignore our own signals
            if (signal.sender_id === localIdRef.current) {
              return;
            }
            
            console.log("[WebRTC] Received signal from channel:", signal.signal_type);
            handleSignal(signal.signal_type, signal.signal_data);
          }
        )
        .subscribe((status) => {
          console.log("[WebRTC] Channel status:", status);
        });

      channelRef.current = channel;

      // If initiator, create and send offer
      if (isInitiator) {
        // Small delay to ensure channel is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log("[WebRTC] Creating offer");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal("offer", offer);
      }
    } catch (err: any) {
      console.error("[WebRTC] Error starting call:", err);
      if (err.name === "NotAllowedError") {
        setError("Accès à la caméra/micro refusé. Veuillez autoriser l'accès.");
      } else if (err.name === "NotFoundError") {
        setError("Aucune caméra ou microphone trouvé.");
      } else {
        setError(`Erreur: ${err.message}`);
      }
    }
  }, [callId, isInitiator, initializePeerConnection, handleSignal, sendSignal]);

  // End the call
  const endCall = useCallback(() => {
    console.log("[WebRTC] Ending call");
    
    // Stop local tracks
    localStream?.getTracks().forEach((track) => {
      track.stop();
    });
    
    // Close peer connection
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    
    // Unsubscribe from channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState("closed");
    
    onCallEnded?.();
  }, [localStream, onCallEnded]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  }, [localStream, isMuted]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [localStream, isVideoEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("[WebRTC] Cleanup on unmount");
      localStream?.getTracks().forEach((track) => track.stop());
      peerConnectionRef.current?.close();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [localStream]);

  return {
    localStream,
    remoteStream,
    connectionState,
    error,
    isMuted,
    isVideoEnabled,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
};
