import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Plus, CheckCircle2, Clock, ExternalLink, Loader2, Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";

interface Incident {
  id: string;
  incident_date: string;
  discovered_date: string;
  description: string;
  data_affected: string[] | null;
  users_affected_count: number | null;
  severity: string;
  cnil_notified: boolean;
  cnil_notification_date: string | null;
  users_notified: boolean;
  users_notification_date: string | null;
  containment_actions: string | null;
  remediation_actions: string | null;
  lessons_learned: string | null;
  status: string;
  reported_by: string | null;
  created_at: string;
}

const severityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Faible", color: "bg-blue-500" },
  medium: { label: "Moyen", color: "bg-warning" },
  high: { label: "Élevé", color: "bg-orange-500" },
  critical: { label: "Critique", color: "bg-destructive" }
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Ouvert", variant: "destructive" },
  contained: { label: "Contenu", variant: "secondary" },
  resolved: { label: "Résolu", variant: "default" },
  closed: { label: "Clôturé", variant: "outline" }
};

const RGPDIncidents = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['rgpd_incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rgpd_incidents')
        .select('*')
        .order('incident_date', { ascending: false });
      if (error) throw error;
      return data as Incident[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Incident>) => {
      const { error } = await supabase
        .from('rgpd_incidents')
        .insert([{ ...data, reported_by: user?.id } as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rgpd_incidents'] });
      setIsDialogOpen(false);
      toast({ title: "Incident enregistré" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Incident> & { id: string }) => {
      const { error } = await supabase
        .from('rgpd_incidents')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rgpd_incidents'] });
      setSelectedIncident(null);
      toast({ title: "Incident mis à jour" });
    }
  });

  const openIncidents = incidents?.filter(i => ['open', 'contained'].includes(i.status)) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div>
              <h1 className="text-2xl font-bold">Gestion des incidents</h1>
              <p className="text-muted-foreground">Violations de données personnelles</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Plus className="w-4 h-4 mr-2" />
                Déclarer un incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Déclarer un nouvel incident</DialogTitle>
              </DialogHeader>
              <IncidentForm onSave={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Checklist Card */}
        <Card className="border-warning bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <Clock className="w-5 h-5" />
              Procédure en cas d'incident
            </CardTitle>
            <CardDescription>Checklist obligatoire RGPD</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">⏱️ Dans les 24 premières heures</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    Identifier la nature et l'étendue de l'incident
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    Contenir l'incident (bloquer les accès)
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    Documenter toutes les actions prises
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-sm">⏱️ Sous 72 heures (OBLIGATION LÉGALE)</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive" />
                    Notifier la CNIL si risque pour les personnes
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive" />
                    Évaluer le risque pour les personnes concernées
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-warning" />
                    Si risque élevé : notifier les personnes concernées
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <a 
                href="https://www.cnil.fr/fr/notifier-une-violation-de-donnees" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Notifier la CNIL (formulaire officiel)
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Status Cards */}
        {openIncidents.length > 0 && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">
                {openIncidents.length} incident(s) en cours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {openIncidents.map(incident => {
                const hoursSinceDiscovery = differenceInHours(new Date(), new Date(incident.discovered_date));
                const isOverdue = hoursSinceDiscovery > 72 && !incident.cnil_notified;
                return (
                  <div 
                    key={incident.id} 
                    className={`p-4 rounded-lg border cursor-pointer hover:bg-muted/50 ${isOverdue ? 'border-destructive bg-destructive/5' : ''}`}
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{incident.description.substring(0, 100)}...</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Découvert le {format(new Date(incident.discovered_date), "d MMM yyyy HH:mm", { locale: fr })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${severityConfig[incident.severity]?.color}`} />
                        <Badge variant={statusConfig[incident.status]?.variant}>
                          {statusConfig[incident.status]?.label}
                        </Badge>
                      </div>
                    </div>
                    {isOverdue && (
                      <p className="text-xs text-destructive mt-2 font-medium">
                        ⚠️ Délai de 72h dépassé - Notification CNIL obligatoire !
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* All Incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Historique des incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : incidents?.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                <p className="text-muted-foreground">Aucun incident déclaré - Excellent !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incidents?.filter(i => !['open', 'contained'].includes(i.status)).map(incident => (
                  <div 
                    key={incident.id} 
                    className="p-4 rounded-lg border cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{incident.description.substring(0, 100)}...</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(incident.incident_date), "d MMM yyyy", { locale: fr })}
                          {incident.users_affected_count && ` • ${incident.users_affected_count} utilisateur(s) affecté(s)`}
                        </p>
                      </div>
                      <Badge variant={statusConfig[incident.status]?.variant}>
                        {statusConfig[incident.status]?.label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails de l'incident</DialogTitle>
            </DialogHeader>
            {selectedIncident && (
              <IncidentDetail 
                incident={selectedIncident} 
                onUpdate={(data) => updateMutation.mutate({ id: selectedIncident.id, ...data })}
                isLoading={updateMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

const IncidentForm = ({ onSave, isLoading }: { onSave: (data: Partial<Incident>) => void; isLoading: boolean }) => {
  const [formData, setFormData] = useState({
    incident_date: "",
    discovered_date: "",
    description: "",
    data_affected: "",
    users_affected_count: "",
    severity: "medium",
    containment_actions: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      incident_date: formData.incident_date,
      discovered_date: formData.discovered_date,
      description: formData.description,
      data_affected: formData.data_affected.split(",").map(s => s.trim()).filter(Boolean),
      users_affected_count: formData.users_affected_count ? parseInt(formData.users_affected_count) : null,
      severity: formData.severity,
      containment_actions: formData.containment_actions || null,
      status: 'open'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date de l'incident *</Label>
          <Input 
            type="datetime-local" 
            value={formData.incident_date}
            onChange={e => setFormData(prev => ({ ...prev, incident_date: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Date de découverte *</Label>
          <Input 
            type="datetime-local" 
            value={formData.discovered_date}
            onChange={e => setFormData(prev => ({ ...prev, discovered_date: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description de l'incident *</Label>
        <Textarea 
          value={formData.description}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Décrivez ce qui s'est passé..."
          rows={4}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Sévérité *</Label>
          <Select value={formData.severity} onValueChange={v => setFormData(prev => ({ ...prev, severity: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Faible</SelectItem>
              <SelectItem value="medium">Moyen</SelectItem>
              <SelectItem value="high">Élevé</SelectItem>
              <SelectItem value="critical">Critique</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Nombre d'utilisateurs affectés</Label>
          <Input 
            type="number"
            value={formData.users_affected_count}
            onChange={e => setFormData(prev => ({ ...prev, users_affected_count: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Données affectées (séparées par des virgules)</Label>
        <Input 
          value={formData.data_affected}
          onChange={e => setFormData(prev => ({ ...prev, data_affected: e.target.value }))}
          placeholder="emails, mots de passe, adresses..."
        />
      </div>

      <div className="space-y-2">
        <Label>Actions de confinement prises</Label>
        <Textarea 
          value={formData.containment_actions}
          onChange={e => setFormData(prev => ({ ...prev, containment_actions: e.target.value }))}
          placeholder="Quelles mesures avez-vous prises pour contenir l'incident ?"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Enregistrer l'incident
      </Button>
    </form>
  );
};

const IncidentDetail = ({ 
  incident, 
  onUpdate, 
  isLoading 
}: { 
  incident: Incident; 
  onUpdate: (data: Partial<Incident>) => void;
  isLoading: boolean;
}) => {
  const [status, setStatus] = useState(incident.status);
  const [cnilNotified, setCnilNotified] = useState(incident.cnil_notified);
  const [usersNotified, setUsersNotified] = useState(incident.users_notified);
  const [remediation, setRemediation] = useState(incident.remediation_actions || "");
  const [lessons, setLessons] = useState(incident.lessons_learned || "");

  const handleSave = () => {
    onUpdate({
      status,
      cnil_notified: cnilNotified,
      cnil_notification_date: cnilNotified && !incident.cnil_notified ? new Date().toISOString() : incident.cnil_notification_date,
      users_notified: usersNotified,
      users_notification_date: usersNotified && !incident.users_notified ? new Date().toISOString() : incident.users_notification_date,
      remediation_actions: remediation || null,
      lessons_learned: lessons || null
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Date de l'incident</p>
          <p className="font-medium">{format(new Date(incident.incident_date), "d MMM yyyy HH:mm", { locale: fr })}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Date de découverte</p>
          <p className="font-medium">{format(new Date(incident.discovered_date), "d MMM yyyy HH:mm", { locale: fr })}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Sévérité</p>
          <Badge className={severityConfig[incident.severity]?.color}>
            {severityConfig[incident.severity]?.label}
          </Badge>
        </div>
        <div>
          <p className="text-muted-foreground">Utilisateurs affectés</p>
          <p className="font-medium">{incident.users_affected_count || "Non spécifié"}</p>
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-1">Description</p>
        <p className="text-sm p-3 bg-muted rounded-lg">{incident.description}</p>
      </div>

      {incident.data_affected?.length ? (
        <div>
          <p className="text-sm text-muted-foreground mb-1">Données affectées</p>
          <div className="flex flex-wrap gap-1">
            {incident.data_affected.map((d, i) => (
              <Badge key={i} variant="outline">{d}</Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Statut</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Ouvert</SelectItem>
            <SelectItem value="contained">Contenu</SelectItem>
            <SelectItem value="resolved">Résolu</SelectItem>
            <SelectItem value="closed">Clôturé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center gap-2">
          <Checkbox 
            id="cnil"
            checked={cnilNotified}
            onCheckedChange={(checked) => setCnilNotified(!!checked)}
          />
          <Label htmlFor="cnil" className="cursor-pointer">CNIL notifiée</Label>
          {incident.cnil_notification_date && (
            <span className="text-xs text-muted-foreground">
              ({format(new Date(incident.cnil_notification_date), "d MMM yyyy")})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox 
            id="users"
            checked={usersNotified}
            onCheckedChange={(checked) => setUsersNotified(!!checked)}
          />
          <Label htmlFor="users" className="cursor-pointer">Utilisateurs notifiés</Label>
          {incident.users_notification_date && (
            <span className="text-xs text-muted-foreground">
              ({format(new Date(incident.users_notification_date), "d MMM yyyy")})
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Actions de remédiation</Label>
        <Textarea 
          value={remediation}
          onChange={e => setRemediation(e.target.value)}
          placeholder="Mesures prises pour corriger le problème..."
        />
      </div>

      <div className="space-y-2">
        <Label>Leçons apprises</Label>
        <Textarea 
          value={lessons}
          onChange={e => setLessons(e.target.value)}
          placeholder="Que peut-on améliorer pour éviter ce type d'incident ?"
        />
      </div>

      <Button className="w-full" onClick={handleSave} disabled={isLoading}>
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Mettre à jour
      </Button>
    </div>
  );
};

export default RGPDIncidents;