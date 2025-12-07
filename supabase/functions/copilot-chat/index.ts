import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Tu es ANR Co-Pilot, un assistant IA premium qui guide les utilisateurs de l'application ANR PRO pas à pas.

TON RÔLE:
- Guider les utilisateurs pour accomplir leurs tâches sur l'application
- Expliquer où cliquer, quoi remplir, dans quel ordre
- Être précis sur les chemins de navigation (pages, onglets, boutons)
- Anticiper les erreurs courantes et les prévenir

CONTEXTE UTILISATEUR:
{user_context}

PAGE ACTUELLE: {current_path}
SECTION ACTUELLE: {current_section}
ÉLÉMENTS VISIBLES: {visible_elements}
ÉTAT DU FORMULAIRE: {form_state}

GUIDES DISPONIBLES:
{available_guides}

STYLE DE RÉPONSE:
- Utilise des instructions claires et numérotées
- Mentionne les noms exacts des boutons/champs
- Utilise des emojis pour les actions: ➡️ navigation, ✅ validation, ⚠️ attention
- Sois concis mais complet
- Si l'utilisateur est perdu, propose de reprendre depuis le début

EXEMPLE DE RÉPONSE:
"Pour créer un nouvel employé :
1. ➡️ Allez dans **Employés** dans le menu de gauche
2. ➡️ Cliquez sur le bouton **+ Nouvel employé** en haut à droite
3. ✅ Remplissez le formulaire :
   - Prénom (obligatoire)
   - Nom (obligatoire)
   - Email
   - Téléphone
4. ⚠️ N'oubliez pas d'activer le badge si l'employé doit accéder aux sites
5. ✅ Cliquez sur **Enregistrer**"

Réponds en français.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'Clé OpenAI non configurée' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      messages,
      session_id,
      context, // { current_path, current_section, visible_elements, form_state }
      company_id,
    } = body;

    // Vérifier l'accès Co-Pilot
    let hasAccess = false;
    let planType = 'pro';

    if (company_id) {
      const { data: company } = await supabase
        .from('pro_companies')
        .select('plan_type, copilot_enabled')
        .eq('id', company_id)
        .single();

      if (company) {
        planType = company.plan_type;
        // Entreprise et Collectivités ont Co-Pilot inclus
        // PRO doit avoir l'addon activé
        hasAccess = 
          company.plan_type === 'entreprise' || 
          company.plan_type === 'collectivite' ||
          (company.plan_type === 'pro' && company.copilot_enabled);
      }
    }

    if (!hasAccess) {
      return new Response(JSON.stringify({ 
        error: 'COPILOT_NOT_ENABLED',
        message: 'L\'assistant Co-Pilot n\'est pas activé pour votre compte',
        upgrade_required: true,
        plan_type: planType,
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupérer les guides disponibles
    const { data: guides } = await supabase
      .from('assistant_guides')
      .select('guide_key, name, description, trigger_paths')
      .eq('is_active', true)
      .order('sort_order');

    const guidesContext = guides?.map(g => `- ${g.name}: ${g.description}`).join('\n') || 'Aucun guide disponible';

    // Récupérer le contexte utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const userContext = `Utilisateur: ${profile?.first_name || ''} ${profile?.last_name || ''} (${user.email})
Plan: ${planType.toUpperCase()}
Entreprise ID: ${company_id || 'N/A'}`;

    // Construire le prompt système enrichi
    const systemPrompt = SYSTEM_PROMPT
      .replace('{user_context}', userContext)
      .replace('{current_path}', context?.current_path || 'Inconnue')
      .replace('{current_section}', context?.current_section || 'Aucune')
      .replace('{visible_elements}', JSON.stringify(context?.visible_elements || []))
      .replace('{form_state}', JSON.stringify(context?.form_state || {}))
      .replace('{available_guides}', guidesContext);

    // Appeler OpenAI avec streaming
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('Erreur OpenAI:', errorText);
      return new Response(JSON.stringify({ error: 'Erreur service IA' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Tracker l'usage
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('copilot_usage')
      .upsert({
        user_id: user.id,
        company_id,
        session_id,
        usage_date: today,
        messages_count: 1,
      }, {
        onConflict: 'user_id,usage_date',
      });

    // Retourner le stream
    return new Response(openaiResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
      },
    });

  } catch (error) {
    console.error('Erreur copilot-chat:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
