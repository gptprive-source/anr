import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, Calendar, Download, CreditCard, Package, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useRelayPoint } from "@/hooks/useRelayPoint";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import BottomNav from "@/components/layout/BottomNav";

const Earnings = () => {
  const navigate = useNavigate();
  const { relayPoint } = useRelayPoint();
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'last' | 'all'>('current');

  // Fetch earnings
  const { data: earnings, isLoading: loadingEarnings } = useQuery({
    queryKey: ['relay_earnings', relayPoint?.id],
    queryFn: async () => {
      if (!relayPoint?.id) return [];
      
      const { data, error } = await supabase
        .from('relay_earnings')
        .select('*, parcels:parcel_id(tracking_number, recipient_name)')
        .eq('relay_point_id', relayPoint.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!relayPoint?.id,
  });

  // Fetch payouts
  const { data: payouts, isLoading: loadingPayouts } = useQuery({
    queryKey: ['relay_payouts', relayPoint?.id],
    queryFn: async () => {
      if (!relayPoint?.id) return [];
      
      const { data, error } = await supabase
        .from('relay_payouts')
        .select('*')
        .eq('relay_point_id', relayPoint.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!relayPoint?.id,
  });

  if (!relayPoint) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/relay')} className="text-primary-foreground hover:bg-primary/80">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Mes revenus</h1>
          </div>
        </div>
        <div className="p-4">
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Vous devez d'abord vous inscrire comme point relais.
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Calculate stats
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const currentMonthEarnings = earnings?.filter(e => {
    const date = new Date(e.created_at);
    return date >= currentMonthStart && date <= currentMonthEnd && e.status !== 'cancelled';
  }) || [];

  const lastMonthEarnings = earnings?.filter(e => {
    const date = new Date(e.created_at);
    return date >= lastMonthStart && date <= lastMonthEnd && e.status !== 'cancelled';
  }) || [];

  const currentMonthTotal = currentMonthEarnings.reduce((sum, e) => sum + Number(e.amount), 0);
  const lastMonthTotal = lastMonthEarnings.reduce((sum, e) => sum + Number(e.amount), 0);
  const pendingTotal = earnings?.filter(e => e.status === 'pending').reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  const filteredEarnings = selectedPeriod === 'current' 
    ? currentMonthEarnings 
    : selectedPeriod === 'last' 
      ? lastMonthEarnings 
      : earnings || [];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownRight className="w-4 h-4 text-green-500" />;
      case 'pickup': return <ArrowUpRight className="w-4 h-4 text-blue-500" />;
      case 'payout': return <CreditCard className="w-4 h-4 text-purple-500" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'deposit': return 'Dépôt colis';
      case 'pickup': return 'Remise colis';
      case 'bonus': return 'Bonus';
      case 'penalty': return 'Pénalité';
      case 'payout': return 'Virement';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary">En attente</Badge>;
      case 'confirmed': return <Badge variant="outline" className="border-blue-500 text-blue-600">Confirmé</Badge>;
      case 'paid': return <Badge className="bg-green-500">Payé</Badge>;
      case 'cancelled': return <Badge variant="destructive">Annulé</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/relay')} className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Mes revenus</h1>
            <p className="text-sm opacity-80">{relayPoint.display_name}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Ce mois</span>
              </div>
              <p className="text-2xl font-bold mt-1">{currentMonthTotal.toFixed(2)}€</p>
              <p className="text-xs text-muted-foreground">{currentMonthEarnings.length} transactions</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-muted-foreground">Mois dernier</span>
              </div>
              <p className="text-2xl font-bold mt-1">{lastMonthTotal.toFixed(2)}€</p>
              <p className="text-xs text-muted-foreground">{lastMonthEarnings.length} transactions</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-800 dark:text-amber-300">En attente de paiement</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">{pendingTotal.toFixed(2)}€</p>
              </div>
              <CreditCard className="w-8 h-8 text-amber-600" />
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
              Paiement automatique le 1er du mois si solde ≥ 10€
            </p>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Ce mois</TabsTrigger>
            <TabsTrigger value="last">Mois dernier</TabsTrigger>
            <TabsTrigger value="all">Tout</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedPeriod} className="mt-4">
            {loadingEarnings ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : filteredEarnings.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Aucune transaction pour cette période
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredEarnings.map((earning) => (
                  <Card key={earning.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(earning.transaction_type)}
                          <div>
                            <p className="font-medium text-sm">{getTransactionLabel(earning.transaction_type)}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(earning.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                            </p>
                            {earning.parcels?.tracking_number && (
                              <p className="text-xs text-muted-foreground">
                                {earning.parcels.tracking_number}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${Number(earning.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {Number(earning.amount) >= 0 ? '+' : ''}{Number(earning.amount).toFixed(2)}€
                          </p>
                          {getStatusBadge(earning.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Payouts History */}
        {payouts && payouts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique des virements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {payouts.slice(0, 5).map((payout) => (
                <div key={payout.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{Number(payout.amount).toFixed(2)}€</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payout.period_start), 'dd MMM', { locale: fr })} - {format(new Date(payout.period_end), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <Badge className={payout.status === 'paid' ? 'bg-green-500' : 'bg-amber-500'}>
                    {payout.status === 'paid' ? 'Payé' : payout.status === 'processing' ? 'En cours' : 'En attente'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Earnings;
