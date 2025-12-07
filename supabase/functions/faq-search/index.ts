import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Synonyms for common French terms
const synonyms: Record<string, string[]> = {
  "prix": ["coût", "tarif", "montant", "payer"],
  "abonnement": ["souscription", "forfait", "offre"],
  "supprimer": ["effacer", "retirer", "enlever", "annuler", "résilier"],
  "créer": ["ajouter", "nouveau", "inscription"],
  "doming": ["badge", "qr", "nfc", "autocollant", "étiquette"],
  "anr": ["adresse", "numérique", "résidentielle", "identifiant"],
  "interphone": ["appel", "sonnette", "visiteur"],
  "résident": ["habitant", "occupant", "locataire", "propriétaire"],
  "déménager": ["déménagement", "changer", "nouvelle adresse", "quitter"],
  "fonctionner": ["marche", "fonctionne", "utiliser", "comment"],
  "gratuit": ["free", "offert", "inclus"],
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s]/g, " ") // Keep only alphanumeric
    .replace(/\s+/g, " ")
    .trim();
}

function expandWithSynonyms(words: string[]): string[] {
  const expanded = new Set(words);
  for (const word of words) {
    // Check if word is a key
    if (synonyms[word]) {
      synonyms[word].forEach(syn => expanded.add(normalize(syn)));
    }
    // Check if word is a value
    for (const [key, values] of Object.entries(synonyms)) {
      if (values.some(v => normalize(v) === word)) {
        expanded.add(normalize(key));
        values.forEach(v => expanded.add(normalize(v)));
      }
    }
  }
  return Array.from(expanded);
}

// Common greetings and small talk that should NOT trigger FAQ search
const greetings = new Set([
  "bonjour", "bonsoir", "salut", "hello", "hi", "coucou", "hey",
  "ca va", "comment ca va", "comment allez vous", "vous allez bien",
  "comment vas tu", "tu vas bien", "quoi de neuf", "bien", "merci",
  "au revoir", "bye", "a bientot", "bonne journee", "ok", "oui", "non",
  "d'accord", "super", "genial", "cool", "nickel", "parfait"
]);

function isGreetingOrSmallTalk(query: string): boolean {
  const normalized = normalize(query);
  // Check exact match
  if (greetings.has(normalized)) return true;
  // Check if query is too short (less than 3 meaningful words)
  const words = normalized.split(" ").filter(w => w.length > 2);
  if (words.length < 2) return true;
  // Check if starts with greeting
  for (const greeting of greetings) {
    if (normalized.startsWith(greeting + " ") && normalized.length < 30) return true;
  }
  return false;
}

function calculateScore(query: string, question: string, answer: string): number {
  const queryWords = expandWithSynonyms(normalize(query).split(" ").filter(w => w.length > 2));
  const questionNorm = normalize(question);
  const answerNorm = normalize(answer);
  
  if (queryWords.length === 0) return 0;
  
  let score = 0;
  let matchedWords = 0;
  
  for (const word of queryWords) {
    // Exact word match in question (high value)
    if (questionNorm.includes(word)) {
      score += 3;
      matchedWords++;
    }
    // Exact word match in answer
    else if (answerNorm.includes(word)) {
      score += 1;
      matchedWords++;
    }
    // Partial match for longer words
    else if (word.length > 4) {
      const partial = word.slice(0, -2);
      if (questionNorm.includes(partial)) {
        score += 1.5;
        matchedWords++;
      } else if (answerNorm.includes(partial)) {
        score += 0.5;
        matchedWords++;
      }
    }
  }
  
  // Normalize score: percentage of words matched × base score
  const maxPossibleScore = queryWords.length * 3;
  const normalizedScore = score / maxPossibleScore;
  
  // Bonus for matching most words
  const matchRatio = matchedWords / queryWords.length;
  
  return normalizedScore * 0.7 + matchRatio * 0.3;
}

async function logUsage(supabase: any, query: string, response: string | null, conversationId?: string) {
  try {
    await supabase.from("chatbot_usage").insert({
      source: "faq",
      query_text: query.slice(0, 500),
      response_preview: response?.slice(0, 100) || null,
      conversation_id: conversationId || null,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost: 0, // FAQ is free
    });
  } catch (err) {
    console.error("[faq-search] Failed to log usage:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, threshold = 0.4, conversationId } = await req.json();
    
    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for greetings/small talk - don't return FAQ for these
    if (isGreetingOrSmallTalk(query)) {
      console.log(`[faq-search] Query "${query}" detected as greeting/small talk, skipping FAQ`);
      return new Response(
        JSON.stringify({ found: false, reason: "greeting" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active FAQ items
    const { data: faqItems, error } = await supabase
      .from("faq_items")
      .select("id, question, answer, section")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching FAQ:", error);
      throw error;
    }

    if (!faqItems || faqItems.length === 0) {
      return new Response(
        JSON.stringify({ found: false, message: "No FAQ items available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate scores for each FAQ item
    const scored = faqItems.map(item => ({
      ...item,
      score: calculateScore(query, item.question, item.answer),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const bestMatch = scored[0];

    console.log(`[faq-search] Query: "${query}" | Best match score: ${bestMatch.score.toFixed(3)} | Threshold: ${threshold}`);

    if (bestMatch.score >= threshold) {
      // Log successful FAQ match
      await logUsage(supabase, query, bestMatch.answer, conversationId);
      
      return new Response(
        JSON.stringify({
          found: true,
          question: bestMatch.question,
          answer: bestMatch.answer,
          section: bestMatch.section,
          score: bestMatch.score,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ found: false, bestScore: bestMatch.score }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[faq-search] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});