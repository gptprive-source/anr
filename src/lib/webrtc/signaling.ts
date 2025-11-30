import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export type SignalType = "offer" | "answer" | "ice-candidate" | "renegotiate-offer" | "renegotiate-answer" | "call-ended";

export interface Signal {
  sender_id: string;
  signal_type: SignalType;
  signal_data: any;
  created_at?: string;
}

export class SignalingChannel {
  private channel: RealtimeChannel | null = null;
  private localId: string;
  private callId: string;
  private onSignal: (signal: Signal) => void;
  private isConnected = false;

  constructor(callId: string, onSignal: (signal: Signal) => void) {
    this.callId = callId;
    this.localId = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.onSignal = onSignal;
    console.log("[Signaling] Créé avec localId:", this.localId);
  }

  async connect(): Promise<void> {
    console.log("[Signaling] Connexion au channel pour l'appel:", this.callId);
    
    try {
      this.channel = supabase
        .channel(`call-signals-${this.callId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: this.callId }
          }
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "call_signals",
            filter: `call_id=eq.${this.callId}`,
          },
          (payload) => {
            const signal = payload.new as Signal;
            
            // Ignorer nos propres signaux
            if (signal.sender_id === this.localId) {
              return;
            }
            
            console.log("[Signaling] 📨 Signal reçu:", signal.signal_type, signal.signal_data);
            this.onSignal(signal);
          }
        )
        .on('broadcast', { event: 'ping' }, ({ payload }) => {
          console.log('[Signaling] Ping reçu:', payload);
        })
        .subscribe(async (status) => {
          console.log("[Signaling] Statut du channel:", status);
          
          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            console.log("[Signaling] ✅ Channel connecté avec succès");
            
            // Envoyer un ping pour tester la connexion
            await this.channel?.send({
              type: 'broadcast',
              event: 'ping',
              payload: { from: this.localId, timestamp: Date.now() }
            });
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.isConnected = false;
            console.error("[Signaling] ❌ Erreur channel:", status);
          }
        });

      // Attendre que le channel soit connecté
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout connexion channel')), 5000);
        
        const checkConnection = () => {
          if (this.isConnected) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        
        checkConnection();
      });

    } catch (error) {
      console.error("[Signaling] ❌ Erreur connexion:", error);
      throw error;
    }
  }

  async send(signalType: SignalType, signalData: any): Promise<void> {
    if (!this.isConnected) {
      console.warn("[Signaling] Channel non connecté, impossible d'envoyer:", signalType);
      return;
    }

    console.log("[Signaling] 📤 Envoi signal:", signalType, signalData);
    
    try {
      const { error } = await supabase.from("call_signals").insert({
        call_id: this.callId,
        sender_id: this.localId,
        signal_type: signalType,
        signal_data: signalData,
      });
      
      if (error) {
        console.error("[Signaling] ❌ Erreur envoi signal:", error);
        throw error;
      }
      
      console.log("[Signaling] ✅ Signal envoyé:", signalType);
    } catch (error) {
      console.error("[Signaling] ❌ Erreur critique envoi signal:", error);
      throw error;
    }
  }

  async fetchExistingSignals(): Promise<Signal[]> {
    console.log("[Signaling] Récupération des signaux existants");
    
    try {
      const { data, error } = await supabase
        .from("call_signals")
        .select("*")
        .eq("call_id", this.callId)
        .order("created_at", { ascending: true });
      
      if (error) {
        console.error("[Signaling] ❌ Erreur récupération signaux:", error);
        return [];
      }
      
      // Filtrer nos propres signaux
      const signals = (data || []).filter(s => s.sender_id !== this.localId) as Signal[];
      console.log("[Signaling] 📨 Signaux existants trouvés:", signals.length);
      
      return signals;
    } catch (error) {
      console.error("[Signaling] ❌ Erreur critique récupération signaux:", error);
      return [];
    }
  }

  async cleanupSignals(): Promise<void> {
    console.log("[Signaling] Nettoyage des signaux");
    
    try {
      const { error } = await supabase
        .from("call_signals")
        .delete()
        .eq("call_id", this.callId);
      
      if (error) {
        console.error("[Signaling] Erreur nettoyage signaux:", error);
      } else {
        console.log("[Signaling] ✅ Signaux nettoyés");
      }
    } catch (error) {
      console.error("[Signaling] Erreur critique nettoyage signaux:", error);
    }
  }

  disconnect(): void {
    console.log("[Signaling] Déconnexion du channel");
    this.isConnected = false;
    
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  get connectionStatus(): string {
    return this.isConnected ? 'connected' : 'disconnected';
  }
}
