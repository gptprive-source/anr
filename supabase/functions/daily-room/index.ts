import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    if (!DAILY_API_KEY) {
      console.error("DAILY_API_KEY not configured");
      throw new Error("Daily.co API key not configured");
    }

    const { callId } = await req.json();
    if (!callId) {
      throw new Error("callId is required");
    }

    console.log(`[daily-room] Creating/getting room for callId: ${callId}`);

    // Create a room name from the callId (sanitize for Daily.co requirements)
    const roomName = `anr-${callId.replace(/[^a-zA-Z0-9-]/g, "").substring(0, 40)}`;

    // First, try to get existing room
    const getResponse = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (getResponse.ok) {
      const room = await getResponse.json();
      console.log(`[daily-room] Found existing room: ${room.url}`);
      return new Response(
        JSON.stringify({ url: room.url, name: room.name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Room doesn't exist, create it
    console.log(`[daily-room] Creating new room: ${roomName}`);
    
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
          // Room expires after 1 hour
          exp: Math.floor(Date.now() / 1000) + 3600,
          // Enable knocking for security
          enable_knocking: false,
          // Max 10 participants
          max_participants: 10,
          // Enable recording (optional)
          enable_recording: "local",
          // Start with video off by default
          start_video_off: true,
          // Start with audio on
          start_audio_off: false,
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error(`[daily-room] Failed to create room: ${error}`);
      throw new Error(`Failed to create Daily room: ${error}`);
    }

    const newRoom = await createResponse.json();
    console.log(`[daily-room] Created room: ${newRoom.url}`);

    return new Response(
      JSON.stringify({ url: newRoom.url, name: newRoom.name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[daily-room] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
