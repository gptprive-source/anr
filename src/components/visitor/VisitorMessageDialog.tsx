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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useVisitorMessages } from "@/hooks/useVisitorMessages";
import { useVisitorBusinessCard } from "@/hooks/useVisitorBusinessCard";
import { Send, Loader2, MessageSquare, Info, User, Building2, CreditCard, Phone, Mail, MapPin } from "lucide-react";
import VisitorBusinessCardManager from "./VisitorBusinessCardManager";

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
  const { card, loading: cardLoading } = useVisitorBusinessCard();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [attachCard, setAttachCard] = useState(false);
  const [showCardManager, setShowCardManager] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setMessage("");
      setPhone("");
      setSelectedTemplateId(null);
      setAttachCard(false);
      setShowCardManager(false);
    }
  }, [open]);

  // Auto-fill phone from card
  useEffect(() => {
    if (card?.phone && !phone) {
      setPhone(card.phone);
    }
  }, [card]);

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
      selectedTemplateId || undefined,
      attachCard && card ? card.id : undefined
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

  // Render business card preview
  const renderCardPreview = () => {
    if (!card) return null;
    
    const isCompany = card.card_type === "company";
    const displayName = isCompany 
      ? card.company_name 
      : `${card.first_name || ""} ${card.last_name || ""}`.trim();

    return (
      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
        <div className="p-2 rounded-full bg-primary/10">
          {isCompany ? (
            <Building2 className="w-5 h-5 text-primary" />
          ) : (
            <User className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{displayName}</p>
          {card.job_title && (
            <p className="text-xs text-muted-foreground truncate">{card.job_title}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCardManager(true)}
          className="text-xs"
        >
          Modifier
        </Button>
      </div>
    );
  };

  // Show card manager dialog
  if (showCardManager) {
    return (
      <VisitorBusinessCardManager
        open={showCardManager}
        onOpenChange={(open) => {
          setShowCardManager(open);
        }}
        onCardSaved={() => setShowCardManager(false)}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
          {/* Business Card Section */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Ma carte de visite
            </Label>
            
            {cardLoading ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Chargement...</span>
              </div>
            ) : card ? (
              <div className="space-y-2">
                {renderCardPreview()}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="attachCard"
                    checked={attachCard}
                    onCheckedChange={(checked) => setAttachCard(checked === true)}
                  />
                  <Label htmlFor="attachCard" className="text-sm cursor-pointer">
                    Joindre ma carte de visite à ce message
                  </Label>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCardManager(true)}
                className="w-full"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Créer ma carte de visite
              </Button>
            )}
          </div>

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

          {/* Optional phone (only if no card attached) */}
          {!attachCard && (
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
          )}

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
