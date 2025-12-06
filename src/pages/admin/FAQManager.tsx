import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface FAQItem {
  id: string;
  section: string;
  section_icon: string | null;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

const sections = [
  { value: "L'APPLICATION ANR", icon: "Smartphone" },
  { value: "ABONNEMENT & PAIEMENT", icon: "CreditCard" },
  { value: "RÉSIDENTS & INVITÉS", icon: "Users" },
  { value: "DÉMÉNAGEMENT", icon: "Home" },
  { value: "SÉCURITÉ", icon: "Shield" },
];

const FAQManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();
  const [newItem, setNewItem] = useState<Partial<FAQItem>>({
    section: sections[0].value,
    section_icon: sections[0].icon,
    question: '',
    answer: '',
    is_active: true,
    sort_order: 0,
  });

  const { data: faqItems, isLoading } = useQuery({
    queryKey: ['admin_faq_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faq_items')
        .select('*')
        .order('section')
        .order('sort_order');
      
      if (error) throw error;
      return data as FAQItem[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (item: Partial<FAQItem>) => {
      const { error } = await supabase.from('faq_items').insert({
        section: item.section!,
        section_icon: item.section_icon,
        question: item.question!,
        answer: item.answer!,
        sort_order: item.sort_order,
        is_active: item.is_active,
        created_by: user?.id,
        updated_by: user?.id,
      });
      if (error) throw error;

      // Log audit
      if (user?.id) {
        await supabase.from('admin_audit_logs').insert({
          user_id: user.id,
          action: 'faq_create',
          entity_type: 'faq',
          new_value: item as any,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_faq_items'] });
      toast.success('Question ajoutée');
      setIsDialogOpen(false);
      setNewItem({
        section: sections[0].value,
        section_icon: sections[0].icon,
        question: '',
        answer: '',
        is_active: true,
        sort_order: 0,
      });
    },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  });

  const updateMutation = useMutation({
    mutationFn: async (item: FAQItem) => {
      const { error } = await supabase
        .from('faq_items')
        .update({
          section: item.section,
          section_icon: item.section_icon,
          question: item.question,
          answer: item.answer,
          sort_order: item.sort_order,
          is_active: item.is_active,
          updated_by: user?.id,
        })
        .eq('id', item.id);
      
      if (error) throw error;

      // Log audit
      if (user?.id) {
        await supabase.from('admin_audit_logs').insert({
          user_id: user.id,
          action: 'faq_update',
          entity_type: 'faq',
          entity_id: item.id,
          new_value: item as any,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_faq_items'] });
      toast.success('Question mise à jour');
      setEditingItem(null);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faq_items').delete().eq('id', id);
      if (error) throw error;

      // Log audit
      await supabase.from('admin_audit_logs').insert({
        user_id: user?.id,
        action: 'faq_delete',
        entity_type: 'faq',
        entity_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_faq_items'] });
      toast.success('Question supprimée');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('faq_items')
        .update({ is_active, updated_by: user?.id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_faq_items'] });
    },
  });

  const groupedFAQ = faqItems?.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, FAQItem[]>);

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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Gestion FAQ</h1>
              <p className="text-muted-foreground">Ajoutez et modifiez les questions fréquentes</p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nouvelle question</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select
                    value={newItem.section}
                    onValueChange={(value) => {
                      const section = sections.find(s => s.value === value);
                      setNewItem({ ...newItem, section: value, section_icon: section?.icon });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Input
                    value={newItem.question}
                    onChange={(e) => setNewItem({ ...newItem, question: e.target.value })}
                    placeholder="Votre question..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Réponse</Label>
                  <Textarea
                    value={newItem.answer}
                    onChange={(e) => setNewItem({ ...newItem, answer: e.target.value })}
                    placeholder="La réponse..."
                    rows={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ordre d'affichage</Label>
                  <Input
                    type="number"
                    value={newItem.sort_order}
                    onChange={(e) => setNewItem({ ...newItem, sort_order: Number(e.target.value) })}
                    className="w-32"
                  />
                </div>
                <Button 
                  onClick={() => createMutation.mutate(newItem)}
                  disabled={!newItem.question || !newItem.answer || createMutation.isPending}
                  className="w-full"
                >
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Variables dynamiques info card */}
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
              💡 Variables dynamiques
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 dark:text-blue-300">
            <p className="mb-2">Utilisez ces variables dans vos questions/réponses. Elles seront remplacées automatiquement par les valeurs de configuration :</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-xs">
              <div><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{"{{max_distance_meters}}"}</code> → Distance max (mètres)</div>
              <div><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{"{{max_call_duration_minutes}}"}</code> → Durée max appel (minutes)</div>
              <div><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{"{{max_residents_per_habitation}}"}</code> → Résidents max par habitation</div>
              <div><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{"{{subscription_price}}"}</code> → Prix abonnement (€)</div>
              <div><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{"{{doming_price}}"}</code> → Prix Doming (€)</div>
              <div><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{"{{invitation_validity_hours}}"}</code> → Validité invitation (heures)</div>
              <div><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">{"{{support_email}}"}</code> → Email support</div>
            </div>
          </CardContent>
        </Card>

        {Object.entries(groupedFAQ || {}).map(([section, items]) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle>{section}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div 
                  key={item.id}
                  className={`p-4 border rounded-lg space-y-3 ${!item.is_active ? 'opacity-50 bg-muted' : ''}`}
                >
                  {editingItem?.id === item.id ? (
                    <div className="space-y-4">
                      <Input
                        value={editingItem.question}
                        onChange={(e) => setEditingItem({ ...editingItem, question: e.target.value })}
                      />
                      <Textarea
                        value={editingItem.answer}
                        onChange={(e) => setEditingItem({ ...editingItem, answer: e.target.value })}
                        rows={4}
                      />
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          value={editingItem.sort_order}
                          onChange={(e) => setEditingItem({ ...editingItem, sort_order: Number(e.target.value) })}
                          className="w-24"
                        />
                        <Button size="sm" onClick={() => updateMutation.mutate(editingItem)}>
                          Enregistrer
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <GripVertical className="w-5 h-5 text-muted-foreground mt-0.5 cursor-grab" />
                          <div>
                            <h4 className="font-medium">{item.question}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{item.answer}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => toggleActiveMutation.mutate({ id: item.id, is_active: !item.is_active })}
                          >
                            {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingItem(item)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm('Supprimer cette question ?')) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Ordre: {item.sort_order}</span>
                        <span>{item.is_active ? 'Visible' : 'Masqué'}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
};

export default FAQManager;
