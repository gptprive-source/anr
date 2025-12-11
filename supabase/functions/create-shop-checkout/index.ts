import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SHOP-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { items, shippingInfo } = await req.json();
    logStep("Request data", { items, shippingInfo });

    if (!items || items.length === 0) {
      throw new Error("No items in cart");
    }

    // For ANR address, we only need firstName, lastName and address (full address string)
    // For custom address, we need all fields
    if (!shippingInfo?.firstName || !shippingInfo?.lastName || !shippingInfo?.address) {
      throw new Error("Missing shipping information");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Parse address - try to extract postal code and city from full address string
    let line1 = shippingInfo.address || "";
    let postalCode = shippingInfo.postalCode || "";
    let city = shippingInfo.city || "";
    
    // If postalCode/city not provided separately, try to extract from address string
    // Format expected: "21 bis avenue Cuvier 93420 Villepinte"
    if (!postalCode || !city) {
      const addressMatch = line1.match(/^(.+?)\s+(\d{5})\s+(.+)$/);
      if (addressMatch) {
        line1 = addressMatch[1].trim();
        postalCode = addressMatch[2];
        city = addressMatch[3].trim();
      }
    }

    logStep("Parsed address", { line1, postalCode, city });

    // Check for existing Stripe customer or create one
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
      
      // Update customer with shipping address
      await stripe.customers.update(customerId, {
        name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
        phone: shippingInfo.phone || undefined,
        shipping: {
          name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
          phone: shippingInfo.phone || undefined,
          address: {
            line1: line1,
            postal_code: postalCode,
            city: city,
            country: "FR",
          },
        },
      });
      logStep("Updated customer shipping address");
    } else {
      // Create new customer with shipping address
      const newCustomer = await stripe.customers.create({
        email: user.email,
        name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
        phone: shippingInfo.phone || undefined,
        shipping: {
          name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
          phone: shippingInfo.phone || undefined,
          address: {
            line1: line1,
            postal_code: postalCode,
            city: city,
            country: "FR",
          },
        },
      });
      customerId = newCustomer.id;
      logStep("Created new customer with shipping", { customerId });
    }

    // Prepare line items
    const lineItems = items.map((item: { priceId: string; quantity: number }) => ({
      price: item.priceId,
      quantity: item.quantity,
    }));

    logStep("Creating checkout session", { lineItems });

    const origin = req.headers.get("origin") || "https://anr.lovable.app";

    // Create Stripe Checkout session with pre-filled shipping
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/dashboard?order=success`,
      cancel_url: `${origin}/shop?order=cancelled`,
      shipping_address_collection: {
        allowed_countries: ["FR", "BE", "CH", "LU", "MC"],
      },
      // Pre-fill shipping details from customer
      customer_update: {
        shipping: "auto",
      },
      metadata: {
        user_id: user.id,
        shipping_name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
        shipping_address: shippingInfo.address,
        shipping_postal_code: postalCode,
        shipping_city: city,
        shipping_phone: shippingInfo.phone || "",
        items_json: JSON.stringify(items),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
