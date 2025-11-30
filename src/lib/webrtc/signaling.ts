import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export type SignalType = "offer" | "answer" | "ice-candidate" | "renegotiate-offer" | "renegotiate-answer";

export interface Signal {
  sender_id: string;
  signal_type: SignalType;
  signal_data: any;
}

export class SignalingChannel {
  private channel: RealtimeChannel | null = null;
  private localId: string;
  private callId: string;
  private onSignal: (signal: Signal) => void;

  constructor(callId: string, onSignal: (signal: Signal) => void) {
    this.callId = callId;
    this.localId = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.onSignal = onSignal;
    console.log("[Signaling] Created with localId:", this.localId);
  }

  async connect(): Promise<void> {
    console.log("[Signaling] Connecting to channel for call:", this.callId);
    
    this.channel = supabase
      .channel(`call-signals-${this.callId}`)
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
          
          // Ignore our own signals
          if (signal.sender_id === this.localId) {
            return;
          }
          
          console.log("[Signaling] Received:", signal.signal_type);
          this.onSignal(signal);
        }
      )
      .subscribe((status) => {
        console.log("[Signaling] Channel status:", status);
      });
  }

  async send(signalType: SignalType, signalData: any): Promise<void> {
    console.log("[Signaling] Sending:", signalType);
    
    const { error } = await supabase.from("call_signals").insert({
      call_id: this.callId,
      sender_id: this.localId,
      signal_type: signalType,
      signal_data: signalData,
    });
    
    if (error) {
      console.error("[Signaling] Error sending signal:", error);
      throw error;
    }
  }

  async fetchExistingSignals(): Promise<Signal[]> {
    console.log("[Signaling] Fetching existing signals");
    
    const { data, error } = await supabase
      .from("call_signals")
      .select("*")
      .eq("call_id", this.callId)
      .order("created_at", { ascending: true });
    
    if (error) {
      console.error("[Signaling] Error fetching signals:", error);
      return [];
    }
    
    // Filter out our own signals
    const signals = (data || []).filter(s => s.sender_id !== this.localId) as Signal[];
    console.log("[Signaling] Found existing signals:", signals.length);
    return signals;
  }

  disconnect(): void {
    if (this.channel) {
      console.log("[Signaling] Disconnecting channel");
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
