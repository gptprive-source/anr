import { ICE_SERVERS } from "./constants";
import { SignalingChannel, SignalType } from "./signaling";

export type ConnectionMode = "send" | "receive";

export interface PeerConnectionCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange: (state: RTCIceConnectionState) => void;
}

export class PeerConnectionManager {
  private pc: RTCPeerConnection | null = null;
  private signaling: SignalingChannel;
  private callbacks: PeerConnectionCallbacks;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private mode: ConnectionMode;

  constructor(
    signaling: SignalingChannel,
    callbacks: PeerConnectionCallbacks,
    mode: ConnectionMode
  ) {
    this.signaling = signaling;
    this.callbacks = callbacks;
    this.mode = mode;
    console.log("[PeerConnection] Created with mode:", mode);
  }

  // Initialize the peer connection
  initialize(localStream?: MediaStream): RTCPeerConnection {
    console.log("[PeerConnection] Initializing, mode:", this.mode, "hasLocalStream:", !!localStream);
    
    this.pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Set up based on mode
    if (this.mode === "send" && localStream) {
      // Sender: add local tracks
      localStream.getTracks().forEach(track => {
        console.log(`[PeerConnection] Adding local track: ${track.kind}`);
        this.pc!.addTrack(track, localStream);
      });
    } else if (this.mode === "receive") {
      // Receiver: add transceivers for receiving
      this.pc.addTransceiver('video', { direction: 'recvonly' });
      this.pc.addTransceiver('audio', { direction: 'recvonly' });
      console.log("[PeerConnection] Added receive-only transceivers");
    }
    
    // Handle remote tracks
    this.pc.ontrack = (event) => {
      console.log("[PeerConnection] 🎥 Received remote track:", event.track.kind, {
        trackId: event.track.id,
        enabled: event.track.enabled,
        readyState: event.track.readyState,
      });
      
      if (event.streams[0]) {
        console.log("[PeerConnection] 🎥 Remote stream received:", {
          streamId: event.streams[0].id,
          active: event.streams[0].active,
          videoTracks: event.streams[0].getVideoTracks().length,
          audioTracks: event.streams[0].getAudioTracks().length,
        });
        this.callbacks.onRemoteStream(event.streams[0]);
      }
    };
    
    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[PeerConnection] New ICE candidate");
        this.signaling.send("ice-candidate", event.candidate.toJSON());
      }
    };
    
    // Monitor connection state
    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState || "closed";
      console.log("[PeerConnection] Connection state:", state);
      this.callbacks.onConnectionStateChange(state);
    };
    
    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc?.iceConnectionState || "closed";
      console.log("[PeerConnection] ICE connection state:", state);
      this.callbacks.onIceConnectionStateChange(state);
    };
    
    return this.pc;
  }

  // Create and send an offer
  async createOffer(): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection not initialized");
    
    console.log("[PeerConnection] Creating offer, signalingState:", this.pc.signalingState);
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.signaling.send("offer", offer);
    console.log("[PeerConnection] Offer sent");
  }

  // Handle incoming offer and create answer
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection not initialized");
    
    console.log("[PeerConnection] Handling offer");
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    await this.processPendingCandidates();
    
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.signaling.send("answer", answer);
    console.log("[PeerConnection] Answer sent");
  }

  // Handle incoming answer
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection not initialized");
    
    console.log("[PeerConnection] Handling answer");
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    await this.processPendingCandidates();
  }

  // Handle renegotiation offer (when adding tracks)
  async handleRenegotiateOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection not initialized");
    
    console.log("[PeerConnection] Handling renegotiate-offer");
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.signaling.send("renegotiate-answer", answer);
  }

  // Handle renegotiation answer
  async handleRenegotiateAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection not initialized");
    
    console.log("[PeerConnection] Handling renegotiate-answer");
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  // Handle ICE candidate
  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) {
      console.log("[PeerConnection] Queuing ICE candidate (no PC yet)");
      this.pendingCandidates.push(candidate);
      return;
    }
    
    if (!this.pc.remoteDescription) {
      console.log("[PeerConnection] Queuing ICE candidate (no remote description)");
      this.pendingCandidates.push(candidate);
      return;
    }
    
    console.log("[PeerConnection] Adding ICE candidate");
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  // Process pending ICE candidates
  private async processPendingCandidates(): Promise<void> {
    if (!this.pc || !this.pc.remoteDescription) return;
    
    console.log(`[PeerConnection] Processing ${this.pendingCandidates.length} pending candidates`);
    
    for (const candidate of this.pendingCandidates) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("[PeerConnection] Error adding pending candidate:", err);
      }
    }
    this.pendingCandidates = [];
  }

  // Add tracks for renegotiation (e.g., when resident enables camera)
  async addTracksAndRenegotiate(stream: MediaStream): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection not initialized");
    
    console.log("[PeerConnection] Adding tracks and renegotiating");
    
    stream.getTracks().forEach(track => {
      console.log(`[PeerConnection] Adding track: ${track.kind}`);
      this.pc!.addTrack(track, stream);
    });
    
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.signaling.send("renegotiate-offer", offer);
    console.log("[PeerConnection] Renegotiation offer sent");
  }

  // Close the connection
  close(): void {
    if (this.pc) {
      console.log("[PeerConnection] Closing");
      this.pc.close();
      this.pc = null;
    }
    this.pendingCandidates = [];
  }

  get connectionState(): RTCPeerConnectionState {
    return this.pc?.connectionState || "closed";
  }

  get isConnected(): boolean {
    return this.pc?.connectionState === "connected";
  }
}
