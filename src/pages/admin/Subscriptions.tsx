import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CreditCard, TrendingUp, Users, Calendar } from "lucide-react";

const Subscriptions = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin_subscriptions'],
    queryFn: async () => {
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select(`
          id, status, stripe_subscription_id, stripe_customer_id,
          current_period_start, current_period_end, cancel_at_period_end,
          created_at, user_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user profiles
      const userIds = [...new Set(subscriptions?.map(s => s.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);

      const enrichedSubs = (subscriptions || []).map(sub => ({
        ...sub,
        user: profileMap[sub.user_id],
      }));

      // Calculate stats
      const active = enrichedSubs.filter(s => s.status === 'active').length;
      const canceled = enrichedSubs.filter(s => s.status === 'canceled').length;
      const pendingCancel = enrichedSubs.filter(s => s.cancel_at_period_end).length;

      return {
        subscriptions: enrichedSubs,
        stats: {
          total: enrichedSubs.length,
          active,
          canceled,
          pendingCancel,
          mrr: active * 1, // 12€/year = 1€/month
          arr: active * 12,
        },
      };
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">Annulation prévue</Badge>;
    }
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Actif</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Annulé</Badge>;
      case 'past_due':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600">Impayé</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Abonnements</h1>
          <p className="text-muted-foreground">Gestion des abonnements utilisateurs</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data?.stats.active}</p>
                  <p className="text-sm text-muted-foreground">Abonnements actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data?.stats.mrr}€</p>
                  <p className="text-sm text-muted-foreground">MRR</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <CreditCard className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data?.stats.arr}€</p>
                  <p className="text-sm text-muted-foreground">ARR</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-full">
                  <Calendar className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{data?.stats.pendingCancel}</p>
                  <p className="text-sm text-muted-foreground">Annulations prévues</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tous les abonnements</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Début période</TableHead>
                  <TableHead>Fin période</TableHead>
                  <TableHead>ID Stripe</TableHead>
                  <TableHead>Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.subscriptions.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {sub.user?.first_name} {sub.user?.last_name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(sub.status, sub.cancel_at_period_end || false)}
                    </TableCell>
                    <TableCell>
                      {sub.current_period_start 
                        ? format(new Date(sub.current_period_start), 'dd MMM yyyy', { locale: fr })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {sub.current_period_end 
                        ? format(new Date(sub.current_period_end), 'dd MMM yyyy', { locale: fr })
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {sub.stripe_subscription_id?.slice(0, 20)}...
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(sub.created_at), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Subscriptions;
