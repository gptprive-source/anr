import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pencil, Loader2 } from "lucide-react";
import type { VisitorCustomTemplate } from "@/hooks/useVisitorCustomTemplates";

const ICON_OPTIONS = ["📝", "📦", "📬", "🚚", "🔔", "✉️", "🏠", "👋", "⏰", "📋"];

interface EditCustomTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: VisitorCustomTemplate | null;
  onSave: (templateId: string, name: string, content: string, icon: string) => Promise<void>;
}

export default function EditCustomTemplateDialog({
  open,
  onOpenChange,
  template,
  onSave,
}: EditCustomTemplateDialogProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("📝");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setContent(template.content);
      setSelectedIcon(template.icon || "📝");
    }
  }, [template]);

  const handleSave = async () => {
    if (!name.trim() || !content.trim() || !template) return;
    
    setSaving(true);
    try {
      await onSave(template.id, name.trim(), content.trim(), selectedIcon);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating template:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Modifier le template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template name */}
          <div className="space-y-2">
            <Label htmlFor="edit-template-name">Nom du template</Label>
            <Input
              id="edit-template-name"
              placeholder="Ex: Colis Amazon, Retour dépôt..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Icon selection */}
          <div className="space-y-2">
            <Label>Icône</Label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                    selectedIcon === icon
                      ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Message content */}
          <div className="space-y-2">
            <Label htmlFor="edit-template-content">Contenu du message</Label>
            <Textarea
              id="edit-template-content"
              placeholder="Votre message template..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {content.length}/500 caractères
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || !content.trim() || saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}