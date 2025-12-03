import { useState, useCallback, useRef, useEffect } from "react";
import DailyIframe, { DailyCall, DailyParticipant } from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

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

const INITIAL_STATE: DailyState = {
  isJoined: false,
  isLoading: false,
  error: null,
  isMuted: false,
  isVideoEnabled: false,
  participants: [],
  localVideoTrack: null,
  remoteVideoTrack: null,
  localAudioTrack: null,
  remoteAudioTrack: null,
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export const useDaily = ({
  callId,
  isResident,
  onCallConnected,
  onCallEnded,
  onError,
}: UseDailyProps) => {
  const [state, setState] = useState<DailyState>(INITIAL_STATE);
  const callRef = useRef<DailyCall | null>(null);
  const roomUrlRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  // Safe state update (prevents updates after unmount)
  const safeSetState = useCallback((updater: (prev: DailyState) => DailyState) => {
    if (mountedRef.current) {
      setState(updater);
    }
  }, []);

  // Update tracks from participants
  const updateTracks = useCallback(() => {
    const call = callRef.current;
    if (!call || !mountedRef.current) return;

    try {
      const participants = call.participants();
      const local = participants.local;
      const remoteParticipants = Object.values(participants).filter(p => !p.local);
      const remote = remoteParticipants[0];

      // Get tracks - check state for playability
      const localVideo = local?.tracks?.video;
      const localAudio = local?.tracks?.audio;
      const remoteVideo = remote?.tracks?.video;
      const remoteAudio = remote?.tracks?.audio;

      logger.log("[useDaily] Tracks update - local video state:", localVideo?.state, "remote video state:", remoteVideo?.state);

      safeSetState(prev => ({
        ...prev,
        participants: Object.values(participants),
        // Use track if playable, otherwise try persistentTrack
        localVideoTrack: localVideo?.state === 'playable' ? (localVideo.track || localVideo.persistentTrack) : null,
        localAudioTrack: localAudio?.state === 'playable' ? (localAudio.track || localAudio.persistentTrack) : null,
        remoteVideoTrack: remoteVideo?.state === 'playable' ? (remoteVideo.track || remoteVideo.persistentTrack) : null,
        remoteAudioTrack: remoteAudio?.state === 'playable' ? (remoteAudio.track || remoteAudio.persistentTrack) : null,
      }));
    } catch (err) {
      logger.error("[useDaily] Error updating tracks:", err);
    }
  }, [safeSetState]);

  // Create or get Daily room with retry
  const createRoom = useCallback(async (): Promise<string> => {
    logger.log("[useDaily] Creating room for:", callId);
    
    let lastError: Error | null = null;
    
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        const { data, error } = await supabase.functions.invoke("daily-room", {
          body: { callId },
        });

        if (error) throw new Error(error.message || "Room creation failed");
        if (!data?.url) throw new Error("No room URL returned");

        logger.log("[useDaily] Room created:", data.url);
        return data.url;
      } catch (err: any) {
        lastError = err;
        logger.warn(`[useDaily] Room creation attempt ${i + 1} failed:`, err.message);
        if (i < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, RETRY_DELAY));
        }
      }
    }

    throw lastError || new Error("Failed to create room");
  }, [callId]);

  // Setup event listeners
  const setupEventListeners = useCallback((call: DailyCall) => {
    call.on("joined-meeting", () => {
      logger.log("[useDaily] Joined meeting");
      retryCountRef.current = 0;
      safeSetState(prev => ({ ...prev, isJoined: true, isLoading: false, error: null }));
      updateTracks();
      onCallConnected?.();
    });

    call.on("left-meeting", () => {
      logger.log("[useDaily] Left meeting");
      safeSetState(prev => ({ ...prev, isJoined: false }));
      onCallEnded?.();
    });

    call.on("participant-joined", () => updateTracks());
    call.on("participant-left", async (event) => {
      logger.log("[useDaily] Participant left:", event?.participant?.user_id);
      updateTracks();
      
      // When remote participant leaves, end the call immediately
      const participants = call.participants();
      const remoteCount = Object.values(participants).filter(p => !p.local).length;
      if (remoteCount === 0) {
        logger.log("[useDaily] No more remote participants - ending call");
        try {
          await call.leave();
          await call.destroy();
          callRef.current = null;
          safeSetState(() => INITIAL_STATE);
        } catch (err) {
          logger.error("[useDaily] Error leaving after participant left:", err);
        }
        onCallEnded?.();
      }
    });

    call.on("participant-updated", updateTracks);
    call.on("track-started", updateTracks);
    call.on("track-stopped", updateTracks);

    call.on("error", (event) => {
      logger.error("[useDaily] Call error:", event);
      const errorMsg = "Erreur de connexion";
      safeSetState(prev => ({ ...prev, error: errorMsg, isLoading: false }));
      onError?.(errorMsg);
    });

    // Network quality handling
    call.on("network-quality-change", (event) => {
      if (event?.threshold === "very-low") {
        logger.warn("[useDaily] Poor network quality");
      }
    });
  }, [safeSetState, updateTracks, onCallConnected, onCallEnded, onError]);

  // Join the call
  const joinCall = useCallback(async () => {
    if (callRef.current || state.isLoading) return;

    safeSetState(prev => ({ ...prev, isLoading: true, error: null }));
    logger.log("[useDaily] Joining as", isResident ? "resident" : "visitor");

    try {
      const roomUrl = await createRoom();
      if (!mountedRef.current) return;
      
      roomUrlRef.current = roomUrl;

      const call = DailyIframe.createCallObject({
        audioSource: true,
        // Visitor has video, resident starts without video (voice-only mode)
        videoSource: !isResident,
      });
      callRef.current = call;

      setupEventListeners(call);

      await call.join({
        url: roomUrl,
        // Resident: voice-only mode after answering (no video)
        // Visitor: video enabled
        startVideoOff: isResident,
        startAudioOff: false,
      });

      // Ensure audio is properly enabled after join
      call.setLocalAudio(true);
      
      logger.log("[useDaily] Joined with audio enabled, video:", !isResident);

      safeSetState(prev => ({
        ...prev,
        isVideoEnabled: !isResident,
        isMuted: false,
      }));

    } catch (err: any) {
      logger.error("[useDaily] Join error:", err);
      const errorMsg = err.message || "Erreur de connexion";
      safeSetState(prev => ({ ...prev, error: errorMsg, isLoading: false }));
      onError?.(errorMsg);
    }
  }, [isResident, createRoom, setupEventListeners, safeSetState, onError, state.isLoading]);

  // Leave the call
  const leaveCall = useCallback(async () => {
    const call = callRef.current;
    if (!call) return;

    logger.log("[useDaily] Leaving call");
    try {
      await call.leave();
      await call.destroy();
    } catch (err) {
      logger.error("[useDaily] Leave error:", err);
    } finally {
      callRef.current = null;
      safeSetState(() => INITIAL_STATE);
    }
  }, [safeSetState]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (!call) return;

    const newMuted = !state.isMuted;
    call.setLocalAudio(!newMuted);
    safeSetState(prev => ({ ...prev, isMuted: newMuted }));
  }, [state.isMuted, safeSetState]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const call = callRef.current;
    if (!call) return;

    const newEnabled = !state.isVideoEnabled;
    call.setLocalVideo(newEnabled);
    safeSetState(prev => ({ ...prev, isVideoEnabled: newEnabled }));
  }, [state.isVideoEnabled, safeSetState]);

  // Enable video
  const enableVideo = useCallback(async () => {
    const call = callRef.current;
    if (!call) return;

    await call.setLocalVideo(true);
    safeSetState(prev => ({ ...prev, isVideoEnabled: true }));
  }, [safeSetState]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const call = callRef.current;
      if (call) {
        call.leave().catch(() => {});
        call.destroy();
        callRef.current = null;
      }
    };
  }, []);

  return {
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
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    enableVideo,
  };
};
