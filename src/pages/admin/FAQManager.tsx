import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, ArrowLeft, FolderPlus, ChevronUp, ChevronDown, Settings2 } from "lucide-react";
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

interface FAQSection {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

const ICONS = [
  "Smartphone", "CreditCard", "Users", "Home", "Shield", "HelpCircle", 
  "Settings", "Bell", "Mail", "Phone", "MapPin", "Calendar", "Clock",
  "FileText", "Lock", "Key", "Star", "Heart", "Bookmark", "Tag"
];

const FAQManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<FAQSection | null>(null);
  const navigate = useNavigate();

  // Fetch sections
  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['admin_faq_sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faq_sections')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as FAQSection[];
    },
  });

  const [newItem, setNewItem] = useState<Partial<FAQItem>>({
    section: '',
    section_icon: '',
    question: '',
    answer: '',
    is_active: true,
    sort_order: 0,
  });

  const [newSection, setNewSection] = useState({
    name: '',
    icon: 'HelpCircle',
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

  // Section mutations
  const createSectionMutation = useMutation({
    mutationFn: async (section: typeof newSection) => {
      const maxOrder = sections?.reduce((max, s) => Math.max(max, s.sort_order), 0) || 0;
      const { error } = await supabase.from('faq_sections').insert({
        name: section.name,
        icon: section.icon,
        sort_order: maxOrder + 1,
        created_by: user?.id,
        updated_by: user?.id,
      });
      if (error) throw error;

      if (user?.id) {
        await supabase.from('admin_audit_logs').insert({
          user_id: user.id,
          action: 'faq_section_create',
          entity_type: 'faq_section',
          new_value: section as any,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_faq_sections'] });
      toast.success('Section ajoutée');
      setIsSectionDialogOpen(false);
      setNewSection({ name: '', icon: 'HelpCircle', sort_order: 0 });
    },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  });

  const updateSectionMutation = useMutation({
    mutationFn: async (section: FAQSection) => {
      // If name changed, update all faq_items with old section name
      const oldSection = sections?.find(s => s.id === section.id);
      if (oldSection && oldSection.name !== section.name) {
        await supabase
          .from('faq_items')
          .update({ section: section.name, section_icon: section.icon })
          .eq('section', oldSection.name);
      }

      const { error } = await supabase
        .from('faq_sections')
        .update({
          name: section.name,
          icon: section.icon,
          sort_order: section.sort_order,
          is_active: section.is_active,
          updated_by: user?.id,
        })
        .eq('id', section.id);
      
      if (error) throw error;

      if (user?.id) {
        await supabase.from('admin_audit_logs').insert({
          user_id: user.id,
          action: 'faq_section_update',
          entity_type: 'faq_section',
          entity_id: section.id,
          new_value: section as any,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_faq_sections'] });
      queryClient.invalidateQueries({ queryKey: ['admin_faq_items'] });
      toast.success('Section mise à jour');
      setEditingSection(null);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faq_sections').delete().eq('id', id);
      if (error) throw error;

      await supabase.from('admin_audit_logs').insert({
        user_id: user?.id,
        action: 'faq_section_delete',
        entity_type: 'faq_section',
        entity_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_faq_sections'] });
      toast.success('Section supprimée');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const moveSectionMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      if (!sections) return;
      
      const currentIndex = sections.findIndex(s => s.id === id);
      if (currentIndex === -1) return;
      
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= sections.length) return;

      const current = sections[currentIndex];
      const target = sections[targetIndex];

      // Swap sort_order values
      await supabase
        .from('faq_sections')
        .update({ sort_order: target.sort_order })
        .eq('id', current.id);

      await supabase
        .from('faq_sections')
        .update({ sort_order: current.sort_order })
        .eq('id', target.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_faq_sections'] });
    },
  });

  // FAQ item mutations
  const createMutation = useMutation({
    mutationFn: async (item: Partial<FAQItem>) => {
      const section = sections?.find(s => s.name === item.section);
      const { error } = await supabase.from('faq_items').insert({
        section: item.section!,
        section_icon: section?.icon || item.section_icon,
        question: item.question!,
        answer: item.answer!,
        sort_order: item.sort_order,
        is_active: item.is_active,
        created_by: user?.id,
        updated_by: user?.id,
      });
      if (error) throw error;

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
        section: sections?.[0]?.name || '',
        section_icon: sections?.[0]?.icon || '',
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
      const section = sections?.find(s => s.name === item.section);
      const { error } = await supabase
        .from('faq_items')
        .update({
          section: item.section,
          section_icon: section?.icon || item.section_icon,
          question: item.question,
          answer: item.answer,
          sort_order: item.sort_order,
          is_active: item.is_active,
          updated_by: user?.id,
        })
        .eq('id', item.id);
      
      if (error) throw error;

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

  // Group FAQ items by section, ordered by section sort_order
  const groupedFAQ = sections?.reduce((acc, section) => {
    const items = faqItems?.filter(item => item.section === section.name) || [];
    if (items.length > 0 || section.is_active) {
      acc[section.name] = { section, items };
    }
    return acc;
  }, {} as Record<string, { section: FAQSection; items: FAQItem[] }>);

  if (isLoading || sectionsLoading) {
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
          
          <div className="flex gap-2">
            <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Nouvelle section
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvelle section</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nom de la section</Label>
                    <Input
                      value={newSection.name}
                      onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                      placeholder="Ex: LIVRAISON"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Icône</Label>
                    <Select
                      value={newSection.icon}
                      onValueChange={(value) => setNewSection({ ...newSection, icon: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ICONS.map(icon => (
                          <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={() => createSectionMutation.mutate(newSection)}
                    disabled={!newSection.name || createSectionMutation.isPending}
                    className="w-full"
                  >
                    Ajouter la section
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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
                        const section = sections?.find(s => s.name === value);
                        setNewItem({ ...newItem, section: value, section_icon: section?.icon });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une section" />
                      </SelectTrigger>
                      <SelectContent>
                        {sections?.map(s => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
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
                    disabled={!newItem.question || !newItem.answer || !newItem.section || createMutation.isPending}
                    className="w-full"
                  >
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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

        {/* Sections management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Ordre des sections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sections?.map((section, index) => (
                <div 
                  key={section.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${!section.is_active ? 'opacity-50 bg-muted' : ''}`}
                >
                  {editingSection?.id === section.id ? (
                    <div className="flex-1 flex items-center gap-3">
                      <Input
                        value={editingSection.name}
                        onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                        className="flex-1"
                      />
                      <Select
                        value={editingSection.icon}
                        onValueChange={(value) => setEditingSection({ ...editingSection, icon: value })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICONS.map(icon => (
                            <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={() => updateSectionMutation.mutate(editingSection)}>
                        Enregistrer
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{section.name}</span>
                        <span className="text-xs text-muted-foreground">({section.icon})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => moveSectionMutation.mutate({ id: section.id, direction: 'up' })}
                          disabled={index === 0}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => moveSectionMutation.mutate({ id: section.id, direction: 'down' })}
                          disabled={index === sections.length - 1}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingSection(section)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            const itemsInSection = faqItems?.filter(i => i.section === section.name).length || 0;
                            if (itemsInSection > 0) {
                              toast.error(`Impossible de supprimer : ${itemsInSection} question(s) dans cette section`);
                              return;
                            }
                            if (confirm('Supprimer cette section ?')) {
                              deleteSectionMutation.mutate(section.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FAQ items by section */}
        {Object.entries(groupedFAQ || {}).map(([sectionName, { section, items }]) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{sectionName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">Aucune question dans cette section</p>
              ) : items.map((item) => (
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