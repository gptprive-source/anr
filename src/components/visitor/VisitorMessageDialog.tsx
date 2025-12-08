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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useVisitorMessages } from "@/hooks/useVisitorMessages";
import { useVisitorBusinessCard } from "@/hooks/useVisitorBusinessCard";
import { useVisitorCustomTemplates } from "@/hooks/useVisitorCustomTemplates";
import { Send, Loader2, MessageSquare, Info, User, Building2, CreditCard, Plus, X, Save, Mic, FileText } from "lucide-react";
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
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [attachCard, setAttachCard] = useState(false);
  const [showCardManager, setShowCardManager] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [isCustomMessage, setIsCustomMessage] = useState(false);
  const [messageType, setMessageType] = useState<"text" | "voice" | "both">("text");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setMessage("");
      setPhone("");
      setSelectedTemplateId(null);
      setAttachCard(false);
      setShowCardManager(false);
      setShowSaveTemplateDialog(false);
      setIsCustomMessage(false);
      setMessageType("text");
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
    
    const result = await sendMessage(
      habitationId,
      message.trim() || undefined,
      phone.trim() || undefined,
      selectedTemplateId || undefined,
      attachCard && card ? card.id : undefined,
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

            {/* Message Type Tabs */}
            <Tabs value={messageType} onValueChange={(v) => setMessageType(v as "text" | "voice" | "both")} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text" className="gap-1.5 text-xs sm:text-sm">
                  <FileText className="w-3.5 h-3.5" />
                  Texte
                </TabsTrigger>
                <TabsTrigger value="voice" className="gap-1.5 text-xs sm:text-sm">
                  <Mic className="w-3.5 h-3.5" />
                  Vocal
                </TabsTrigger>
                <TabsTrigger value="both" className="gap-1.5 text-xs sm:text-sm">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Les deux
                </TabsTrigger>
              </TabsList>

              {/* Text Message Content */}
              <TabsContent value="text" className="space-y-4 mt-4">
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
                  <Label htmlFor="message">Votre message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => handleMessageChange(e.target.value)}
                    placeholder="Bonjour, je suis passé pour..."
                    rows={4}
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
              </TabsContent>

              {/* Voice Message Content */}
              <TabsContent value="voice" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-sm">Message vocal (60 sec max)</Label>
                  <VoiceRecorder 
                    onRecordingComplete={handleAudioRecorded}
                    maxDuration={60}
                  />
                </div>
              </TabsContent>

              {/* Both Messages Content */}
              <TabsContent value="both" className="space-y-4 mt-4">
                {/* Voice recorder */}
                <div className="space-y-2">
                  <Label className="text-sm">Message vocal (60 sec max)</Label>
                  <VoiceRecorder 
                    onRecordingComplete={handleAudioRecorded}
                    maxDuration={60}
                  />
                </div>
                
                {/* Text message */}
                <div className="space-y-2">
                  <Label htmlFor="message-both">Message texte complémentaire</Label>
                  <Textarea
                    id="message-both"
                    value={message}
                    onChange={(e) => handleMessageChange(e.target.value)}
                    placeholder="Ajoutez des détails écrits..."
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {message.length}/500
                  </p>
                </div>
              </TabsContent>
            </Tabs>

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
              disabled={sending || !canSubmit}
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

      {/* Save Template Dialog */}
      <SaveCustomTemplateDialog
        open={showSaveTemplateDialog}
        onOpenChange={setShowSaveTemplateDialog}
        messageContent={message}
        onSave={handleSaveTemplate}
      />
    </>
  );
};

export default VisitorMessageDialog;
