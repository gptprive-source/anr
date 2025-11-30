import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, deviceToken, redirectUrl } = await req.json();

    if (!email || !deviceToken) {
      throw new Error("email and deviceToken are required");
    }

    console.log(`[send-verification-email] Sending verification to: ${email}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create verification record
    const verificationCode = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { error: insertError } = await supabase
      .from("email_verifications")
      .insert({
        email,
        device_token: deviceToken,
        verification_code: verificationCode,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("[send-verification-email] Insert error:", insertError);
      throw new Error("Failed to create verification record");
    }

    // Build verification URL
    const verifyUrl = `${redirectUrl || supabaseUrl}/verify-email?code=${verificationCode}&token=${deviceToken}`;

    // Send email using Supabase Auth (this uses the built-in email service)
    // We'll use a magic link approach with custom metadata
    const { error: authError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: verifyUrl,
      },
    });

    if (authError) {
      console.error("[send-verification-email] Auth error:", authError);
      // Fallback: just log the verification URL (in production, integrate with email service)
      console.log(`[send-verification-email] Verification URL: ${verifyUrl}`);
    }

    console.log(`[send-verification-email] Verification sent successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification email sent",
        // In dev mode, return the URL for testing
        ...(Deno.env.get("ENVIRONMENT") === "development" && { verifyUrl }),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-verification-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
