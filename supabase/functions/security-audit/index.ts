import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditResult {
  check_type: string;
  severity: 'critical' | 'warning' | 'info';
  table_name?: string;
  policy_name?: string;
  description: string;
  recommendation?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body for trigger info
    let triggeredBy: string | null = null;
    let triggerType = 'scheduled';
    
    try {
      const body = await req.json();
      triggeredBy = body.user_id || null;
      triggerType = body.trigger_type || 'scheduled';
    } catch {
      // No body, assume scheduled trigger
    }

    console.log('[security-audit] Starting security audit, trigger:', triggerType);

    // Create audit run record
    const { data: runData, error: runError } = await supabaseAdmin
      .from('security_audit_runs')
      .insert({
        triggered_by: triggeredBy,
        trigger_type: triggerType,
        status: 'running'
      })
      .select()
      .single();

    if (runError) {
      console.error('[security-audit] Failed to create audit run:', runError);
      throw runError;
    }

    const runId = runData.id;
    const results: AuditResult[] = [];

    // Check 1: Tables without RLS enabled
    console.log('[security-audit] Checking tables without RLS...');
    const { data: tablesWithoutRls, error: rlsError } = await supabaseAdmin
      .rpc('get_tables_without_rls');

    if (!rlsError && tablesWithoutRls) {
      for (const row of tablesWithoutRls) {
        results.push({
          check_type: 'rls_disabled',
          severity: 'critical',
          table_name: row.table_name,
          description: `La table "${row.table_name}" n'a pas RLS activé. Toutes les données sont accessibles publiquement.`,
          recommendation: `Exécuter: ALTER TABLE public.${row.table_name} ENABLE ROW LEVEL SECURITY;`
        });
      }
    }

    // Check 2: Tables with RLS but no policies
    console.log('[security-audit] Checking tables without policies...');
    const { data: tablesWithoutPolicies, error: policiesError } = await supabaseAdmin
      .rpc('get_tables_without_policies');

    if (!policiesError && tablesWithoutPolicies) {
      for (const row of tablesWithoutPolicies) {
        results.push({
          check_type: 'no_policies',
          severity: 'critical',
          table_name: row.table_name,
          description: `La table "${row.table_name}" a RLS activé mais aucune politique définie. Aucun accès possible.`,
          recommendation: `Créer des politiques RLS pour la table ${row.table_name}`
        });
      }
    }

    // Check 3: Overly permissive policies
    console.log('[security-audit] Checking permissive policies...');
    const { data: permissivePolicies, error: permissiveError } = await supabaseAdmin
      .rpc('get_permissive_policies');

    if (!permissiveError && permissivePolicies) {
      for (const row of permissivePolicies) {
        // Skip certain tables where public access is intentional
        const publicTables = ['anrs', 'habitations', 'faq_items', 'app_config'];
        if (publicTables.includes(row.table_name)) {
          results.push({
            check_type: 'permissive_policy',
            severity: 'info',
            table_name: row.table_name,
            policy_name: row.policy_name,
            description: `Politique permissive sur "${row.table_name}" (accès public intentionnel)`,
            recommendation: `Vérifier que l'accès public est bien voulu pour cette table`
          });
        } else {
          results.push({
            check_type: 'permissive_policy',
            severity: 'warning',
            table_name: row.table_name,
            policy_name: row.policy_name,
            description: `Politique trop permissive sur "${row.table_name}": ${row.policy_name}`,
            recommendation: `Restreindre la politique ${row.policy_name} avec des conditions auth.uid()`
          });
        }
      }
    }

    // Check 4: PII tables protection (profiles, phone_verifications)
    console.log('[security-audit] Checking PII protection...');
    const piiTables = ['profiles', 'phone_verifications'];
    
    for (const tableName of piiTables) {
      // Check if restrictive policy exists
      const { data: policies } = await supabaseAdmin
        .from('pg_policies')
        .select('*')
        .eq('tablename', tableName)
        .eq('schemaname', 'public');
      
      // Use raw query to check for restrictive policies
      const { data: restrictivePolicies } = await supabaseAdmin.rpc('get_permissive_policies');
      
      const hasRestrictive = restrictivePolicies?.some(
        (p: any) => p.table_name === tableName && p.policy_qual?.includes('auth.uid()')
      );

      if (!hasRestrictive) {
        results.push({
          check_type: 'pii_unprotected',
          severity: 'warning',
          table_name: tableName,
          description: `La table PII "${tableName}" pourrait nécessiter une politique restrictive`,
          recommendation: `Ajouter une politique RESTRICTIVE avec auth.uid() IS NOT NULL`
        });
      }
    }

    // Check 5: Sensitive operations without audit trail
    console.log('[security-audit] Checking audit trail...');
    const sensitiveActions = ['DELETE', 'UPDATE'];
    // This is informational - audit logging should be implemented
    results.push({
      check_type: 'audit_coverage',
      severity: 'info',
      description: `Vérifier que les actions sensibles sont journalisées dans admin_audit_logs`,
      recommendation: `S'assurer que DELETE et UPDATE sur les tables critiques sont audités`
    });

    // Insert all results
    console.log(`[security-audit] Found ${results.length} issues, inserting results...`);
    
    if (results.length > 0) {
      const resultsToInsert = results.map(r => ({
        run_id: runId,
        ...r
      }));

      const { error: insertError } = await supabaseAdmin
        .from('security_audit_results')
        .insert(resultsToInsert);

      if (insertError) {
        console.error('[security-audit] Failed to insert results:', insertError);
      }
    }

    // Count issues by severity
    const criticalCount = results.filter(r => r.severity === 'critical').length;
    const warningCount = results.filter(r => r.severity === 'warning').length;

    // Update audit run with completion status
    const { error: updateError } = await supabaseAdmin
      .from('security_audit_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_issues: results.length,
        critical_issues: criticalCount,
        warning_issues: warningCount
      })
      .eq('id', runId);

    if (updateError) {
      console.error('[security-audit] Failed to update run status:', updateError);
    }

    // Send email notification if critical issues found
    if (criticalCount > 0) {
      console.log('[security-audit] Critical issues found, sending notification...');
      
      // Get support email from config
      const { data: configData } = await supabaseAdmin
        .from('app_config')
        .select('value')
        .eq('key', 'support_email')
        .single();

      const supportEmail = configData?.value || 'contact@soqotomobil.com';

      // Send email via SMTP
      const smtpHost = Deno.env.get('SMTP_HOST');
      const smtpPort = Deno.env.get('SMTP_PORT');
      const smtpUser = Deno.env.get('SMTP_USER');
      const smtpPass = Deno.env.get('SMTP_PASS');

      if (smtpHost && smtpUser && smtpPass) {
        try {
          const criticalIssues = results.filter(r => r.severity === 'critical');
          const issuesList = criticalIssues
            .map(i => `- ${i.table_name || 'Système'}: ${i.description}`)
            .join('\n');

          const emailBody = `
⚠️ ALERTE SÉCURITÉ ANR

L'audit de sécurité automatique a détecté ${criticalCount} problème(s) critique(s):

${issuesList}

Actions requises:
${criticalIssues.map(i => i.recommendation).filter(Boolean).join('\n')}

Connectez-vous à l'interface admin pour plus de détails:
https://anr.soqotomobil.com/admin/security

Date de l'audit: ${new Date().toLocaleString('fr-FR')}
          `.trim();

          console.log('[security-audit] Email notification prepared for:', supportEmail);
          // Note: Email sending would be implemented here with SMTP library
        } catch (emailError) {
          console.error('[security-audit] Failed to send email:', emailError);
        }
      }
    }

    console.log('[security-audit] Audit completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        total_issues: results.length,
        critical_issues: criticalCount,
        warning_issues: warningCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[security-audit] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
