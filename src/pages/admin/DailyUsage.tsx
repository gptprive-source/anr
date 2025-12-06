import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDailyUsage } from "@/hooks/useDailyUsage";
import {
  Phone,
  Video,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const DailyUsage = () => {
  const [period, setPeriod] = useState<"day" | "week" | "month" | "all">("month");
  const { logs, stats, loading, alertThreshold, isOverBudget, refetch } = useDailyUsage(period);

  // Prepare chart data - group by day
  const chartData = logs.reduce((acc: any[], log) => {
    if (!log.started_at) return acc;
    const date = format(new Date(log.started_at), "dd/MM", { locale: fr });
    const existing = acc.find((d) => d.date === date);
    if (existing) {
      existing.calls += 1;
      existing.cost += log.estimated_cost_usd;
      existing.minutes += log.participant_minutes;
    } else {
      acc.push({
        date,
        calls: 1,
        cost: log.estimated_cost_usd,
        minutes: log.participant_minutes,
      });
    }
    return acc;
  }, []).reverse();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatCurrency = (usd: number) => {
    return `$${usd.toFixed(4)}`;
  };

  const formatCurrencyEur = (usd: number) => {
    // Approximate conversion
    return `~${(usd * 0.92).toFixed(2)}€`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Coûts Daily.co</h1>
            <p className="text-muted-foreground">
              Suivi des appels vidéo et estimation des coûts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
              <TabsList>
                <TabsTrigger value="day">Jour</TabsTrigger>
                <TabsTrigger value="week">Semaine</TabsTrigger>
                <TabsTrigger value="month">Mois</TabsTrigger>
                <TabsTrigger value="all">Tout</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Alert if over budget */}
        {isOverBudget && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Seuil d'alerte dépassé</p>
                <p className="text-sm text-muted-foreground">
                  Le coût mensuel ({formatCurrency(stats.totalCostUsd)}) dépasse le seuil de {formatCurrency(alertThreshold)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Total appels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalCalls}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Participant-minutes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalParticipantMinutes.toFixed(1)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Coût estimé (USD)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalCostUsd)}</p>
              <p className="text-sm text-muted-foreground">{formatCurrencyEur(stats.totalCostUsd)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Durée moyenne
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.averageDuration.toFixed(1)} min</p>
            </CardContent>
          </Card>
        </div>

        {/* Type breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                <span>Appels vidéo</span>
              </div>
              <Badge variant="secondary">{stats.videoCalls}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                <span>Appels audio</span>
              </div>
              <Badge variant="secondary">{stats.audioCalls}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span>Appels groupe</span>
              </div>
              <Badge variant="secondary">{stats.groupCalls}</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {chartData.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Évolution des coûts</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `$${v.toFixed(2)}`} />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toFixed(4)}`, "Coût"]}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nombre d'appels</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      formatter={(value: number) => [value, "Appels"]}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                    <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed table */}
        <Card>
          <CardHeader>
            <CardTitle>Détail des appels</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucun appel enregistré pour cette période
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Durée</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Coût</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.slice(0, 50).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.started_at ? (
                            <span title={format(new Date(log.started_at), "Pp", { locale: fr })}>
                              {formatDistanceToNow(new Date(log.started_at), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{formatDuration(log.duration_seconds)}</TableCell>
                        <TableCell>{log.participant_count}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {log.is_video ? (
                              <Video className="w-4 h-4 text-primary" />
                            ) : (
                              <Phone className="w-4 h-4 text-muted-foreground" />
                            )}
                            {log.is_group_call && <Users className="w-4 h-4 text-secondary" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(log.estimated_cost_usd)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing info */}
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              💡 Tarifs Daily.co estimés : <strong>$0.004</strong>/participant-minute (vidéo), <strong>$0.002</strong>/participant-minute (audio).
              Ces estimations peuvent varier selon votre forfait Daily.co.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default DailyUsage;
