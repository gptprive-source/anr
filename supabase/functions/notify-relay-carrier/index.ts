import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[notify-relay-carrier] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { type, data } = await req.json();
    logStep("Processing notification", { type });

    // Validate SMTP configuration
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error("SMTP configuration missing (SMTP_HOST, SMTP_USER, SMTP_PASS)");
    }

    // Get company info from config
    const { data: configs } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', ['company_name', 'support_email', 'app_url']);
    
    const configMap: Record<string, string> = {};
    configs?.forEach(c => configMap[c.key] = String(c.value).replace(/"/g, ''));
    
    const companyName = configMap.company_name || 'ANR';
    const appUrl = configMap.app_url || 'https://anr.fr';

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', type)
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      logStep("Template not found", { type, error: templateError?.message });
      return new Response(JSON.stringify({ error: `Template ${type} not found` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404
      });
    }

    // Replace variables in template
    let htmlContent = template.html_content;
    let subject = template.subject;
    
    // Add common variables
    const variables = {
      ...data,
      company_name: companyName,
      platform_name: companyName,
      dashboard_url: `${appUrl}/relay/dashboard`,
      contact_url: `${appUrl}/contact`,
    };

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      htmlContent = htmlContent.replace(regex, String(value || ''));
      subject = subject.replace(regex, String(value || ''));
    }

    // Get recipient email - either from data.email or lookup by user_id
    let recipientEmail = data.email || data.contact_email;
    
    // If user_id is provided, lookup email from auth.users
    if (!recipientEmail && data.user_id) {
      const { data: userData } = await supabase.auth.admin.getUserById(data.user_id);
      recipientEmail = userData?.user?.email;
    }
    
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "No recipient email provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      });
    }

    logStep("Sending email via SMTP", { to: recipientEmail, subject });

    // Create SMTP client and send email
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    await client.send({
      from: smtpUser,
      to: recipientEmail,
      subject: subject,
      content: "auto",
      html: htmlContent,
    });

    await client.close();

    logStep("Email sent successfully", { to: recipientEmail, type });

    // Log sent email
    await supabase.from('sent_documents').insert({
      document_type: 'email',
      template_key: type,
      recipient_email: recipientEmail,
      subject: subject,
      sent_at: new Date().toISOString(),
      metadata: { notification_type: type, ...data }
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
