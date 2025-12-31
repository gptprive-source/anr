import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, MessageSquare, Edit2, Check, X } from "lucide-react";

const MAX_TEMPLATES = 3;
const MAX_TITLE_LENGTH = 30;
const MAX_MESSAGE_LENGTH = 200;

export interface MessageTemplate {
  id: string;
  title: string;
  message: string;
}

interface MessageTemplatesEditorProps {
  templates: MessageTemplate[];
  onChange: (templates: MessageTemplate[]) => void;
  disabled?: boolean;
}

const MessageTemplatesEditor = ({
  templates,
  onChange,
  disabled = false,
}: MessageTemplatesEditorProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");

  const handleAdd = () => {
    if (templates.length >= MAX_TEMPLATES) return;
    
    const newTemplate: MessageTemplate = {
      id: crypto.randomUUID(),
      title: "",
      message: "",
    };
    
    onChange([...templates, newTemplate]);
    setEditingId(newTemplate.id);
    setEditTitle("");
    setEditMessage("");
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingId(template.id);
    setEditTitle(template.title);
    setEditMessage(template.message);
  };

  const handleSave = () => {
    if (!editingId) return;
    
    // Don't save empty templates
    if (!editTitle.trim() && !editMessage.trim()) {
      handleDelete(editingId);
      return;
    }

    const updated = templates.map((t) =>
      t.id === editingId
        ? { ...t, title: editTitle.trim(), message: editMessage.trim() }
        : t
    );
    onChange(updated);
    setEditingId(null);
    setEditTitle("");
    setEditMessage("");
  };

  const handleCancel = () => {
    // If it's a new empty template, remove it
    const template = templates.find((t) => t.id === editingId);
    if (template && !template.title && !template.message) {
      handleDelete(editingId!);
    }
    setEditingId(null);
    setEditTitle("");
    setEditMessage("");
  };

  const handleDelete = (id: string) => {
    onChange(templates.filter((t) => t.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditTitle("");
      setEditMessage("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Messages pré-enregistrés
        </Label>
        <span className="text-xs text-muted-foreground">
          {templates.length}/{MAX_TEMPLATES}
        </span>
      </div>

      <div className="space-y-2">
        {templates.map((template) => (
          <Card key={template.id} className="p-3">
            {editingId === template.id ? (
              <div className="space-y-2">
                <Input
                  placeholder="Titre du message"
                  value={editTitle}
                  onChange={(e) =>
                    setEditTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))
                  }
                  maxLength={MAX_TITLE_LENGTH}
                  disabled={disabled}
                  autoFocus
                />
                <div className="relative">
                  <Textarea
                    placeholder="Contenu du message"
                    value={editMessage}
                    onChange={(e) =>
                      setEditMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))
                    }
                    maxLength={MAX_MESSAGE_LENGTH}
                    disabled={disabled}
                    rows={3}
                  />
                  <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                    {editMessage.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={disabled}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleSave}
                    disabled={disabled}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {template.title || "Sans titre"}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {template.message || "Message vide"}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(template)}
                    disabled={disabled}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(template.id)}
                    disabled={disabled}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {templates.length < MAX_TEMPLATES && !editingId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un message ({templates.length}/{MAX_TEMPLATES})
        </Button>
      )}
    </div>
  );
};

export default MessageTemplatesEditor;
