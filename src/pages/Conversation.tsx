import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Building2, User, Phone, Mail, MapPin, Check, CheckCheck, Loader2, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

        // Determine if visitorId is a business_card_id, message ID (anon-xxx), or visitor_phone
        let query = supabase
          .from("visitor_messages" as any)
          .select("*, business_card:visitor_business_cards(*)")
          .eq("habitation_id", residentData.habitation_id)
          .order("created_at", { ascending: true });

        // Check if visitorId is an anon-{messageId} pattern
        const isAnonId = visitorId.startsWith("anon-");
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitorId);
        
        if (isAnonId) {
          // Extract the message ID and fetch that specific message
          const messageId = visitorId.replace("anon-", "");
          query = query.eq("id", messageId);
        } else if (isUuid) {
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

  // Group messages by date for separators
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
    <div className="min-h-screen flex flex-col bg-[hsl(30,25%,92%)] pb-20">
      {/* Header - WhatsApp style */}
      <div className="sticky top-0 z-10 bg-[hsl(168,76%,36%)] text-white px-2 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/messages")} className="text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            {isCompany ? (
              <Building2 className="w-5 h-5" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{displayName}</p>
            {card?.job_title && (
              <p className="text-xs opacity-80 truncate">{card.job_title}</p>
            )}
          </div>

          {card && (
            <AddToContactsButton businessCard={card} messageId={visitorMessages[0]?.id} size="icon" variant="ghost" className="text-white hover:bg-white/10" />
          )}
        </div>
      </div>

      {/* Contact Info Expandable */}
      {card && (card.phone || card.email || card.visitor_anr_code) && (
        <div className="mx-3 mt-3 p-3 bg-card rounded-lg border border-purple-500 shadow-sm">
          <div className="flex flex-wrap gap-3 text-sm">
            {card.phone && (
              <a href={`tel:${card.phone}`} className="flex items-center gap-1 text-blue-500 hover:underline">
                <Phone className="w-4 h-4" />
                {card.phone}
              </a>
            )}
            {card.email && (
              <a href={`mailto:${card.email}`} className="flex items-center gap-1 text-orange-500 hover:underline">
                <Mail className="w-4 h-4" />
                {card.email}
              </a>
            )}
            {card.visitor_anr_code && (
              <span className="flex items-center gap-1 text-green-500">
                <MapPin className="w-4 h-4" />
                ANR: {card.visitor_anr_code}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Messages Area - WhatsApp style background */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {messagesWithDateSeparators.map((item, index) => {
          if (item.type === 'separator') {
            return (
              <div key={`sep-${index}`} className="flex justify-center my-3">
                <span className="bg-white/80 text-muted-foreground text-xs px-3 py-1 rounded-lg shadow-sm">
                  {item.data.label}
                </span>
              </div>
            );
          }

          if (item.type === 'visitor') {
            const msg = item.data;
            return (
              <div key={`visitor-${msg.id}`} className="flex justify-start">
                <div className="max-w-[85%]">
                  {msg.voice_message_url ? (
                    <div className="mb-1">
                      <WhatsAppAudioPlayer 
                        audioUrl={msg.voice_message_url} 
                        isOwn={false}
                        showAvatar={true}
                      />
                      <p className="text-xs text-muted-foreground mt-1 ml-2">
                        {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-card rounded-xl rounded-tl-sm px-3 py-2 shadow-sm border">
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          } else {
            const reply = item.data;
            return (
              <div key={`reply-${reply.id}`} className="flex justify-end">
                <div className="max-w-[85%]">
                  {reply.reply_voice_url ? (
                    <div className="mb-1">
                      <WhatsAppAudioPlayer 
                        audioUrl={reply.reply_voice_url} 
                        isOwn={true}
                        showAvatar={true}
                      />
                      <div className="flex items-center justify-end gap-1 mt-1 mr-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(reply.created_at), "HH:mm", { locale: fr })}
                        </span>
                        {reply.is_read ? (
                          <CheckCheck className="w-4 h-4 text-primary" />
                        ) : (
                          <Check className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[hsl(142,70%,85%)] rounded-xl rounded-tr-sm px-3 py-2 shadow-sm">
                      <p className="text-sm whitespace-pre-wrap text-[hsl(142,30%,20%)]">{reply.reply_text}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-xs text-[hsl(142,30%,40%)]">
                          {format(new Date(reply.created_at), "HH:mm", { locale: fr })}
                        </span>
                        {reply.is_read ? (
                          <CheckCheck className="w-4 h-4 text-primary" />
                        ) : (
                          <Check className="w-4 h-4 text-[hsl(142,30%,50%)]" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - WhatsApp style */}
      <div className="sticky bottom-20 bg-[hsl(30,15%,88%)] px-2 py-2">
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
          <div className="flex items-center gap-2">
            {/* Emoji/Chatbot icon */}
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Smile className="w-6 h-6" />
            </button>

            {/* Input Field */}
            <div className="flex-1 bg-card rounded-full px-4 py-2 flex items-center border shadow-sm">
              <Input
                placeholder="Entrez un message"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="border-0 p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && replyText.trim()) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>

            {/* Mic button - main action when no text */}
            <button 
              className="p-3 rounded-full bg-[hsl(168,76%,36%)] text-white hover:bg-[hsl(168,76%,30%)] transition-colors shadow-lg"
              onClick={() => {
                if (replyText.trim()) {
                  handleSend();
                } else {
                  setShowVoiceRecorder(true);
                }
              }}
              disabled={sending}
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Conversation;
