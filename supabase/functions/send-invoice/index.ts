import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  items?: InvoiceItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  paymentMethod?: string;
  billingAddress?: string;
  shippingAddress?: string;
  orderType?: "subscription" | "doming" | "shop";
  // View only mode
  viewOnly?: boolean;
  orderId?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-INVOICE] ${step}${detailsStr}`);
};

const generateInvoiceHtml = (
  email: string,
  firstName: string,
  lastName: string,
  invoiceNumber: string,
  invoiceDate: string,
  items: InvoiceItem[],
  subtotal: number,
  tax: number,
  total: number,
  paymentMethod: string,
  billingAddress: string | undefined,
  shippingAddress: string | undefined,
  orderType: string
) => {
  const orderTypeLabels: Record<string, string> = {
    subscription: "Abonnement ANR",
    doming: "Commande de Doming",
    shop: "Commande Boutique",
  };

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${item.unitPrice.toFixed(2)} €</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${item.total.toFixed(2)} €</td>
    </tr>
  `).join('');

  const shippingHtml = shippingAddress ? `
    <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
      <h3 style="color: #64748b; margin: 0 0 10px 0; font-size: 14px;">📦 Adresse de livraison</h3>
      <p style="margin: 0; color: #333;">${shippingAddress}</p>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture ANR ${invoiceNumber}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🧾 Facture ANR</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${orderTypeLabels[orderType] || "Commande"}</p>
    </div>
    
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <!-- Header info -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 25px; flex-wrap: wrap;">
        <div>
          <p style="margin: 0; color: #666; font-size: 14px;">Facturé à :</p>
          <p style="margin: 5px 0 0 0; font-weight: bold; color: #333;">${firstName} ${lastName}</p>
          <p style="margin: 5px 0 0 0; color: #666;">${email}</p>
          ${billingAddress ? `<p style="margin: 5px 0 0 0; color: #666;">${billingAddress}</p>` : ''}
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; color: #666; font-size: 14px;">Facture N°</p>
          <p style="margin: 5px 0 0 0; font-weight: bold; color: #0ea5e9; font-family: monospace;">${invoiceNumber}</p>
          <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Date : ${invoiceDate}</p>
        </div>
      </div>

      ${shippingHtml}
      
      <!-- Items table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #333; border-bottom: 2px solid #0ea5e9;">Description</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #333; border-bottom: 2px solid #0ea5e9;">Qté</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #333; border-bottom: 2px solid #0ea5e9;">Prix unit.</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #333; border-bottom: 2px solid #0ea5e9;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <!-- Totals -->
      <div style="background: #f8fafc; border-radius: 8px; padding: 15px;">
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px 0; color: #666;">Sous-total</td>
            <td style="padding: 5px 0; text-align: right; color: #333;">${subtotal.toFixed(2)} €</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #666;">TVA (20%)</td>
            <td style="padding: 5px 0; text-align: right; color: #333;">${tax.toFixed(2)} €</td>
          </tr>
          <tr style="font-weight: bold; font-size: 18px;">
            <td style="padding: 10px 0; color: #333; border-top: 2px solid #e5e5e5;">Total TTC</td>
            <td style="padding: 10px 0; text-align: right; color: #0ea5e9; border-top: 2px solid #e5e5e5;">${total.toFixed(2)} €</td>
          </tr>
        </table>
      </div>
      
      <!-- Payment info -->
      <div style="background: #ecfdf5; border-radius: 8px; padding: 15px; margin-top: 20px; border-left: 4px solid #10b981;">
        <p style="margin: 0; color: #065f46; font-size: 14px;">
          <strong>✅ Paiement reçu</strong><br>
          Mode de paiement : ${paymentMethod}
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; display: print-none;">
        <button onclick="window.print()" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; padding: 14px 30px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; font-size: 16px;">
          🖨️ Imprimer
        </button>
      </div>
      
      <p style="font-size: 14px; color: #666; margin-top: 30px; text-align: center;">
        Des questions ? Contactez-nous à <a href="mailto:contact@soqotomobil.com" style="color: #0ea5e9;">contact@soqotomobil.com</a>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 20px; padding: 20px;">
      <p style="font-size: 12px; color: #999; margin: 0;">
        ANR - Adresse Numérique Résidentielle<br>
        SIRET: 123 456 789 00000 | TVA: FR12345678900<br>
        Cet email fait office de facture pour votre commande.
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting invoice processing");

    const requestData: InvoiceRequest = await req.json();
    
    // Check if this is a view-only request to fetch order details
    if (requestData.viewOnly && requestData.orderId) {
      logStep("View-only mode for order", { orderId: requestData.orderId, orderType: requestData.orderType });
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      let invoiceData: {
        email: string;
        firstName: string;
        lastName: string;
        invoiceNumber: string;
        invoiceDate: string;
        items: InvoiceItem[];
        subtotal: number;
        tax: number;
        total: number;
        paymentMethod: string;
        shippingAddress?: string;
        orderType: string;
      };
      
      if (requestData.orderType === 'subscription') {
        // Fetch subscription
        const { data: sub, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('id', requestData.orderId)
          .single();
        
        if (subError || !sub) {
          logStep("Subscription not found", { error: subError });
          throw new Error('Subscription not found');
        }
        
        logStep("Subscription found", { subId: sub.id, userId: sub.user_id });
        
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sub.user_id)
          .single();
        
        logStep("Profile found", { profile });
        
        // Fetch user email from auth
        const { data: { user } } = await supabase.auth.admin.getUserById(sub.user_id);
        
        logStep("User email found", { email: user?.email });
        
        const createdDate = new Date(sub.created_at);
        
        // Fetch plan price from app_config
        const { data: priceConfig } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', `${sub.plan_type}_plan_price`)
          .single();
        
        const planPrice = priceConfig?.value as number || 12;
        const planLabels: Record<string, string> = {
          particulier: "Particulier",
          pro: "Professionnel", 
          entreprise: "Entreprise",
          collectivites: "Collectivités"
        };
        
        invoiceData = {
          email: user?.email || '',
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          invoiceNumber: `ANR-SUB-${sub.id.substring(0, 8).toUpperCase()}`,
          invoiceDate: createdDate.toLocaleDateString('fr-FR'),
          items: [{
            description: `Abonnement ANR ${planLabels[sub.plan_type] || sub.plan_type} (12 mois)`,
            quantity: 1,
            unitPrice: planPrice,
            total: planPrice
          }],
          subtotal: planPrice / 1.2,
          tax: planPrice - (planPrice / 1.2),
          total: planPrice,
          paymentMethod: 'Carte bancaire (Stripe)',
          orderType: 'subscription'
        };
      } else {
        // Fetch doming order
        const { data: order, error: orderError } = await supabase
          .from('doming_orders')
          .select('*, anrs(*)')
          .eq('id', requestData.orderId)
          .single();
        
        if (orderError || !order) {
          throw new Error('Order not found');
        }
        
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', order.user_id)
          .single();
        
        // Fetch user email
        const { data: { user } } = await supabase.auth.admin.getUserById(order.user_id);
        
        const createdDate = new Date(order.created_at);
        
        invoiceData = {
          email: user?.email || '',
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          invoiceNumber: `ANR-DOM-${order.id.substring(0, 8).toUpperCase()}`,
          invoiceDate: createdDate.toLocaleDateString('fr-FR'),
          items: [{
            description: `Doming QR/NFC${order.is_free ? ' (Gratuit)' : ''}`,
            quantity: order.quantity,
            unitPrice: order.is_free ? 0 : order.unit_price,
            total: order.total_price
          }],
          subtotal: order.total_price / 1.2,
          tax: order.total_price - (order.total_price / 1.2),
          total: order.total_price,
          paymentMethod: order.is_free ? 'Gratuit (inclus)' : 'Carte bancaire (Stripe)',
          shippingAddress: order.shipping_address || undefined,
          orderType: 'doming'
        };
      }
      
      const invoiceHtml = generateInvoiceHtml(
        invoiceData.email,
        invoiceData.firstName,
        invoiceData.lastName,
        invoiceData.invoiceNumber,
        invoiceData.invoiceDate,
        invoiceData.items,
        invoiceData.subtotal,
        invoiceData.tax,
        invoiceData.total,
        invoiceData.paymentMethod,
        undefined,
        invoiceData.shippingAddress,
        invoiceData.orderType
      );
      
      return new Response(JSON.stringify({ success: true, invoiceHtml }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Original email sending logic
    const {
      email,
      firstName,
      lastName,
      invoiceNumber,
      invoiceDate,
      items,
      subtotal,
      tax,
      total,
      paymentMethod,
      billingAddress,
      shippingAddress,
      orderType,
    } = requestData;

    if (!email || !invoiceNumber || !items) {
      throw new Error("Missing required invoice data");
    }

    logStep("Sending invoice to", { email, invoiceNumber });

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error("SMTP configuration missing");
    }

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

    const htmlContent = generateInvoiceHtml(
      email!,
      firstName || '',
      lastName || '',
      invoiceNumber!,
      invoiceDate || new Date().toLocaleDateString('fr-FR'),
      items!,
      subtotal || 0,
      tax || 0,
      total || 0,
      paymentMethod || 'Carte bancaire',
      billingAddress,
      shippingAddress,
      orderType || 'shop'
    );

    await client.send({
      from: smtpUser,
      to: email!,
      subject: `🧾 Facture ANR N°${invoiceNumber} - ${(total || 0).toFixed(2)}€`,
      content: "auto",
      html: htmlContent,
    });

    await client.close();

    logStep("Invoice email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SEND-INVOICE] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
