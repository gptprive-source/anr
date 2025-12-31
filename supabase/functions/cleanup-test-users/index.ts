import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// List of test user IDs to delete
const TEST_USER_IDS = [
  'b581d9f4-064f-418f-aeab-6f17af243e6b', // oukhridkhadijamoi@gmail.com
  'dc78f506-6f89-4f50-80a9-d71969272bdf', // enseignes.prod@gmail.com
  'acd2de76-7056-45ca-a7d8-08b2d9b2bb27', // enseigneprod@gmail.com
  '66d08abb-68ef-48a1-b532-422de6196239', // gptprive@gmail.com
  '71409562-b866-44f9-8fa5-f229cf0ca82d', // narva.pose@gmail.com
  'b7c0791d-6f90-4959-bced-3fe512c74a6f', // m.pro.walid@gmail.com
  'd6f0a769-1c7d-4fd9-85c2-c5335a1ccd51', // ilyesbbsh@icloud.com
  'c04d6ee5-e118-4bcb-bf15-17b65252ef22', // ilyesbbsh93@gmail.com
  '1eaf3a87-03ff-4c97-acf1-f714cc8959d1', // aminikhalid@gmail.com
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const results: { userId: string; status: string; error?: string }[] = [];

    for (const userId of TEST_USER_IDS) {
      try {
        console.log(`[CLEANUP] Processing user: ${userId}`);

        // 1. Delete call_participants
        const { error: callParticipantsError } = await supabaseAdmin
          .from('call_participants')
          .delete()
          .eq('user_id', userId);
        if (callParticipantsError) console.log(`[CLEANUP] call_participants error for ${userId}:`, callParticipantsError.message);

        // 2. Update call_logs to remove answered_by reference
        const { error: callLogsUpdateError } = await supabaseAdmin
          .from('call_logs')
          .update({ answered_by: null })
          .eq('answered_by', userId);
        if (callLogsUpdateError) console.log(`[CLEANUP] call_logs update error for ${userId}:`, callLogsUpdateError.message);

        // 3. Delete push_tokens
        const { error: pushTokensError } = await supabaseAdmin
          .from('push_tokens')
          .delete()
          .eq('user_id', userId);
        if (pushTokensError) console.log(`[CLEANUP] push_tokens error for ${userId}:`, pushTokensError.message);

        // 4. Delete message_replies where user is replier
        const { error: repliesError } = await supabaseAdmin
          .from('message_replies')
          .delete()
          .eq('replier_id', userId);
        if (repliesError) console.log(`[CLEANUP] message_replies error for ${userId}:`, repliesError.message);

        // 5. Delete granted_accesses
        const { error: grantedAccessError } = await supabaseAdmin
          .from('granted_accesses')
          .delete()
          .eq('granted_by', userId);
        if (grantedAccessError) console.log(`[CLEANUP] granted_accesses error for ${userId}:`, grantedAccessError.message);

        // 6. Delete scheduled_accesses
        const { error: scheduledAccessError } = await supabaseAdmin
          .from('scheduled_accesses')
          .delete()
          .eq('created_by', userId);
        if (scheduledAccessError) console.log(`[CLEANUP] scheduled_accesses error for ${userId}:`, scheduledAccessError.message);

        // 7. Delete blocked_visitors
        const { error: blockedError } = await supabaseAdmin
          .from('blocked_visitors')
          .delete()
          .eq('blocked_by', userId);
        if (blockedError) console.log(`[CLEANUP] blocked_visitors error for ${userId}:`, blockedError.message);

        // 8. Delete subscriptions
        const { error: subscriptionsError } = await supabaseAdmin
          .from('subscriptions')
          .delete()
          .eq('user_id', userId);
        if (subscriptionsError) console.log(`[CLEANUP] subscriptions error for ${userId}:`, subscriptionsError.message);

        // 9. Delete user_roles
        const { error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId);
        if (rolesError) console.log(`[CLEANUP] user_roles error for ${userId}:`, rolesError.message);

        // 10. Delete residents (get habitation IDs first)
        const { data: residentData } = await supabaseAdmin
          .from('residents')
          .select('habitation_id')
          .eq('user_id', userId);
        
        const habIds = residentData?.map(r => r.habitation_id) || [];
        
        const { error: residentsError } = await supabaseAdmin
          .from('residents')
          .delete()
          .eq('user_id', userId);
        if (residentsError) console.log(`[CLEANUP] residents error for ${userId}:`, residentsError.message);

        // 11. Delete pro_company_roles
        const { error: proRolesError } = await supabaseAdmin
          .from('pro_company_roles')
          .delete()
          .eq('user_id', userId);
        if (proRolesError) console.log(`[CLEANUP] pro_company_roles error for ${userId}:`, proRolesError.message);

        // 12. Delete referrals
        const { error: referralsError } = await supabaseAdmin
          .from('referrals')
          .delete()
          .or(`referrer_id.eq.${userId},referred_id.eq.${userId}`);
        if (referralsError) console.log(`[CLEANUP] referrals error for ${userId}:`, referralsError.message);

        // 13. Delete ringtone_settings
        const { error: ringtoneError } = await supabaseAdmin
          .from('ringtone_settings')
          .delete()
          .eq('user_id', userId);
        if (ringtoneError) console.log(`[CLEANUP] ringtone_settings error for ${userId}:`, ringtoneError.message);

        // 14. Delete rgpd_rights_requests
        const { error: rgpdError } = await supabaseAdmin
          .from('rgpd_rights_requests')
          .delete()
          .eq('user_id', userId);
        if (rgpdError) console.log(`[CLEANUP] rgpd_rights_requests error for ${userId}:`, rgpdError.message);

        // 15. Delete support_conversations and messages
        const { data: supportConvs } = await supabaseAdmin
          .from('support_conversations')
          .select('id')
          .eq('user_id', userId);
        if (supportConvs && supportConvs.length > 0) {
          const convIds = supportConvs.map(c => c.id);
          await supabaseAdmin.from('support_messages').delete().in('conversation_id', convIds);
          await supabaseAdmin.from('support_conversations').delete().eq('user_id', userId);
        }

        // 16. Delete phone_verifications
        const { error: phoneVerifError } = await supabaseAdmin
          .from('phone_verifications')
          .delete()
          .eq('user_id', userId);
        if (phoneVerifError) console.log(`[CLEANUP] phone_verifications error for ${userId}:`, phoneVerifError.message);

        // 17. Delete doming_orders
        const { error: domingError } = await supabaseAdmin
          .from('doming_orders')
          .delete()
          .eq('user_id', userId);
        if (domingError) console.log(`[CLEANUP] doming_orders error for ${userId}:`, domingError.message);

        // 18. Delete door_access_sessions
        const { error: doorSessionError } = await supabaseAdmin
          .from('door_access_sessions')
          .delete()
          .eq('user_id', userId);
        if (doorSessionError) console.log(`[CLEANUP] door_access_sessions error for ${userId}:`, doorSessionError.message);

        // 19. Delete copilot_sessions and copilot_usage
        await supabaseAdmin.from('copilot_usage').delete().eq('user_id', userId);
        await supabaseAdmin.from('copilot_sessions').delete().eq('user_id', userId);

        // 20. Delete user_consents
        await supabaseAdmin.from('user_consents').delete().eq('user_id', userId);

        // 21. Delete user_notifications
        await supabaseAdmin.from('user_notifications').delete().eq('user_id', userId);

        // 22. Delete user_communication_reads
        await supabaseAdmin.from('user_communication_reads').delete().eq('user_id', userId);

        // 23. Delete google_drive_tokens
        await supabaseAdmin.from('google_drive_tokens').delete().eq('user_id', userId);

        // 24. Delete face_embeddings
        await supabaseAdmin.from('face_embeddings').delete().eq('user_id', userId);

        // 25. Delete resident_contacts
        await supabaseAdmin.from('resident_contacts').delete().eq('user_id', userId);

        // 26. Delete visitor_custom_templates
        await supabaseAdmin.from('visitor_custom_templates').delete().eq('user_id', userId);

        // 27. Delete admin_audit_logs
        await supabaseAdmin.from('admin_audit_logs').delete().eq('user_id', userId);

        // 28. Delete referral_codes
        await supabaseAdmin.from('referral_codes').delete().eq('user_id', userId);

        // 29. Delete referral_payouts
        await supabaseAdmin.from('referral_payouts').delete().eq('user_id', userId);

        // 30. Delete relay_points
        await supabaseAdmin.from('relay_points').delete().eq('user_id', userId);

        // 31. Delete pro_activity_logs
        await supabaseAdmin.from('pro_activity_logs').delete().eq('user_id', userId);

        // 32. Delete profiles (should cascade from auth.users but do it explicitly)
        const { error: profilesError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userId);
        if (profilesError) console.log(`[CLEANUP] profiles error for ${userId}:`, profilesError.message);

        // 33. Finally delete auth.users
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
          console.log(`[CLEANUP] auth.users error for ${userId}:`, authError.message);
          results.push({ userId, status: 'error', error: authError.message });
        } else {
          console.log(`[CLEANUP] Successfully deleted user: ${userId}`);
          results.push({ userId, status: 'deleted' });
        }

        // 17. Clean orphaned habitations (no more residents)
        for (const habId of habIds) {
          const { data: remainingResidents } = await supabaseAdmin
            .from('residents')
            .select('id')
            .eq('habitation_id', habId)
            .limit(1);
          
          if (!remainingResidents || remainingResidents.length === 0) {
            // Delete associated data first
            await supabaseAdmin.from('visitor_messages').delete().eq('habitation_id', habId);
            await supabaseAdmin.from('call_logs').delete().eq('habitation_id', habId);
            await supabaseAdmin.from('door_access_logs').delete().eq('habitation_id', habId);
            await supabaseAdmin.from('granted_accesses').delete().eq('habitation_id', habId);
            await supabaseAdmin.from('scheduled_accesses').delete().eq('habitation_id', habId);
            await supabaseAdmin.from('blocked_visitors').delete().eq('habitation_id', habId);
            
            // Delete habitation
            const { error: habError } = await supabaseAdmin
              .from('habitations')
              .delete()
              .eq('id', habId);
            if (habError) {
              console.log(`[CLEANUP] habitations error for ${habId}:`, habError.message);
            } else {
              console.log(`[CLEANUP] Deleted orphaned habitation: ${habId}`);
            }
          }
        }

      } catch (userError) {
        console.error(`[CLEANUP] Error processing user ${userId}:`, userError);
        results.push({ userId, status: 'error', error: String(userError) });
      }
    }

    // Clean any orphaned visitor_business_cards with user_id references
    const { error: cardsError } = await supabaseAdmin
      .from('visitor_business_cards')
      .update({ user_id: null })
      .in('user_id', TEST_USER_IDS);
    if (cardsError) console.log('[CLEANUP] visitor_business_cards update error:', cardsError.message);

    console.log('[CLEANUP] Cleanup completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} users`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CLEANUP] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
