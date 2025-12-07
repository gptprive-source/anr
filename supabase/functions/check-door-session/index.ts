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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { user_id, employee_id, anr_id, device_id } = body;

    if (!anr_id) {
      return new Response(JSON.stringify({ error: 'anr_id requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construire la requête pour trouver une session active
    let query = supabase
      .from('door_access_sessions')
      .select('*')
      .eq('anr_id', anr_id)
      .eq('status', 'active')
      .order('entry_at', { ascending: false })
      .limit(1);

    // Filtrer par utilisateur ou employé
    if (user_id) {
      query = query.eq('user_id', user_id);
    } else if (employee_id) {
      query = query.eq('employee_id', employee_id);
    } else if (device_id) {
      query = query.eq('device_id', device_id);
    } else {
      return new Response(JSON.stringify({ error: 'user_id, employee_id ou device_id requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: session, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erreur recherche session:', error);
      return new Response(JSON.stringify({ error: 'Erreur base de données' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!session) {
      // Pas de session active = 1er scan = ENTRÉE
      console.log(`Pas de session active pour anr=${anr_id}, user=${user_id || employee_id || device_id}`);
      return new Response(JSON.stringify({
        has_active_session: false,
        action: 'ENTRY',
        message: 'Scanner pour rentrer',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Session active trouvée = 2ème scan = SORTIE
    const entryAt = new Date(session.entry_at);
    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - entryAt.getTime()) / 1000);
    const durationMinutes = Math.floor(durationSeconds / 60);
    const durationHours = Math.floor(durationMinutes / 60);

    let durationDisplay = '';
    if (durationHours > 0) {
      durationDisplay = `${durationHours}h ${durationMinutes % 60}min`;
    } else {
      durationDisplay = `${durationMinutes}min`;
    }

    console.log(`Session active trouvée: ${session.id}, durée: ${durationDisplay}`);

    // Vérifier si auto-clockout est dépassé
    const { data: scheduleData } = await supabase
      .from('door_scheduled_access')
      .select('auto_clockout_minutes')
      .eq('id', session.schedule_id)
      .single();

    const autoClockoutMinutes = scheduleData?.auto_clockout_minutes || 480; // 8h par défaut
    const shouldAutoClockout = durationMinutes >= autoClockoutMinutes;

    if (shouldAutoClockout) {
      // Auto-déconnexion après délai dépassé
      await supabase
        .from('door_access_sessions')
        .update({
          status: 'timeout',
          exit_at: now.toISOString(),
          notes: `Auto-clockout après ${autoClockoutMinutes} minutes`
        })
        .eq('id', session.id);

      // Logger l'anomalie
      await supabase.from('security_anomalies').insert({
        anomaly_type: 'door_no_exit_scan',
        anr_id,
        severity: 'info',
        details: {
          session_id: session.id,
          duration_minutes: durationMinutes,
          auto_clockout_minutes: autoClockoutMinutes,
        }
      });

      return new Response(JSON.stringify({
        has_active_session: false,
        action: 'ENTRY',
        message: 'Session précédente expirée, scanner pour rentrer',
        previous_session: {
          id: session.id,
          entry_at: session.entry_at,
          status: 'timeout',
          duration: durationDisplay,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      has_active_session: true,
      action: 'EXIT',
      message: 'Scanner pour sortir',
      session: {
        id: session.id,
        entry_at: session.entry_at,
        duration_seconds: durationSeconds,
        duration_display: durationDisplay,
        face_verified_entry: session.face_verified_entry,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erreur check-door-session:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
