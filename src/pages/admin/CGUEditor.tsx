import { useState, useEffect } from "react";
import { useAppConfig } from "@/hooks/useAppConfig";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "./AdminLayout";

const CGUEditor = () => {
  const { getConfig, updateConfig, isLoading, isUpdating } = useAppConfig();
  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const originalContent = getConfig('cgu_content') || '';
  const lastUpdated = getConfig('cgu_last_updated') || '';

  useEffect(() => {
    if (originalContent && !content) {
      setContent(originalContent);
    }
  }, [originalContent]);

  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  const handleSave = async () => {
    try {
      await updateConfig({ key: 'cgu_content', value: content });
      await updateConfig({ key: 'cgu_last_updated', value: new Date().toISOString().split('T')[0] });
      toast.success('CGU mises à jour avec succès');
      setHasChanges(false);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  // Simple markdown to HTML conversion for preview
  const renderMarkdown = (markdown: string) => {
    return markdown
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mt-6 mb-4 text-foreground">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-semibold mt-5 mb-3 text-foreground">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-medium mt-4 mb-2 text-foreground">{line.slice(4)}</h3>;
        }
        if (line.trim() === '') {
          return <br key={index} />;
        }
        return <p key={index} className="text-muted-foreground mb-2">{line}</p>;
      });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Conditions Générales d'Utilisation</h1>
            <p className="text-muted-foreground mt-1">
              Éditez le contenu des CGU en format Markdown
            </p>
            {lastUpdated && (
              <p className="text-sm text-muted-foreground mt-1">
                Dernière mise à jour : {new Date(lastUpdated).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isUpdating}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isUpdating ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Éditeur Markdown
            </CardTitle>
            <CardDescription>
              Utilisez la syntaxe Markdown : # Titre, ## Sous-titre, ### Section, texte normal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="edit" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Éditer
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Prévisualiser
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Écrivez vos CGU en Markdown..."
                  className="min-h-[500px] font-mono text-sm"
                />
              </TabsContent>

              <TabsContent value="preview">
                <div className="min-h-[500px] p-6 border rounded-lg bg-card overflow-auto">
                  {renderMarkdown(content)}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guide Markdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p><code className="bg-muted px-2 py-1 rounded"># Titre</code> → Titre principal</p>
                <p><code className="bg-muted px-2 py-1 rounded">## Sous-titre</code> → Sous-titre</p>
                <p><code className="bg-muted px-2 py-1 rounded">### Section</code> → Section</p>
              </div>
              <div className="space-y-2">
                <p><code className="bg-muted px-2 py-1 rounded">Texte normal</code> → Paragraphe</p>
                <p><code className="bg-muted px-2 py-1 rounded">(ligne vide)</code> → Saut de ligne</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default CGUEditor;