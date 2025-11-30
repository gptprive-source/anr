// WebRTC Configuration - ICE Servers améliorés
export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    // Serveurs TURN pour les réseaux restrictifs
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

// Media constraints optimisées
export const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
  frameRate: { ideal: 30, max: 60 },
  aspectRatio: { ideal: 16/9 }
};

export const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48000,
  sampleSize: 16
};

export const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  video: VIDEO_CONSTRAINTS,
  audio: AUDIO_CONSTRAINTS
};

// Timeouts et configurations
export const CONNECTION_TIMEOUT = 30000; // 30 seconds
export const ICE_GATHERING_TIMEOUT = 10000; // 10 seconds
