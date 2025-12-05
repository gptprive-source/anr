import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Clock, CheckCircle2, AlertTriangle, Eye, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface RightsRequest {
  id: string;
  user_id: string | null;
  user_email: string;
  request_type: string;
  status: string;
  request_details: string | null;
  response_details: string | null;
  handled_by: string | null;
  requested_at: string;
  completed_at: string | null;
  deadline_at: string;
}

const requestTypeLabels: Record<string, string> = {
  access: "Accès aux données",
  rectification: "Rectification",
  deletion: "Suppression",
  portability: "Portabilité",
  opposition: "Opposition"
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  in_progress: { label: "En cours", variant: "default" },
  completed: { label: "Traité", variant: "outline" },
  rejected: { label: "Rejeté", variant: "destructive" }
};

const RGPDRequests = () => {
  const [selectedRequest, setSelectedRequest] = useState<RightsRequest | null>(null);
  const [responseText, setResponseText] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['rgpd_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rgpd_rights_requests')
        .select('*')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return data as RightsRequest[];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, response }: { id: string; status: string; response: string }) => {
      const updateData: any = {
        status,
        response_details: response,
        handled_by: user?.id
      };
      if (status === 'completed' || status === 'rejected') {
        updateData.completed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('rgpd_rights_requests')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rgpd_requests'] });
      setSelectedRequest(null);
      setResponseText("");
      toast({ title: "Demande mise à jour" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const handleExport = () => {
    if (!requests) return;
    
    const csvContent = [
      ["Date", "Email", "Type", "Statut", "Délai", "Détails", "Réponse"].join(";"),
      ...requests.map(r => [
        format(new Date(r.requested_at), "dd/MM/yyyy"),
        r.user_email,
        requestTypeLabels[r.request_type],
        statusLabels[r.status]?.label || r.status,
        format(new Date(r.deadline_at), "dd/MM/yyyy"),
        r.request_details || "",
        r.response_details || ""
      ].map(v => `"${v}"`).join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demandes-droits-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const pendingCount = requests?.filter(r => r.status === 'pending').length || 0;
  const inProgressCount = requests?.filter(r => r.status === 'in_progress').length || 0;
  const overdueCount = requests?.filter(r => 
    ['pending', 'in_progress'].includes(r.status) && new Date(r.deadline_at) < new Date()
  ).length || 0;

  const getDeadlineInfo = (deadline: string, status: string) => {
    if (status === 'completed' || status === 'rejected') return null;
    const days = differenceInDays(new Date(deadline), new Date());
    if (days < 0) return { text: `${Math.abs(days)}j de retard`, isOverdue: true };
    if (days === 0) return { text: "Aujourd'hui", isOverdue: true };
    if (days <= 7) return { text: `${days}j restants`, isOverdue: false };
    return { text: `${days}j`, isOverdue: false };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Demandes d'exercice de droits</h1>
              <p className="text-muted-foreground">Délai légal : 30 jours</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{inProgressCount}</p>
                  <p className="text-xs text-muted-foreground">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={overdueCount > 0 ? "border-destructive" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-5 h-5 ${overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-2xl font-bold">{overdueCount}</p>
                  <p className="text-xs text-muted-foreground">En retard</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des demandes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : requests?.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Aucune demande enregistrée</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Délai</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests?.map((request) => {
                    const deadlineInfo = getDeadlineInfo(request.deadline_at, request.status);
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="text-sm">
                          {format(new Date(request.requested_at), "dd/MM/yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="font-medium">{request.user_email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {requestTypeLabels[request.request_type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusLabels[request.status]?.variant || "secondary"}>
                            {statusLabels[request.status]?.label || request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {deadlineInfo && (
                            <span className={deadlineInfo.isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                              {deadlineInfo.text}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setSelectedRequest(request);
                              setNewStatus(request.status);
                              setResponseText(request.response_details || "");
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Détails de la demande</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedRequest.user_email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium">{requestTypeLabels[selectedRequest.request_type]}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date de demande</p>
                    <p className="font-medium">
                      {format(new Date(selectedRequest.requested_at), "dd MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date limite</p>
                    <p className="font-medium">
                      {format(new Date(selectedRequest.deadline_at), "dd MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>

                {selectedRequest.request_details && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Détails de la demande</p>
                    <p className="text-sm p-3 bg-muted rounded-lg">{selectedRequest.request_details}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="in_progress">En cours</SelectItem>
                      <SelectItem value="completed">Traité</SelectItem>
                      <SelectItem value="rejected">Rejeté</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Réponse / Notes</p>
                  <Textarea 
                    value={responseText}
                    onChange={e => setResponseText(e.target.value)}
                    placeholder="Détails de la réponse apportée..."
                    rows={4}
                  />
                </div>

                <Button 
                  className="w-full"
                  onClick={() => updateMutation.mutate({
                    id: selectedRequest.id,
                    status: newStatus,
                    response: responseText
                  })}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Mettre à jour
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default RGPDRequests;