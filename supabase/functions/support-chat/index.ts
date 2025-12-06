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
    const { messages, conversationId, rgpdContext } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build system prompt based on context
    let systemPrompt = `Tu es l'assistant virtuel ANR (Adresse Numérique Résidentielle). Tu aides les utilisateurs avec leurs questions sur:

- L'ANR: identifiant numérique gratuit et permanent pour chaque adresse postale en France
- L'interphone numérique: service d'abonnement à 12€/an pour recevoir les appels des visiteurs
- Le Doming: badge physique avec QR code, puce NFC et numéro ANR (1 gratuit pour nouvelle ANR, 7€ les suivants)
- Les résidents: jusqu'à 7 résidents par habitation (1 propriétaire + 6 invités)
- Le déménagement: l'abonnement suit l'utilisateur, pas l'adresse
- La sécurité: visiteur à moins de 30m, appels limités à 2 minutes, vidéo unidirectionnelle

Réponds de manière concise, amicale et en français. Si tu ne connais pas la réponse ou si la question nécessite une assistance humaine, suggère à l'utilisateur de demander à parler à un agent humain.`;

    // Add RGPD context if present
    if (rgpdContext) {
      systemPrompt += `

CONTEXTE RGPD IMPORTANT:
L'utilisateur exerce un droit RGPD. Type de demande: ${rgpdContext.requestType}
Email de l'utilisateur: ${rgpdContext.userEmail}
ID de la demande: ${rgpdContext.requestId}

INSTRUCTIONS POUR LES DEMANDES RGPD:
- Pour "access" ou "portability": Appelle la fonction export_user_data pour envoyer les données par email immédiatement.
- Pour "rectification": Demande quelles données l'utilisateur souhaite corriger, puis appelle update_rgpd_request avec les détails.
- Pour "erasure": Explique que la suppression nécessite une vérification manuelle, confirme l'intention, puis appelle update_rgpd_request.
- Pour "restriction" ou "objection": Demande des précisions sur les traitements concernés, puis appelle update_rgpd_request.

Après chaque action, confirme clairement à l'utilisateur ce qui a été fait.`;
    }

    // Define tools for RGPD requests
    const tools = rgpdContext ? [
      {
        type: "function",
        function: {
          name: "export_user_data",
          description: "Exporte toutes les données personnelles de l'utilisateur et les envoie par email. Utilisé pour les demandes d'accès et de portabilité.",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_rgpd_request",
          description: "Met à jour la demande RGPD avec les précisions collectées et change le statut.",
          parameters: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["in_progress", "completed"],
                description: "Nouveau statut de la demande"
              },
              response_details: {
                type: "string",
                description: "Détails de la réponse ou des actions effectuées"
              }
            },
            required: ["status", "response_details"]
          }
        }
      }
    ] : undefined;

    // Estimate input tokens
    const inputText = systemPrompt + messages.map((m: any) => m.content).join(" ");
    const inputTokens = estimateTokens(inputText);

    const requestBody: any = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    };

    if (tools) {
      requestBody.tools = tools;
      requestBody.tool_choice = "auto";
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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

    // Create a TransformStream to intercept, process tool calls, and log usage
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    
    let fullResponse = "";
    let toolCalls: any[] = [];
    let currentToolCall: any = null;
    const lastUserMessage = messages[messages.length - 1]?.content || "";

    // Process stream in background
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          
          // Extract content from SSE
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && !line.includes("[DONE]")) {
              try {
                const json = JSON.parse(line.slice(6));
                const delta = json.choices?.[0]?.delta;
                
                // Handle regular content
                if (delta?.content) {
                  fullResponse += delta.content;
                  await writer.write(value);
                }
                
                // Handle tool calls
                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    if (tc.index !== undefined) {
                      if (!toolCalls[tc.index]) {
                        toolCalls[tc.index] = { id: tc.id, function: { name: "", arguments: "" } };
                      }
                      if (tc.function?.name) {
                        toolCalls[tc.index].function.name = tc.function.name;
                      }
                      if (tc.function?.arguments) {
                        toolCalls[tc.index].function.arguments += tc.function.arguments;
                      }
                    }
                  }
                }
                
                // Check if response is complete
                const finishReason = json.choices?.[0]?.finish_reason;
                if (finishReason === "tool_calls" && toolCalls.length > 0 && rgpdContext) {
                  // Process tool calls
                  for (const toolCall of toolCalls) {
                    const functionName = toolCall.function.name;
                    let args = {};
                    try {
                      args = JSON.parse(toolCall.function.arguments || "{}");
                    } catch {}
                    
                    console.log(`[support-chat] Processing tool call: ${functionName}`, args);
                    
                    let resultMessage = "";
                    
                    if (functionName === "export_user_data") {
                      // Call export-user-data function
                      try {
                        const exportResponse = await fetch(`${supabaseUrl}/functions/v1/export-user-data`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${supabaseKey}`,
                          },
                          body: JSON.stringify({ userId: rgpdContext.userId }),
                        });
                        
                        if (exportResponse.ok) {
                          // Update request status to completed
                          await supabase.from("rgpd_rights_requests").update({
                            status: "completed",
                            completed_at: new Date().toISOString(),
                            response_details: "Export automatique des données effectué et envoyé par email."
                          }).eq("id", rgpdContext.requestId);
                          
                          resultMessage = "✅ Vos données personnelles ont été exportées et envoyées à votre adresse email. Votre demande est maintenant complétée.";
                        } else {
                          resultMessage = "❌ Une erreur s'est produite lors de l'export. Notre équipe a été notifiée et traitera votre demande manuellement.";
                        }
                      } catch (err) {
                        console.error("[support-chat] Export error:", err);
                        resultMessage = "❌ Une erreur s'est produite. Notre équipe traitera votre demande manuellement.";
                      }
                    } else if (functionName === "update_rgpd_request") {
                      // Update request with collected details
                      try {
                        const parsedArgs = args as { status?: string; response_details?: string };
                        const updateData: any = {
                          status: parsedArgs.status || "in_progress",
                          response_details: parsedArgs.response_details,
                        };
                        
                        if (parsedArgs.status === "completed") {
                          updateData.completed_at = new Date().toISOString();
                        }
                        
                        await supabase.from("rgpd_rights_requests").update(updateData)
                          .eq("id", rgpdContext.requestId);
                        
                        resultMessage = parsedArgs.status === "completed" 
                          ? "✅ Votre demande a été traitée avec succès."
                          : "📝 Votre demande a été mise à jour et sera traitée par notre équipe dans les meilleurs délais (maximum 30 jours).";
                      } catch (err) {
                        console.error("[support-chat] Update error:", err);
                        resultMessage = "❌ Une erreur s'est produite lors de la mise à jour.";
                      }
                    }
                    
                    // Send result message to client
                    if (resultMessage) {
                      const sseMessage = `data: {"choices":[{"delta":{"content":"\\n\\n${resultMessage}"}}]}\n\n`;
                      await writer.write(encoder.encode(sseMessage));
                      fullResponse += "\n\n" + resultMessage;
                    }
                  }
                } else if (!delta?.tool_calls) {
                  // Normal content, forward it
                  await writer.write(value);
                }
              } catch {}
            } else if (line.includes("[DONE]")) {
              await writer.write(value);
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
