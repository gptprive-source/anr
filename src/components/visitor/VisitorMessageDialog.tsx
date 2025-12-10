import { useState, useEffect, useCallback } from "react";
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
import { useVisitorBusinessCard } from "@/hooks/useVisitorBusinessCard";
import { useVisitorCustomTemplates } from "@/hooks/useVisitorCustomTemplates";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Send, Loader2, MessageSquare, Info, User, Building2, CreditCard, Plus, X, Save, Mic } from "lucide-react";
import VisitorBusinessCardManager from "./VisitorBusinessCardManager";
import SaveCustomTemplateDialog from "./SaveCustomTemplateDialog";
import VoiceRecorder from "./VoiceRecorder";

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
  const { templates: adminTemplates, retentionDays, sendMessage } = useVisitorMessages();
  const { card, loading: cardLoading } = useVisitorBusinessCard();
  const { templates: customTemplates, saveTemplate, deleteTemplate, incrementUsage } = useVisitorCustomTemplates();
  const { flags } = useFeatureFlags();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showCardManager, setShowCardManager] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [isCustomMessage, setIsCustomMessage] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setMessage("");
      setPhone("");
      setSelectedTemplateId(null);
      setShowCardManager(false);
      setShowSaveTemplateDialog(false);
      setIsCustomMessage(false);
      setAudioBlob(null);
    }
  }, [open]);

  const handleAudioRecorded = useCallback((blob: Blob | null) => {
    setAudioBlob(blob);
  }, []);

  // Auto-fill phone from card
  useEffect(() => {
    if (card?.phone && !phone) {
      setPhone(card.phone);
    }
  }, [card]);

  const handleCustomTemplateClick = (template: { id: string; content: string }) => {
    setMessage(template.content);
    setSelectedTemplateId(template.id);
    setIsCustomMessage(false);
    incrementUsage(template.id);
  };

  const handleAdminTemplateClick = (template: { id: string; content: string }) => {
    setMessage(template.content);
    setSelectedTemplateId(template.id);
    setIsCustomMessage(false);
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    setSelectedTemplateId(null);
    setIsCustomMessage(value.trim().length > 0);
  };

  const handleDeleteCustomTemplate = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    try {
      await deleteTemplate(templateId);
      toast({
        title: "Template supprimé",
        description: "Votre template a été supprimé",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le template",
        variant: "destructive",
      });
    }
  };

  const handleSaveTemplate = async (name: string, content: string, icon: string) => {
    try {
      await saveTemplate(name, content, icon);
      toast({
        title: "Template sauvegardé",
        description: "Votre template est prêt à l'emploi",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le template",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleSubmit = async () => {
    const hasText = message.trim().length > 0;
    const hasAudio = audioBlob !== null;
    
    if (!hasText && !hasAudio) {
      toast({
        title: "Message requis",
        description: "Veuillez saisir un message texte ou enregistrer un message vocal",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    
    // Convert audio blob to base64 if exists
    let audioBase64: string | undefined;
    if (audioBlob) {
      audioBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]); // Remove data URL prefix
        };
        reader.readAsDataURL(audioBlob);
      });
    }
    
    // Always attach business card if exists
    const result = await sendMessage(
      habitationId,
      message.trim() || undefined,
      phone.trim() || undefined,
      selectedTemplateId || undefined,
      card ? card.id : undefined, // Always attach card if exists
      audioBase64
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

  const canSubmit = message.trim().length > 0 || audioBlob !== null;

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

  // Card manager is now rendered alongside main dialog to preserve state

  return (
    <>
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
            {/* Business Card Section - Always attached if exists */}
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
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Votre carte sera jointe au message
                  </p>
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

            {/* Voice Message - only if enabled */}
            {flags.visitorVoiceMessagesEnabled && (
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Message vocal (optionnel)
                </Label>
                <VoiceRecorder 
                  onRecordingComplete={handleAudioRecorded}
                  maxDuration={60}
                />
              </div>
            )}

            {/* Custom templates section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Mes templates</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSaveTemplateDialog(true)}
                  disabled={!message.trim()}
                  className="h-7 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Créer
                </Button>
              </div>
              {customTemplates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {customTemplates.map((template) => (
                    <Badge
                      key={template.id}
                      variant={selectedTemplateId === template.id ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/10 transition-colors py-1.5 px-3 pr-1.5 gap-1"
                      onClick={() => handleCustomTemplateClick(template)}
                    >
                      <span>{template.icon}</span>
                      <span>{template.name}</span>
                      <button
                        onClick={(e) => handleDeleteCustomTemplate(e, template.id)}
                        className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Aucun template personnalisé. Tapez un message et cliquez sur "Créer" pour en ajouter.
                </p>
              )}
            </div>

            {/* Admin templates (suggestions) */}
            {adminTemplates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Suggestions</Label>
                <div className="flex flex-wrap gap-2">
                  {adminTemplates.map((template) => (
                    <Badge
                      key={template.id}
                      variant={selectedTemplateId === template.id ? "default" : "secondary"}
                      className="cursor-pointer hover:bg-primary/10 transition-colors py-1.5 px-3"
                      onClick={() => handleAdminTemplateClick(template)}
                    >
                      {template.icon && <span className="mr-1">{template.icon}</span>}
                      {template.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Message textarea */}
            <div className="space-y-2">
              <Label htmlFor="message">Message texte (optionnel)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => handleMessageChange(e.target.value)}
                placeholder="Bonjour, je suis passé pour..."
                rows={3}
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                {isCustomMessage && message.trim().length >= 10 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSaveTemplateDialog(true)}
                    className="h-7 text-xs"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Sauvegarder comme template
                  </Button>
                )}
                <p className="text-xs text-muted-foreground ml-auto">
                  {message.length}/500
                </p>
              </div>
            </div>

            {/* Optional phone (only if no card) */}
            {!card && (
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
              disabled={sending || !canSubmit}
              className="w-full"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer le message
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SaveCustomTemplateDialog
        open={showSaveTemplateDialog}
        onOpenChange={setShowSaveTemplateDialog}
        messageContent={message}
        onSave={handleSaveTemplate}
      />

      <VisitorBusinessCardManager
        open={showCardManager}
        onOpenChange={setShowCardManager}
        onCardSaved={() => setShowCardManager(false)}
      />
    </>
  );
};

export default VisitorMessageDialog;
