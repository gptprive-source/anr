import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DoorOpen, 
  QrCode, 
  Loader2, 
  MapPin,
  AlertTriangle,
  LogIn,
  Building2,
  Clock
} from 'lucide-react';
import { EmployeeDoorScanner } from '@/components/door/EmployeeDoorScanner';
import VisitorFooter from '@/components/layout/VisitorFooter';

export default function EmployeeScan() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [anrData, setAnrData] = useState<{
    id: string;
    code: string;
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<{
    id: string;
    first_name: string;
    last_name: string;
    company_name: string;
  } | null>(null);

  const anrCode = searchParams.get('anr');

  useEffect(() => {
    if (anrCode) {
      fetchAnrData(anrCode);
    } else {
      setLoading(false);
      setScanning(true);
    }
  }, [anrCode]);

  useEffect(() => {
    checkEmployeeStatus();
  }, []);

  const fetchAnrData = async (code: string) => {
    try {
      const { data: anr, error } = await supabase
        .from('anrs')
        .select('id, code, address, latitude, longitude')
        .eq('code', code)
        .single();

      if (error || !anr) {
        console.error('ANR non trouvé:', error);
        setScanning(true);
      } else {
        setAnrData(anr);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkEmployeeStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Vérifier si l'utilisateur est un employé
    const { data: employee } = await supabase
      .from('pro_employees')
      .select(`
        id,
        first_name,
        last_name,
        pro_companies (
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (employee) {
      setEmployeeInfo({
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        company_name: (employee.pro_companies as any)?.name || '',
      });
    }
  };

  const handleAnrScanned = useCallback((code: string) => {
    setScanning(false);
    navigate(`/employee-scan?anr=${code}`);
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mode scan - utiliser le scanner QR intégré
  if (scanning) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container max-w-lg mx-auto p-4">
          <Card className="mt-8 border-2 border-blue-500">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-blue-500/10 border-2 border-blue-500">
                  <QrCode className="h-12 w-12 text-blue-500" />
                </div>
              </div>
              <CardTitle>Scanner l'ANR</CardTitle>
              <CardDescription>
                Scannez le QR code de l'ANR pour pointer votre entrée ou sortie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input manuel du code */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Code ANR</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="ANR-XXXXXX"
                    className="flex-1 px-3 py-2 border rounded-md"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget.value.trim().toUpperCase();
                        if (input) handleAnrScanned(input);
                      }
                    }}
                  />
                  <Button onClick={() => {
                    const input = document.querySelector('input')?.value?.trim().toUpperCase();
                    if (input) handleAnrScanned(input);
                  }}>
                    Valider
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info employé */}
          {employeeInfo && (
            <Card className="mt-4 border-2 border-orange-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {employeeInfo.first_name} {employeeInfo.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {employeeInfo.company_name}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <VisitorFooter />
      </div>
    );
  }

  // Mode pointage
  if (anrData) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container max-w-lg mx-auto p-4">
          {/* Info employé en haut */}
          {employeeInfo && (
            <Card className="mb-4 border-2 border-green-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {employeeInfo.first_name} {employeeInfo.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {employeeInfo.company_name}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-500">Employé</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scanner principal */}
          <EmployeeDoorScanner
            anrId={anrData.id}
            anrCode={anrData.code}
            anrAddress={anrData.address}
          />

          {/* Bouton retour au scan */}
          <div className="mt-6 text-center">
            <Button 
              variant="outline" 
              onClick={() => {
                setAnrData(null);
                setScanning(true);
                navigate('/employee-scan');
              }}
              className="border-2 border-purple-500"
            >
              <QrCode className="h-4 w-4 mr-2 text-purple-500" />
              Scanner une autre ANR
            </Button>
          </div>
        </div>
        <VisitorFooter />
      </div>
    );
  }

  // État par défaut - pas d'ANR
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-lg mx-auto p-4">
        <Card className="mt-8 border-2 border-orange-500">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4 border-2 border-orange-500">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
            <CardTitle>Aucune ANR sélectionnée</CardTitle>
            <CardDescription>
              Scannez un QR code ANR pour commencer
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setScanning(true)} className="border-2 border-blue-500 bg-blue-500 hover:bg-blue-600">
              <QrCode className="h-4 w-4 mr-2" />
              Scanner une ANR
            </Button>
          </CardContent>
        </Card>
      </div>
      <VisitorFooter />
    </div>
  );
}