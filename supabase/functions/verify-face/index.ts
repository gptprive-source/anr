import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calcul de la distance cosinus entre deux vecteurs
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Générer un embedding à partir des landmarks faciaux (simplifié)
function generateEmbeddingFromLandmarks(landmarks: any[]): number[] {
  // Extraire les positions normalisées des landmarks
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
        verified: false, 
        error: 'VISION_KEY_MISSING',
        message: 'Clé Google Cloud Vision non configurée' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { 
      image_base64, // Photo à vérifier (base64)
      user_id,      // Ou employee_id
      employee_id,
      context,      // 'entry' ou 'exit'
    } = body;

    if (!image_base64) {
      return new Response(JSON.stringify({ 
        verified: false, 
        error: 'IMAGE_MISSING' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!user_id && !employee_id) {
      return new Response(JSON.stringify({ 
        verified: false, 
        error: 'USER_MISSING' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupérer l'embedding enregistré
    let embeddingQuery = supabase
      .from('face_embeddings')
      .select('*')
      .is('deleted_at', null)
      .eq('consent_given', true);

    if (user_id) {
      embeddingQuery = embeddingQuery.eq('user_id', user_id);
    } else {
      embeddingQuery = embeddingQuery.eq('employee_id', employee_id);
    }

    const { data: storedEmbedding, error: embeddingError } = await embeddingQuery.single();

    if (embeddingError || !storedEmbedding) {
      console.log('Aucun embedding enregistré pour:', user_id || employee_id);
      return new Response(JSON.stringify({ 
        verified: false, 
        error: 'NO_FACE_REGISTERED',
        message: 'Aucun visage enregistré' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
        verified: false, 
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
        verified: false, 
        error: 'NO_FACE_DETECTED',
        message: 'Aucun visage détecté dans l\'image' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const detectedFace = faces[0];
    
    // Vérifier la qualité de la détection
    if (detectedFace.detectionConfidence < 0.7) {
      return new Response(JSON.stringify({ 
        verified: false, 
        error: 'LOW_QUALITY',
        message: 'Qualité de l\'image insuffisante',
        confidence: detectedFace.detectionConfidence 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Générer l'embedding de la photo capturée
    const capturedEmbedding = generateEmbeddingFromLandmarks(detectedFace.landmarks || []);

    if (capturedEmbedding.length === 0) {
      return new Response(JSON.stringify({ 
        verified: false, 
        error: 'EMBEDDING_FAILED',
        message: 'Impossible de générer l\'empreinte faciale' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Comparer avec l'embedding stocké
    const storedVector = storedEmbedding.embedding as number[];
    const similarity = cosineSimilarity(capturedEmbedding, storedVector);

    // Récupérer le seuil de similarité
    const { data: thresholdConfig } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'face_recognition_similarity_threshold')
      .single();

    const threshold = thresholdConfig?.value ? Number(thresholdConfig.value) : 0.6;
    const verified = similarity >= threshold;
    const confidencePercent = Math.round(similarity * 100);

    console.log(`Vérification faciale: similarity=${similarity.toFixed(3)}, threshold=${threshold}, verified=${verified}`);

    // Mettre à jour les stats de l'embedding
    await supabase
      .from('face_embeddings')
      .update({
        last_verified_at: new Date().toISOString(),
        verification_count: (storedEmbedding.verification_count || 0) + 1,
      })
      .eq('id', storedEmbedding.id);

    // Logger le résultat
    if (!verified) {
      // Logger l'anomalie si échec
      await supabase.from('security_anomalies').insert({
        anomaly_type: 'door_face_mismatch',
        severity: 'warning',
        details: {
          user_id,
          employee_id,
          context,
          similarity,
          threshold,
          detection_confidence: detectedFace.detectionConfidence,
        }
      });
    }

    return new Response(JSON.stringify({ 
      verified,
      confidence: confidencePercent,
      similarity,
      threshold,
      message: verified 
        ? 'Identité vérifiée' 
        : `Visage non reconnu (${confidencePercent}% < ${Math.round(threshold * 100)}%)`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erreur verify-face:', error);
    return new Response(JSON.stringify({ 
      verified: false,
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
