import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Download, Search, Filter, RefreshCw } from "lucide-react";

const actionLabels: Record<string, string> = {
  config_update: 'Configuration modifiée',
  faq_create: 'FAQ créée',
  faq_update: 'FAQ modifiée',
  faq_delete: 'FAQ supprimée',
  role_update: 'Rôle modifié',
  role_remove: 'Rôle retiré',
  user_delete: 'Utilisateur supprimé',
  security_audit_triggered: 'Audit sécurité lancé',
  security_issue_resolved: 'Problème sécurité résolu',
};

const AuditLog = () => {
  const [filters, setFilters] = useState({
    action: '',
    search: '',
  });

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['admin_audit_logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get profiles for user_ids
      const userIds = [...new Set(data?.map(l => l.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);

      return (data || []).map(log => ({
        ...log,
        user: profileMap[log.user_id],
      }));
    },
  });

  const filteredLogs = logs?.filter(log => {
    if (!filters.search) return true;
    const term = filters.search.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.entity_type?.toLowerCase().includes(term) ||
      log.user?.first_name?.toLowerCase().includes(term) ||
      log.user?.last_name?.toLowerCase().includes(term)
    );
  });

  const exportToCSV = () => {
    if (!filteredLogs?.length) return;

    const headers = ['Date', 'Utilisateur', 'Action', 'Type', 'Entité', 'Ancienne valeur', 'Nouvelle valeur'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
      `${log.user?.first_name || ''} ${log.user?.last_name || ''}`.trim(),
      actionLabels[log.action] || log.action,
      log.entity_type || '',
      log.entity_id || '',
      JSON.stringify(log.old_value || ''),
      JSON.stringify(log.new_value || ''),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getActionBadge = (action: string) => {
    if (action.includes('delete') || action.includes('remove')) {
      return <Badge variant="destructive">{actionLabels[action] || action}</Badge>;
    }
    if (action.includes('create')) {
      return <Badge className="bg-green-500">{actionLabels[action] || action}</Badge>;
    }
    return <Badge variant="secondary">{actionLabels[action] || action}</Badge>;
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
            <h1 className="text-3xl font-bold">Journal d'audit</h1>
            <p className="text-muted-foreground">Historique de toutes les actions administratives</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
              <Select
                value={filters.action}
                onValueChange={(value) => setFilters({ ...filters, action: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Toutes les actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  {Object.entries(actionLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs?.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      <div>
                        <p className="font-medium">
                          {format(new Date(log.created_at), 'dd MMM yyyy', { locale: fr })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'HH:mm:ss')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.user ? (
                        <span>{log.user.first_name} {log.user.last_name}</span>
                      ) : (
                        <span className="text-muted-foreground">Système</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell>
                      {log.entity_type && (
                        <Badge variant="outline">{log.entity_type}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {log.entity_id && (
                        <p className="text-xs text-muted-foreground truncate">
                          ID: {log.entity_id}
                        </p>
                      )}
                      {log.new_value && (
                        <p className="text-xs text-muted-foreground truncate">
                          {typeof log.new_value === 'object' 
                            ? JSON.stringify(log.new_value).slice(0, 50) + '...'
                            : String(log.new_value).slice(0, 50)
                          }
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredLogs?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucune entrée dans le journal
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AuditLog;
