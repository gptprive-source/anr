import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Euro, Clock, QrCode, Users, TrendingUp, Power, AlertCircle, CheckCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useRelayPoint } from "@/hooks/useRelayPoint";
import { useParcels } from "@/hooks/useParcels";
import BottomNav from "@/components/layout/BottomNav";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

  const waitingParcels = relayParcels?.filter(p => p.status === 'deposited_at_relay') || [];
  const readyParcels = relayParcels?.filter(p => p.status === 'available_for_pickup') || [];
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
              <p className="text-sm opacity-80">Point Relais ANR</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('/relay/settings')} className="text-primary-foreground hover:bg-primary/80">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Card */}
        <Card className={relayPoint.is_verified ? 'border-green-500/50' : 'border-yellow-500/50'}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {relayPoint.is_verified ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-yellow-500" />
                )}
                <div>
                  <p className="font-medium">
                    {relayPoint.is_verified ? 'Relais vérifié' : 'En attente de vérification'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {relayPoint.is_verified 
                      ? 'Vous pouvez recevoir des colis'
                      : 'Un administrateur vérifiera votre inscription'}
                  </p>
                </div>
              </div>
              {relayPoint.is_verified && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">{relayPoint.is_active ? 'Actif' : 'Inactif'}</span>
                  <Switch
                    checked={relayPoint.is_active}
                    onCheckedChange={handleToggleActive}
                    disabled={isUpdating}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
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
                  <p className="text-2xl font-bold">{relayPoint.pending_earnings.toFixed(2)}€</p>
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
              <span className="font-semibold text-green-600">{relayPoint.pending_earnings.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total perçu</span>
              <span className="font-semibold">{relayPoint.total_earnings.toFixed(2)}€</span>
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate('/relay/earnings')}>
              Historique des paiements
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default RelayDashboard;
