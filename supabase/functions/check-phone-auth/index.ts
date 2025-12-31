import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OVH API signature generation using SHA1
async function signOvhRequest(
  method: string,
  url: string,
  body: string,
  timestamp: number,
  appSecret: string,
  consumerKey: string
): Promise<string> {
  const toSign = `${appSecret}+${consumerKey}+${method.toUpperCase()}+${url}+${body}+${timestamp}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(toSign);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  
  return `$1$${hashHex}`;
}

// Normalize phone number for comparison - works for all countries
function normalizeForComparison(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/[^\d]/g, "");
  
  // Take last 9 digits for comparison (works for all international numbers)
  if (cleaned.length >= 9) {
    return cleaned.slice(-9);
  }
  
  return cleaned;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { verification_id } = await req.json();

    if (!verification_id) {
      return new Response(JSON.stringify({ error: "verification_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get verification record
    const { data: verification, error: fetchError } = await supabase
      .from("phone_verifications")
      .select("*")
      .eq("id", verification_id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !verification) {
      return new Response(JSON.stringify({ error: "Vérification non trouvée" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already verified
    if (verification.status === "verified") {
      return new Response(JSON.stringify({ verified: true, status: "verified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if expired
    if (new Date(verification.expires_at) < new Date()) {
      await supabase
        .from("phone_verifications")
        .update({ status: "expired" })
        .eq("id", verification_id);

      return new Response(JSON.stringify({ verified: false, status: "expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get OVH credentials
    const appKey = Deno.env.get("OVH_APPLICATION_KEY")!;
    const appSecret = Deno.env.get("OVH_APPLICATION_SECRET")!;
    const consumerKey = Deno.env.get("OVH_CONSUMER_KEY")!;
    const billingAccount = Deno.env.get("OVH_BILLING_ACCOUNT")!;
    const ovhPhoneNumber = Deno.env.get("OVH_PHONE_NUMBER")!;

    // Clean OVH phone number to get service name (remove + prefix)
    const serviceName = ovhPhoneNumber.replace("+", "00");

    console.log("[check-phone-auth] Checking call logs for verification:", verification_id);
    console.log("[check-phone-auth] Looking for calls from:", verification.phone_number);
    console.log("[check-phone-auth] Started at:", verification.started_at);

    try {
      // Get OVH API time
      const timeRes = await fetch("https://eu.api.ovh.com/1.0/auth/time");
      const timestamp = await timeRes.json();

      // Query OVH incoming call logs
      // GET /telephony/{billingAccount}/service/{serviceName}/voiceConsumption
      const callLogsUrl = `https://eu.api.ovh.com/1.0/telephony/${billingAccount}/service/${serviceName}/voiceConsumption`;
      const signature = await signOvhRequest("GET", callLogsUrl, "", timestamp, appSecret, consumerKey);

      const callLogsRes = await fetch(callLogsUrl, {
        method: "GET",
        headers: {
          "X-Ovh-Application": appKey,
          "X-Ovh-Timestamp": String(timestamp),
          "X-Ovh-Signature": signature,
          "X-Ovh-Consumer": consumerKey,
        },
      });

      if (!callLogsRes.ok) {
        const errorText = await callLogsRes.text();
        console.error("[check-phone-auth] OVH API error:", callLogsRes.status, errorText);
        return new Response(JSON.stringify({ verified: false, status: "pending", error: "Erreur API OVH" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const callIds = await callLogsRes.json();
      console.log("[check-phone-auth] Found", callIds.length, "call consumption records");

      // Check recent calls (get details for last 10 calls)
      const recentCallIds = callIds.slice(-10);
      const startedAt = new Date(verification.started_at);
      const expectedPhone = normalizeForComparison(verification.phone_number);

      for (const callId of recentCallIds) {
        // Get call details
        const callDetailUrl = `https://eu.api.ovh.com/1.0/telephony/${billingAccount}/service/${serviceName}/voiceConsumption/${callId}`;
        const detailSignature = await signOvhRequest("GET", callDetailUrl, "", timestamp, appSecret, consumerKey);

        const detailRes = await fetch(callDetailUrl, {
          method: "GET",
          headers: {
            "X-Ovh-Application": appKey,
            "X-Ovh-Timestamp": String(timestamp),
            "X-Ovh-Signature": detailSignature,
            "X-Ovh-Consumer": consumerKey,
          },
        });

        if (!detailRes.ok) continue;

        const callDetail = await detailRes.json();
        console.log("[check-phone-auth] Call detail:", JSON.stringify(callDetail));

        // Check if this is an incoming call within the valid time window
        // Accept calls up to 5 minutes BEFORE started_at (user might call before initiating verification)
        const callDate = new Date(callDetail.creationDatetime || callDetail.datetime);
        const fiveMinutesBefore = new Date(startedAt.getTime() - 5 * 60 * 1000);
        
        if (callDate < fiveMinutesBefore) {
          console.log("[check-phone-auth] Call is more than 5 min before started_at, skipping. Call:", callDate.toISOString(), "Window starts:", fiveMinutesBefore.toISOString());
          continue;
        }
        
        console.log("[check-phone-auth] Call is within valid time window. Call:", callDate.toISOString(), "Started at:", startedAt.toISOString());

        // Check if wayType is incoming
        if (callDetail.wayType !== "incoming") {
          console.log("[check-phone-auth] Not an incoming call, skipping");
          continue;
        }

        // Compare caller number
        const callerPhone = normalizeForComparison(callDetail.calling || callDetail.callingNumber || "");
        console.log("[check-phone-auth] Comparing caller:", callerPhone, "with expected:", expectedPhone);

        if (callerPhone === expectedPhone) {
          console.log("[check-phone-auth] Phone number matched! Verifying...");

          // Update verification status
          await supabase
            .from("phone_verifications")
            .update({ status: "verified", verified_at: new Date().toISOString() })
            .eq("id", verification_id);

          // Update profile with phone and device
          await supabase
            .from("profiles")
            .update({
              phone_number: verification.phone_number,
              phone_verified: true,
              device_id: verification.device_id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

          console.log("[check-phone-auth] Profile updated successfully");

          return new Response(JSON.stringify({ verified: true, status: "verified" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

    } catch (pollError) {
      console.error("[check-phone-auth] Error checking call logs:", pollError);
    }

    // No matching call found yet
    return new Response(JSON.stringify({ verified: false, status: "pending" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[check-phone-auth] Error:", error);
    return new Response(JSON.stringify({ error: "Erreur interne du serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
