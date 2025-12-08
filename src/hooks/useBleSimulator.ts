import { useState, useCallback } from 'react';

export type SimulatedResponse = 
  | 'SUCCESS'
  | 'EXPIRED'
  | 'INVALID'
  | 'REPLAY'
  | 'RSSI_FAIL'
  | 'FACE_REQUIRED'
  | 'TIMEOUT';

interface SimulationStep {
  step: string;
  duration: number;
}

const SIMULATION_STEPS: SimulationStep[] = [
  { step: 'scanning', duration: 1500 },
  { step: 'connecting', duration: 1000 },
  { step: 'authenticating', duration: 800 },
  { step: 'sending_token', duration: 600 },
  { step: 'waiting_response', duration: 1200 },
];

export const useBleSimulator = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const simulateOpenDoor = useCallback(async (
    simulatedResult: SimulatedResponse = 'SUCCESS'
  ): Promise<{ success: boolean; error?: string; resultCode?: string }> => {
    setIsSimulating(true);
    setProgress(0);

    const totalDuration = SIMULATION_STEPS.reduce((acc, s) => acc + s.duration, 0);
    let elapsed = 0;

    for (const step of SIMULATION_STEPS) {
      setCurrentStep(step.step);
      await new Promise(resolve => setTimeout(resolve, step.duration));
      elapsed += step.duration;
      setProgress(Math.round((elapsed / totalDuration) * 100));
    }

    setCurrentStep('processing_result');
    await new Promise(resolve => setTimeout(resolve, 500));

    setIsSimulating(false);
    setCurrentStep(null);
    setProgress(0);

    switch (simulatedResult) {
      case 'SUCCESS':
        return { success: true, resultCode: '01' };
      case 'EXPIRED':
        return { success: false, error: 'Token expiré', resultCode: '02' };
      case 'INVALID':
        return { success: false, error: 'Token invalide', resultCode: '03' };
      case 'REPLAY':
        return { success: false, error: 'Token déjà utilisé', resultCode: '04' };
      case 'RSSI_FAIL':
        return { success: false, error: 'Signal trop faible - Approchez-vous', resultCode: '05' };
      case 'FACE_REQUIRED':
        return { success: false, error: 'Vérification faciale requise', resultCode: '06' };
      case 'TIMEOUT':
        return { success: false, error: 'Timeout de connexion', resultCode: 'FF' };
      default:
        return { success: false, error: 'Erreur inconnue' };
    }
  }, []);

  const getStepLabel = (step: string | null): string => {
    switch (step) {
      case 'scanning': return 'Recherche du module...';
      case 'connecting': return 'Connexion BLE...';
      case 'authenticating': return 'Authentification...';
      case 'sending_token': return 'Envoi du token...';
      case 'waiting_response': return 'Attente réponse...';
      case 'processing_result': return 'Traitement...';
      default: return 'Initialisation...';
    }
  };

  return {
    isSimulating,
    currentStep,
    progress,
    simulateOpenDoor,
    getStepLabel,
  };
};
