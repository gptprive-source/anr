import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pricing for gpt-4o-mini (per 1M tokens)
const PRICING = {
  input: 0.15 / 1_000_000, // $0.15 per 1M input tokens
  output: 0.60 / 1_000_000, // $0.60 per 1M output tokens
};

// Rough token estimation (1 token ≈ 4 chars for French)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const systemPrompt = `Tu es l'assistant virtuel ANR (Adresse Numérique Résidentielle). Tu aides les utilisateurs avec leurs questions sur:

- L'ANR: identifiant numérique gratuit et permanent pour chaque adresse postale en France
- L'interphone numérique: service d'abonnement à 12€/an pour recevoir les appels des visiteurs
- Le Doming: badge physique avec QR code, puce NFC et numéro ANR (1 gratuit pour nouvelle ANR, 7€ les suivants)
- Les résidents: jusqu'à 7 résidents par habitation (1 propriétaire + 6 invités)
- Le déménagement: l'abonnement suit l'utilisateur, pas l'adresse
- La sécurité: visiteur à moins de 30m, appels limités à 2 minutes, vidéo unidirectionnelle

Réponds de manière concise, amicale et en français. Si tu ne connais pas la réponse ou si la question nécessite une assistance humaine, suggère à l'utilisateur de demander à parler à un agent humain.`;

    // Estimate input tokens
    const inputText = systemPrompt + messages.map((m: any) => m.content).join(" ");
    const inputTokens = estimateTokens(inputText);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, veuillez réessayer plus tard." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a TransformStream to intercept and log usage
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    
    let fullResponse = "";
    const lastUserMessage = messages[messages.length - 1]?.content || "";

    // Process stream in background
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          await writer.write(value);
          
          // Extract content from SSE
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && !line.includes("[DONE]")) {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) fullResponse += content;
              } catch {}
            }
          }
        }
        
        await writer.close();
        
        // Log usage after stream completes
        const outputTokens = estimateTokens(fullResponse);
        const estimatedCost = (inputTokens * PRICING.input) + (outputTokens * PRICING.output);
        
        try {
          await supabase.from("chatbot_usage").insert({
            source: "openai",
            model: "gpt-4o-mini",
            query_text: lastUserMessage.slice(0, 500),
            response_preview: fullResponse.slice(0, 100),
            conversation_id: conversationId || null,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            estimated_cost: estimatedCost,
          });
          console.log(`[support-chat] Logged usage: ${inputTokens} in, ${outputTokens} out, $${estimatedCost.toFixed(6)}`);
        } catch (err) {
          console.error("[support-chat] Failed to log usage:", err);
        }
      } catch (err) {
        console.error("[support-chat] Stream error:", err);
        await writer.abort(err);
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});