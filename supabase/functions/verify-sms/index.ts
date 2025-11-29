import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse incoming SMS webhook (format depends on SMS provider)
    // Most providers send: from (sender phone), body (message content)
    const body = await req.json();
    console.log("Received SMS webhook:", JSON.stringify(body));

    // Extract SMS data (adapt based on your SMS provider's format)
    const senderPhone = body.from || body.From || body.sender || body.phone;
    const messageBody = body.body || body.Body || body.text || body.message;

    if (!senderPhone || !messageBody) {
      console.error("Missing sender phone or message body");
      return new Response(
        JSON.stringify({ error: "Invalid SMS data" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the verification message
    // Expected format: "ANR-VFY:[CODE]:[TIMESTAMP]:[SIGNATURE]"
    const match = messageBody.match(/ANR-VFY:([A-Z0-9]+):(\d+):([A-Za-z0-9+/=]+)/);
    
    if (!match) {
      console.error("Invalid message format:", messageBody);
      return new Response(
        JSON.stringify({ error: "Invalid verification format" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [, verificationCode, timestamp, signature] = match;
    const messageTimestamp = parseInt(timestamp, 10);
    const now = Date.now();

    // Check if timestamp is within 5 minutes
    const fiveMinutes = 5 * 60 * 1000;
    if (now - messageTimestamp > fiveMinutes) {
      console.error("Verification expired:", { messageTimestamp, now });
      return new Response(
        JSON.stringify({ error: "Verification expired" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number for comparison
    const normalizedSender = senderPhone.replace(/[\s\-\(\)]/g, '');

    // Find the pending verification request
    const { data: verification, error: fetchError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('verification_code', verificationCode)
      .eq('status', 'pending')
      .single();

    if (fetchError || !verification) {
      console.error("Verification not found:", verificationCode, fetchError);
      return new Response(
        JSON.stringify({ error: "Verification request not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the phone number matches
    const normalizedExpected = verification.phone_number.replace(/[\s\-\(\)]/g, '');
    if (!normalizedSender.includes(normalizedExpected.slice(-9)) && 
        !normalizedExpected.includes(normalizedSender.slice(-9))) {
      console.error("Phone mismatch:", { sender: normalizedSender, expected: normalizedExpected });
      return new Response(
        JSON.stringify({ error: "Phone number mismatch" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify signature matches
    if (verification.signature !== signature) {
      console.error("Signature mismatch");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (new Date(verification.expires_at) < new Date()) {
      console.error("Verification expired in database");
      await supabase
        .from('phone_verifications')
        .update({ status: 'expired' })
        .eq('id', verification.id);

      return new Response(
        JSON.stringify({ error: "Verification expired" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from('phone_verifications')
      .update({ 
        status: 'verified',
        verified_at: new Date().toISOString()
      })
      .eq('id', verification.id);

    if (updateError) {
      console.error("Failed to update verification:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update verification" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Phone verified successfully:", normalizedSender);

    return new Response(
      JSON.stringify({ success: true, phone: normalizedSender }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("Error processing SMS:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
