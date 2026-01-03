import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[PROCESS-REFERRAL-PAYOUT] Starting payout check");

    const { userId } = await req.json();

    // If userId provided, process just for that user, otherwise check all
    let usersToCheck: string[] = [];

    if (userId) {
      usersToCheck = [userId];
    } else {
      // Find all users with balance >= 50
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .gte("referral_balance", 50);

      if (profilesError) throw profilesError;
      usersToCheck = profiles?.map((p) => p.id) || [];
    }

    console.log("[PROCESS-REFERRAL-PAYOUT] Users to check:", usersToCheck.length);

    const payoutsCreated: string[] = [];

    for (const uid of usersToCheck) {
      // Get user profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, first_name, last_name, referral_balance, iban")
        .eq("id", uid)
        .single();

      if (profileError || !profile) {
        console.error("[PROCESS-REFERRAL-PAYOUT] Profile not found for user:", uid);
        continue;
      }

      const balance = Number(profile.referral_balance || 0);

      if (balance < 50) {
        console.log("[PROCESS-REFERRAL-PAYOUT] Balance too low for user:", uid, balance);
        continue;
      }

      // Count how many €50 payouts we can make
      const payoutCount = Math.floor(balance / 50);
      const payoutAmount = payoutCount * 50;
      const referralsCount = payoutCount * 10; // 10 referrals per 50€

      console.log("[PROCESS-REFERRAL-PAYOUT] Creating payout for user:", uid, {
        payoutAmount,
        referralsCount,
        currentBalance: balance,
      });

      // Create payout record
      const { data: payout, error: payoutError } = await supabaseAdmin
        .from("referral_payouts")
        .insert({
          user_id: uid,
          amount: payoutAmount,
          referrals_count: referralsCount,
          status: "pending",
          iban: profile.iban,
        })
        .select()
        .single();

      if (payoutError) {
        console.error("[PROCESS-REFERRAL-PAYOUT] Error creating payout:", payoutError);
        continue;
      }

      // Deduct balance
      const newBalance = balance - payoutAmount;
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ referral_balance: newBalance })
        .eq("id", uid);

      if (updateError) {
        console.error("[PROCESS-REFERRAL-PAYOUT] Error updating balance:", updateError);
        // Rollback payout
        await supabaseAdmin.from("referral_payouts").delete().eq("id", payout.id);
        continue;
      }

      // Mark referrals as credited
      const { error: referralsError } = await supabaseAdmin
        .from("referrals")
        .update({ status: "credited" })
        .eq("referrer_id", uid)
        .eq("status", "paid")
        .limit(referralsCount);

      if (referralsError) {
        console.error("[PROCESS-REFERRAL-PAYOUT] Error updating referrals status:", referralsError);
      }

      payoutsCreated.push(uid);

      // Send notification email to referrer using DB template
      try {
        const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
        
        // Get user email
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(uid);
        const userEmail = authUser?.user?.email;

        if (userEmail) {
          // Fetch template from database
          const { data: template } = await supabaseAdmin
            .from("email_templates")
            .select("subject, html_content")
            .eq("template_key", "referral_payout_pending")
            .eq("is_active", true)
            .single();

          const { data: configAddress } = await supabaseAdmin
            .from("app_config")
            .select("value")
            .eq("key", "invoice_address")
            .single();

          const companyAddress = configAddress?.value ? JSON.parse(configAddress.value) : "ANR";
          const ibanMasked = profile.iban 
            ? `${profile.iban.substring(0, 4)} **** **** ${profile.iban.slice(-4)}`
            : "NON RENSEIGNÉ";

          const templateVars: Record<string, string> = {
            godfather_name: profile.first_name || "Cher parrain",
            payout_amount: String(payoutAmount),
            referrals_count: String(referralsCount),
            iban_masked: ibanMasked,
            dashboard_url: `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://anr.fr'}/referral`,
            company_address: companyAddress,
          };

          let emailSubject = template?.subject || `💸 Votre virement de ${payoutAmount}€ est en préparation !`;
          let emailHtml = template?.html_content || `<p>Félicitations ! Votre virement de ${payoutAmount}€ est en préparation.</p>`;

          // Replace variables
          for (const [key, val] of Object.entries(templateVars)) {
            emailSubject = emailSubject.replace(new RegExp(`{{${key}}}`, 'g'), val);
            emailHtml = emailHtml.replace(new RegExp(`{{${key}}}`, 'g'), val);
          }

          const smtpClient = new SMTPClient({
            connection: {
              hostname: Deno.env.get("SMTP_HOST") || "",
              port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
              tls: true,
              auth: {
                username: Deno.env.get("SMTP_USER") || "",
                password: Deno.env.get("SMTP_PASS") || "",
              },
            },
          });

          await smtpClient.send({
            from: Deno.env.get("SMTP_USER") || "noreply@anr.fr",
            to: userEmail,
            subject: emailSubject,
            content: `Votre virement de ${payoutAmount}€ est en préparation.`,
            html: emailHtml,
          });

          await smtpClient.close();
          console.log("[PROCESS-REFERRAL-PAYOUT] Email sent to referrer:", userEmail);

          // Log sent document
          await supabaseAdmin.from("sent_documents").insert({
            template_key: "referral_payout_pending",
            recipient_email: userEmail,
            subject: emailSubject,
            html_snapshot: emailHtml,
            status: "sent",
            metadata: { user_id: uid, amount: payoutAmount },
          });
        }
      } catch (emailError) {
        console.error("[PROCESS-REFERRAL-PAYOUT] Error sending referrer email:", emailError);
      }
    }

    console.log("[PROCESS-REFERRAL-PAYOUT] Completed. Payouts created:", payoutsCreated.length);

    return new Response(
      JSON.stringify({
        success: true,
        payoutsCreated: payoutsCreated.length,
        userIds: payoutsCreated,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[PROCESS-REFERRAL-PAYOUT] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
