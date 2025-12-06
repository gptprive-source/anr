import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Scale, 
  FileText, 
  Users, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Download,
  Shield,
  Database,
  Trash2,
  History,
  ExternalLink,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const RGPD = () => {
  const [exportingPdf, setExportingPdf] = useState(false);
  const navigate = useNavigate();

  // Fetch registry count
  const { data: registryData } = useQuery({
    queryKey: ['rgpd_registry_count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('rgpd_data_processing_registry')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      return count || 0;
    }
  });

  // Fetch subprocessors count
  const { data: subprocessorsData } = useQuery({
    queryKey: ['rgpd_subprocessors_count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('rgpd_subprocessors')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      return count || 0;
    }
  });

  // Fetch pending requests
  const { data: pendingRequests } = useQuery({
    queryKey: ['rgpd_pending_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rgpd_rights_requests')
        .select('*')
        .in('status', ['pending', 'in_progress']);
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch open incidents
  const { data: openIncidents } = useQuery({
    queryKey: ['rgpd_open_incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rgpd_incidents')
        .select('*')
        .in('status', ['open', 'contained']);
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch last purge
  const { data: lastPurge } = useQuery({
    queryKey: ['rgpd_last_purge'],
    queryFn: async () => {
      const { data } = await supabase
        .from('rgpd_purge_logs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    }
  });

  // Fetch app config for last updates
  const { data: configData } = useQuery({
    queryKey: ['rgpd_config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_config')
        .select('key, updated_at')
        .in('key', ['privacy_policy_content', 'cgu_content']);
      return data || [];
    }
  });

  // Calculate compliance score
  const calculateComplianceScore = () => {
    let score = 0;
    const checks = [];

    // Registry documented (20 points)
    if (registryData && registryData >= 5) {
      score += 20;
      checks.push({ name: "Registre des traitements", status: "ok" });
    } else {
      checks.push({ name: "Registre des traitements", status: "partial", note: "Incomplet" });
      score += 10;
    }

    // Subprocessors documented (20 points)
    if (subprocessorsData && subprocessorsData >= 4) {
      score += 20;
      checks.push({ name: "Sous-traitants documentés", status: "ok" });
    } else {
      checks.push({ name: "Sous-traitants documentés", status: "partial", note: "À compléter" });
      score += 10;
    }

    // No pending requests overdue (20 points)
    const overdueRequests = pendingRequests?.filter(r => new Date(r.deadline_at) < new Date()) || [];
    if (overdueRequests.length === 0) {
      score += 20;
      checks.push({ name: "Demandes de droits traitées", status: "ok" });
    } else {
      checks.push({ name: "Demandes de droits traitées", status: "error", note: `${overdueRequests.length} en retard` });
    }

    // No open critical incidents (20 points)
    const criticalIncidents = openIncidents?.filter(i => i.severity === 'critical') || [];
    if (criticalIncidents.length === 0) {
      score += 20;
      checks.push({ name: "Aucun incident critique", status: "ok" });
    } else {
      checks.push({ name: "Incidents critiques ouverts", status: "error", note: `${criticalIncidents.length} incidents` });
    }

    // Purge configured and running (20 points)
    if (lastPurge) {
      const daysSinceLastPurge = Math.floor((Date.now() - new Date(lastPurge.executed_at).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastPurge <= 7) {
        score += 20;
        checks.push({ name: "Purge automatique active", status: "ok" });
      } else {
        score += 10;
        checks.push({ name: "Purge automatique", status: "partial", note: "Dernière purge > 7 jours" });
      }
    } else {
      checks.push({ name: "Purge automatique", status: "partial", note: "Jamais exécutée" });
      score += 5;
    }

    return { score, checks };
  };

  const { score, checks } = calculateComplianceScore();

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      // For now, just open a new window with all the data
      // In a real implementation, you'd generate a PDF server-side
      window.open('/admin/rgpd/registry', '_blank');
    } finally {
      setExportingPdf(false);
    }
  };

  const getPrivacyPolicyUpdate = () => {
    const policy = configData?.find(c => c.key === 'privacy_policy_content');
    return policy?.updated_at ? format(new Date(policy.updated_at), "d MMM yyyy", { locale: fr }) : "—";
  };

  const getCGUUpdate = () => {
    const cgu = configData?.find(c => c.key === 'cgu_content');
    return cgu?.updated_at ? format(new Date(cgu.updated_at), "d MMM yyyy", { locale: fr }) : "—";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Scale className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Conformité RGPD</h1>
              <p className="text-muted-foreground">Centre de conformité et documentation</p>
            </div>
          </div>
          <Button onClick={handleExportPDF} disabled={exportingPdf}>
            {exportingPdf ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exporter PDF CNIL
          </Button>
        </div>

        {/* Score Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Score de conformité</p>
                <p className="text-4xl font-bold text-primary">{score}%</p>
              </div>
              <div className="w-24 h-24 relative">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${score * 2.51} 251`}
                    className="text-primary"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {score >= 80 ? (
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  ) : score >= 50 ? (
                    <Clock className="w-8 h-8 text-warning" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                  )}
                </div>
              </div>
            </div>
            <Progress value={score} className="h-2" />
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/admin/rgpd/registry">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Database className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{registryData || 0}</p>
                    <p className="text-xs text-muted-foreground">Traitements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/rgpd/requests">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <Users className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingRequests?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Demandes en attente</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/rgpd/incidents">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{openIncidents?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Incidents ouverts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/rgpd/subprocessors">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <Building2 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{subprocessorsData || 0}</p>
                    <p className="text-xs text-muted-foreground">Sous-traitants</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Checklist de conformité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checks.map((check, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {check.status === "ok" ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : check.status === "partial" ? (
                      <Clock className="w-5 h-5 text-warning" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    )}
                    <span>{check.name}</span>
                  </div>
                  {check.note ? (
                    <Badge variant={check.status === "error" ? "destructive" : "secondary"}>
                      {check.note}
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-success">OK</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documents légaux
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Politique de confidentialité</span>
                <span className="text-muted-foreground">{getPrivacyPolicyUpdate()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>CGU</span>
                <span className="text-muted-foreground">{getCGUUpdate()}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link to="/admin/privacy">Modifier</Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link to="/admin/cgu">CGU</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Purge automatique
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastPurge ? (
                <div className="space-y-2">
                  <p className="text-sm">
                    Dernière purge : <span className="font-medium">{format(new Date(lastPurge.executed_at), "d MMM yyyy HH:mm", { locale: fr })}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lastPurge.records_deleted} supprimés, {lastPurge.records_anonymized} anonymisés
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune purge effectuée</p>
              )}
              <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                <Link to="/admin/config">Configurer</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                Consentements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Historique des consentements utilisateurs
              </p>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/admin/rgpd/consents">Voir l'historique</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* External Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Ressources CNIL
            </CardTitle>
            <CardDescription>Documentation et outils officiels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              <a 
                href="https://www.cnil.fr/fr/notifier-une-violation-de-donnees" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm">Notifier une violation</span>
                <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
              </a>
              <a 
                href="https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <Database className="w-4 h-4 text-primary" />
                <span className="text-sm">Guide du registre</span>
                <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
              </a>
              <a 
                href="https://www.cnil.fr/fr/outil-pia-telechargez-et-installez-le-logiciel-de-la-cnil" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <Shield className="w-4 h-4 text-warning" />
                <span className="text-sm">Outil PIA (DPIA)</span>
                <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
              </a>
              <a 
                href="https://www.cnil.fr/fr/les-droits-pour-maitriser-vos-donnees-personnelles" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <Users className="w-4 h-4 text-success" />
                <span className="text-sm">Droits des personnes</span>
                <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default RGPD;