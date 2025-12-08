import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Radio,
  Wifi,
  WifiOff,
  Zap,
  AlertTriangle,
  Clock,
  Scan
} from 'lucide-react';
import { useBleSimulator, SimulatedResponse } from '@/hooks/useBleSimulator';
import { toast } from 'sonner';

const SIMULATION_SCENARIOS: { 
  id: SimulatedResponse; 
  label: string; 
  icon: React.ReactNode;
  description: string;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
}[] = [
  { 
    id: 'SUCCESS', 
    label: 'Succès', 
    icon: <CheckCircle2 className="h-4 w-4" />,
    description: 'Ouverture réussie',
    variant: 'default'
  },
  { 
    id: 'EXPIRED', 
    label: 'Token expiré', 
    icon: <Clock className="h-4 w-4" />,
    description: 'Token trop vieux',
    variant: 'destructive'
  },
  { 
    id: 'INVALID', 
    label: 'Token invalide', 
    icon: <XCircle className="h-4 w-4" />,
    description: 'Signature incorrecte',
    variant: 'destructive'
  },
  { 
    id: 'REPLAY', 
    label: 'Replay attack', 
    icon: <AlertTriangle className="h-4 w-4" />,
    description: 'Token déjà utilisé',
    variant: 'destructive'
  },
  { 
    id: 'RSSI_FAIL', 
    label: 'Signal faible', 
    icon: <WifiOff className="h-4 w-4" />,
    description: 'Trop loin du module',
    variant: 'secondary'
  },
  { 
    id: 'FACE_REQUIRED', 
    label: 'Face requise', 
    icon: <Scan className="h-4 w-4" />,
    description: 'Vérification faciale',
    variant: 'secondary'
  },
  { 
    id: 'TIMEOUT', 
    label: 'Timeout', 
    icon: <Wifi className="h-4 w-4" />,
    description: 'Connexion perdue',
    variant: 'destructive'
  },
];

export const BleSimulatorPanel = () => {
  const { isSimulating, currentStep, progress, simulateOpenDoor, getStepLabel } = useBleSimulator();
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSimulate = async (scenario: SimulatedResponse) => {
    setLastResult(null);
    
    const result = await simulateOpenDoor(scenario);
    
    if (result.success) {
      setLastResult({ success: true, message: 'Porte ouverte avec succès!' });
      toast.success('🚪 Simulation: Porte ouverte!', {
        description: 'Le relais a été activé pendant 3 secondes'
      });
    } else {
      setLastResult({ success: false, message: result.error || 'Erreur inconnue' });
      toast.error('Simulation: Échec', {
        description: result.error
      });
    }
  };

  return (
    <Card className="border-dashed border-2 border-amber-500/50 bg-amber-50/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg">Mode Simulation BLE</CardTitle>
          <Badge variant="outline" className="ml-auto text-amber-600 border-amber-500">
            DEV MODE
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Testez le flux BLE sans hardware ESP32
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Simulation en cours */}
        {isSimulating && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary animate-pulse" />
              <span className="font-medium">{getStepLabel(currentStep)}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{progress}%</p>
          </div>
        )}

        {/* Résultat */}
        {lastResult && !isSimulating && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            lastResult.success 
              ? 'bg-green-500/10 border border-green-500/30' 
              : 'bg-destructive/10 border border-destructive/30'
          }`}>
            {lastResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <span className={lastResult.success ? 'text-green-700' : 'text-destructive'}>
              {lastResult.message}
            </span>
          </div>
        )}

        {/* Scénarios de simulation */}
        <div className="grid grid-cols-2 gap-2">
          {SIMULATION_SCENARIOS.map((scenario) => (
            <Button
              key={scenario.id}
              variant={scenario.variant}
              size="sm"
              disabled={isSimulating}
              onClick={() => handleSimulate(scenario.id)}
              className="flex items-center gap-2 h-auto py-2 px-3"
            >
              {scenario.icon}
              <div className="text-left">
                <div className="text-xs font-medium">{scenario.label}</div>
                <div className="text-[10px] opacity-70">{scenario.description}</div>
              </div>
            </Button>
          ))}
        </div>

        {/* Quick action */}
        <Button
          className="w-full"
          size="lg"
          disabled={isSimulating}
          onClick={() => handleSimulate('SUCCESS')}
        >
          <Play className="h-4 w-4 mr-2" />
          {isSimulating ? 'Simulation en cours...' : 'Simuler ouverture réussie'}
        </Button>
      </CardContent>
    </Card>
  );
};
