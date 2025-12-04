import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, AreaChart, Area, ComposedChart
} from "recharts";
import { Download, TrendingUp, Users, Phone, CreditCard, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const Analytics = () => {
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['admin_analytics'],
    queryFn: async () => {
      const [
        profilesRes,
        subscriptionsRes,
        callLogsRes,
        anrsRes,
        domingOrdersRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id, created_at'),
        supabase.from('subscriptions').select('id, status, created_at, current_period_end'),
        supabase.from('call_logs').select('id, status, started_at, answered_at, ended_at'),
        supabase.from('anrs').select('id, created_at'),
        supabase.from('doming_orders').select('id, total_price, created_at, status'),
      ]);

      const users = profilesRes.data || [];
      const subscriptions = subscriptionsRes.data || [];
      const calls = callLogsRes.data || [];
      const anrs = anrsRes.data || [];
      const domingOrders = domingOrdersRes.data || [];

      // Monthly user growth (last 12 months)
      const monthlyGrowth = [];
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        
        const newUsers = users.filter(u => {
          const created = new Date(u.created_at);
          return created >= monthStart && created <= monthEnd;
        }).length;

        const newSubs = subscriptions.filter(s => {
          const created = new Date(s.created_at);
          return created >= monthStart && created <= monthEnd;
        }).length;

        monthlyGrowth.push({
          month: format(date, 'MMM yy', { locale: fr }),
          users: newUsers,
          subscriptions: newSubs,
          cumUsers: users.filter(u => new Date(u.created_at) <= monthEnd).length,
        });
      }

      // Daily calls (last 30 days)
      const dailyCalls = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        const dayCalls = calls.filter(c => 
          format(new Date(c.started_at), 'yyyy-MM-dd') === dateStr
        );
        
        const answered = dayCalls.filter(c => c.answered_at).length;
        
        dailyCalls.push({
          date: format(date, 'dd/MM'),
          total: dayCalls.length,
          answered,
          responseRate: dayCalls.length > 0 ? Math.round((answered / dayCalls.length) * 100) : 0,
        });
      }

      // Revenue data (from doming orders and subscriptions)
      const monthlyRevenue = [];
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        
        const domingRevenue = domingOrders
          .filter(o => {
            const created = new Date(o.created_at);
            return created >= monthStart && created <= monthEnd && o.status === 'completed';
          })
          .reduce((acc, o) => acc + (o.total_price || 0), 0) / 100;

        const subRevenue = subscriptions
          .filter(s => {
            const created = new Date(s.created_at);
            return created >= monthStart && created <= monthEnd;
          }).length * 12; // 12€ per subscription

        monthlyRevenue.push({
          month: format(date, 'MMM yy', { locale: fr }),
          domings: domingRevenue,
          subscriptions: subRevenue,
          total: domingRevenue + subRevenue,
        });
      }

      // Conversion funnel
      const totalVisitors = users.length * 3; // Estimate
      const registered = users.length;
      const paid = subscriptions.length;
      const active = subscriptions.filter(s => s.status === 'active').length;

      const funnel = [
        { stage: 'Visiteurs', value: totalVisitors, percent: 100 },
        { stage: 'Inscrits', value: registered, percent: Math.round((registered / totalVisitors) * 100) },
        { stage: 'Payés', value: paid, percent: Math.round((paid / totalVisitors) * 100) },
        { stage: 'Actifs', value: active, percent: Math.round((active / totalVisitors) * 100) },
      ];

      // Call duration distribution
      const answeredCalls = calls.filter(c => c.answered_at && c.ended_at);
      const durationBuckets = [
        { range: '0-30s', count: 0 },
        { range: '30-60s', count: 0 },
        { range: '60-90s', count: 0 },
        { range: '90-120s', count: 0 },
      ];

      answeredCalls.forEach(c => {
        const duration = (new Date(c.ended_at!).getTime() - new Date(c.answered_at!).getTime()) / 1000;
        if (duration <= 30) durationBuckets[0].count++;
        else if (duration <= 60) durationBuckets[1].count++;
        else if (duration <= 90) durationBuckets[2].count++;
        else durationBuckets[3].count++;
      });

      return {
        monthlyGrowth,
        dailyCalls,
        monthlyRevenue,
        funnel,
        durationBuckets,
        totals: {
          users: users.length,
          anrs: anrs.length,
          subscriptions: subscriptions.length,
          activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
          calls: calls.length,
          answeredCalls: answeredCalls.length,
        }
      };
    },
  });

  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Analyses détaillées pour vos présentations</p>
          </div>
          <Button onClick={() => exportToCSV(analyticsData?.monthlyGrowth || [], 'growth_data')}>
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analyticsData?.totals.users}</p>
                  <p className="text-sm text-muted-foreground">Utilisateurs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-full">
                  <MapPin className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analyticsData?.totals.anrs}</p>
                  <p className="text-sm text-muted-foreground">ANRs</p>
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
                  <p className="text-2xl font-bold">{analyticsData?.totals.activeSubscriptions}</p>
                  <p className="text-sm text-muted-foreground">Abonnements actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-full">
                  <Phone className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analyticsData?.totals.calls}</p>
                  <p className="text-sm text-muted-foreground">Appels total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="growth" className="space-y-6">
          <TabsList>
            <TabsTrigger value="growth">Croissance</TabsTrigger>
            <TabsTrigger value="calls">Appels</TabsTrigger>
            <TabsTrigger value="revenue">Revenus</TabsTrigger>
            <TabsTrigger value="funnel">Funnel</TabsTrigger>
          </TabsList>

          <TabsContent value="growth">
            <Card>
              <CardHeader>
                <CardTitle>Croissance mensuelle (12 mois)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analyticsData?.monthlyGrowth || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar yAxisId="left" dataKey="users" fill="hsl(var(--chart-1))" name="Nouveaux utilisateurs" />
                      <Bar yAxisId="left" dataKey="subscriptions" fill="hsl(var(--chart-2))" name="Nouveaux abonnements" />
                      <Line yAxisId="right" type="monotone" dataKey="cumUsers" stroke="hsl(var(--primary))" strokeWidth={2} name="Total utilisateurs" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calls">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Volume d'appels quotidien</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData?.dailyCalls || []}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" name="Total" />
                        <Area type="monotone" dataKey="answered" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1)/0.2)" name="Répondus" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribution durée des appels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData?.durationBuckets || []}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="range" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--chart-3))" name="Nombre d'appels" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle>Revenus mensuels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData?.monthlyRevenue || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value}€`, '']}
                      />
                      <Bar dataKey="subscriptions" stackId="a" fill="hsl(var(--chart-1))" name="Abonnements" />
                      <Bar dataKey="domings" stackId="a" fill="hsl(var(--chart-2))" name="Domings" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="funnel">
            <Card>
              <CardHeader>
                <CardTitle>Funnel de conversion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.funnel.map((stage, index) => (
                    <div key={stage.stage} className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{stage.stage}</span>
                        <span className="text-muted-foreground">{stage.value} ({stage.percent}%)</span>
                      </div>
                      <div className="h-8 bg-muted rounded-lg overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${stage.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Analytics;
