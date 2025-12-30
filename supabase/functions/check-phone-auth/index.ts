import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Poll OVH events API
    const eventToken = verification.event_token;
    if (!eventToken) {
      return new Response(JSON.stringify({ verified: false, status: "pending", error: "Token OVH manquant" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[check-phone-auth] Polling OVH events for verification:", verification_id);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const eventsRes = await fetch(`https://events.voip.ovh.net/?token=${eventToken}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (eventsRes.ok) {
        const events = await eventsRes.json();
        console.log("[check-phone-auth] OVH events received:", JSON.stringify(events));

        // Look for incoming call event with matching caller ID
        for (const event of events) {
          // Check for start_ringing or incomingCall event
          if (event.event === "start_ringing" || event.event === "incomingCall") {
            const callerNumber = event.callingNumber || event.calling || event.from;
            
            if (callerNumber) {
              // Normalize and compare phone numbers
              const normalizedCaller = callerNumber.replace(/[\s\-\.]/g, "").replace(/^0033/, "+33").replace(/^33/, "+33").replace(/^0/, "+33");
              const normalizedExpected = verification.phone_number;

              console.log("[check-phone-auth] Comparing caller:", normalizedCaller, "with expected:", normalizedExpected);

              if (normalizedCaller === normalizedExpected || normalizedCaller.endsWith(normalizedExpected.slice(-9)) || normalizedExpected.endsWith(normalizedCaller.slice(-9))) {
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
          }
        }
      }
    } catch (pollError) {
      // Timeout or network error - just return pending
      if (pollError instanceof Error && pollError.name === "AbortError") {
        console.log("[check-phone-auth] Polling timeout, returning pending");
      } else {
        console.error("[check-phone-auth] Polling error:", pollError);
      }
    }

    // No matching event found
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
