import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting
const rateLimits = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW = 60000;

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

    const roomName = `anr-${callId.replace(/[^a-zA-Z0-9-]/g, "").substring(0, 50)}`;

    // Essayer de créer le room
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
          exp: Math.floor(Date.now() / 1000) + 3600,
          max_participants: 10,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
          sfu_switchover: 0.5,
          enable_network_ui: false,
          enable_chat: false,
          enable_screenshare: false,
          enable_recording: false,
          lang: "fr",
        },
      }),
    });

    // Si création réussie
    if (createResponse.ok) {
      const room = await createResponse.json();
      console.log("[daily-room] Room created:", room.name);
      return new Response(
        JSON.stringify({ url: room.url, name: room.name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Si le room existe déjà (vérifier le message d'erreur ou code 409)
    const errorText = await createResponse.text();
    const roomExists = createResponse.status === 409 || errorText.includes("already exists");
    
    if (roomExists) {
      console.log("[daily-room] Room exists, fetching existing...");
      const getResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
      });
      
      if (getResponse.ok) {
        const room = await getResponse.json();
        console.log("[daily-room] Retrieved existing room:", room.name);
        return new Response(
          JSON.stringify({ url: room.url, name: room.name }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Autre erreur
    throw new Error(`Daily API error: ${errorText}`);

  } catch (error: any) {
    console.error("[daily-room] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
