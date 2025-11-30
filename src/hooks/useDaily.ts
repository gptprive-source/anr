import { useState, useCallback, useRef, useEffect } from "react";
import DailyIframe, { DailyCall, DailyParticipant } from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";

interface UseDailyProps {
  callId: string;
  isResident: boolean;
  onCallConnected?: () => void;
  onCallEnded?: () => void;
  onError?: (error: string) => void;
}

interface DailyState {
  isJoined: boolean;
  isLoading: boolean;
  error: string | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  participants: DailyParticipant[];
  localVideoTrack: MediaStreamTrack | null;
  remoteVideoTrack: MediaStreamTrack | null;
  localAudioTrack: MediaStreamTrack | null;
  remoteAudioTrack: MediaStreamTrack | null;
}

export const useDaily = ({
  callId,
  isResident,
  onCallConnected,
  onCallEnded,
  onError,
}: UseDailyProps) => {
  const [state, setState] = useState<DailyState>({
    isJoined: false,
    isLoading: false,
    error: null,
    isMuted: false,
    isVideoEnabled: false, // Start with video disabled (audio-first)
    participants: [],
    localVideoTrack: null,
    remoteVideoTrack: null,
    localAudioTrack: null,
    remoteAudioTrack: null,
  });

  const callRef = useRef<DailyCall | null>(null);
  const roomUrlRef = useRef<string | null>(null);

  // Update tracks from participants
  const updateTracks = useCallback(() => {
    const call = callRef.current;
    if (!call) return;

    const participants = call.participants();
    const local = participants.local;
    const remoteParticipants = Object.values(participants).filter(p => !p.local);
    const remote = remoteParticipants[0]; // First remote participant

    setState(prev => ({
      ...prev,
      participants: Object.values(participants),
      localVideoTrack: local?.tracks?.video?.persistentTrack || null,
      localAudioTrack: local?.tracks?.audio?.persistentTrack || null,
      remoteVideoTrack: remote?.tracks?.video?.persistentTrack || null,
      remoteAudioTrack: remote?.tracks?.audio?.persistentTrack || null,
    }));
  }, []);

  // Create or get Daily room
  const createRoom = useCallback(async (): Promise<string> => {
    console.log("[useDaily] Creating/getting room for callId:", callId);
    
    const { data, error } = await supabase.functions.invoke("daily-room", {
      body: { callId },
    });

    if (error) {
      console.error("[useDaily] Error creating room:", error);
      throw new Error("Impossible de créer la salle d'appel");
    }

    console.log("[useDaily] Room URL:", data.url);
    return data.url;
  }, [callId]);

  // Join the call
  const joinCall = useCallback(async () => {
    if (callRef.current || state.isLoading) {
      console.log("[useDaily] Already joining or joined");
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    console.log("[useDaily] Joining call as", isResident ? "resident" : "visitor");

    try {
      // Get or create room
      const roomUrl = await createRoom();
      roomUrlRef.current = roomUrl;

      // Create Daily call object
      const call = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: !isResident, // Visitor starts with video, resident without
      });
      callRef.current = call;

      // Set up event listeners
      call.on("joined-meeting", () => {
        console.log("[useDaily] Joined meeting");
        setState(prev => ({ ...prev, isJoined: true, isLoading: false }));
        updateTracks();
        onCallConnected?.();
      });

      call.on("left-meeting", () => {
        console.log("[useDaily] Left meeting");
        setState(prev => ({ ...prev, isJoined: false }));
        onCallEnded?.();
      });

      call.on("participant-joined", (event) => {
        console.log("[useDaily] Participant joined:", event?.participant?.user_id);
        updateTracks();
      });

      call.on("participant-left", (event) => {
        console.log("[useDaily] Participant left:", event?.participant?.user_id);
        updateTracks();
        
        // If no more remote participants, end call
        const participants = call.participants();
        const remoteCount = Object.values(participants).filter(p => !p.local).length;
        if (remoteCount === 0 && state.isJoined) {
          console.log("[useDaily] No more participants, ending call");
          onCallEnded?.();
        }
      });

      call.on("participant-updated", () => {
        updateTracks();
      });

      call.on("track-started", () => {
        updateTracks();
      });

      call.on("track-stopped", () => {
        updateTracks();
      });

      call.on("error", (event) => {
        console.error("[useDaily] Error:", event);
        const errorMsg = "Erreur de connexion à l'appel";
        setState(prev => ({ ...prev, error: errorMsg, isLoading: false }));
        onError?.(errorMsg);
      });

      // Join the room - visitor with video, resident audio-only initially
      await call.join({
        url: roomUrl,
        startVideoOff: isResident, // Resident joins without video
        startAudioOff: false,
      });

      setState(prev => ({
        ...prev,
        isVideoEnabled: !isResident,
        isMuted: false,
      }));

    } catch (err: any) {
      console.error("[useDaily] Error joining call:", err);
      const errorMsg = err.message || "Erreur de connexion";
      setState(prev => ({ ...prev, error: errorMsg, isLoading: false }));
      onError?.(errorMsg);
    }
  }, [callId, isResident, createRoom, onCallConnected, onCallEnded, onError, state.isLoading, updateTracks, state.isJoined]);

  // Leave the call
  const leaveCall = useCallback(async () => {
    console.log("[useDaily] Leaving call");
    const call = callRef.current;
    if (call) {
      await call.leave();
      await call.destroy();
      callRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isJoined: false,
      participants: [],
      localVideoTrack: null,
      remoteVideoTrack: null,
      localAudioTrack: null,
      remoteAudioTrack: null,
    }));
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (!call) return;

    const newMuted = !state.isMuted;
    call.setLocalAudio(!newMuted);
    setState(prev => ({ ...prev, isMuted: newMuted }));
    console.log("[useDaily] Audio:", newMuted ? "muted" : "unmuted");
  }, [state.isMuted]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const call = callRef.current;
    if (!call) return;

    const newEnabled = !state.isVideoEnabled;
    call.setLocalVideo(newEnabled);
    setState(prev => ({ ...prev, isVideoEnabled: newEnabled }));
    console.log("[useDaily] Video:", newEnabled ? "enabled" : "disabled");
  }, [state.isVideoEnabled]);

  // Enable video (for resident to switch to two-way video)
  const enableVideo = useCallback(async () => {
    const call = callRef.current;
    if (!call) return;

    await call.setLocalVideo(true);
    setState(prev => ({ ...prev, isVideoEnabled: true }));
    console.log("[useDaily] Video enabled");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const call = callRef.current;
      if (call) {
        call.leave();
        call.destroy();
        callRef.current = null;
      }
    };
  }, []);

  return {
    // State
    isJoined: state.isJoined,
    isLoading: state.isLoading,
    error: state.error,
    isMuted: state.isMuted,
    isVideoEnabled: state.isVideoEnabled,
    participants: state.participants,
    localVideoTrack: state.localVideoTrack,
    remoteVideoTrack: state.remoteVideoTrack,
    localAudioTrack: state.localAudioTrack,
    remoteAudioTrack: state.remoteAudioTrack,

    // Actions
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    enableVideo,
  };
};
