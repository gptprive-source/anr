import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Plus, Edit, Trash2, Download, Globe, Shield, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RegistryEntry {
  id: string;
  name: string;
  purpose: string;
  legal_basis: string;
  data_categories: string[];
  retention_period: string;
  recipients: string[];
  third_country_transfer: boolean;
  transfer_safeguards: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const legalBasisLabels: Record<string, string> = {
  contract: "Contrat",
  consent: "Consentement",
  legitimate_interest: "Intérêt légitime",
  legal_obligation: "Obligation légale"
};

const RGPDRegistry = () => {
  const [editingEntry, setEditingEntry] = useState<RegistryEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: entries, isLoading } = useQuery({
    queryKey: ['rgpd_registry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rgpd_data_processing_registry')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as RegistryEntry[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (entry: Partial<RegistryEntry>) => {
      if (entry.id) {
        const { error } = await supabase
          .from('rgpd_data_processing_registry')
          .update(entry)
          .eq('id', entry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('rgpd_data_processing_registry')
          .insert([entry as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rgpd_registry'] });
      setIsDialogOpen(false);
      setEditingEntry(null);
      toast({ title: "Traitement enregistré" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rgpd_data_processing_registry')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rgpd_registry'] });
      toast({ title: "Traitement désactivé" });
    }
  });

  const handleExport = () => {
    if (!entries) return;
    
    const csvContent = [
      ["Nom", "Finalité", "Base légale", "Catégories de données", "Durée de conservation", "Destinataires", "Transfert hors UE", "Garanties"].join(";"),
      ...entries.filter(e => e.is_active).map(e => [
        e.name,
        e.purpose,
        legalBasisLabels[e.legal_basis],
        e.data_categories.join(", "),
        e.retention_period,
        e.recipients.join(", "),
        e.third_country_transfer ? "Oui" : "Non",
        e.transfer_safeguards || ""
      ].map(v => `"${v}"`).join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registre-traitements-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const activeEntries = entries?.filter(e => e.is_active) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Database className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Registre des traitements</h1>
              <p className="text-muted-foreground">Article 30 du RGPD</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingEntry(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingEntry ? "Modifier le traitement" : "Nouveau traitement"}
                  </DialogTitle>
                </DialogHeader>
                <RegistryForm 
                  entry={editingEntry} 
                  onSave={(data) => saveMutation.mutate(data)}
                  isLoading={saveMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {activeEntries.length} traitement(s) documenté(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Traitement</TableHead>
                      <TableHead>Base légale</TableHead>
                      <TableHead>Données</TableHead>
                      <TableHead>Conservation</TableHead>
                      <TableHead>Transfert UE</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{entry.purpose}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {legalBasisLabels[entry.legal_basis]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {entry.data_categories.slice(0, 2).map((cat, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                            {entry.data_categories.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{entry.data_categories.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{entry.retention_period}</TableCell>
                        <TableCell>
                          {entry.third_country_transfer ? (
                            <div className="flex items-center gap-1">
                              <Globe className="w-4 h-4 text-warning" />
                              <span className="text-xs">SCCs</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Shield className="w-4 h-4 text-success" />
                              <span className="text-xs">UE</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setEditingEntry(entry);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => deleteMutation.mutate(entry.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

const RegistryForm = ({ 
  entry, 
  onSave, 
  isLoading 
}: { 
  entry: RegistryEntry | null; 
  onSave: (data: Partial<RegistryEntry>) => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState({
    name: entry?.name || "",
    purpose: entry?.purpose || "",
    legal_basis: entry?.legal_basis || "contract",
    data_categories: entry?.data_categories?.join(", ") || "",
    retention_period: entry?.retention_period || "",
    recipients: entry?.recipients?.join(", ") || "",
    third_country_transfer: entry?.third_country_transfer || false,
    transfer_safeguards: entry?.transfer_safeguards || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(entry?.id ? { id: entry.id } : {}),
      name: formData.name,
      purpose: formData.purpose,
      legal_basis: formData.legal_basis,
      data_categories: formData.data_categories.split(",").map(s => s.trim()).filter(Boolean),
      retention_period: formData.retention_period,
      recipients: formData.recipients.split(",").map(s => s.trim()).filter(Boolean),
      third_country_transfer: formData.third_country_transfer,
      transfer_safeguards: formData.transfer_safeguards || null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nom du traitement *</Label>
        <Input 
          value={formData.name} 
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Finalité *</Label>
        <Textarea 
          value={formData.purpose} 
          onChange={e => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Base légale *</Label>
        <Select 
          value={formData.legal_basis} 
          onValueChange={v => setFormData(prev => ({ ...prev, legal_basis: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contract">Exécution d'un contrat</SelectItem>
            <SelectItem value="consent">Consentement</SelectItem>
            <SelectItem value="legitimate_interest">Intérêt légitime</SelectItem>
            <SelectItem value="legal_obligation">Obligation légale</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Catégories de données * (séparées par des virgules)</Label>
        <Input 
          value={formData.data_categories} 
          onChange={e => setFormData(prev => ({ ...prev, data_categories: e.target.value }))}
          placeholder="email, nom, prénom, adresse"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Durée de conservation *</Label>
        <Input 
          value={formData.retention_period} 
          onChange={e => setFormData(prev => ({ ...prev, retention_period: e.target.value }))}
          placeholder="Ex: 3 ans après fin du contrat"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Destinataires * (séparés par des virgules)</Label>
        <Input 
          value={formData.recipients} 
          onChange={e => setFormData(prev => ({ ...prev, recipients: e.target.value }))}
          placeholder="Supabase, Stripe"
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <input 
          type="checkbox"
          id="transfer"
          checked={formData.third_country_transfer}
          onChange={e => setFormData(prev => ({ ...prev, third_country_transfer: e.target.checked }))}
          className="rounded"
        />
        <Label htmlFor="transfer">Transfert hors Union Européenne</Label>
      </div>

      {formData.third_country_transfer && (
        <div className="space-y-2">
          <Label>Garanties de transfert</Label>
          <Input 
            value={formData.transfer_safeguards} 
            onChange={e => setFormData(prev => ({ ...prev, transfer_safeguards: e.target.value }))}
            placeholder="Standard Contractual Clauses (SCCs)"
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Enregistrer
      </Button>
    </form>
  );
};

export default RGPDRegistry;