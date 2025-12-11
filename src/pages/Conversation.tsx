import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Menu, Mic, Building2, User, Phone, Mail, MapPin, Check, CheckCheck, Loader2, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMessageReplies } from "@/hooks/useMessageReplies";
import { AddToContactsButton } from "@/components/messages/AddToContactsButton";
import WhatsAppAudioPlayer from "@/components/messages/WhatsAppAudioPlayer";
import VoiceRecorder from "@/components/visitor/VoiceRecorder";
import { format, isToday, isYesterday } from "date-fns";
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

const formatDateSeparator = (date: Date) => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  return format(date, "EEEE d MMMM", { locale: fr });
};

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

  const firstMessageId = visitorMessages[0]?.id || "";
  const { replies, sendReply, loading: repliesLoading } = useMessageReplies(firstMessageId);

  useEffect(() => {
    const fetchVisitorMessages = async () => {
      if (!visitorId || !user) return;

      try {
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

        let query = supabase
          .from("visitor_messages" as any)
          .select("*, business_card:visitor_business_cards(*)")
          .eq("habitation_id", residentData.habitation_id)
          .order("created_at", { ascending: true });

        const isAnonId = visitorId.startsWith("anon-");
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitorId);
        
        if (isAnonId) {
          const messageId = visitorId.replace("anon-", "");
          query = query.eq("id", messageId);
        } else if (isUuid) {
          query = query.eq("business_card_id", visitorId);
        } else {
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
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="glass-card p-6">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      </div>
    );
  }

  if (visitorMessages.length === 0) {
    return null;
  }

  const messageWithCard = visitorMessages.find(m => m.business_card);
  const card = messageWithCard?.business_card;
  const isCompany = card?.card_type === "company";
  const displayName = card
    ? isCompany
      ? card.company_name
      : `${card.first_name || ""} ${card.last_name || ""}`.trim()
    : visitorMessages[0]?.visitor_phone || "Visiteur";

  const allMessages = [
    ...visitorMessages.map(m => ({ type: 'visitor' as const, data: m, date: new Date(m.created_at) })),
    ...replies.map(r => ({ type: 'reply' as const, data: r, date: new Date(r.created_at) }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const messagesWithDateSeparators: { type: 'separator' | 'visitor' | 'reply'; data: any; date: Date }[] = [];
  let lastDateStr = "";
  
  allMessages.forEach((msg) => {
    const dateStr = format(msg.date, "yyyy-MM-dd");
    if (dateStr !== lastDateStr) {
      messagesWithDateSeparators.push({ type: 'separator', data: { label: formatDateSeparator(msg.date) }, date: msg.date });
      lastDateStr = dateStr;
    }
    messagesWithDateSeparators.push(msg);
  });

  return (
    <div className="min-h-screen flex flex-col gradient-bg pb-20">
      {/* Header - Transparent with glassmorphism */}
      <div className="glass-header sticky top-0 z-10">
        <div className="flex items-center gap-3 px-3 py-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/messages")} 
            className="text-white hover:bg-white/10 rounded-full"
          >
            <Menu className="w-6 h-6" />
          </Button>
          
          <div className="flex-1 text-center">
            <p className="font-semibold text-white text-lg">{displayName}</p>
          </div>

          {/* Avatar with thick white border */}
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-[3px] border-white shadow-lg">
            {isCompany ? (
              <Building2 className="w-6 h-6 text-white" />
            ) : (
              <User className="w-6 h-6 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Contact Info Card */}
      {card && (card.phone || card.email || card.visitor_anr_code) && (
        <div className="mx-4 mt-3">
          <div className="glass-card p-3">
            <div className="flex flex-wrap gap-3 text-sm">
              {card.phone && (
                <a href={`tel:${card.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                  <Phone className="w-4 h-4" />
                  {card.phone}
                </a>
              )}
              {card.email && (
                <a href={`mailto:${card.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                  <Mail className="w-4 h-4" />
                  {card.email}
                </a>
              )}
              {card.visitor_anr_code && (
                <span className="flex items-center gap-1 text-gray-500">
                  <MapPin className="w-4 h-4" />
                  ANR: {card.visitor_anr_code}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messagesWithDateSeparators.map((item, index) => {
          if (item.type === 'separator') {
            return (
              <div key={`sep-${index}`} className="flex justify-center my-4">
                <span className="bg-white/80 backdrop-blur-sm text-gray-600 text-xs px-4 py-1.5 rounded-full shadow-sm font-medium">
                  {item.data.label}
                </span>
              </div>
            );
          }

          if (item.type === 'visitor') {
            const msg = item.data;
            return (
              <div key={`visitor-${msg.id}`} className="flex justify-start">
                {msg.voice_message_url ? (
                  <div className="max-w-[80%]">
                    <WhatsAppAudioPlayer 
                      audioUrl={msg.voice_message_url} 
                      isOwn={false}
                      showAvatar={true}
                    />
                    <p className="text-xs text-white/70 mt-1 ml-2">
                      {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                    </p>
                  </div>
                ) : (
                  <div className="bubble-received">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.message}</p>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                    </p>
                  </div>
                )}
              </div>
            );
          } else {
            const reply = item.data;
            return (
              <div key={`reply-${reply.id}`} className="flex justify-end">
                {reply.reply_voice_url ? (
                  <div className="max-w-[80%]">
                    <WhatsAppAudioPlayer 
                      audioUrl={reply.reply_voice_url} 
                      isOwn={true}
                      showAvatar={true}
                    />
                    <div className="flex items-center justify-end gap-1 mt-1 mr-2">
                      <span className="text-xs text-white/70">
                        {format(new Date(reply.created_at), "HH:mm", { locale: fr })}
                      </span>
                      {reply.is_read ? (
                        <CheckCheck className="w-4 h-4 text-white" />
                      ) : (
                        <Check className="w-4 h-4 text-white/70" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bubble-sent">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{reply.reply_text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs text-gray-600">
                        {format(new Date(reply.created_at), "HH:mm", { locale: fr })}
                      </span>
                      {reply.is_read ? (
                        <CheckCheck className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Check className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          }
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Pill style EXACT from mockup */}
      <div className="sticky bottom-20 px-4 py-3">
        {showVoiceRecorder ? (
          <div className="glass-card p-3">
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
          </div>
        ) : (
          <div className="input-pill flex items-center gap-3">
            {/* Attachment icon */}
            <button className="text-blue-500 hover:text-blue-600 transition-colors p-1">
              <Paperclip className="w-6 h-6" />
            </button>

            {/* Input Field */}
            <input
              type="text"
              placeholder="Écrivez un message..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 bg-transparent border-0 outline-none text-gray-800 placeholder:text-gray-400 text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && replyText.trim()) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            {/* Send/Mic button - Round gradient */}
            <button 
              className="send-button-round flex-shrink-0"
              onClick={() => {
                if (replyText.trim()) {
                  handleSend();
                } else {
                  setShowVoiceRecorder(true);
                }
              }}
              disabled={sending}
            >
              {replyText.trim() ? (
                <Send className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Conversation;
