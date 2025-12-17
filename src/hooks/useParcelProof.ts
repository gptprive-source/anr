import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "./useGeolocation";
import { useToast } from "./use-toast";

export interface ProofData {
  parcelId: string;
  proofType: 'deposit' | 'pickup' | 'delivery' | 'return';
  actorType: 'carrier' | 'relay' | 'recipient' | 'driver';
  actorId?: string;
  actorName?: string;
  recipientUserId?: string;
  recipientName?: string;
  scanMethod: 'nfc' | 'qr' | 'manual';
  notes?: string;
  photoUrl?: string;
}

export interface GeneratedProof {
  id: string;
  proof_hash: string;
  timestamp_utc: string;
  geo_latitude: number | null;
  geo_longitude: number | null;
}

// Generate SHA-256 hash for proof integrity
const generateProofHash = async (data: Record<string, any>): Promise<string> => {
  const encoder = new TextEncoder();
  const dataString = JSON.stringify(data, Object.keys(data).sort());
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataString));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Generate device ID hash for anonymized tracking
const getDeviceIdHash = async (): Promise<string> => {
  const deviceInfo = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset()
  ].join('|');
  
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(deviceInfo));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
};

export const useParcelProof = () => {
  const [generating, setGenerating] = useState(false);
  const { getCurrentPosition } = useGeolocation();
  const { toast } = useToast();

  const generateProof = async (data: ProofData): Promise<GeneratedProof | null> => {
    setGenerating(true);
    
    try {
      // Get current position
      let geo = { latitude: null as number | null, longitude: null as number | null, accuracy: null as number | null };
      try {
        const position = await getCurrentPosition();
        geo = {
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: null // Accuracy not provided by useGeolocation
        };
      } catch (e) {
        console.warn('[ParcelProof] Could not get GPS position:', e);
      }

      const timestampUtc = new Date().toISOString();
      const deviceIdHash = await getDeviceIdHash();
      
      // Build proof data for hashing
      const proofPayload = {
        parcel_id: data.parcelId,
        proof_type: data.proofType,
        timestamp_utc: timestampUtc,
        geo_latitude: geo.latitude,
        geo_longitude: geo.longitude,
        device_id_hash: deviceIdHash,
        scan_method: data.scanMethod
      };
      
      const proofHash = await generateProofHash(proofPayload);

      // Create proof record
      const { data: proof, error } = await supabase
        .from('parcel_proofs')
        .insert({
          parcel_id: data.parcelId,
          proof_type: data.proofType,
          actor_user_id: data.actorType === 'recipient' ? data.actorId : null,
          actor_relay_id: data.actorType === 'relay' ? data.actorId : null,
          actor_carrier_id: data.actorType === 'carrier' ? data.actorId : null,
          actor_driver_id: data.actorType === 'driver' ? data.actorId : null,
          actor_name: data.actorName,
          recipient_user_id: data.recipientUserId,
          recipient_name: data.recipientName,
          geo_latitude: geo.latitude,
          geo_longitude: geo.longitude,
          geo_accuracy_m: geo.accuracy,
          timestamp_utc: timestampUtc,
          timestamp_device: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          device_id_hash: deviceIdHash,
          device_info: {
            user_agent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
          },
          scan_method: data.scanMethod,
          proof_hash: proofHash,
          proof_data: proofPayload,
          notes: data.notes,
          photo_url: data.photoUrl
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Preuve générée",
        description: `Hash: ${proofHash.substring(0, 16)}...`,
      });

      return {
        id: proof.id,
        proof_hash: proofHash,
        timestamp_utc: timestampUtc,
        geo_latitude: geo.latitude,
        geo_longitude: geo.longitude
      };
    } catch (error: any) {
      console.error('[ParcelProof] Error generating proof:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer la preuve",
        variant: "destructive"
      });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const getProofsForParcel = async (parcelId: string) => {
    const { data, error } = await supabase
      .from('parcel_proofs')
      .select('*')
      .eq('parcel_id', parcelId)
      .order('timestamp_utc', { ascending: true });

    if (error) throw error;
    return data;
  };

  const exportProofsAsJson = (proofs: any[]) => {
    const blob = new Blob([JSON.stringify(proofs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proofs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    generating,
    generateProof,
    getProofsForParcel,
    exportProofsAsJson
  };
};
