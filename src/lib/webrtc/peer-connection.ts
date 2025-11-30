import { ICE_SERVERS, CONNECTION_TIMEOUT } from "./constants";
import { SignalingChannel } from "./signaling";

export type ConnectionMode = "send" | "receive";

export interface PeerConnectionCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange: (state: RTCIceConnectionState) => void;
  onError?: (error: string) => void;
}

export class PeerConnectionManager {
  private pc: RTCPeerConnection | null = null;
  private signaling: SignalingChannel;
  private callbacks: PeerConnectionCallbacks;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private mode: ConnectionMode;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    signaling: SignalingChannel,
    callbacks: PeerConnectionCallbacks,
    mode: ConnectionMode
  ) {
    this.signaling = signaling;
    this.callbacks = callbacks;
    this.mode = mode;
    console.log("[PeerConnection] Créé avec mode:", mode);
  }

  // Initialiser la connexion peer
  initialize(localStream?: MediaStream): RTCPeerConnection {
    console.log("[PeerConnection] Initialisation, mode:", this.mode, "streamLocal:", !!localStream);
    
    this.pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Configurer selon le mode
    if (this.mode === "send" && localStream) {
      // Expéditeur: ajouter les tracks locaux
      localStream.getTracks().forEach(track => {
        console.log(`[PeerConnection] Ajout track local: ${track.kind}`, {
          id: track.id,
          enabled: track.enabled,
          readyState: track.readyState
        });
        
        const sender = this.pc!.addTrack(track, localStream);
        console.log(`[PeerConnection] ✅ Sender créé:`, sender.track?.kind);
      });
    } else if (this.mode === "receive") {
      // Récepteur: ajouter des transceivers pour la réception
      this.pc.addTransceiver('video', { 
        direction: 'recvonly',
        streams: []
      });
      this.pc.addTransceiver('audio', { 
        direction: 'recvonly',
        streams: [] 
      });
      console.log("[PeerConnection] ✅ Transceivers receive-only ajoutés");
    }
    
    // Gérer les tracks distants
    this.pc.ontrack = (event) => {
      console.log("[PeerConnection] 🎥 Track distant reçu:", event.track.kind, {
        trackId: event.track.id,
        enabled: event.track.enabled,
        readyState: event.track.readyState,
        streams: event.streams.length
      });
      
      if (event.streams && event.streams.length > 0) {
        const remoteStream = event.streams[0];
        console.log("[PeerConnection] 🎥 Stream distant reçu:", {
          streamId: remoteStream.id,
          active: remoteStream.active,
          videoTracks: remoteStream.getVideoTracks().length,
          audioTracks: remoteStream.getAudioTracks().length,
        });
        
        remoteStream.onaddtrack = () => {
          console.log("[PeerConnection] Track ajouté au stream distant");
        };
        
        this.callbacks.onRemoteStream(remoteStream);
      }
    };
    
    // Gérer les candidats ICE
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[PeerConnection] Nouveau candidat ICE");
        this.signaling.send("ice-candidate", event.candidate.toJSON());
      } else {
        console.log("[PeerConnection] ✅ Tous les candidats ICE ont été envoyés");
      }
    };
    
    // Gérer l'état de gathering ICE
    this.pc.onicegatheringstatechange = () => {
      console.log("[PeerConnection] ICE gathering state:", this.pc?.iceGatheringState);
    };
    
    // Surveiller l'état de connexion
    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState || "closed";
      console.log("[PeerConnection] État connexion:", state);
      this.callbacks.onConnectionStateChange(state);
      
      if (state === "connected") {
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
        }
      }
    };
    
    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc?.iceConnectionState || "closed";
      console.log("[PeerConnection] État ICE connexion:", state);
      this.callbacks.onIceConnectionStateChange(state);
      
      if (state === "failed") {
        this.callbacks.onError?.("Échec de la connexion ICE");
      }
    };
    
    // Timeout pour la connexion
    this.connectionTimeout = setTimeout(() => {
      if (this.pc?.connectionState !== "connected") {
        console.error("[PeerConnection] ❌ Timeout connexion");
        this.callbacks.onError?.("Timeout de connexion");
      }
    }, CONNECTION_TIMEOUT);

    return this.pc;
  }

  // Créer et envoyer une offre
  async createOffer(): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection non initialisée");
    
    console.log("[PeerConnection] Création offre, signalingState:", this.pc.signalingState);
    
    try {
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      console.log("[PeerConnection] Offre créée:", offer.type);
      
      await this.pc.setLocalDescription(offer);
      console.log("[PeerConnection] Local description définie");
      
      await this.signaling.send("offer", offer);
      console.log("[PeerConnection] ✅ Offre envoyée");
      
    } catch (error) {
      console.error("[PeerConnection] ❌ Erreur création offre:", error);
      throw error;
    }
  }

  // Gérer une offre entrante et créer une réponse
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection non initialisée");
    
    console.log("[PeerConnection] Traitement offre reçue");
    
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("[PeerConnection] ✅ Remote description définie (offer)");
      
      await this.processPendingCandidates();
      
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      
      await this.signaling.send("answer", answer);
      console.log("[PeerConnection] ✅ Réponse envoyée");
      
    } catch (error) {
      console.error("[PeerConnection] ❌ Erreur traitement offre:", error);
      throw error;
    }
  }

  // Gérer une réponse entrante
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection non initialisée");
    
    console.log("[PeerConnection] Traitement réponse reçue");
    
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log("[PeerConnection] ✅ Remote description définie (answer)");
      await this.processPendingCandidates();
      
    } catch (error) {
      console.error("[PeerConnection] ❌ Erreur traitement réponse:", error);
      throw error;
    }
  }

  // Gérer une offre de renégociation
  async handleRenegotiateOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection non initialisée");
    
    console.log("[PeerConnection] Traitement offre de renégociation");
    
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("[PeerConnection] ✅ Remote description définie (renegotiate-offer)");
      
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      
      await this.signaling.send("renegotiate-answer", answer);
      console.log("[PeerConnection] ✅ Réponse de renégociation envoyée");
      
    } catch (error) {
      console.error("[PeerConnection] ❌ Erreur traitement offre de renégociation:", error);
      throw error;
    }
  }

  // Gérer une réponse de renégociation
  async handleRenegotiateAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection non initialisée");
    
    console.log("[PeerConnection] Traitement réponse de renégociation");
    
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log("[PeerConnection] ✅ Remote description définie (renegotiate-answer)");
      
    } catch (error) {
      console.error("[PeerConnection] ❌ Erreur traitement réponse de renégociation:", error);
      throw error;
    }
  }

  // Gérer les candidats ICE
  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) {
      console.log("[PeerConnection] Mise en file candidat ICE (PC non prête)");
      this.pendingCandidates.push(candidate);
      return;
    }
    
    if (!this.pc.remoteDescription) {
      console.log("[PeerConnection] Mise en file candidat ICE (remote description manquante)");
      this.pendingCandidates.push(candidate);
      return;
    }
    
    try {
      console.log("[PeerConnection] Ajout candidat ICE");
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("[PeerConnection] ❌ Erreur ajout candidat ICE:", error);
    }
  }

  // Traiter les candidats ICE en attente
  private async processPendingCandidates(): Promise<void> {
    if (!this.pc || !this.pc.remoteDescription) return;
    
    console.log(`[PeerConnection] Traitement ${this.pendingCandidates.length} candidats en attente`);
    
    for (const candidate of this.pendingCandidates) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("[PeerConnection] ✅ Candidat en attente ajouté");
      } catch (err) {
        console.error("[PeerConnection] ❌ Erreur ajout candidat en attente:", err);
      }
    }
    this.pendingCandidates = [];
  }

  // Ajouter des tracks et renégocier
  async addTracksAndRenegotiate(stream: MediaStream): Promise<void> {
    if (!this.pc) throw new Error("PeerConnection non initialisée");
    
    console.log("[PeerConnection] Ajout tracks et renégociation");
    
    try {
      stream.getTracks().forEach(track => {
        console.log(`[PeerConnection] Ajout track: ${track.kind}`);
        this.pc!.addTrack(track, stream);
      });
      
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      await this.signaling.send("renegotiate-offer", offer);
      console.log("[PeerConnection] ✅ Offre de renégociation envoyée");
      
    } catch (error) {
      console.error("[PeerConnection] ❌ Erreur renégociation:", error);
      throw error;
    }
  }

  // Fermer la connexion
  close(): void {
    console.log("[PeerConnection] Fermeture connexion");
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    
    if (this.pc) {
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

  getStats(): Promise<RTCStatsReport> | null {
    return this.pc?.getStats() || null;
  }
}
