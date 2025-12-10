import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Mic, Building2, User, Phone, Mail, MapPin, Briefcase, Clock, Check, CheckCheck, Loader2, MessageSquare, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMessageReplies } from "@/hooks/useMessageReplies";
import { AddToContactsButton } from "@/components/messages/AddToContactsButton";
import VoiceRecorder from "@/components/visitor/VoiceRecorder";
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
  visitor_anr_code: string | null;
}

interface VisitorMessage {
  id: string;
  habitation_id: string;
  message: string | null;
  voice_message_url: string | null;
  visitor_phone: string | null;
  is_read: boolean;
  created_at: string;
  business_card?: BusinessCard | null;
}

const Conversation = () => {
  const { messageId } = useParams<{ messageId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [message, setMessage] = useState<VisitorMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const { replies, sendReply, loading: repliesLoading } = useMessageReplies(messageId || "");

  // Fetch message details
  useEffect(() => {
    const fetchMessage = async () => {
      if (!messageId) return;

      try {
        const { data, error } = await (supabase
          .from("visitor_messages" as any)
          .select("*, business_card:visitor_business_cards(*)")
          .eq("id", messageId)
          .single() as any);

        if (error) throw error;
        setMessage(data as VisitorMessage);

        // Mark as read
        if (data && !data.is_read) {
          await supabase
            .from("visitor_messages" as any)
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("id", messageId);
        }
      } catch (error) {
        console.error("[Conversation] Error:", error);
        toast({
          title: "Erreur",
          description: "Message introuvable",
          variant: "destructive",
        });
        navigate("/messages");
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  }, [messageId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const handleSend = async () => {
    if (!message || (!replyText.trim() && !audioBlob)) return;

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
        setReplyText("");
        setAudioBlob(null);
        setShowVoiceRecorder(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!message) {
    return null;
  }

  const card = message.business_card;
  const isCompany = card?.card_type === "company";
  const displayName = card
    ? isCompany
      ? card.company_name
      : `${card.first_name || ""} ${card.last_name || ""}`.trim()
    : message.visitor_phone || "Visiteur";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/messages")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
              {isCompany ? (
                <Building2 className="w-5 h-5 text-primary" />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{displayName}</p>
              {card?.job_title && (
                <p className="text-xs text-muted-foreground truncate">{card.job_title}</p>
              )}
            </div>
          </div>

          {card && (
            <AddToContactsButton businessCard={card} messageId={message.id} size="icon" variant="ghost" />
          )}
        </div>
      </div>

      {/* Contact Info Card */}
      {card && (
        <div className="mx-4 mt-4 p-4 bg-muted/50 rounded-lg border">
          <div className="flex flex-wrap gap-3 text-sm">
            {card.phone && (
              <a href={`tel:${card.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                <Phone className="w-4 h-4" />
                {card.phone}
              </a>
            )}
            {card.email && (
              <a href={`mailto:${card.email}`} className="flex items-center gap-1 text-primary hover:underline">
                <Mail className="w-4 h-4" />
                {card.email}
              </a>
            )}
            {card.visitor_anr_code && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                ANR: {card.visitor_anr_code}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Original visitor message */}
        <div className="flex justify-start">
          <div className="max-w-[80%] bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
            {message.message && (
              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
            )}
            {message.voice_message_url && (
              <audio controls className="w-full h-8 mt-2">
                <source src={message.voice_message_url} type="audio/webm" />
              </audio>
            )}
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(message.created_at), "dd MMM à HH:mm", { locale: fr })}
            </p>
          </div>
        </div>

        {/* Replies */}
        {replies.map((reply) => (
          <div key={reply.id} className="flex justify-end">
            <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3">
              {reply.reply_text && (
                <p className="text-sm whitespace-pre-wrap">{reply.reply_text}</p>
              )}
              {reply.reply_voice_url && (
                <audio controls className="w-full h-8 mt-2">
                  <source src={reply.reply_voice_url} type="audio/webm" />
                </audio>
              )}
              <div className="flex items-center justify-end gap-1 mt-2">
                <p className="text-xs opacity-70">
                  {format(new Date(reply.created_at), "HH:mm", { locale: fr })}
                </p>
                {reply.is_read ? (
                  <CheckCheck className="w-3 h-3 opacity-70" />
                ) : (
                  <Check className="w-3 h-3 opacity-70" />
                )}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-card border-t p-4">
        {showVoiceRecorder ? (
          <div className="space-y-3">
            <VoiceRecorder onRecordingComplete={(blob) => setAudioBlob(blob)} />
            {audioBlob && (
              <div className="flex items-center gap-2">
                <audio controls className="flex-1 h-8">
                  <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
                </audio>
                <Button size="sm" variant="ghost" onClick={() => setAudioBlob(null)}>
                  Supprimer
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowVoiceRecorder(false);
                  setAudioBlob(null);
                }}
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleSend}
                disabled={!audioBlob || sending}
              >
                {sending ? "Envoi..." : "Envoyer"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={() => setShowVoiceRecorder(true)}
            >
              <Mic className="w-5 h-5" />
            </Button>
            <Textarea
              placeholder="Votre réponse..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              size="icon"
              className="flex-shrink-0"
              onClick={handleSend}
              disabled={!replyText.trim() || sending}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Conversation;
