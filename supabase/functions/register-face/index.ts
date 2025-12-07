import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Générer un embedding à partir des landmarks faciaux
function generateEmbeddingFromLandmarks(landmarks: any[]): number[] {
  const embedding: number[] = [];
  
  for (const landmark of landmarks) {
    if (landmark.position) {
      embedding.push(landmark.position.x);
      embedding.push(landmark.position.y);
      embedding.push(landmark.position.z || 0);
    }
  }
  
  // Normaliser le vecteur
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    return embedding.map(val => val / norm);
  }
  
  return embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const googleVisionKey = Deno.env.get('GOOGLE_CLOUD_VISION_KEY');
    if (!googleVisionKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'VISION_KEY_MISSING',
        message: 'Clé Google Cloud Vision non configurée' 
      }), {
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
      image_base64,        // Photo pour enregistrement (base64)
      employee_id,         // Si enregistrement pour un employé
      consent_given,       // Consentement RGPD explicite
      consent_method,      // 'checkbox', 'signature', etc.
    } = body;

    if (!image_base64) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'IMAGE_MISSING' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!consent_given) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'CONSENT_REQUIRED',
        message: 'Le consentement RGPD est requis pour l\'enregistrement biométrique' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Si enregistrement pour un employé, vérifier les permissions
    if (employee_id) {
      const { data: employee } = await supabase
        .from('pro_employees')
        .select('company_id')
        .eq('id', employee_id)
        .single();

      if (!employee) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'EMPLOYEE_NOT_FOUND' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Vérifier que l'utilisateur a les droits sur cette entreprise
      const { data: role } = await supabase
        .from('pro_company_roles')
        .select('role')
        .eq('company_id', employee.company_id)
        .eq('user_id', user.id)
        .single();

      if (!role || !['owner', 'admin', 'manager'].includes(role.role)) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'PERMISSION_DENIED',
          message: 'Vous n\'avez pas les droits pour enregistrer cet employé' 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Appeler Google Cloud Vision pour détecter le visage
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: image_base64.replace(/^data:image\/\w+;base64,/, '') },
            features: [
              { type: 'FACE_DETECTION', maxResults: 1 }
            ]
          }]
        })
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error('Erreur Google Vision:', errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'VISION_API_ERROR',
        message: 'Erreur service de reconnaissance' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const visionData = await visionResponse.json();
    const faces = visionData.responses?.[0]?.faceAnnotations;

    if (!faces || faces.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'NO_FACE_DETECTED',
        message: 'Aucun visage détecté dans l\'image. Veuillez reprendre la photo.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (faces.length > 1) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'MULTIPLE_FACES',
        message: 'Plusieurs visages détectés. Veuillez prendre une photo avec un seul visage.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const detectedFace = faces[0];
    
    // Vérifier la qualité de la détection
    if (detectedFace.detectionConfidence < 0.8) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'LOW_QUALITY',
        message: 'Qualité de l\'image insuffisante. Veuillez vous placer face à la caméra avec un bon éclairage.',
        confidence: detectedFace.detectionConfidence 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Générer l'embedding
    const embedding = generateEmbeddingFromLandmarks(detectedFace.landmarks || []);

    if (embedding.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'EMBEDDING_FAILED',
        message: 'Impossible de générer l\'empreinte faciale. Veuillez réessayer.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Supprimer l'ancien embedding s'il existe (soft delete pour RGPD)
    const targetUserId = employee_id ? null : user.id;
    const targetEmployeeId = employee_id || null;

    await supabase
      .from('face_embeddings')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_reason: 'replaced_by_new_registration'
      })
      .eq(employee_id ? 'employee_id' : 'user_id', employee_id || user.id)
      .is('deleted_at', null);

    // Créer le nouvel embedding
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const { data: newEmbedding, error: insertError } = await supabase
      .from('face_embeddings')
      .insert({
        user_id: targetUserId,
        employee_id: targetEmployeeId,
        embedding,
        embedding_version: 'v1',
        quality_score: detectedFace.detectionConfidence,
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
        consent_method: consent_method || 'checkbox',
        consent_ip_address: clientIp,
        consent_user_agent: userAgent,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erreur insertion embedding:', insertError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'DATABASE_ERROR',
        message: 'Erreur lors de l\'enregistrement' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mettre à jour la date d'enregistrement facial de l'employé si applicable
    if (employee_id) {
      await supabase
        .from('pro_employees')
        .update({ face_registered_at: new Date().toISOString() })
        .eq('id', employee_id);
    }

    console.log(`Visage enregistré: user=${targetUserId}, employee=${targetEmployeeId}, quality=${detectedFace.detectionConfidence}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Visage enregistré avec succès',
      quality_score: Math.round(detectedFace.detectionConfidence * 100),
      embedding_id: newEmbedding.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erreur register-face:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
