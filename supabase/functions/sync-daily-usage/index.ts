import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[sync-daily-usage] Starting sync...');

    // Get pricing from config
    const { data: configData } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', ['daily_cost_per_video_minute', 'daily_cost_per_audio_minute']);

    const config: Record<string, number> = {};
    configData?.forEach(c => {
      config[c.key] = parseFloat(String(c.value).replace(/"/g, '')) || 0;
    });

    const videoCostPerMin = config['daily_cost_per_video_minute'] || 0.004;
    const audioCostPerMin = config['daily_cost_per_audio_minute'] || 0.002;

    // Calculate date range (last 24 hours by default)
    const body = await req.json().catch(() => ({}));
    const hoursBack = body.hoursBack || 24;
    const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    console.log(`[sync-daily-usage] Fetching meetings since ${startDate.toISOString()}`);

    // Fetch meetings from Daily.co API
    const response = await fetch(
      `https://api.daily.co/v1/meetings?timeframe_start=${Math.floor(startDate.getTime() / 1000)}`,
      {
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[sync-daily-usage] Daily API error:', errorText);
      throw new Error(`Daily API error: ${response.status}`);
    }

    const meetingsData = await response.json();
    const meetings = meetingsData.data || [];

    console.log(`[sync-daily-usage] Found ${meetings.length} meetings`);

    let synced = 0;
    let errors = 0;

    for (const meeting of meetings) {
      try {
        const roomName = meeting.room || meeting.name || 'unknown';
        const duration = meeting.duration || 0;
        const maxParticipants = meeting.max_participants || 1;
        
        // Check if already synced
        const { data: existing } = await supabase
          .from('daily_usage_logs')
          .select('id')
          .eq('room_name', roomName)
          .eq('started_at', new Date(meeting.start_time * 1000).toISOString())
          .maybeSingle();

        if (existing) {
          continue; // Skip already synced
        }

        // Calculate costs
        const participantMinutes = (duration / 60) * maxParticipants;
        const isVideo = true; // Assume video by default from API
        const costPerMinute = isVideo ? videoCostPerMin : audioCostPerMin;
        const estimatedCost = participantMinutes * costPerMinute;

        // Extract call_id from room name if possible (format: anr-call-{uuid})
        let callId = null;
        if (roomName.startsWith('anr-call-')) {
          const potentialId = roomName.replace('anr-call-', '');
          // Verify it's a valid UUID
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(potentialId)) {
            callId = potentialId;
          }
        }

        const { error: insertError } = await supabase
          .from('daily_usage_logs')
          .insert({
            call_id: callId,
            room_name: roomName,
            duration_seconds: duration,
            participant_count: maxParticipants,
            participant_minutes: participantMinutes,
            is_video: isVideo,
            is_group_call: maxParticipants > 2,
            estimated_cost_usd: estimatedCost,
            started_at: new Date(meeting.start_time * 1000).toISOString(),
            ended_at: meeting.start_time && duration 
              ? new Date((meeting.start_time + duration) * 1000).toISOString()
              : null,
          });

        if (insertError) {
          console.error('[sync-daily-usage] Insert error:', insertError);
          errors++;
        } else {
          synced++;
        }
      } catch (meetingError) {
        console.error('[sync-daily-usage] Meeting processing error:', meetingError);
        errors++;
      }
    }

    console.log(`[sync-daily-usage] Sync complete: ${synced} synced, ${errors} errors`);

    return new Response(JSON.stringify({
      success: true,
      meetings_found: meetings.length,
      synced,
      errors,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[sync-daily-usage] Error:', error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
