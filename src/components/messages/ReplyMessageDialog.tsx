import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMessageReplies } from "@/hooks/useMessageReplies";
import VoiceRecorder from "@/components/visitor/VoiceRecorder";
import { Send, Mic, MessageSquare, Building2, User, Phone, Mail, Clock, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BusinessCard {
  id: string;
  card_type: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
}

interface VisitorMessage {
  id: string;
  habitation_id: string;
  message: string | null;
  voice_message_url: string | null;
  visitor_phone: string | null;
  created_at: string;
  business_card?: BusinessCard | null;
}

interface ReplyMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: VisitorMessage;
  onReplySent?: () => void;
}

export const ReplyMessageDialog = ({
  open,
  onOpenChange,
  message,
  onReplySent,
}: ReplyMessageDialogProps) => {
  const { toast } = useToast();
  const { replies, sendReply, loading } = useMessageReplies(message.id);
  const [replyText, setReplyText] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"text" | "voice">("text");

  const card = message.business_card;

  const handleSend = async () => {
    if (!replyText.trim() && !audioBlob) {
      toast({
        title: "Message vide",
        description: "Veuillez écrire un message ou enregistrer un vocal",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      let audioBase64: string | undefined;
      if (audioBlob) {
        const buffer = await audioBlob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        audioBase64 = btoa(String.fromCharCode(...bytes));
      }

      const result = await sendReply(
        message.id,
        message.habitation_id,
        replyText.trim() || undefined,
        audioBase64
      );

      if (result.success) {
        toast({
          title: "Réponse envoyée",
          description: "Votre réponse a été envoyée au visiteur",
        });
        setReplyText("");
        setAudioBlob(null);
        onReplySent?.();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la réponse",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleRecordingComplete = (blob: Blob) => {
    setAudioBlob(blob);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Répondre au message
          </DialogTitle>
        </DialogHeader>

        {/* Business Card Preview */}
        {card && (
          <div className="p-3 bg-muted rounded-lg border">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                {card.card_type === "company" ? (
                  <Building2 className="w-5 h-5 text-primary" />
                ) : (
                  <User className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {card.card_type === "company" ? (
                  <>
                    <p className="font-medium truncate">{card.company_name}</p>
                    {card.first_name && (
                      <p className="text-sm text-muted-foreground">
                        {card.first_name} {card.last_name}
                        {card.job_title && ` - ${card.job_title}`}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-medium truncate">
                      {card.first_name} {card.last_name}
                    </p>
                    {card.job_title && (
                      <p className="text-sm text-muted-foreground">{card.job_title}</p>
                    )}
                  </>
                )}
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                  {card.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {card.phone}
                    </span>
                  )}
                  {card.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {card.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Original Message */}
        <div className="p-3 bg-secondary/50 rounded-lg border-l-4 border-secondary">
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(message.created_at), "dd MMM à HH:mm", { locale: fr })}
          </p>
          {message.message && <p className="text-sm">{message.message}</p>}
          {message.voice_message_url && (
            <audio controls className="w-full mt-2 h-8">
              <source src={message.voice_message_url} type="audio/webm" />
            </audio>
          )}
        </div>

        {/* Previous Replies */}
        {replies.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Vos réponses précédentes</p>
            {replies.map((reply) => (
              <div key={reply.id} className="p-3 bg-primary/5 rounded-lg border-l-4 border-primary">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(reply.created_at), "dd MMM à HH:mm", { locale: fr })}
                  </p>
                  {reply.is_read ? (
                    <CheckCheck className="w-3 h-3 text-primary" />
                  ) : (
                    <Check className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                {reply.reply_text && <p className="text-sm">{reply.reply_text}</p>}
                {reply.reply_voice_url && (
                  <audio controls className="w-full mt-2 h-8">
                    <source src={reply.reply_voice_url} type="audio/webm" />
                  </audio>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("text")}
            className="flex-1"
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Texte
          </Button>
          <Button
            variant={mode === "voice" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("voice")}
            className="flex-1"
          >
            <Mic className="w-4 h-4 mr-1" />
            Vocal
          </Button>
        </div>

        {/* Reply Input */}
        {mode === "text" ? (
          <Textarea
            placeholder="Écrivez votre réponse..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
          />
        ) : (
          <div className="p-4 border rounded-lg bg-muted/30">
            <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
            {audioBlob && (
              <div className="mt-3">
                <audio controls className="w-full h-8">
                  <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
                </audio>
              </div>
            )}
          </div>
        )}

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={sending || (!replyText.trim() && !audioBlob)}
          className="w-full"
        >
          {sending ? (
            <>Envoi en cours...</>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Envoyer la réponse
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
