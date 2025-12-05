import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Shield, ShieldAlert, ShieldCheck, RefreshCw, Download, CheckCircle, AlertTriangle, Info, Clock, User } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useSecurityAudit } from "@/hooks/useSecurityAudit";
import { toast } from "sonner";
import { useAuditLog } from "@/hooks/useAuditLog";

const Security = () => {
  const {
    latestRun,
    auditHistory,
    currentIssues,
    isLoading,
    triggerAudit,
    isTriggering,
    resolveIssue,
    isResolving,
    securityScore,
    unresolvedCount,
    criticalCount
  } = useSecurityAudit();

  const { logAction } = useAuditLog();

  const handleTriggerAudit = () => {
    triggerAudit();
    logAction({
      action: 'security_audit_triggered',
      entity_type: 'security',
    });
    toast.success("Audit de sécurité lancé");
  };

  const handleResolveIssue = (issueId: string, description: string) => {
    resolveIssue(issueId);
    logAction({
      action: 'security_issue_resolved',
      entity_type: 'security',
      entity_id: issueId,
      new_value: { description }
    });
    toast.success("Problème marqué comme résolu");
  };

  const exportToCSV = () => {
    if (!currentIssues?.length) return;

    const headers = ['Sévérité', 'Type', 'Table', 'Description', 'Recommandation', 'Résolu', 'Date'];
    const rows = currentIssues.map(issue => [
      issue.severity,
      issue.check_type,
      issue.table_name || '',
      issue.description,
      issue.recommendation || '',
      issue.is_resolved ? 'Oui' : 'Non',
      format(new Date(issue.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-securite-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="gap-1"><ShieldAlert className="h-3 w-3" />Critique</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 gap-1"><AlertTriangle className="h-3 w-3" />Attention</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Info className="h-3 w-3" />Info</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Audit de Sécurité
            </h1>
            <p className="text-muted-foreground">
              Surveillance automatique des configurations RLS et politiques de sécurité
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV} disabled={!currentIssues?.length}>
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
            <Button onClick={handleTriggerAudit} disabled={isTriggering}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isTriggering ? 'animate-spin' : ''}`} />
              {isTriggering ? 'Audit en cours...' : 'Lancer un audit'}
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score de Sécurité</CardTitle>
              {securityScore >= 80 ? (
                <ShieldCheck className="h-5 w-5 text-green-500" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-yellow-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getScoreColor(securityScore)}`}>
                {securityScore}/100
              </div>
              <Progress 
                value={securityScore} 
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Problèmes Critiques</CardTitle>
              <ShieldAlert className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{criticalCount}</div>
              <p className="text-xs text-muted-foreground">à résoudre immédiatement</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Problèmes Non Résolus</CardTitle>
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{unresolvedCount}</div>
              <p className="text-xs text-muted-foreground">total à traiter</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dernier Audit</CardTitle>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">
                {latestRun?.completed_at 
                  ? format(new Date(latestRun.completed_at), 'dd/MM HH:mm', { locale: fr })
                  : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {latestRun?.trigger_type === 'scheduled' ? 'Automatique' : 'Manuel'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="issues" className="space-y-4">
          <TabsList>
            <TabsTrigger value="issues">
              Problèmes Détectés
              {unresolvedCount > 0 && (
                <Badge variant="destructive" className="ml-2">{unresolvedCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Historique des Audits</TabsTrigger>
          </TabsList>

          <TabsContent value="issues">
            <Card>
              <CardHeader>
                <CardTitle>Résultats du Dernier Audit</CardTitle>
                <CardDescription>
                  {currentIssues?.length || 0} problème(s) détecté(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentIssues && currentIssues.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sévérité</TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead className="max-w-md">Description</TableHead>
                        <TableHead>Recommandation</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentIssues.map((issue) => (
                        <TableRow key={issue.id} className={issue.is_resolved ? 'opacity-50' : ''}>
                          <TableCell>{getSeverityBadge(issue.severity)}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {issue.table_name || '-'}
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="text-sm">{issue.description}</p>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs">
                            {issue.recommendation || '-'}
                          </TableCell>
                          <TableCell>
                            {issue.is_resolved ? (
                              <Badge variant="outline" className="text-green-600 gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Résolu
                              </Badge>
                            ) : (
                              <Badge variant="secondary">En attente</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!issue.is_resolved && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResolveIssue(issue.id, issue.description)}
                                disabled={isResolving}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Résoudre
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Aucun problème de sécurité détecté</p>
                    <p className="text-sm">Lancez un audit pour vérifier la configuration</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Historique des Audits</CardTitle>
                <CardDescription>
                  Les 20 derniers audits de sécurité
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditHistory && auditHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Critiques</TableHead>
                        <TableHead>Avertissements</TableHead>
                        <TableHead>Durée</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditHistory.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell>
                            {format(new Date(run.started_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {run.trigger_type === 'scheduled' ? 'Automatique' : 'Manuel'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {run.status === 'completed' ? (
                              <Badge variant="outline" className="text-green-600">Terminé</Badge>
                            ) : run.status === 'running' ? (
                              <Badge variant="secondary">En cours</Badge>
                            ) : (
                              <Badge variant="destructive">Échec</Badge>
                            )}
                          </TableCell>
                          <TableCell>{run.total_issues}</TableCell>
                          <TableCell className="text-red-500 font-medium">
                            {run.critical_issues}
                          </TableCell>
                          <TableCell className="text-yellow-500">
                            {run.warning_issues}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {run.completed_at && run.started_at
                              ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4" />
                    <p>Aucun historique d'audit</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Security;
