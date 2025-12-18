import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProofData {
  qr_token: string;
  nfc_serial: string;
  nfc_anr_code: string;
  nfc_scanned_at: string;
  qr_scanned_at: string;
  geo?: { lat: number; lng: number };
  local_proof_hash: string;
  proof_id: string;
}

interface SyncRequest {
  proofs: ProofData[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const jwtSecret = Deno.env.get("DELIVERY_JWT_SECRET") || supabaseServiceKey.substring(0, 32);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const secret = new TextEncoder().encode(jwtSecret);

    const { proofs }: SyncRequest = await req.json();

    if (!proofs || proofs.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucune preuve à synchroniser" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sync-proofs] Syncing ${proofs.length} proofs`);

    const results: Array<{ proof_id: string; status: string; error?: string }> = [];
    let validated = 0;
    let rejected = 0;
    const conflicts: string[] = [];

    for (const proof of proofs) {
      try {
        // 1. Verify JWT token
        let payload: any;
        try {
          const { payload: decoded } = await jose.jwtVerify(proof.qr_token, secret);
          payload = decoded;
        } catch (jwtError: any) {
          if (jwtError.code === "ERR_JWT_EXPIRED") {
            results.push({ proof_id: proof.proof_id, status: "rejected", error: "Token expiré" });
            rejected++;
            continue;
          }
          throw jwtError;
        }

        // 2. Check if token was already consumed
        const tokenHash = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(proof.qr_token)
        );
        const tokenHashHex = Array.from(new Uint8Array(tokenHash))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");

        const { data: existingToken } = await supabase
          .from("parcel_qr_tokens")
          .select("status, consumed_at")
          .eq("token_hash", tokenHashHex)
          .single();

        if (existingToken?.status === "consumed") {
          results.push({ proof_id: proof.proof_id, status: "conflict", error: "Token déjà consommé" });
          conflicts.push(proof.proof_id);
          continue;
        }

        // 3. Verify NFC ANR code matches expected
        if (payload.expected_anr_code && 
            proof.nfc_anr_code.toUpperCase() !== payload.expected_anr_code.toUpperCase()) {
          results.push({ 
            proof_id: proof.proof_id, 
            status: "rejected", 
            error: `ANR mismatch: ${proof.nfc_anr_code} vs ${payload.expected_anr_code}` 
          });
          rejected++;
          continue;
        }

        // 4. Verify NFC serial matches (if we have it on record)
        const { data: anr } = await supabase
          .from("anrs")
          .select("id, nfc_serial")
          .eq("code", proof.nfc_anr_code.toUpperCase())
          .single();

        if (anr?.nfc_serial && anr.nfc_serial !== proof.nfc_serial) {
          results.push({ 
            proof_id: proof.proof_id, 
            status: "rejected", 
            error: "NFC serial mismatch" 
          });
          rejected++;
          continue;
        }

        // 5. Verify timestamps are coherent
        const nfcTime = new Date(proof.nfc_scanned_at).getTime();
        const qrTime = new Date(proof.qr_scanned_at).getTime();
        const now = Date.now();

        // NFC must be scanned before QR
        if (qrTime < nfcTime) {
          results.push({ 
            proof_id: proof.proof_id, 
            status: "rejected", 
            error: "QR scanné avant NFC" 
          });
          rejected++;
          continue;
        }

        // Max 15 minutes between NFC and QR scan
        if (qrTime - nfcTime > 15 * 60 * 1000) {
          results.push({ 
            proof_id: proof.proof_id, 
            status: "rejected", 
            error: "Délai trop long entre NFC et QR (>15min)" 
          });
          rejected++;
          continue;
        }

        // Timestamps should not be in the future
        if (nfcTime > now + 60000 || qrTime > now + 60000) {
          results.push({ 
            proof_id: proof.proof_id, 
            status: "rejected", 
            error: "Timestamp dans le futur" 
          });
          rejected++;
          continue;
        }

        // 6. All validations passed - create official proof
        const { data: parcelProof, error: proofError } = await supabase
          .from("parcel_proofs")
          .insert({
            parcel_id: payload.parcel_id,
            proof_type: "delivery",
            proof_hash: proof.local_proof_hash,
            proof_data: {
              qr_token_hash: tokenHashHex,
              nfc_serial: proof.nfc_serial,
              nfc_anr_code: proof.nfc_anr_code,
              nfc_scanned_at: proof.nfc_scanned_at,
              qr_scanned_at: proof.qr_scanned_at,
              driver_id: payload.driver_id,
              route_id: payload.route_id,
              local_proof_id: proof.proof_id
            },
            geo_latitude: proof.geo?.lat,
            geo_longitude: proof.geo?.lng,
            actor_driver_id: payload.driver_id,
            timestamp_utc: proof.qr_scanned_at,
            timestamp_device: proof.nfc_scanned_at
          })
          .select()
          .single();

        if (proofError) {
          console.error("[sync-proofs] Error creating proof:", proofError);
          results.push({ proof_id: proof.proof_id, status: "rejected", error: proofError.message });
          rejected++;
          continue;
        }

        // 7. Mark token as consumed
        await supabase
          .from("parcel_qr_tokens")
          .update({
            status: "consumed",
            consumed_at: new Date().toISOString(),
            nfc_scan_at: proof.nfc_scanned_at,
            qr_scan_at: proof.qr_scanned_at
          })
          .eq("token_hash", tokenHashHex);

        // 8. Update parcel status
        await supabase
          .from("parcels")
          .update({
            status: "delivered",
            delivered_at: proof.qr_scanned_at
          })
          .eq("id", payload.parcel_id);

        results.push({ proof_id: proof.proof_id, status: "validated" });
        validated++;

        console.log(`[sync-proofs] Proof ${proof.proof_id} validated for parcel ${payload.parcel_id}`);
      } catch (error: any) {
        console.error(`[sync-proofs] Error processing proof ${proof.proof_id}:`, error);
        results.push({ proof_id: proof.proof_id, status: "rejected", error: error.message });
        rejected++;
      }
    }

    console.log(`[sync-proofs] Complete: ${validated} validated, ${rejected} rejected, ${conflicts.length} conflicts`);

    return new Response(
      JSON.stringify({
        validated,
        rejected,
        conflicts,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[sync-proofs] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
