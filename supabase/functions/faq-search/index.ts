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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, threshold = 0.3 } = await req.json();
    
    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
