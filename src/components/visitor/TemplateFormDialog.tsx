import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Save } from "lucide-react";

const ICON_OPTIONS = ["📝", "📦", "🔔", "🏠", "🚗", "📫", "👋", "🔑", "📞", "✉️"];

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageContent?: string;
  initialName?: string;
  initialIcon?: string;
  mode?: "create" | "edit";
  onSave: (name: string, content: string, icon: string) => Promise<void>;
}

const TemplateFormDialog = ({
  open,
  onOpenChange,
  messageContent = "",
  initialName = "",
  initialIcon = "📝",
  mode = "create",
  onSave,
}: TemplateFormDialogProps) => {
  const [name, setName] = useState(initialName);
  const [content, setContent] = useState(messageContent);
  const [selectedIcon, setSelectedIcon] = useState(initialIcon);
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setName(initialName);
      setContent(messageContent);
      setSelectedIcon(initialIcon);
    }
    onOpenChange(newOpen);
  };

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Créer un template" : "Modifier le template"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Sauvegardez ce message pour le réutiliser facilement"
              : "Modifiez votre template de message"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Nom du template</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Livraison colis"
              maxLength={30}
            />
          </div>

          <div className="space-y-2">
            <Label>Icône</Label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                    selectedIcon === icon
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-content">Message</Label>
            <Textarea
              id="template-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Contenu du message..."
              rows={4}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {content.length}/200
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || !content.trim()}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {mode === "create" ? "Sauvegarder" : "Mettre à jour"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateFormDialog;
