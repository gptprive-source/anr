import { useState, useCallback, useRef } from 'react';
import * as faceapi from '@vladmandic/face-api';

// Utiliser le CDN jsdelivr pour les modèles
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model';
const SIMILARITY_THRESHOLD = 0.6; // Distance euclidienne max (plus bas = plus strict)

interface FaceRecognitionResult {
  success: boolean;
  descriptor?: Float32Array;
  confidence?: number;
  error?: string;
}

interface VerificationResult {
  verified: boolean;
  confidence: number;
  distance: number;
}

export function useFaceRecognition() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const modelsLoadedRef = useRef(false);

  // Charger les modèles face-api.js
  const loadModels = useCallback(async () => {
    if (modelsLoadedRef.current) {
      setModelsLoaded(true);
      return true;
    }

    setLoading(true);
    try {
      console.log('[FaceAPI] Chargement des modèles...');
      setLoadingProgress(10);

      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setLoadingProgress(40);
      console.log('[FaceAPI] tinyFaceDetector chargé');

      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      setLoadingProgress(70);
      console.log('[FaceAPI] faceLandmark68Net chargé');

      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setLoadingProgress(100);
      console.log('[FaceAPI] faceRecognitionNet chargé');

      modelsLoadedRef.current = true;
      setModelsLoaded(true);
      return true;
    } catch (error) {
      console.error('[FaceAPI] Erreur chargement modèles:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Extraire le descriptor (vecteur 128D) d'une image
  const extractDescriptor = useCallback(async (
    imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | string
  ): Promise<FaceRecognitionResult> => {
    try {
      // S'assurer que les modèles sont chargés
      if (!modelsLoadedRef.current) {
        const loaded = await loadModels();
        if (!loaded) {
          return { success: false, error: 'Impossible de charger les modèles' };
        }
      }

      // Convertir base64 en image si nécessaire
      let inputElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;
      
      if (typeof imageSource === 'string') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Erreur chargement image'));
          img.src = imageSource;
        });
        inputElement = img;
      } else {
        inputElement = imageSource;
      }

      // Détecter le visage et extraire le descriptor
      const detection = await faceapi
        .detectSingleFace(inputElement, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.5,
        }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        return { success: false, error: 'Aucun visage détecté' };
      }

      console.log('[FaceAPI] Visage détecté, score:', detection.detection.score);

      return {
        success: true,
        descriptor: detection.descriptor,
        confidence: detection.detection.score,
      };
    } catch (error) {
      console.error('[FaceAPI] Erreur extraction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur extraction',
      };
    }
  }, [loadModels]);

  // Comparer deux descriptors (distance euclidienne)
  const compareDescriptors = useCallback((
    descriptor1: Float32Array | number[],
    descriptor2: Float32Array | number[]
  ): VerificationResult => {
    // Convertir en Float32Array si nécessaire
    const d1 = descriptor1 instanceof Float32Array ? descriptor1 : new Float32Array(descriptor1);
    const d2 = descriptor2 instanceof Float32Array ? descriptor2 : new Float32Array(descriptor2);

    // Calculer la distance euclidienne
    const distance = faceapi.euclideanDistance(d1, d2);
    
    // Plus la distance est petite, plus les visages sont similaires
    const verified = distance < SIMILARITY_THRESHOLD;
    const confidence = Math.max(0, Math.min(1, 1 - distance));

    console.log('[FaceAPI] Comparaison - Distance:', distance.toFixed(4), 'Vérifié:', verified);

    return {
      verified,
      confidence,
      distance,
    };
  }, []);

  // Vérifier un visage contre un descriptor stocké
  const verifyFace = useCallback(async (
    imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | string,
    storedDescriptor: number[]
  ): Promise<VerificationResult & { error?: string }> => {
    const extractResult = await extractDescriptor(imageSource);
    
    if (!extractResult.success || !extractResult.descriptor) {
      return {
        verified: false,
        confidence: 0,
        distance: 1,
        error: extractResult.error,
      };
    }

    return compareDescriptors(extractResult.descriptor, storedDescriptor);
  }, [extractDescriptor, compareDescriptors]);

  // Convertir descriptor en tableau JSON pour stockage
  const descriptorToArray = useCallback((descriptor: Float32Array): number[] => {
    return Array.from(descriptor);
  }, []);

  return {
    modelsLoaded,
    loading,
    loadingProgress,
    loadModels,
    extractDescriptor,
    compareDescriptors,
    verifyFace,
    descriptorToArray,
    SIMILARITY_THRESHOLD,
  };
}
