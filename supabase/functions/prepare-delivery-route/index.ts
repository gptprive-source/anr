import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PrepareRouteRequest {
  driver_id: string;
  parcel_ids: string[];
  route_date: string;
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

    const { driver_id, parcel_ids, route_date }: PrepareRouteRequest = await req.json();

    if (!driver_id || !parcel_ids || parcel_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "driver_id et parcel_ids requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[prepare-route] Preparing route for driver ${driver_id} with ${parcel_ids.length} parcels`);

    // Fetch parcels with recipient ANR info
    const { data: parcels, error: parcelsError } = await supabase
      .from("parcels")
      .select(`
        id,
        tracking_number,
        recipient_name,
        recipient_anr_id,
        recipient_email,
        recipient_phone,
        status,
        anrs:recipient_anr_id (
          id,
          code,
          address,
          nfc_serial
        )
      `)
      .in("id", parcel_ids)
      .in("status", ["pending", "in_transit"]);

    if (parcelsError) {
      console.error("[prepare-route] Error fetching parcels:", parcelsError);
      throw parcelsError;
    }

    if (!parcels || parcels.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun colis trouvé avec ces IDs" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate route ID
    const route_id = crypto.randomUUID();

    // Token expiration: end of day or 12 hours from now
    const now = new Date();
    const endOfDay = new Date(route_date + "T23:59:59Z");
    const twelveHoursLater = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const expiresAt = twelveHoursLater < endOfDay ? twelveHoursLater : endOfDay;

    // Create JWT encoder
    const secret = new TextEncoder().encode(jwtSecret);

    // Generate QR tokens for each parcel
    const preparedParcels = [];
    const tokensToInsert = [];

    for (const parcel of parcels) {
      const anr = parcel.anrs as any;
      const expectedAnrCode = anr?.code || "UNKNOWN";
      const expectedNfcSerial = anr?.nfc_serial || null;

      // Create JWT token payload
      const payload = {
        parcel_id: parcel.id,
        tracking_number: parcel.tracking_number,
        expected_anr_code: expectedAnrCode,
        driver_id: driver_id,
        route_id: route_id,
        iat: Math.floor(now.getTime() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000)
      };

      // Sign JWT
      const jwt = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
        .sign(secret);

      // Hash token for storage
      const tokenHash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(jwt)
      );
      const tokenHashHex = Array.from(new Uint8Array(tokenHash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      preparedParcels.push({
        parcel_id: parcel.id,
        tracking_number: parcel.tracking_number,
        qr_token: jwt,
        expected_anr_code: expectedAnrCode,
        expected_nfc_serial: expectedNfcSerial,
        recipient_name: parcel.recipient_name,
        recipient_address: anr?.address || "Adresse inconnue",
        status: "pending" as const
      });

      tokensToInsert.push({
        token_hash: tokenHashHex,
        parcel_id: parcel.id,
        expected_anr_id: anr?.id || null,
        expected_nfc_serial: expectedNfcSerial,
        proof_type: "delivery",
        emitter_type: "driver",
        emitter_id: driver_id,
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: "prepared"
      });
    }

    // Store tokens in database
    const { error: insertError } = await supabase
      .from("parcel_qr_tokens")
      .insert(tokensToInsert);

    if (insertError) {
      console.error("[prepare-route] Error storing tokens:", insertError);
      // Continue anyway - tokens are still valid for offline use
    }

    // Update parcels status to in_transit
    await supabase
      .from("parcels")
      .update({ status: "in_transit" })
      .in("id", parcel_ids);

    console.log(`[prepare-route] Route ${route_id} prepared with ${preparedParcels.length} parcels`);

    // Generate a simplified public key representation for client-side verification
    // In production, you would use proper asymmetric keys
    const publicKey = btoa(jwtSecret.substring(0, 16));

    return new Response(
      JSON.stringify({
        route_id,
        driver_id,
        route_date,
        parcels: preparedParcels,
        public_key: publicKey,
        expires_at: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[prepare-route] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
