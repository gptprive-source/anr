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

interface CompanyInfo {
  name: string;
  siret: string;
  tva: string;
  address: string;
  email: string;
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
  orderType: string,
  companyInfo: CompanyInfo
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
            <td style="padding: 5px 0; color: #666;">Sous-total HT</td>
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
        Des questions ? Contactez-nous à <a href="mailto:${companyInfo.email}" style="color: #0ea5e9;">${companyInfo.email}</a>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 20px; padding: 20px;">
      <p style="font-size: 12px; color: #999; margin: 0;">
        ${companyInfo.name}<br>
        ${companyInfo.address}<br>
        SIRET: ${companyInfo.siret} | TVA: ${companyInfo.tva}<br>
        Cet email fait office de facture pour votre commande.
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

// Helper to fetch company info from app_config
const fetchCompanyInfo = async (supabase: any): Promise<CompanyInfo> => {
  const keys = ['invoice_company_name', 'invoice_siret', 'invoice_tva', 'invoice_address', 'invoice_contact_email'];
  const { data: configs } = await supabase
    .from('app_config')
    .select('key, value')
    .in('key', keys);
  
  const configMap: Record<string, string> = {};
  configs?.forEach((c: any) => {
    configMap[c.key] = typeof c.value === 'string' ? c.value : String(c.value);
  });
  
  return {
    name: configMap['invoice_company_name'] || 'ANR - Adresse Numérique Résidentielle',
    siret: configMap['invoice_siret'] || '123 456 789 00000',
    tva: configMap['invoice_tva'] || 'FR12345678900',
    address: configMap['invoice_address'] || '1 rue de l\'Innovation, 75001 Paris',
    email: configMap['invoice_contact_email'] || 'contact@soqotomobil.com',
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting invoice processing");

    const requestData: InvoiceRequest = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch company info from app_config
    const companyInfo = await fetchCompanyInfo(supabase);
    logStep("Company info fetched", companyInfo);
    
    // Check if this is a view-only request to fetch order details
    if (requestData.viewOnly && requestData.orderId) {
      logStep("View-only mode for order", { orderId: requestData.orderId, orderType: requestData.orderType });
      
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
        
        logStep("Subscription found", { subId: sub.id, userId: sub.user_id, planType: sub.plan_type });
        
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
        
        // Fetch plan price from app_config - use the actual plan type
        const planType = sub.plan_type || 'particulier';
        const priceKey = `${planType}_annual_price`;
        
        const { data: priceConfig } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', priceKey)
          .single();
        
        // Default annual prices per plan
        const defaultPrices: Record<string, number> = {
          particulier: 12,
          pro: 348,        // 29€/month * 12
          entreprise: 1188, // 99€/month * 12
          collectivites: 2388 // 199€/month * 12
        };
        
        // The price in app_config is already annual - ensure it's a number
        let rawPrice = priceConfig?.value;
        // Handle case where value might be a JSON string or wrapped in quotes
        if (typeof rawPrice === 'string') {
          try {
            rawPrice = JSON.parse(rawPrice);
          } catch {
            // Not JSON, just a plain string
          }
        }
        const annualPrice = Number(rawPrice) || defaultPrices[planType] || 12;
        
        const planLabels: Record<string, string> = {
          particulier: "Particulier",
          pro: "Professionnel", 
          entreprise: "Entreprise",
          collectivites: "Collectivités"
        };
        
        logStep("Plan pricing", { planType, priceKey, annualPrice });
        
        invoiceData = {
          email: user?.email || '',
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          invoiceNumber: `ANR-SUB-${sub.id.substring(0, 8).toUpperCase()}`,
          invoiceDate: createdDate.toLocaleDateString('fr-FR'),
          items: [{
            description: `Abonnement ANR ${planLabels[planType] || planType} (12 mois)`,
            quantity: 1,
            unitPrice: annualPrice,
            total: annualPrice
          }],
          subtotal: annualPrice / 1.2,
          tax: annualPrice - (annualPrice / 1.2),
          total: annualPrice,
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
        
        // Convert cents to euros for display
        const unitPriceEuros = order.is_free ? 0 : order.unit_price / 100;
        const totalPriceEuros = order.total_price / 100;
        
        invoiceData = {
          email: user?.email || '',
          firstName: profile?.first_name || '',
          lastName: profile?.last_name || '',
          invoiceNumber: `ANR-DOM-${order.id.substring(0, 8).toUpperCase()}`,
          invoiceDate: createdDate.toLocaleDateString('fr-FR'),
          items: [{
            description: `Doming QR/NFC${order.is_free ? ' (Gratuit)' : ''}`,
            quantity: order.quantity,
            unitPrice: unitPriceEuros,
            total: totalPriceEuros
          }],
          subtotal: totalPriceEuros / 1.2,
          tax: totalPriceEuros - (totalPriceEuros / 1.2),
          total: totalPriceEuros,
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
        invoiceData.orderType,
        companyInfo
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
      orderType || 'shop',
      companyInfo
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
