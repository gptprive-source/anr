import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Mic, Building2, User, Phone, Mail, MapPin, Clock, Check, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMessageReplies } from "@/hooks/useMessageReplies";
import { AddToContactsButton } from "@/components/messages/AddToContactsButton";
import VoiceRecorder from "@/components/visitor/VoiceRecorder";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import BottomNav from "@/components/layout/BottomNav";

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
  business_card_id: string | null;
  business_card?: BusinessCard | null;
}

const Conversation = () => {
  const { visitorId } = useParams<{ visitorId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [visitorMessages, setVisitorMessages] = useState<VisitorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [habitationId, setHabitationId] = useState<string | null>(null);

  // Get the first message ID for replies hook
  const firstMessageId = visitorMessages[0]?.id || "";
  const { replies, sendReply, loading: repliesLoading } = useMessageReplies(firstMessageId);

  // Fetch all messages from this visitor
  useEffect(() => {
    const fetchVisitorMessages = async () => {
      if (!visitorId || !user) return;

      try {
        // First get user's habitation
        const { data: residentData } = await supabase
          .from("residents")
          .select("habitation_id")
          .eq("user_id", user.id)
          .eq("status", "verified")
          .maybeSingle();

        if (!residentData?.habitation_id) {
          navigate("/messages");
          return;
        }

        setHabitationId(residentData.habitation_id);

        // Determine if visitorId is a business_card_id or visitor_phone
        let query = supabase
          .from("visitor_messages" as any)
          .select("*, business_card:visitor_business_cards(*)")
          .eq("habitation_id", residentData.habitation_id)
          .order("created_at", { ascending: true });

        // Check if visitorId looks like a UUID (business_card_id) or phone
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitorId);
        
        if (isUuid) {
          query = query.eq("business_card_id", visitorId);
        } else {
          // It's a phone number or device ID
          query = query.eq("visitor_phone", visitorId);
        }

        const { data, error } = await (query as any);

        if (error) throw error;

        if (!data || data.length === 0) {
          toast({
            title: "Erreur",
            description: "Conversation introuvable",
            variant: "destructive",
          });
          navigate("/messages");
          return;
        }

        setVisitorMessages(data as VisitorMessage[]);

        // Mark all as read
        const unreadIds = data.filter((m: any) => !m.is_read).map((m: any) => m.id);
        if (unreadIds.length > 0) {
          await supabase
            .from("visitor_messages" as any)
            .update({ is_read: true, read_at: new Date().toISOString() })
            .in("id", unreadIds);
        }
      } catch (error) {
        console.error("[Conversation] Error:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger la conversation",
          variant: "destructive",
        });
        navigate("/messages");
      } finally {
        setLoading(false);
      }
    };

    fetchVisitorMessages();
  }, [visitorId, user]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visitorMessages, replies]);

  const handleSend = async () => {
    if (!habitationId || !firstMessageId || (!replyText.trim() && !audioBlob)) return;

    setSending(true);
    try {
      let audioBase64: string | undefined;
      if (audioBlob) {
        const buffer = await audioBlob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        audioBase64 = btoa(String.fromCharCode(...bytes));
      }

      const result = await sendReply(
        firstMessageId,
        habitationId,
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

  if (visitorMessages.length === 0) {
    return null;
  }

  // Get visitor info from first message with business card
  const messageWithCard = visitorMessages.find(m => m.business_card);
  const card = messageWithCard?.business_card;
  const isCompany = card?.card_type === "company";
  const displayName = card
    ? isCompany
      ? card.company_name
      : `${card.first_name || ""} ${card.last_name || ""}`.trim()
    : visitorMessages[0]?.visitor_phone || "Visiteur";

  // Combine visitor messages and replies in chronological order
  const allMessages = [
    ...visitorMessages.map(m => ({ type: 'visitor' as const, data: m, date: new Date(m.created_at) })),
    ...replies.map(r => ({ type: 'reply' as const, data: r, date: new Date(r.created_at) }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20">
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
            <AddToContactsButton businessCard={card} messageId={visitorMessages[0]?.id} size="icon" variant="ghost" />
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
        {allMessages.map((item, index) => {
          if (item.type === 'visitor') {
            const msg = item.data;
            return (
              <div key={`visitor-${msg.id}`} className="flex justify-start">
                <div className="max-w-[80%] bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                  {msg.message && (
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  )}
                  {msg.voice_message_url && (
                    <audio controls className="w-full h-8 mt-2">
                      <source src={msg.voice_message_url} type="audio/webm" />
                    </audio>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(msg.created_at), "dd MMM à HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
            );
          } else {
            const reply = item.data;
            return (
              <div key={`reply-${reply.id}`} className="flex justify-end">
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
            );
          }
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - WhatsApp style */}
      <div className="sticky bottom-20 bg-card border-t p-4">
        {showVoiceRecorder ? (
          <VoiceRecorder 
            onRecordingComplete={(blob) => setAudioBlob(blob)}
            onSend={handleSend}
            onCancel={() => {
              setShowVoiceRecorder(false);
              setAudioBlob(null);
            }}
            sending={sending}
            audioBlob={audioBlob}
          />
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

      <BottomNav />
    </div>
  );
};

export default Conversation;
