import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, CreditCard, Phone, TrendingUp, TrendingDown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

const Dashboard = () => {
  const navigate = useNavigate();
  // Fetch all stats in parallel
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin_stats'],
    queryFn: async () => {
      const [
        profilesRes,
        anrsRes,
        subscriptionsRes,
        callsRes,
        callsThisMonthRes,
        recentUsersRes,
        recentCallsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id, created_at', { count: 'exact' }),
        supabase.from('anrs').select('id', { count: 'exact' }),
        supabase.from('subscriptions').select('id, status', { count: 'exact' }).eq('status', 'active'),
        supabase.from('call_logs').select('id, status, started_at, answered_at, ended_at'),
        supabase.from('call_logs').select('id', { count: 'exact' }).gte('started_at', startOfDay(new Date()).toISOString()),
        supabase.from('profiles').select('created_at').order('created_at', { ascending: true }),
        supabase.from('call_logs').select('started_at, status').order('started_at', { ascending: false }).limit(500),
      ]);

      // Calculate user growth over last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30);
      const userGrowth = [];
      const users = recentUsersRes.data || [];
      
      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = users.filter(u => 
          format(new Date(u.created_at), 'yyyy-MM-dd') === dateStr
        ).length;
        userGrowth.push({
          date: format(date, 'dd MMM', { locale: fr }),
          users: count,
        });
      }

      // Calculate call volume over last 7 days
      const callVolume = [];
      const calls = recentCallsRes.data || [];
      
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayCalls = calls.filter(c => 
          format(new Date(c.started_at), 'yyyy-MM-dd') === dateStr
        );
        callVolume.push({
          date: format(date, 'EEE', { locale: fr }),
          total: dayCalls.length,
          answered: dayCalls.filter(c => c.status === 'ended').length,
          missed: dayCalls.filter(c => c.status === 'missed' || c.status === 'declined').length,
        });
      }

      // Call status distribution
      const allCalls = callsRes.data || [];
      const callDistribution = [
        { name: 'Répondus', value: allCalls.filter(c => c.status === 'ended' && c.answered_at).length, color: 'hsl(var(--chart-1))' },
        { name: 'Manqués', value: allCalls.filter(c => c.status === 'missed').length, color: 'hsl(var(--chart-2))' },
        { name: 'Déclinés', value: allCalls.filter(c => c.status === 'declined').length, color: 'hsl(var(--chart-3))' },
      ];

      // Calculate average call duration
      const answeredCalls = allCalls.filter(c => c.answered_at && c.ended_at);
      const avgDuration = answeredCalls.length > 0
        ? Math.round(answeredCalls.reduce((acc, c) => {
            const duration = (new Date(c.ended_at!).getTime() - new Date(c.answered_at!).getTime()) / 1000;
            return acc + duration;
          }, 0) / answeredCalls.length)
        : 0;

      return {
        totalUsers: profilesRes.count || 0,
        totalAnrs: anrsRes.count || 0,
        activeSubscriptions: subscriptionsRes.count || 0,
        callsToday: callsThisMonthRes.count || 0,
        totalCalls: allCalls.length,
        avgCallDuration: avgDuration,
        responseRate: allCalls.length > 0 
          ? Math.round((answeredCalls.length / allCalls.length) * 100) 
          : 0,
        userGrowth,
        callVolume,
        callDistribution,
        mrr: (subscriptionsRes.count || 0) * 12, // 12€/year = 1€/month
      };
    },
  });

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend,
    trendValue,
    subtitle 
  }: { 
    title: string; 
    value: string | number; 
    icon: any;
    trend?: 'up' | 'down';
    trendValue?: string;
    subtitle?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(trend || subtitle) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            {trend && (
              <>
                {trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                  {trendValue}
                </span>
              </>
            )}
            {subtitle && <span>{subtitle}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );

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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Vue d'ensemble de votre application</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Utilisateurs" 
            value={stats?.totalUsers || 0} 
            icon={Users}
            subtitle="Total inscrits"
          />
          <StatCard 
            title="ANRs créées" 
            value={stats?.totalAnrs || 0} 
            icon={MapPin}
            subtitle="Adresses numériques"
          />
          <StatCard 
            title="Abonnements actifs" 
            value={stats?.activeSubscriptions || 0} 
            icon={CreditCard}
            subtitle={`MRR: ${stats?.mrr || 0}€`}
          />
          <StatCard 
            title="Appels aujourd'hui" 
            value={stats?.callsToday || 0} 
            icon={Phone}
            subtitle={`Taux réponse: ${stats?.responseRate}%`}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* User Growth */}
          <Card>
            <CardHeader>
              <CardTitle>Croissance utilisateurs (30 jours)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.userGrowth || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Call Volume */}
          <Card>
            <CardHeader>
              <CardTitle>Volume d'appels (7 jours)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.callVolume || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="answered" stackId="a" fill="hsl(var(--chart-1))" name="Répondus" />
                    <Bar dataKey="missed" stackId="a" fill="hsl(var(--chart-2))" name="Manqués" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Call Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribution des appels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.callDistribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {(stats?.callDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Total appels</span>
                <span className="font-bold">{stats?.totalCalls || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Durée moyenne</span>
                <span className="font-bold">{stats?.avgCallDuration || 0}s</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">Taux de réponse</span>
                <span className="font-bold">{stats?.responseRate || 0}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-muted-foreground">ARR estimé</span>
                <span className="font-bold">{(stats?.mrr || 0) * 12}€</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
