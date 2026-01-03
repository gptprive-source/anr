import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const departmentLabels: Record<string, string> = {
  administratif: "Administratif",
  commercial: "Commercial",
  partenariat: "Partenariat",
  presse: "Presse",
  investisseurs: "Investisseurs",
  communication: "Communication",
  informatique: "Informatique",
  collectivites: "Collectivités territoriales",
};

const senderTypeLabels: Record<string, string> = {
  particulier: "Particulier",
  societe: "Société",
  collectivites: "Collectivité",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId } = await req.json();

    if (!messageId) {
      throw new Error("Message ID required");
    }

    console.log(`Processing contact message: ${messageId}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the message
    const { data: message, error: messageError } = await supabaseAdmin
      .from("contact_messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (messageError || !message) {
      throw new Error("Message not found");
    }

    // Get support email from config
    const { data: configData } = await supabaseAdmin
      .from("app_config")
      .select("value")
      .eq("key", "support_email")
      .single();

    const supportEmail = configData?.value || "contact@soqotomobil.com";

    // Get collaborators assigned to this department
    const { data: departmentUsers } = await supabaseAdmin
      .from("user_departments")
      .select("user_id")
      .eq("department", message.department);

    // Get their emails from auth
    const recipientEmails: string[] = [supportEmail];

    if (departmentUsers && departmentUsers.length > 0) {
      for (const du of departmentUsers) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(du.user_id);
        if (userData?.user?.email) {
          recipientEmails.push(userData.user.email);
        }
      }
    }

    // Send email notification
    const SMTP_HOST = Deno.env.get("SMTP_HOST");
    const SMTP_PORT = Deno.env.get("SMTP_PORT");
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.log("SMTP not configured, skipping email notification");
      return new Response(JSON.stringify({ success: true, emailSent: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const departmentLabel = departmentLabels[message.department] || message.department;
    const senderTypeLabel = senderTypeLabels[message.sender_type] || message.sender_type;

    // Fetch templates from database
    const { data: adminTemplate } = await supabaseAdmin
      .from("email_templates")
      .select("subject, html_content")
      .eq("template_key", "contact_admin_notification")
      .eq("is_active", true)
      .single();

    const { data: userTemplate } = await supabaseAdmin
      .from("email_templates")
      .select("subject, html_content")
      .eq("is_active", true)
      .eq("template_key", "contact_user_confirmation")
      .single();

    // Template variables
    const templateVars: Record<string, string> = {
      department: departmentLabel,
      sender_name: `${message.first_name} ${message.last_name}`,
      sender_type: senderTypeLabel,
      sender_email: message.email,
      sender_phone: message.phone || "",
      company_name: message.company_name || "",
      subject: message.subject || "",
      message: message.message,
      first_name: message.first_name,
      message_preview: message.message.substring(0, 300) + (message.message.length > 300 ? "..." : ""),
      admin_url: "https://mkzpdmyymabgsntwmmir.lovable.app/admin/messages",
    };

    // Replace variables in templates
    const replaceVars = (template: string, vars: Record<string, string>): string => {
      let result = template;
      for (const [key, val] of Object.entries(vars)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), val);
      }
      return result;
    };

    // Admin notification email - use DB template or fallback
    let adminSubject = `📬 Nouveau message - ${departmentLabel} - ${message.first_name} ${message.last_name}`;
    let adminEmailHtml = `<p>Nouveau message de ${message.first_name} ${message.last_name} (${senderTypeLabel})</p><p>${message.message}</p>`;

    if (adminTemplate) {
      adminSubject = replaceVars(adminTemplate.subject, templateVars);
      adminEmailHtml = replaceVars(adminTemplate.html_content, templateVars);
    }

    // User confirmation email - use DB template or fallback  
    let userSubject = `✅ ANR - Nous avons bien reçu votre message`;
    let userEmailHtml = `<p>Bonjour ${message.first_name}, nous avons bien reçu votre message.</p>`;

    if (userTemplate) {
      userSubject = replaceVars(userTemplate.subject, templateVars);
      userEmailHtml = replaceVars(userTemplate.html_content, templateVars);
    }

    // Send emails using SMTP
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: parseInt(SMTP_PORT || "465"),
        tls: true,
        auth: {
          username: SMTP_USER,
          password: SMTP_PASS,
        },
      },
    });

    // Send notification to admin team
    const uniqueRecipients = [...new Set(recipientEmails)];
    await client.send({
      from: SMTP_USER,
      to: uniqueRecipients,
      subject: adminSubject,
      html: adminEmailHtml,
    });
    console.log(`Admin notification sent to ${uniqueRecipients.length} recipients`);

    // Log admin email
    await supabaseAdmin.from("sent_documents").insert({
      template_key: "contact_admin_notification",
      recipient_email: uniqueRecipients.join(", "),
      subject: adminSubject,
      html_snapshot: adminEmailHtml,
      status: "sent",
      metadata: { message_id: messageId, department: message.department },
    });

    // Send confirmation to the sender
    await client.send({
      from: SMTP_USER,
      to: [message.email],
      subject: userSubject,
      html: userEmailHtml,
    });
    console.log(`Confirmation email sent to ${message.email}`);

    // Log user confirmation email
    await supabaseAdmin.from("sent_documents").insert({
      template_key: "contact_user_confirmation",
      recipient_email: message.email,
      subject: userSubject,
      html_snapshot: userEmailHtml,
      status: "sent",
      metadata: { message_id: messageId },
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true, emailSent: true, recipientCount: uniqueRecipients.length, confirmationSent: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in notify-contact-message:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
