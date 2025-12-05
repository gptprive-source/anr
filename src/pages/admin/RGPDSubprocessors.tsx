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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Edit, ExternalLink, Globe, Shield, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Subprocessor {
  id: string;
  name: string;
  service_description: string;
  location: string;
  is_eu: boolean;
  dpa_url: string | null;
  dpa_signed_date: string | null;
  transfer_safeguards: string | null;
  data_processed: string[] | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

const RGPDSubprocessors = () => {
  const [editingEntry, setEditingEntry] = useState<Subprocessor | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subprocessors, isLoading } = useQuery({
    queryKey: ['rgpd_subprocessors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rgpd_subprocessors')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as Subprocessor[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (entry: Partial<Subprocessor>) => {
      if (entry.id) {
        const { error } = await supabase
          .from('rgpd_subprocessors')
          .update(entry)
          .eq('id', entry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('rgpd_subprocessors')
          .insert([entry as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rgpd_subprocessors'] });
      setIsDialogOpen(false);
      setEditingEntry(null);
      toast({ title: "Sous-traitant enregistré" });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  return (
    <AdminLayout>
      <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Sous-traitants (DPA)</h1>
              <p className="text-muted-foreground">Data Processing Agreements</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingEntry(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEntry ? "Modifier le sous-traitant" : "Nouveau sous-traitant"}
                </DialogTitle>
              </DialogHeader>
              <SubprocessorForm 
                entry={editingEntry} 
                onSave={(data) => saveMutation.mutate(data)}
                isLoading={saveMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4">
            {subprocessors?.map((sub) => (
              <Card key={sub.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${sub.is_eu ? 'bg-success/10' : 'bg-warning/10'}`}>
                        {sub.is_eu ? (
                          <Shield className="w-6 h-6 text-success" />
                        ) : (
                          <Globe className="w-6 h-6 text-warning" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{sub.name}</h3>
                        <p className="text-sm text-muted-foreground">{sub.service_description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={sub.is_eu ? "default" : "secondary"}>
                            {sub.location}
                          </Badge>
                          {sub.dpa_url && (
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              DPA
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {sub.dpa_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={sub.dpa_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Voir DPA
                          </a>
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setEditingEntry(sub);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {(sub.data_processed?.length || sub.transfer_safeguards) && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {sub.data_processed?.length ? (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Données traitées</p>
                          <div className="flex flex-wrap gap-1">
                            {sub.data_processed.map((d, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {sub.transfer_safeguards && !sub.is_eu && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Garanties de transfert</p>
                          <p className="text-sm">{sub.transfer_safeguards}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const SubprocessorForm = ({ 
  entry, 
  onSave, 
  isLoading 
}: { 
  entry: Subprocessor | null; 
  onSave: (data: Partial<Subprocessor>) => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState({
    name: entry?.name || "",
    service_description: entry?.service_description || "",
    location: entry?.location || "",
    is_eu: entry?.is_eu || false,
    dpa_url: entry?.dpa_url || "",
    transfer_safeguards: entry?.transfer_safeguards || "",
    data_processed: entry?.data_processed?.join(", ") || "",
    notes: entry?.notes || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(entry?.id ? { id: entry.id } : {}),
      name: formData.name,
      service_description: formData.service_description,
      location: formData.location,
      is_eu: formData.is_eu,
      dpa_url: formData.dpa_url || null,
      transfer_safeguards: formData.transfer_safeguards || null,
      data_processed: formData.data_processed.split(",").map(s => s.trim()).filter(Boolean),
      notes: formData.notes || null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nom du sous-traitant *</Label>
        <Input 
          value={formData.name} 
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Description du service *</Label>
        <Textarea 
          value={formData.service_description} 
          onChange={e => setFormData(prev => ({ ...prev, service_description: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Localisation *</Label>
        <Input 
          value={formData.location} 
          onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
          placeholder="USA, France, Allemagne..."
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <input 
          type="checkbox"
          id="is_eu"
          checked={formData.is_eu}
          onChange={e => setFormData(prev => ({ ...prev, is_eu: e.target.checked }))}
          className="rounded"
        />
        <Label htmlFor="is_eu">Hébergé dans l'Union Européenne</Label>
      </div>

      <div className="space-y-2">
        <Label>URL du DPA</Label>
        <Input 
          value={formData.dpa_url} 
          onChange={e => setFormData(prev => ({ ...prev, dpa_url: e.target.value }))}
          placeholder="https://..."
          type="url"
        />
      </div>

      {!formData.is_eu && (
        <div className="space-y-2">
          <Label>Garanties de transfert hors UE</Label>
          <Input 
            value={formData.transfer_safeguards} 
            onChange={e => setFormData(prev => ({ ...prev, transfer_safeguards: e.target.value }))}
            placeholder="Standard Contractual Clauses (SCCs)"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Données traitées (séparées par des virgules)</Label>
        <Input 
          value={formData.data_processed} 
          onChange={e => setFormData(prev => ({ ...prev, data_processed: e.target.value }))}
          placeholder="profils, emails, logs"
        />
      </div>

      <div className="space-y-2">
        <Label>Notes internes</Label>
        <Textarea 
          value={formData.notes} 
          onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Enregistrer
      </Button>
    </form>
  );
};

export default RGPDSubprocessors;