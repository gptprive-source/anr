import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Euro, Clock, QrCode, Users, TrendingUp, Power, AlertCircle, CheckCircle, Settings, FileSignature, GraduationCap, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useRelayPoint, RelayStatus } from "@/hooks/useRelayPoint";
import { useParcels } from "@/hooks/useParcels";
import BottomNav from "@/components/layout/BottomNav";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_STEPS: { status: RelayStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'draft', label: 'Inscription', icon: <Package className="w-4 h-4" /> },
  { status: 'identity_verified', label: 'KYC vérifié', icon: <CheckCircle className="w-4 h-4" /> },
  { status: 'contract_signed', label: 'Contrat signé', icon: <FileSignature className="w-4 h-4" /> },
  { status: 'anr_assigned', label: 'ANR attribué', icon: <QrCode className="w-4 h-4" /> },
  { status: 'training_validated', label: 'Formation', icon: <GraduationCap className="w-4 h-4" /> },
  { status: 'active', label: 'Actif', icon: <Power className="w-4 h-4" /> },
];

const getStatusIndex = (status: RelayStatus): number => {
  const index = STATUS_STEPS.findIndex(s => s.status === status);
  return index >= 0 ? index : 0;
};

const RelayDashboard = () => {
  const navigate = useNavigate();
  const { relayPoint, isLoading, toggleActive, isUpdating } = useRelayPoint();
  const { relayParcels, pendingCount } = useParcels({ relayPointId: relayPoint?.id });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!relayPoint) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="text-primary-foreground hover:bg-primary/80">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Point Relais</h1>
          </div>
        </div>

        <div className="p-4">
          <Card className="text-center py-12">
            <CardContent>
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Devenez point relais ANR</h2>
              <p className="text-muted-foreground mb-6">
                Gagnez de l'argent en recevant les colis de vos voisins
              </p>
              <Button onClick={() => navigate('/relay/register')}>
                S'inscrire comme relais
              </Button>
            </CardContent>
          </Card>
        </div>

        <BottomNav />
      </div>
    );
  }

  const handleToggleActive = async () => {
    try {
      await toggleActive();
      toast.success(relayPoint.is_active ? 'Point relais désactivé' : 'Point relais activé');
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  };

  const currentStatusIndex = getStatusIndex(relayPoint.status || 'draft');
  const progressPercent = ((currentStatusIndex + 1) / STATUS_STEPS.length) * 100;
  const isActive = relayPoint.status === 'active';
  const isSuspended = relayPoint.status === 'suspended';

  // Determine next action
  const getNextAction = () => {
    switch (relayPoint.status) {
      case 'draft':
        return { label: 'En attente de vérification KYC', action: null, description: 'Notre équipe vérifie vos documents' };
      case 'identity_verified':
        return { label: 'Signer le contrat', action: () => navigate('/relay/contract'), description: 'Acceptez les conditions pour continuer' };
      case 'contract_signed':
        return { label: 'En attente d\'attribution ANR', action: null, description: 'Un ANR sera bientôt attribué à votre point relais' };
      case 'anr_assigned':
        return { label: 'Compléter la formation', action: () => navigate('/relay/training'), description: 'Formation express de 5-10 minutes' };
      case 'training_validated':
        return { label: 'Activation en cours', action: null, description: 'Votre point relais sera activé très prochainement' };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  const waitingParcels = relayParcels?.filter(p => p.status === 'deposited_at_relay') || [];
  const deliveredThisMonth = relayParcels?.filter(p => {
    if (p.status !== 'delivered' || !p.delivered_at) return false;
    const deliveredDate = new Date(p.delivered_at);
    const now = new Date();
    return deliveredDate.getMonth() === now.getMonth() && deliveredDate.getFullYear() === now.getFullYear();
  }).length || 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="text-primary-foreground hover:bg-primary/80">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{relayPoint.display_name}</h1>
              <p className="text-sm opacity-80">
                {relayPoint.relay_type === 'professional' ? 'Relais Professionnel' : 'Relais Particulier'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/relay/settings')} className="text-primary-foreground hover:bg-primary/80">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Progress Card (for non-active relays) */}
        {!isActive && !isSuspended && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Progression de l'inscription</CardTitle>
              <CardDescription>
                Étape {currentStatusIndex + 1} sur {STATUS_STEPS.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progressPercent} className="h-2" />
              
              <div className="flex justify-between text-xs">
                {STATUS_STEPS.slice(0, -1).map((step, index) => (
                  <div 
                    key={step.status} 
                    className={`flex flex-col items-center gap-1 ${index <= currentStatusIndex ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${index <= currentStatusIndex ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {step.icon}
                    </div>
                    <span className="text-[10px] text-center max-w-[50px]">{step.label}</span>
                  </div>
                ))}
              </div>

              {nextAction && (
                <Card className={nextAction.action ? 'bg-primary/5 border-primary/30 cursor-pointer' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}>
                  <CardContent className="pt-4" onClick={nextAction.action || undefined}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {nextAction.action ? (
                          <div className="p-2 rounded-full bg-primary text-primary-foreground">
                            {relayPoint.status === 'identity_verified' ? <FileSignature className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                          </div>
                        ) : (
                          <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                        )}
                        <div>
                          <p className="font-medium">{nextAction.label}</p>
                          <p className="text-sm text-muted-foreground">{nextAction.description}</p>
                        </div>
                      </div>
                      {nextAction.action && <ArrowRight className="w-5 h-5 text-primary" />}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}

        {/* Suspended Warning */}
        {isSuspended && (
          <Card className="border-red-500/50 bg-red-50 dark:bg-red-900/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 mt-1" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-300">Point relais suspendu</p>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {relayPoint.suspended_reason || 'Votre point relais a été suspendu. Contactez le support pour plus d\'informations.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Status Card */}
        {isActive && (
          <Card className="border-green-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <div>
                    <p className="font-medium">Relais actif et opérationnel</p>
                    <p className="text-sm text-muted-foreground">Vous pouvez recevoir et remettre des colis</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{relayPoint.is_active ? 'En ligne' : 'Hors ligne'}</span>
                  <Switch
                    checked={relayPoint.is_active}
                    onCheckedChange={handleToggleActive}
                    disabled={isUpdating}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid - Only show for active relays */}
        {isActive && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Package className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{pendingCount}</p>
                      <p className="text-sm text-muted-foreground">En attente</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Euro className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{relayPoint.pending_earnings?.toFixed(2) || '0.00'}€</p>
                      <p className="text-sm text-muted-foreground">Gains en cours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <TrendingUp className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{relayPoint.total_parcels_handled}</p>
                      <p className="text-sm text-muted-foreground">Total traités</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Users className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{relayPoint.current_capacity}/{relayPoint.max_capacity}</p>
                      <p className="text-sm text-muted-foreground">Capacité</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/relay/scan')}
              >
                <QrCode className="w-6 h-6" />
                <span>Scanner colis</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => navigate('/relay/parcels')}
              >
                <Package className="w-6 h-6" />
                <span>Voir les colis</span>
              </Button>
            </div>

            {/* Pending Parcels */}
            {waitingParcels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Colis en attente de retrait</CardTitle>
                  <CardDescription>{waitingParcels.length} colis à remettre</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {waitingParcels.slice(0, 5).map((parcel) => (
                    <div key={parcel.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{parcel.recipient_name}</p>
                        <p className="text-sm text-muted-foreground">{parcel.tracking_number}</p>
                        {parcel.deposited_at && (
                          <p className="text-xs text-muted-foreground">
                            Déposé le {format(new Date(parcel.deposited_at), 'dd MMM', { locale: fr })}
                          </p>
                        )}
                      </div>
                      <Badge variant={parcel.parcel_type === 'fragile' ? 'destructive' : 'secondary'}>
                        {parcel.parcel_type}
                      </Badge>
                    </div>
                  ))}
                  {waitingParcels.length > 5 && (
                    <Button variant="link" className="w-full" onClick={() => navigate('/relay/parcels')}>
                      Voir tous les colis ({waitingParcels.length})
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Earnings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Euro className="w-5 h-5" />
                  Mes gains
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ce mois</span>
                  <span className="font-semibold">{deliveredThisMonth} colis</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Gains en attente</span>
                  <span className="font-semibold text-green-600">{relayPoint.pending_earnings?.toFixed(2) || '0.00'}€</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total perçu</span>
                  <span className="font-semibold">{relayPoint.total_earnings?.toFixed(2) || '0.00'}€</span>
                </div>
                <Button variant="outline" className="w-full" onClick={() => navigate('/relay/earnings')}>
                  Historique des paiements
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default RelayDashboard;
