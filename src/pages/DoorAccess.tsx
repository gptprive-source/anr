import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DoorAccessPanel } from '@/components/door/DoorAccessPanel';
import BottomNav from '@/components/layout/BottomNav';
import { Loader2, DoorOpen, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DoorAccess() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [anrId, setAnrId] = useState<string | null>(null);
  const [anrCode, setAnrCode] = useState<string | null>(null);
  const [hasDoorModule, setHasDoorModule] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (user) {
      fetchResidentData();
    }
  }, [user, authLoading, navigate]);

  const fetchResidentData = async () => {
    try {
      // Récupérer l'habitation du résident
      const { data: resident, error: residentError } = await supabase
        .from('residents')
        .select(`
          habitation_id,
          habitations (
            anr_id,
            anrs (
              id,
              code
            )
          )
        `)
        .eq('user_id', user!.id)
        .eq('status', 'verified')
        .single();

      if (residentError || !resident) {
        console.error('Erreur récupération résident:', residentError);
        setLoading(false);
        return;
      }

      const habitation = resident.habitations as any;
      const anr = habitation?.anrs;

      if (anr) {
        setAnrId(anr.id);
        setAnrCode(anr.code);

        // Vérifier s'il y a un module de porte actif
        const { data: doorModule } = await supabase
          .from('door_modules')
          .select('id')
          .eq('anr_id', anr.id)
          .eq('is_active', true)
          .single();

        setHasDoorModule(!!doorModule);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!anrId || !anrCode) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container max-w-2xl mx-auto p-4">
          <Card className="mt-8 border border-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Aucune ANR associée
              </CardTitle>
              <CardDescription>
                Vous n'êtes pas associé à une ANR valide.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/dashboard')}>
                Retour au tableau de bord
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  // En mode DEV, simuler la présence du module pour tester l'interface
  const effectiveHasDoorModule = import.meta.env.DEV ? true : hasDoorModule;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-2xl mx-auto p-4">
        <DoorAccessPanel anrId={anrId} anrCode={anrCode} hasDoorModule={effectiveHasDoorModule} />
      </div>
      <BottomNav />
    </div>
  );
}
