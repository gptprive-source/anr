import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useVisitorMessages } from "@/hooks/useVisitorMessages";
import { Send, Loader2, MessageSquare, Info } from "lucide-react";

interface VisitorMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitationId: string;
  callId?: string;
  onMessageSent?: () => void;
}

const VisitorMessageDialog = ({
  open,
  onOpenChange,
  habitationId,
  callId,
  onMessageSent,
}: VisitorMessageDialogProps) => {
  const { templates, retentionDays, sendMessage } = useVisitorMessages();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setMessage("");
      setPhone("");
      setSelectedTemplateId(null);
    }
  }, [open]);

  const handleTemplateClick = (template: { id: string; message: string }) => {
    setMessage(template.message);
    setSelectedTemplateId(template.id);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: "Message requis",
        description: "Veuillez saisir un message",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    const result = await sendMessage(
      habitationId,
      message.trim(),
      phone.trim() || undefined,
      callId,
      selectedTemplateId || undefined
    );

    if (result.success) {
      toast({
        title: "Message envoyé",
        description: "Le résident recevra votre message",
      });
      onOpenChange(false);
      onMessageSent?.();
    } else {
      toast({
        title: "Erreur",
        description: result.error || "Impossible d'envoyer le message",
        variant: "destructive",
      });
    }
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Laisser un message
          </DialogTitle>
          <DialogDescription>
            Le résident recevra votre message sur son application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick templates */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Messages rapides</Label>
              <div className="flex flex-wrap gap-2">
                {templates.map((template) => (
                  <Badge
                    key={template.id}
                    variant={selectedTemplateId === template.id ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10 transition-colors py-1.5 px-3"
                    onClick={() => handleTemplateClick(template)}
                  >
                    <span className="mr-1">{template.icon}</span>
                    {template.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Message textarea */}
          <div className="space-y-2">
            <Label htmlFor="message">Votre message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setSelectedTemplateId(null);
              }}
              placeholder="Bonjour, je suis passé pour..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </p>
          </div>

          {/* Optional phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone (optionnel)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              maxLength={20}
            />
          </div>

          {/* RGPD notice */}
          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
            <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Ce message sera conservé {retentionDays} jours puis automatiquement supprimé conformément au RGPD.
            </p>
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={sending || !message.trim()}
            className="w-full"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Envoyer le message
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VisitorMessageDialog;
