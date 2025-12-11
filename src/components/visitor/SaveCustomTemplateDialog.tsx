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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2 } from "lucide-react";

const ICON_OPTIONS = ["📝", "📦", "📬", "🚚", "🔔", "✉️", "🏠", "👋", "⏰", "📋"];

interface SaveCustomTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageContent?: string;
  onSave: (name: string, content: string, icon: string) => Promise<void>;
}

export default function SaveCustomTemplateDialog({
  open,
  onOpenChange,
  messageContent = "",
  onSave,
}: SaveCustomTemplateDialogProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState(messageContent);
  const [selectedIcon, setSelectedIcon] = useState("📝");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setContent(messageContent);
    }
  }, [open, messageContent]);

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) return;
    
    setSaving(true);
    try {
      await onSave(name.trim(), content.trim(), selectedIcon);
      setName("");
      setContent("");
      setSelectedIcon("📝");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving template:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Créer un template
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Nom du template</Label>
            <Input
              id="template-name"
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
            <Label htmlFor="template-content">Message</Label>
            <Textarea
              id="template-content"
              placeholder="Écrivez votre message template ici..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={500}
            />
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
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
