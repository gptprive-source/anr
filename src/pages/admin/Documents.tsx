import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  FileText, 
  Mail, 
  Bell, 
  Scale, 
  Edit, 
  Eye, 
  Save, 
  RotateCcw, 
  Send,
  History,
  Search,
  ChevronDown,
  Check,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import TemplateEditor from "@/components/admin/TemplateEditor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string | null;
  category: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  variables: string[];
  preview_data: Record<string, string>;
  default_html_content: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  version: number | null;
  legal_review_at: string | null;
  legal_review_by: string | null;
  last_test_sent_at: string | null;
  last_test_sent_to: string | null;
}

interface SentDocument {
  id: string;
  template_key: string;
  recipient_email: string;
  recipient_user_id: string | null;
  subject: string;
  html_snapshot: string | null;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown>;
  sent_at: string;
}

const categoryConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  invoice: { label: "Factures", icon: FileText, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  confirmation: { label: "Confirmations", icon: Check, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  notification: { label: "Notifications", icon: Bell, color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  legal: { label: "Légal / RGPD", icon: Scale, color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
};

const Documents = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewHistoryDoc, setViewHistoryDoc] = useState<SentDocument | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  // Fetch templates
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("category", { ascending: true });
      
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  // Fetch sent documents
  const { data: sentDocuments, isLoading: loadingHistory } = useQuery({
    queryKey: ["sent-documents", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("sent_documents")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(100);
      
      if (searchTerm) {
        query = query.or(`recipient_email.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SentDocument[];
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, html_content, subject }: { id: string; html_content: string; subject: string }) => {
      const { error } = await supabase
        .from("email_templates")
        .update({ 
          html_content, 
          subject,
          updated_at: new Date().toISOString(),
          version: (selectedTemplate?.version || 0) + 1
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template sauvegardé avec succès");
      setEditMode(false);
    },
    onError: (error) => {
      toast.error("Erreur lors de la sauvegarde: " + error.message);
    },
  });

  // Reset template mutation
  const resetMutation = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      if (!template.default_html_content) {
        throw new Error("Pas de template par défaut disponible");
      }
      
      const { error } = await supabase
        .from("email_templates")
        .update({ 
          html_content: template.default_html_content,
          updated_at: new Date().toISOString() 
        })
        .eq("id", template.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template réinitialisé");
      setSelectedTemplate(null);
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });

  // Mark as legally reviewed
  const markLegalReviewMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("email_templates")
        .update({ 
          legal_review_at: new Date().toISOString(),
          legal_review_by: user?.id
        })
        .eq("id", templateId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template marqué comme validé légalement");
    },
  });

  // Send test email
  const sendTestEmail = async (template: EmailTemplate, email: string) => {
    setSendingTest(true);
    try {
      // Render the template with preview data
      let renderedHtml = template.html_content;
      let renderedSubject = template.subject;
      Object.entries(template.preview_data).forEach(([key, value]) => {
        renderedHtml = renderedHtml.replace(new RegExp(`{{${key}}}`, 'g'), value);
        renderedSubject = renderedSubject.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });

      const { error } = await supabase.functions.invoke('send-test-email', {
        body: {
          to: email,
          subject: `[TEST] ${renderedSubject}`,
          html: renderedHtml,
          templateKey: template.template_key
        }
      });

      if (error) throw error;

      // Update last test sent
      await supabase
        .from("email_templates")
        .update({ 
          last_test_sent_at: new Date().toISOString(),
          last_test_sent_to: email
        })
        .eq("id", template.id);

      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success(`Email de test envoyé à ${email}`);
      setTestEmailAddress("");
    } catch (error) {
      toast.error("Erreur lors de l'envoi: " + (error as Error).message);
    } finally {
      setSendingTest(false);
    }
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedContent(template.html_content);
    setEditedSubject(template.subject);
    setEditMode(true);
    setPreviewMode(false);
  };

  const handlePreviewTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setPreviewMode(true);
    setEditMode(false);
  };

  const handleSave = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate({
      id: selectedTemplate.id,
      html_content: editedContent,
      subject: editedSubject,
    });
  };

  const handleReset = () => {
    if (!selectedTemplate) return;
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser ce template ?")) {
      resetMutation.mutate(selectedTemplate);
    }
  };

  const renderPreview = (html: string, previewData: Record<string, string>) => {
    let rendered = html;
    Object.entries(previewData).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return rendered;
  };

  const isModified = (template: EmailTemplate) => {
    return template.default_html_content && template.html_content !== template.default_html_content;
  };

  const groupedTemplates = templates?.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>) || {};

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Documents & Templates</h1>
          <p className="text-muted-foreground">
            Gérez les templates d'emails professionnels et consultez l'historique des envois
          </p>
        </div>

        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates" className="gap-2">
              <Mail className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Historique
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            {loadingTemplates ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="grid gap-6">
                {Object.entries(categoryConfig).map(([category, config]) => {
                  const categoryTemplates = groupedTemplates[category] || [];
                  if (categoryTemplates.length === 0) return null;

                  const Icon = config.icon;
                  
                  return (
                    <Collapsible key={category} defaultOpen>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${config.color}`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <CardTitle className="text-lg">{config.label}</CardTitle>
                                  <CardDescription>{categoryTemplates.length} template(s)</CardDescription>
                                </div>
                              </div>
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              {categoryTemplates.map((template) => (
                                <div
                                  key={template.id}
                                  className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                                >
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="font-medium">{template.name}</h4>
                                      {!template.is_active && (
                                        <Badge variant="secondary">Inactif</Badge>
                                      )}
                                      {isModified(template) && (
                                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                                          <AlertTriangle className="w-3 h-3 mr-1" />
                                          Modifié
                                        </Badge>
                                      )}
                                      {template.legal_review_at && (
                                        <Badge variant="outline" className="text-green-600 border-green-300">
                                          <CheckCircle2 className="w-3 h-3 mr-1" />
                                          Validé légal
                                        </Badge>
                                      )}
                                      {template.version && template.version > 1 && (
                                        <Badge variant="secondary" className="text-xs">
                                          v{template.version}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {template.description}
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                      <span>
                                        Modifié le {format(new Date(template.updated_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                                      </span>
                                      {template.last_test_sent_at && (
                                        <span className="flex items-center gap-1">
                                          <Send className="w-3 h-3" />
                                          Test: {format(new Date(template.last_test_sent_at), "dd/MM HH:mm", { locale: fr })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handlePreviewTemplate(template)}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      Aperçu
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleEditTemplate(template)}
                                    >
                                      <Edit className="w-4 h-4 mr-1" />
                                      Modifier
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par email ou sujet..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : sentDocuments?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun document envoyé
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sentDocuments?.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {doc.status === 'sent' ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-destructive" />
                            )}
                            <span className="font-medium truncate">{doc.subject}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>{doc.recipient_email}</span>
                            <span>•</span>
                            <span>{format(new Date(doc.sent_at), "dd/MM/yyyy HH:mm", { locale: fr })}</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              {doc.template_key.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          {doc.error_message && (
                            <p className="text-xs text-destructive mt-1">{doc.error_message}</p>
                          )}
                        </div>
                        {doc.html_snapshot && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewHistoryDoc(doc)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Template Dialog */}
        <Dialog open={editMode} onOpenChange={(open) => !open && setEditMode(false)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Modifier: {selectedTemplate?.name}</DialogTitle>
              <DialogDescription>
                Modifiez le contenu HTML du template email
              </DialogDescription>
            </DialogHeader>
            
            {selectedTemplate && (
              <div className="flex-1 overflow-hidden flex flex-col gap-4">
                <div className="space-y-2">
                  <Label>Sujet de l'email</Label>
                  <Input
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    placeholder="Sujet de l'email"
                  />
                </div>

                <div className="flex-1 overflow-hidden" style={{ minHeight: '60vh' }}>
                  <Label className="mb-2 block">Contenu HTML</Label>
                  <div className="h-full" style={{ minHeight: 'calc(60vh - 30px)' }}>
                    <TemplateEditor
                      content={editedContent}
                      onChange={setEditedContent}
                      variables={selectedTemplate.variables}
                      previewData={selectedTemplate.preview_data}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={resetMutation.isPending || !selectedTemplate.default_html_content}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Réinitialiser
                    </Button>
                    {!selectedTemplate.legal_review_at && (
                      <Button
                        variant="outline"
                        onClick={() => markLegalReviewMutation.mutate(selectedTemplate.id)}
                        disabled={markLegalReviewMutation.isPending}
                      >
                        <Scale className="w-4 h-4 mr-2" />
                        Valider légalement
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditMode(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleSave} disabled={updateMutation.isPending}>
                      <Save className="w-4 h-4 mr-2" />
                      Sauvegarder
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Preview Template Dialog */}
        <Dialog open={previewMode} onOpenChange={(open) => !open && setPreviewMode(false)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Aperçu: {selectedTemplate?.name}</DialogTitle>
              <DialogDescription>
                Prévisualisation du template avec des données de test
              </DialogDescription>
            </DialogHeader>
            
            {selectedTemplate && (
              <div className="flex-1 overflow-hidden flex flex-col gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Sujet:</strong> {renderPreview(selectedTemplate.subject, selectedTemplate.preview_data)}
                  </p>
                </div>

                {/* Test Email Section */}
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                  <Send className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Email de test..."
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    className="flex-1"
                    type="email"
                  />
                  <Button
                    size="sm"
                    onClick={() => sendTestEmail(selectedTemplate, testEmailAddress)}
                    disabled={sendingTest || !testEmailAddress}
                  >
                    {sendingTest ? (
                      <Clock className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-1" />
                    )}
                    Envoyer un test
                  </Button>
                </div>

                <div className="flex gap-4 flex-wrap">
                  <div className="text-sm text-muted-foreground">
                    <strong>Variables disponibles:</strong>
                  </div>
                  {selectedTemplate.variables.map((v) => (
                    <Badge key={v} variant="secondary" className="font-mono text-xs">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>

                <div className="flex-1 border rounded-lg overflow-auto" style={{ minHeight: '50vh', maxHeight: '60vh' }}>
                  <iframe
                    srcDoc={renderPreview(selectedTemplate.html_content, selectedTemplate.preview_data)}
                    className="w-full bg-white"
                    style={{ minHeight: '100%', height: 'auto' }}
                    title="Email Preview"
                    onLoad={(e) => {
                      const iframe = e.target as HTMLIFrameElement;
                      if (iframe.contentDocument) {
                        iframe.style.height = Math.max(500, iframe.contentDocument.body.scrollHeight + 50) + 'px';
                      }
                    }}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setPreviewMode(false)}>
                    Fermer
                  </Button>
                  <Button onClick={() => {
                    setPreviewMode(false);
                    handleEditTemplate(selectedTemplate);
                  }}>
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View History Document Dialog */}
        <Dialog open={!!viewHistoryDoc} onOpenChange={(open) => !open && setViewHistoryDoc(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Document envoyé</DialogTitle>
              <DialogDescription>
                {viewHistoryDoc?.recipient_email} - {viewHistoryDoc && format(new Date(viewHistoryDoc.sent_at), "dd/MM/yyyy HH:mm", { locale: fr })}
              </DialogDescription>
            </DialogHeader>
            
            {viewHistoryDoc && (
              <div className="flex-1 overflow-auto" style={{ minHeight: '50vh', maxHeight: '70vh' }}>
                <iframe
                  srcDoc={viewHistoryDoc.html_snapshot || ""}
                  className="w-full bg-white border rounded-lg"
                  style={{ minHeight: '100%', height: 'auto' }}
                  title="Document Preview"
                  onLoad={(e) => {
                    const iframe = e.target as HTMLIFrameElement;
                    if (iframe.contentDocument) {
                      iframe.style.height = Math.max(500, iframe.contentDocument.body.scrollHeight + 50) + 'px';
                    }
                  }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Documents;