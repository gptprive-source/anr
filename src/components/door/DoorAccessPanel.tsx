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
  Loader2,
  Copy,
  QrCode,
  User,
  Phone,
  Trash2,
  Pencil
} from 'lucide-react';
import { useDoorAccess } from '@/hooks/useDoorAccess';
import { useRealtimeDoorLogs } from '@/hooks/useRealtimeDoorLogs';
import { CreateScheduledAccessDialog } from './CreateScheduledAccessDialog';
import { EditScheduledAccessDialog } from './EditScheduledAccessDialog';
import { DoorAccessHistory } from './DoorAccessHistory';
import { BleConnectionStatus } from './BleConnectionStatus';
import { BleOpenDoorButton } from './BleOpenDoorButton';
import { BleSimulatorPanel } from './BleSimulatorPanel';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface DoorAccessPanelProps {
  anrId: string;
  anrCode: string;
  hasDoorModule?: boolean;
}

export function DoorAccessPanel({ anrId, anrCode, hasDoorModule = true }: DoorAccessPanelProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAccess, setEditingAccess] = useState<typeof scheduledAccess[0] | null>(null);
  const [activeTab, setActiveTab] = useState(hasDoorModule ? 'instant' : 'scheduled');
  const { toast } = useToast();

  const {
    loading,
    generatedToken,
    scheduledAccess,
    generateToken,
    fetchScheduledAccess,
    updateScheduledAccess,
    deleteScheduledAccess,
    toggleScheduledAccess,
  } = useDoorAccess(anrId);

  const handleEditAccess = (access: typeof scheduledAccess[0]) => {
    setEditingAccess(access);
    setShowEditDialog(true);
  };

  // Use realtime logs hook
  const { logs: accessLogs, loading: logsLoading, refresh: refreshLogs, newLogCount } = useRealtimeDoorLogs({
    anrId,
    limit: 50,
    showNotifications: true,
  });

  useEffect(() => {
    fetchScheduledAccess();
  }, [fetchScheduledAccess]);

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
          {!hasDoorModule ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DoorOpen className="h-5 w-5 text-muted-foreground" />
                  Module de porte non installé
                </CardTitle>
                <CardDescription>
                  L'ouverture instantanée nécessite un module de porte physique.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Le module de porte ANR permet d'ouvrir votre porte à distance via Bluetooth.
                  Contactez notre support pour commander et installer votre module.
                </p>
                <p className="text-sm text-muted-foreground">
                  En attendant, vous pouvez déjà <strong>planifier des accès</strong> dans l'onglet "Accès programmés".
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DoorOpen className="h-5 w-5" />
                  Ouverture de porte
                </CardTitle>
                <CardDescription>
                  Ouvrez la porte via Bluetooth Low Energy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* BLE Open Door Button */}
                <BleOpenDoorButton
                  anrId={anrId}
                  anrCode={anrCode}
                  onSuccess={() => {
                    // Refresh logs after successful open
                    setTimeout(() => refreshLogs(), 1000);
                  }}
                />

                {/* Manual token generation section */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Ou générer un token manuel
                    </span>
                  </div>
                  
                  <Button 
                    onClick={handleGenerateToken} 
                    disabled={loading}
                    variant="outline"
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Key className="h-4 w-4 mr-2" />
                    )}
                    Générer token JWS
                  </Button>

                  {/* Token généré */}
                  {generatedToken && (
                    <Card className="bg-muted/50 mt-4">
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
                            Copier
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1"
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            QR Code
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Simulation Panel - Development Mode */}
          {import.meta.env.DEV && hasDoorModule && (
            <BleSimulatorPanel />
          )}
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
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{access.name}</span>
                              <Badge variant={access.is_active ? "default" : "secondary"}>
                                {access.is_active ? "Actif" : "Inactif"}
                              </Badge>
                            </div>
                            
                            {/* Bénéficiaire */}
                            {(access.beneficiary_first_name || access.beneficiary_last_name) && (
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {access.beneficiary_first_name} {access.beneficiary_last_name}
                                </span>
                                {access.beneficiary_anr_code && (
                                  <Badge variant="outline" className="text-xs">
                                    {access.beneficiary_anr_code}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {access.description && (
                              <p className="text-sm text-muted-foreground">
                                {access.description}
                              </p>
                            )}
                            
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {access.time_from} - {access.time_to}
                              </span>
                              {access.days_of_week && (
                                <span>
                                  {access.days_of_week.map(d => getDayName(d)).join(', ')}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {access.forward_calls_to_beneficiary && (
                                <Badge variant="secondary" className="text-xs">
                                  <Phone className="h-3 w-3 mr-1" />
                                  Transfert d'appels activé
                                </Badge>
                              )}
                              {access.require_face_recognition_entry && (
                                <Badge variant="outline" className="text-xs">
                                  Reconnaissance faciale
                                </Badge>
                              )}
                            </div>

                            {access.valid_from && access.valid_until && (
                              <p className="text-xs text-muted-foreground">
                                Valide du {access.valid_from} au {access.valid_until}
                              </p>
                            )}
                          </div>
                        <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditAccess(access)}
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleScheduledAccess(access.id, !access.is_active)}
                              title={access.is_active ? "Désactiver" : "Activer"}
                            >
                              {access.is_active ? (
                                <XCircle className="h-4 w-4 text-yellow-500" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteScheduledAccess(access.id)}
                              className="text-destructive hover:text-destructive"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
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
            loading={logsLoading}
            onRefresh={refreshLogs}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog création accès programmé */}
      <CreateScheduledAccessDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        anrId={anrId}
      />

      {/* Dialog modification accès programmé */}
      <EditScheduledAccessDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        access={editingAccess}
        onSave={updateScheduledAccess}
        loading={loading}
      />
    </div>
  );
}
