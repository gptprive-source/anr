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
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if called with userId in body (from support-chat) or via JWT
    const body = await req.json().catch(() => ({}));
    let userId: string | null = null;
    
    if (body.userId) {
      // Called from support-chat with service role - trust the userId
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      // Only allow if called with service role key
      if (token === supabaseServiceKey) {
        userId = body.userId;
      } else {
        return new Response(JSON.stringify({ error: 'Non autorisé' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Called directly by user with JWT
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Non autorisé' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Non autorisé' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      userId = user.id;
    }

    console.log(`[export-user-data] Exporting data for user: ${userId}`);

    // Fetch all user data
    const [
      profileResult,
      residentsResult,
      subscriptionsResult,
      callLogsResult,
      consentsResult,
      pushTokensResult,
      userResult
    ] = await Promise.all([
      // Profile
      supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      
      // Residents (habitations)
      supabaseClient
        .from('residents')
        .select(`
          id,
          is_owner,
          is_muted,
          status,
          created_at,
          habitation:habitations (
            id,
            name,
            floor,
            anr:anrs (
              code,
              address
            )
          )
        `)
        .eq('user_id', userId),
      
      // Subscriptions
      supabaseClient
        .from('subscriptions')
        .select('id, status, current_period_start, current_period_end, cancel_at_period_end, created_at')
        .eq('user_id', userId),
      
      // Call logs (where user answered)
      supabaseClient
        .from('call_logs')
        .select('id, status, started_at, answered_at, ended_at')
        .eq('answered_by', userId)
        .order('started_at', { ascending: false })
        .limit(100),
      
      // Consents
      supabaseClient
        .from('user_consents')
        .select('consent_type, version, consented, consented_at')
        .eq('user_id', userId),
      
      // Push tokens (without actual token for security)
      supabaseClient
        .from('push_tokens')
        .select('platform, created_at')
        .eq('user_id', userId),
      
      // Get user email from auth
      supabaseClient.auth.admin.getUserById(userId!)
    ]);

    // Build export data
    const userEmail = userResult.data?.user?.email || '';
    const exportData = {
      export_date: new Date().toISOString(),
      user_id: userId,
      email: userEmail,
      
      profile: profileResult.data ? {
        first_name: profileResult.data.first_name,
        last_name: profileResult.data.last_name,
        phone_number: profileResult.data.phone_number,
        phone_verified: profileResult.data.phone_verified,
        created_at: profileResult.data.created_at
      } : null,
      
      habitations: residentsResult.data?.map(r => ({
        name: (r.habitation as any)?.name,
        floor: (r.habitation as any)?.floor,
        address: (r.habitation as any)?.anr?.address,
        anr_code: (r.habitation as any)?.anr?.code,
        is_owner: r.is_owner,
        is_muted: r.is_muted,
        status: r.status,
        joined_at: r.created_at
      })) || [],
      
      subscriptions: subscriptionsResult.data?.map(s => ({
        status: s.status,
        period_start: s.current_period_start,
        period_end: s.current_period_end,
        cancel_at_period_end: s.cancel_at_period_end,
        created_at: s.created_at
      })) || [],
      
      call_history: callLogsResult.data?.map(c => ({
        status: c.status,
        started_at: c.started_at,
        answered_at: c.answered_at,
        ended_at: c.ended_at
      })) || [],
      
      consents: consentsResult.data || [],
      
      devices: pushTokensResult.data?.map(p => ({
        platform: p.platform,
        registered_at: p.created_at
      })) || [],
      
      data_retention_info: {
        call_logs: "Conservés 12 mois",
        visitor_gps: "Anonymisés après 30 jours",
        profile: "Conservé pendant la durée de l'abonnement + 3 ans",
        support_conversations: "Conservées 6 mois"
      }
    };

    // Log the export request for audit
    await supabaseClient
      .from('admin_audit_logs')
      .insert({
        user_id: userId,
        action: 'user_data_export',
        entity_type: 'user',
        entity_id: userId,
        new_value: { exported_at: new Date().toISOString() }
      });

    console.log(`[export-user-data] Export completed for user: ${userId}`);

    return new Response(JSON.stringify(exportData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('[export-user-data] Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});