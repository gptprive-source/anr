import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseWebRTCProps {
  callId: string;
  isInitiator: boolean; // true = visitor (sends video), false = resident (receives first)
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
  const [hasAnswered, setHasAnswered] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localIdRef = useRef<string>(`peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const isCleanedUpRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);

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

  // Initialize peer connection for RECEIVING (resident - no local media yet)
  const initializeReceiveOnlyConnection = useCallback(() => {
    console.log("[WebRTC] Initializing receive-only peer connection");
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Add transceivers for receiving (recvonly)
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    // Handle remote tracks (visitor's video)
    pc.ontrack = (event) => {
      console.log("[WebRTC] 🎥 Received remote track:", event.track.kind, {
        trackId: event.track.id,
        enabled: event.track.enabled,
        muted: event.track.muted,
        readyState: event.track.readyState,
        streams: event.streams.length,
      });
      if (event.streams[0]) {
        const stream = event.streams[0];
        console.log("[WebRTC] 🎥 Setting remote stream:", {
          streamId: stream.id,
          active: stream.active,
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
        });
        setRemoteStream(stream);
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

  // Initialize peer connection for SENDING (visitor - with local media)
  const initializeSendConnection = useCallback((stream: MediaStream) => {
    console.log("[WebRTC] Initializing send peer connection with local media");
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Add local tracks (visitor's video/audio)
    stream.getTracks().forEach((track) => {
      console.log(`[WebRTC] Adding local track: ${track.kind}`);
      pc.addTrack(track, stream);
    });

    // Handle remote tracks (resident's video when they enable it)
    pc.ontrack = (event) => {
      console.log("[WebRTC] 🎥 Received remote track:", event.track.kind, {
        trackId: event.track.id,
        enabled: event.track.enabled,
        muted: event.track.muted,
        readyState: event.track.readyState,
        streams: event.streams.length,
      });
      if (event.streams[0]) {
        const stream = event.streams[0];
        console.log("[WebRTC] 🎥 Setting remote stream:", {
          streamId: stream.id,
          active: stream.active,
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
        });
        setRemoteStream(stream);
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

    return pc;
  }, [sendSignal, onCallConnected, onCallEnded]);

  // Handle incoming signals
  const handleSignal = useCallback(async (signalType: string, signalData: any) => {
    const pc = peerConnectionRef.current;
    
    console.log(`[WebRTC] Handling signal: ${signalType}, hasPC: ${!!pc}`);

    try {
      if (signalType === "offer") {
        if (!isInitiator) {
          // Resident receives offer - store it and set up receive-only connection
          console.log("[WebRTC] Resident received offer, setting up receive-only connection");
          
          const receivePC = peerConnectionRef.current || initializeReceiveOnlyConnection();
          
          await receivePC.setRemoteDescription(new RTCSessionDescription(signalData));
          pendingOfferRef.current = signalData;
          await processPendingCandidates();
          
          // Create answer for receive-only
          console.log("[WebRTC] Creating receive-only answer");
          const answer = await receivePC.createAnswer();
          await receivePC.setLocalDescription(answer);
          await sendSignal("answer", answer);
        }
      } else if (signalType === "answer") {
        if (pc) {
          console.log("[WebRTC] Received answer, setting remote description");
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
          await processPendingCandidates();
        }
      } else if (signalType === "renegotiate-offer") {
        // Handle renegotiation from the other peer (e.g., when resident enables their camera)
        if (pc) {
          console.log("[WebRTC] Handling renegotiate-offer");
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal("renegotiate-answer", answer);
        }
      } else if (signalType === "renegotiate-answer") {
        // Handle renegotiation answer
        if (pc) {
          console.log("[WebRTC] Handling renegotiate-answer");
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        }
      } else if (signalType === "ice-candidate") {
        if (pc) {
          if (pc.remoteDescription) {
            console.log("[WebRTC] Adding ICE candidate");
            await pc.addIceCandidate(new RTCIceCandidate(signalData));
          } else {
            console.log("[WebRTC] Queuing ICE candidate (no remote description yet)");
            pendingCandidatesRef.current.push(signalData);
          }
        } else {
          console.log("[WebRTC] Queuing ICE candidate (no peer connection yet)");
          pendingCandidatesRef.current.push(signalData);
        }
      }
    } catch (err) {
      console.error(`[WebRTC] Error handling ${signalType}:`, err);
      setError(`Erreur de signalisation: ${err}`);
    }
  }, [isInitiator, initializeReceiveOnlyConnection, sendSignal, processPendingCandidates]);

  // Start the call (visitor calls this)
  const startCall = useCallback(async () => {
    if (!isInitiator) {
      console.log("[WebRTC] Resident should use listenForCall, not startCall");
      return;
    }

    // Prevent multiple calls
    if (hasInitializedRef.current) {
      console.log("[WebRTC] Already initialized, skipping startCall");
      return;
    }
    hasInitializedRef.current = true;

    // Reset cleanup flag
    isCleanedUpRef.current = false;
    
    console.log("[WebRTC] Visitor starting call");
    setError(null);

    try {
      // Get local media (visitor's camera)
      console.log("[WebRTC] Requesting media access");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });
      
      // Check if cleaned up during async operation
      if (isCleanedUpRef.current) {
        console.log("[WebRTC] ⚠️ Cleaned up during media access, stopping");
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      
      console.log("[WebRTC] ✅ Got local stream:", {
        streamId: stream.id,
        active: stream.active,
        videoTracks: stream.getVideoTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState })),
        audioTracks: stream.getAudioTracks().map(t => ({ id: t.id, enabled: t.enabled, readyState: t.readyState })),
      });
      setLocalStream(stream);

      // Initialize peer connection with media
      const pc = initializeSendConnection(stream);

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

      // Small delay to ensure channel is ready, then create offer
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if cleaned up during delay
      if (isCleanedUpRef.current || pc.signalingState === 'closed') {
        console.log("[WebRTC] ⚠️ Cleaned up during channel setup, stopping");
        return;
      }
      
      console.log("[WebRTC] Creating offer, signalingState:", pc.signalingState);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal("offer", offer);
      
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
  }, [callId, isInitiator, initializeSendConnection, handleSignal, sendSignal]);

  // Listen for incoming call (resident calls this - receive video without answering)
  const listenForCall = useCallback(async () => {
    if (isInitiator) {
      console.log("[WebRTC] Visitor should use startCall, not listenForCall");
      return;
    }

    // Prevent multiple calls
    if (hasInitializedRef.current) {
      console.log("[WebRTC] Already initialized, skipping listenForCall");
      return;
    }
    hasInitializedRef.current = true;

    console.log("[WebRTC] Resident listening for call");
    setError(null);

    // Initialize receive-only connection
    initializeReceiveOnlyConnection();

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

    // Check for existing signals (in case visitor already sent offer)
    const { data: existingSignals } = await supabase
      .from("call_signals")
      .select("*")
      .eq("call_id", callId)
      .order("created_at", { ascending: true });

    if (existingSignals && existingSignals.length > 0) {
      console.log("[WebRTC] Processing existing signals:", existingSignals.length);
      for (const signal of existingSignals) {
        if (signal.sender_id !== localIdRef.current) {
          await handleSignal(signal.signal_type, signal.signal_data);
        }
      }
    }
  }, [callId, isInitiator, initializeReceiveOnlyConnection, handleSignal]);

  // Answer the call (resident enables their camera/mic)
  const answerCall = useCallback(async () => {
    console.log("[WebRTC] Resident answering call - enabling local media");
    setHasAnswered(true);

    try {
      // Get local media (resident's camera - optional)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });
      
      setLocalStream(stream);

      // Add tracks to existing connection
      const pc = peerConnectionRef.current;
      if (pc) {
        stream.getTracks().forEach((track) => {
          console.log(`[WebRTC] Adding local track after answer: ${track.kind}`);
          pc.addTrack(track, stream);
        });

        // Renegotiate to send our video
        console.log("[WebRTC] Renegotiating to enable two-way");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal("renegotiate-offer", offer);
      }
    } catch (err: any) {
      console.error("[WebRTC] Error enabling local media:", err);
      // Even if camera fails, the call is still "answered" (audio might work)
      setError("Impossible d'activer la caméra");
    }
  }, [sendSignal]);

  // End the call
  const endCall = useCallback(() => {
    console.log("[WebRTC] Ending call");
    
    localStream?.getTracks().forEach((track) => {
      track.stop();
    });
    
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState("closed");
    setHasAnswered(false);
    
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

  // Cleanup on unmount - use empty deps to only run once
  useEffect(() => {
    return () => {
      console.log("[WebRTC] Cleanup on unmount");
      isCleanedUpRef.current = true;
      hasInitializedRef.current = false; // Reset so next mount can initialize
      
      // Stop all tracks from peer connection senders
      peerConnectionRef.current?.getSenders().forEach(sender => {
        sender.track?.stop();
      });
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []); // Empty deps - only run on unmount

  return {
    localStream,
    remoteStream,
    connectionState,
    error,
    isMuted,
    isVideoEnabled,
    hasAnswered,
    startCall,      // Visitor uses this
    listenForCall,  // Resident uses this to receive video before answering
    answerCall,     // Resident uses this to enable their camera
    endCall,
    toggleMute,
    toggleVideo,
  };
};
