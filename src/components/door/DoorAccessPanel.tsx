import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DoorOpen, 
  Key, 
  Clock, 
  History, 
  Plus, 
  Bluetooth,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Copy,
  QrCode
} from 'lucide-react';
import { useDoorAccess } from '@/hooks/useDoorAccess';
import { CreateScheduledAccessDialog } from './CreateScheduledAccessDialog';
import { DoorAccessHistory } from './DoorAccessHistory';
import { BleConnectionStatus } from './BleConnectionStatus';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface DoorAccessPanelProps {
  anrId: string;
  anrCode: string;
}

export function DoorAccessPanel({ anrId, anrCode }: DoorAccessPanelProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('instant');
  const { toast } = useToast();

  const {
    loading,
    generatedToken,
    accessLogs,
    scheduledAccess,
    generateToken,
    fetchAccessLogs,
    fetchScheduledAccess,
    deleteScheduledAccess,
    toggleScheduledAccess,
  } = useDoorAccess(anrId);

  useEffect(() => {
    fetchAccessLogs();
    fetchScheduledAccess();
  }, [fetchAccessLogs, fetchScheduledAccess]);

  const handleGenerateToken = async () => {
    await generateToken({
      mode: 'SINGLE',
      scope: 'OPEN_DOOR',
      ttl_seconds: 60,
    });
  };

  const handleCopyToken = () => {
    if (generatedToken?.jws_token) {
      navigator.clipboard.writeText(generatedToken.jws_token);
      toast({
        title: "Token copié",
        description: "Le token JWS a été copié dans le presse-papiers",
      });
    }
  };

  const getDayName = (day: number) => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[day] || '';
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DoorOpen className="h-6 w-6 text-primary" />
            Ouverture de porte
          </h2>
          <p className="text-muted-foreground">
            Gérez l'accès à votre porte connectée
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Bluetooth className="h-3 w-3 mr-1" />
          {anrCode}
        </Badge>
      </div>

      {/* Statut BLE */}
      <BleConnectionStatus anrCode={anrCode} />

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="instant" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Accès instantané
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Accès programmés
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* Accès instantané */}
        <TabsContent value="instant" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Générer un token d'accès
              </CardTitle>
              <CardDescription>
                Créez un token temporaire pour ouvrir la porte immédiatement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleGenerateToken} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <DoorOpen className="h-5 w-5 mr-2" />
                )}
                Générer un token d'ouverture
              </Button>

              {/* Token généré */}
              {generatedToken && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium">Token généré</span>
                      </div>
                      <Badge>
                        {generatedToken.token.ttl_seconds}s
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        <strong>ID:</strong> {generatedToken.token.id.substring(0, 8)}...
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Valide jusqu'à:</strong>{' '}
                        {format(new Date(generatedToken.token.valid_until), 'HH:mm:ss', { locale: fr })}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCopyToken}
                        className="flex-1"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copier token JWS
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Afficher QR
                      </Button>
                    </div>

                    {/* Info BLE */}
                    <div className="text-xs text-muted-foreground bg-background p-3 rounded-lg">
                      <div className="font-medium mb-1">Configuration BLE:</div>
                      <div>Service: {generatedToken.ble.service_uuid.substring(0, 8)}...</div>
                      <div>Token Char: {generatedToken.ble.token_char_uuid.substring(0, 8)}...</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accès programmés */}
        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Accès programmés
                </CardTitle>
                <CardDescription>
                  Autorisations récurrentes pour prestataires et visiteurs réguliers
                </CardDescription>
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {scheduledAccess.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun accès programmé</p>
                  <p className="text-sm">
                    Créez des autorisations pour vos prestataires réguliers
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledAccess.map((access) => (
                    <Card key={access.id} className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{access.name}</span>
                              <Badge variant={access.is_active ? "default" : "secondary"}>
                                {access.is_active ? "Actif" : "Inactif"}
                              </Badge>
                            </div>
                            {access.description && (
                              <p className="text-sm text-muted-foreground">
                                {access.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{access.time_from} - {access.time_to}</span>
                              {access.days_of_week && (
                                <span>
                                  {access.days_of_week.map(d => getDayName(d)).join(', ')}
                                </span>
                              )}
                            </div>
                            {access.require_face_recognition_entry && (
                              <Badge variant="outline" className="text-xs">
                                Reconnaissance faciale requise
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleScheduledAccess(access.id, !access.is_active)}
                            >
                              {access.is_active ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteScheduledAccess(access.id)}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historique */}
        <TabsContent value="history">
          <DoorAccessHistory 
            logs={accessLogs} 
            loading={loading}
            onRefresh={fetchAccessLogs}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog création accès programmé */}
      <CreateScheduledAccessDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        anrId={anrId}
      />
    </div>
  );
}
