import { VIDEO_CONSTRAINTS, AUDIO_CONSTRAINTS } from "./constants";

export async function getLocalMediaStream(): Promise<MediaStream> {
  console.log("[Media] Requesting media access...");
  
  try {
    // Vérifier d'abord les permissions et devices disponibles
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasVideo = devices.some(device => device.kind === 'videoinput');
    const hasAudio = devices.some(device => device.kind === 'audioinput');
    
    console.log("[Media] Available devices:", { hasVideo, hasAudio, devices });

    // Adapter les contraintes selon les devices disponibles
    const constraints: MediaStreamConstraints = {
      video: hasVideo ? VIDEO_CONSTRAINTS : false,
      audio: hasAudio ? AUDIO_CONSTRAINTS : false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Vérifier que les tracks fonctionnent
    stream.getTracks().forEach(track => {
      track.onended = () => console.log(`[Media] Track ${track.kind} ended`);
      track.onmute = () => console.log(`[Media] Track ${track.kind} muted`);
      track.onunmute = () => console.log(`[Media] Track ${track.kind} unmuted`);
    });

    console.log("[Media] ✅ Stream obtenu avec succès:", {
      id: stream.id,
      active: stream.active,
      videoTracks: stream.getVideoTracks().length,
      audioTracks: stream.getAudioTracks().length
    });

    return stream;
  } catch (error: any) {
    console.error("[Media] ❌ Erreur accès média:", error);
    
    if (error.name === 'NotAllowedError') {
      throw new Error("Permission caméra/micro refusée");
    } else if (error.name === 'NotFoundError') {
      throw new Error("Aucune caméra/micro trouvé");
    } else if (error.name === 'NotReadableError') {
      throw new Error("Caméra/micro déjà utilisé");
    } else {
      throw new Error(`Erreur média: ${error.message}`);
    }
  }
}

export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  
  console.log("[Media] Arrêt du stream:", stream.id);
  stream.getTracks().forEach(track => {
    console.log(`[Media] Arrêt track ${track.kind}:`, track.id);
    track.stop();
    track.enabled = false;
  });
}

export function toggleAudioTrack(stream: MediaStream | null): boolean {
  if (!stream) return true;
  
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) return true;
  
  const newState = !audioTracks[0].enabled;
  audioTracks.forEach(track => {
    track.enabled = newState;
  });
  
  console.log("[Media] Audio:", newState ? "activé" : "muté");
  return !newState; // retourne isMuted
}

export function toggleVideoTrack(stream: MediaStream | null): boolean {
  if (!stream) return false;
  
  const videoTracks = stream.getVideoTracks();
  if (videoTracks.length === 0) return false;
  
  const newState = !videoTracks[0].enabled;
  videoTracks.forEach(track => {
    track.enabled = newState;
  });
  
  console.log("[Media] Vidéo:", newState ? "activée" : "désactivée");
  return newState;
}

// Nouvelle fonction pour vérifier l'état des tracks
export function getStreamState(stream: MediaStream | null) {
  if (!stream) return null;
  
  return {
    id: stream.id,
    active: stream.active,
    videoTracks: stream.getVideoTracks().map(t => ({
      id: t.id,
      enabled: t.enabled,
      readyState: t.readyState,
      muted: t.muted
    })),
    audioTracks: stream.getAudioTracks().map(t => ({
      id: t.id,
      enabled: t.enabled,
      readyState: t.readyState,
      muted: t.muted
    }))
  };
}
