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

type VideoMode = "off" | "simple" | "double";

export interface RemoteParticipant {
  sessionId: string;
  visitorVideo: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
}

interface DailyState {
  isJoined: boolean;
  isLoading: boolean;
  error: string | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  videoMode: VideoMode;
  participants: DailyParticipant[];
  localVideoTrack: MediaStreamTrack | null;
  localAudioTrack: MediaStreamTrack | null;
  remoteParticipants: RemoteParticipant[];
}

const INITIAL_STATE: DailyState = {
  isJoined: false,
  isLoading: false,
  error: null,
  isMuted: false,
  isVideoEnabled: false,
  videoMode: "off",
  participants: [],
  localVideoTrack: null,
  localAudioTrack: null,
  remoteParticipants: [],
};

// OPTIMISÉ: Réduit de 2000ms à 300ms
const MAX_RETRIES = 2;
const RETRY_DELAY = 300;

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

  const safeSetState = useCallback((updater: (prev: DailyState) => DailyState) => {
    if (mountedRef.current) {
      setState(updater);
    }
  }, []);

  // OPTIMISÉ: Update tracks immédiat sans timeout
  const updateTracks = useCallback(() => {
    const call = callRef.current;
    if (!call || !mountedRef.current) return;

    try {
      const participants = call.participants();
      const local = participants.local;
      const remoteParticipants = Object.values(participants).filter(p => !p.local);

      const localVideo = local?.tracks?.video;
      const localAudio = local?.tracks?.audio;

      const remoteParticipantsData: RemoteParticipant[] = remoteParticipants.map(p => {
        const video = p.tracks?.video;
        const audio = p.tracks?.audio;
        const isVisitor = !p.user_id || p.user_name === 'visitor';
        return {
          sessionId: p.session_id,
          visitorVideo: isVisitor,
          videoTrack: video?.state === 'playable' ? (video.track || video.persistentTrack) : null,
          audioTrack: audio?.state === 'playable' ? (audio.track || audio.persistentTrack) : null,
        };
      });

      logger.log("[useDaily] updateTracks - remote:", remoteParticipantsData.length);

      safeSetState(prev => ({
        ...prev,
        participants: Object.values(participants),
        localVideoTrack: localVideo?.state === 'playable' ? (localVideo.track || localVideo.persistentTrack) : null,
        localAudioTrack: localAudio?.state === 'playable' ? (localAudio.track || localAudio.persistentTrack) : null,
        remoteParticipants: remoteParticipantsData,
      }));
    } catch (err) {
      logger.error("[useDaily] Error updating tracks:", err);
    }
  }, [safeSetState]);

  // OPTIMISÉ: Retry rapide
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

        logger.log("[useDaily] Room ready:", data.url);
        return data.url;
      } catch (err: any) {
        lastError = err;
        logger.warn(`[useDaily] Room attempt ${i + 1} failed:`, err.message);
        if (i < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, RETRY_DELAY));
        }
      }
    }

    throw lastError || new Error("Failed to create room");
  }, [callId]);

  const setupEventListeners = useCallback((call: DailyCall) => {
    call.on("joined-meeting", () => {
      logger.log("[useDaily] Joined meeting");
      retryCountRef.current = 0;
      safeSetState(prev => ({ ...prev, isJoined: true, isLoading: false, error: null }));
      // OPTIMISÉ: Update immédiat sans setTimeout
      updateTracks();
      onCallConnected?.();
    });

    call.on("left-meeting", () => {
      logger.log("[useDaily] Left meeting");
      safeSetState(prev => ({ ...prev, isJoined: false }));
      onCallEnded?.();
    });

    call.on("participant-joined", updateTracks);
    call.on("participant-left", (event) => {
      logger.log("[useDaily] Participant left:", event?.participant?.user_id);
      updateTracks();
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

    call.on("network-quality-change", (event) => {
      if (event?.threshold === "very-low") {
        logger.warn("[useDaily] Poor network quality");
      }
    });
  }, [safeSetState, updateTracks, onCallConnected, onCallEnded, onError]);

  const requestMediaPermissions = useCallback(async (needVideo: boolean): Promise<boolean> => {
    try {
      logger.log("[useDaily] Requesting permissions, video:", needVideo);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: needVideo,
      });
      stream.getTracks().forEach(track => track.stop());
      logger.log("[useDaily] Permissions granted");
      return true;
    } catch (err: any) {
      logger.error("[useDaily] Permission denied:", err.name, err.message);
      return false;
    }
  }, []);

  // OPTIMISÉ: Parallélisation des opérations
  const joinCall = useCallback(async () => {
    if (callRef.current || state.isLoading) return;

    safeSetState(prev => ({ ...prev, isLoading: true, error: null }));
    logger.log("[useDaily] Joining as", isResident ? "resident" : "visitor");

    try {
      // PARALLÈLE: Permissions + Room création en même temps
      const [permissionGranted, roomUrl] = await Promise.all([
        requestMediaPermissions(true),
        createRoom(),
      ]);
      
      if (!permissionGranted) {
        throw new Error("Permissions caméra/micro refusées. Veuillez autoriser l'accès dans les paramètres.");
      }
      
      if (!mountedRef.current) return;
      
      roomUrlRef.current = roomUrl;

      // OPTIMISÉ: Configuration Daily pour latence minimale
      const call = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: true,
        subscribeToTracksAutomatically: true,
        dailyConfig: {
          avoidEval: true,
        },
      });
      callRef.current = call;

      setupEventListeners(call);

      // OPTIMISÉ: Join avec options optimisées
      await call.join({
        url: roomUrl,
        startVideoOff: isResident,
        startAudioOff: false,
        subscribeToTracksAutomatically: true,
      });

      // Audio immédiat
      call.setLocalAudio(true);
      
      // Visiteur: vidéo immédiate sans délai
      if (!isResident) {
        call.setLocalVideo(true);
        logger.log("[useDaily] Visitor video enabled immediately");
      }
      
      logger.log("[useDaily] Joined - isResident:", isResident);

      safeSetState(prev => ({
        ...prev,
        isVideoEnabled: !isResident,
        videoMode: isResident ? "off" : "simple",
        isMuted: false,
      }));

    } catch (err: any) {
      logger.error("[useDaily] Join error:", err);
      const errorMsg = err.message || "Erreur de connexion";
      safeSetState(prev => ({ ...prev, error: errorMsg, isLoading: false }));
      onError?.(errorMsg);
    }
  }, [isResident, createRoom, setupEventListeners, safeSetState, onError, state.isLoading, requestMediaPermissions]);

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

  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (!call) return;

    const newMuted = !state.isMuted;
    call.setLocalAudio(!newMuted);
    safeSetState(prev => ({ ...prev, isMuted: newMuted }));
  }, [state.isMuted, safeSetState]);

  // OPTIMISÉ: Changement de mode sans délai
  const setVideoMode = useCallback((mode: VideoMode) => {
    const call = callRef.current;
    if (!call) return;

    logger.log("[useDaily] Setting video mode:", mode);
    
    if (mode === "double") {
      call.setLocalVideo(true);
    } else {
      call.setLocalVideo(false);
    }
    
    safeSetState(prev => ({ 
      ...prev, 
      videoMode: mode,
      isVideoEnabled: mode !== "off"
    }));
    
    // OPTIMISÉ: Update immédiat
    updateTracks();
  }, [safeSetState, updateTracks]);

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
    videoMode: state.videoMode,
    participants: state.participants,
    localVideoTrack: state.localVideoTrack,
    localAudioTrack: state.localAudioTrack,
    remoteParticipants: state.remoteParticipants,
    joinCall,
    leaveCall,
    toggleMute,
    setVideoMode,
  };
};
