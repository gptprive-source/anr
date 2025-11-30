import { MEDIA_CONSTRAINTS } from "./constants";

// Get local media stream with high quality settings
export async function getLocalMediaStream(): Promise<MediaStream> {
  console.log("[Media] Requesting media access with constraints:", MEDIA_CONSTRAINTS);
  
  const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
  
  console.log("[Media] ✅ Got local stream:", {
    streamId: stream.id,
    active: stream.active,
    videoTracks: stream.getVideoTracks().map(t => ({ 
      id: t.id, 
      enabled: t.enabled, 
      readyState: t.readyState,
      settings: t.getSettings()
    })),
    audioTracks: stream.getAudioTracks().map(t => ({ 
      id: t.id, 
      enabled: t.enabled, 
      readyState: t.readyState 
    })),
  });
  
  return stream;
}

// Stop all tracks in a stream
export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  
  console.log("[Media] Stopping stream:", stream.id);
  stream.getTracks().forEach(track => {
    track.stop();
    console.log(`[Media] Stopped track: ${track.kind}`);
  });
}

// Toggle audio track enabled state
export function toggleAudioTrack(stream: MediaStream | null): boolean {
  if (!stream) return false;
  
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) return false;
  
  const newState = !audioTracks[0].enabled;
  audioTracks.forEach(track => {
    track.enabled = newState;
  });
  
  console.log("[Media] Audio toggled:", newState ? "unmuted" : "muted");
  return !newState; // Returns isMuted
}

// Toggle video track enabled state
export function toggleVideoTrack(stream: MediaStream | null): boolean {
  if (!stream) return true;
  
  const videoTracks = stream.getVideoTracks();
  if (videoTracks.length === 0) return false;
  
  const newState = !videoTracks[0].enabled;
  videoTracks.forEach(track => {
    track.enabled = newState;
  });
  
  console.log("[Media] Video toggled:", newState ? "enabled" : "disabled");
  return newState;
}
