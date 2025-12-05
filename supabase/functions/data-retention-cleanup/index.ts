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

    console.log('[data-retention-cleanup] Starting cleanup job...');

    // Get retention settings from app_config
    const { data: configData } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', [
        'retention_call_logs_days',
        'retention_visitor_gps_days',
        'retention_chatbot_days',
        'retention_contact_messages_days'
      ]);

    const config: Record<string, number> = {};
    configData?.forEach(c => {
      config[c.key] = typeof c.value === 'number' ? c.value : parseInt(String(c.value)) || 365;
    });

    // Default values
    const callLogsDays = config['retention_call_logs_days'] || 365;
    const visitorGpsDays = config['retention_visitor_gps_days'] || 30;
    const chatbotDays = config['retention_chatbot_days'] || 180;
    const contactMessagesDays = config['retention_contact_messages_days'] || 1095; // 3 years

    const results = {
      call_logs_deleted: 0,
      visitor_gps_anonymized: 0,
      chatbot_anonymized: 0,
      contact_messages_deleted: 0
    };

    // 1. Delete old call_logs (> X days)
    const callLogsDate = new Date();
    callLogsDate.setDate(callLogsDate.getDate() - callLogsDays);
    
    const { data: deletedCallLogs, error: callLogsError } = await supabase
      .from('call_logs')
      .delete()
      .lt('started_at', callLogsDate.toISOString())
      .select('id');
    
    if (callLogsError) {
      console.error('[data-retention-cleanup] Error deleting call_logs:', callLogsError);
    } else {
      results.call_logs_deleted = deletedCallLogs?.length || 0;
      console.log(`[data-retention-cleanup] Deleted ${results.call_logs_deleted} old call_logs`);
    }

    // 2. Anonymize visitor GPS data (> X days)
    const gpsDate = new Date();
    gpsDate.setDate(gpsDate.getDate() - visitorGpsDays);
    
    const { data: anonymizedGps, error: gpsError } = await supabase
      .from('call_logs')
      .update({ 
        visitor_latitude: null, 
        visitor_longitude: null 
      })
      .lt('started_at', gpsDate.toISOString())
      .not('visitor_latitude', 'is', null)
      .select('id');
    
    if (gpsError) {
      console.error('[data-retention-cleanup] Error anonymizing GPS:', gpsError);
    } else {
      results.visitor_gps_anonymized = anonymizedGps?.length || 0;
      console.log(`[data-retention-cleanup] Anonymized GPS for ${results.visitor_gps_anonymized} call_logs`);
    }

    // 3. Anonymize chatbot usage (> X days)
    const chatbotDate = new Date();
    chatbotDate.setDate(chatbotDate.getDate() - chatbotDays);
    
    const { data: anonymizedChatbot, error: chatbotError } = await supabase
      .from('chatbot_usage')
      .update({ 
        query_text: '[ANONYMIZED]',
        response_preview: '[ANONYMIZED]'
      })
      .lt('created_at', chatbotDate.toISOString())
      .not('query_text', 'eq', '[ANONYMIZED]')
      .select('id');
    
    if (chatbotError) {
      console.error('[data-retention-cleanup] Error anonymizing chatbot:', chatbotError);
    } else {
      results.chatbot_anonymized = anonymizedChatbot?.length || 0;
      console.log(`[data-retention-cleanup] Anonymized ${results.chatbot_anonymized} chatbot entries`);
    }

    // 4. Delete old resolved contact messages (> X days)
    const contactDate = new Date();
    contactDate.setDate(contactDate.getDate() - contactMessagesDays);
    
    const { data: deletedContacts, error: contactError } = await supabase
      .from('contact_messages')
      .delete()
      .lt('created_at', contactDate.toISOString())
      .eq('status', 'resolved')
      .select('id');
    
    if (contactError) {
      console.error('[data-retention-cleanup] Error deleting contact_messages:', contactError);
    } else {
      results.contact_messages_deleted = deletedContacts?.length || 0;
      console.log(`[data-retention-cleanup] Deleted ${results.contact_messages_deleted} old contact_messages`);
    }

    // Log the purge operation
    await supabase
      .from('rgpd_purge_logs')
      .insert({
        purge_type: 'scheduled',
        records_deleted: results.call_logs_deleted + results.contact_messages_deleted,
        records_anonymized: results.visitor_gps_anonymized + results.chatbot_anonymized,
        details: {
          config: {
            call_logs_days: callLogsDays,
            visitor_gps_days: visitorGpsDays,
            chatbot_days: chatbotDays,
            contact_messages_days: contactMessagesDays
          },
          results
        }
      });

    console.log('[data-retention-cleanup] Cleanup completed:', results);

    return new Response(JSON.stringify({
      success: true,
      ...results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('[data-retention-cleanup] Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});