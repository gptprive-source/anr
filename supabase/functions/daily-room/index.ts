import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting (resets on cold start)
const rateLimits = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 100; // requests per minute per IP
const RATE_WINDOW = 60000; // 1 minute

const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const limit = rateLimits.get(ip);
  
  if (!limit || now > limit.reset) {
    rateLimits.set(ip, { count: 1, reset: now + RATE_WINDOW });
    return true;
  }
  
  if (limit.count >= RATE_LIMIT) return false;
  
  limit.count++;
  return true;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  
  if (!checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    if (!DAILY_API_KEY) {
      throw new Error("DAILY_API_KEY not configured");
    }

    const { callId } = await req.json();
    if (!callId || typeof callId !== "string") {
      throw new Error("Invalid callId");
    }

    // Sanitize room name (alphanumeric + hyphen only, max 64 chars)
    const roomName = `anr-${callId.replace(/[^a-zA-Z0-9-]/g, "").substring(0, 50)}`;

    // Try to get existing room first
    const getResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });

    if (getResponse.ok) {
      const room = await getResponse.json();
      return new Response(
        JSON.stringify({ url: room.url, name: room.name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new room with optimized settings
    const createResponse = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "public",
        properties: {
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
          max_participants: 10,
          enable_knocking: false,
          start_video_off: true,
          start_audio_off: false,
          // Optimize for low latency
          sfu_switchover: 0.5,
          // Enable adaptive bitrate
          enable_network_ui: false,
          // Disable unnecessary features
          enable_chat: false,
          enable_screenshare: false,
          enable_recording: false,
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Daily API error: ${error}`);
    }

    const room = await createResponse.json();
    return new Response(
      JSON.stringify({ url: room.url, name: room.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[daily-room] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
