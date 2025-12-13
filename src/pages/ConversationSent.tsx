import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Lock, Loader2, Smile, Send, Mic, Paperclip, X, Image, Video, Camera, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSentMessages } from "@/hooks/useSentMessages";
import { useVisitorMessages } from "@/hooks/useVisitorMessages";
import { useEncryptedMessages } from "@/hooks/useEncryptedMessages";
import WhatsAppAudioPlayer from "@/components/messages/WhatsAppAudioPlayer";
import VoiceRecorder from "@/components/visitor/VoiceRecorder";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import BottomNav from "@/components/layout/BottomNav";

const EMOJI_CATEGORIES = {
  "😊 Smileys": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😉", "😊", "😇", "🥰", "😍", "😘", "😗"],
  "👋 Gestes": ["👋", "🤚", "✋", "👌", "🤌", "✌️", "🤞", "🤟", "🤘", "👍", "👎", "👏", "🙌", "🤝", "🙏"],
  "❤️ Coeurs": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💕", "💖", "💗", "💘", "💝"],
};

const formatDateSeparator = (date: Date) => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  return format(date, "EEEE d MMMM", { locale: fr });
};

const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <a 
          key={index} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 underline hover:text-blue-600 break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

const ConversationSent = () => {
  const { habitationId } = useParams<{ habitationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [habitationInfo, setHabitationInfo] = useState<{ name: string; address: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const { messages, replies, getConversationMessages, markReplyAsRead, businessCard } = useSentMessages();
  const { sendMessage } = useVisitorMessages();
  const { encryptMessageForResident, isReady: encryptionReady } = useEncryptedMessages(habitationId || undefined);

  // Get conversation data for this habitation
  const conversationData = habitationId ? getConversationMessages(habitationId) : { messages: [], replies: [] };

  // Fetch habitation info
  useEffect(() => {
    const fetchHabitationInfo = async () => {
      if (!habitationId) return;

      const { data } = await supabase
        .from("habitations")
        .select("name, anr:anrs(address)")
        .eq("id", habitationId)
        .maybeSingle();

      if (data) {
        setHabitationInfo({
          name: data.name || "Résidence",
          address: (data.anr as any)?.address || "",
        });
      }
      setLoading(false);
    };

    fetchHabitationInfo();
  }, [habitationId]);

  // Mark replies as read
  useEffect(() => {
    conversationData.replies
      .filter(r => !r.is_read)
      .forEach(r => markReplyAsRead(r.id));
  }, [conversationData.replies]);

  // Scroll handling
  const hasScrolledRef = useRef(false);
  useLayoutEffect(() => {
    if (!loading && conversationData.messages.length > 0 && !hasScrolledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      hasScrolledRef.current = true;
    }
  }, [loading, conversationData.messages.length]);

  useEffect(() => {
    if (hasScrolledRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [conversationData.replies.length]);

  const handleSend = async () => {
    if (!habitationId || (!newMessage.trim() && !audioBlob)) return;

    setSending(true);
    try {
      let audioBase64: string | undefined;
      if (audioBlob) {
        const buffer = await audioBlob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        audioBase64 = btoa(String.fromCharCode(...bytes));
      }

      // Encrypt message if ready
      let encryptionData: { encrypted_message: string; message_nonce: string; visitor_public_key: string } | undefined;
      if (encryptionReady && newMessage.trim()) {
        try {
          encryptionData = await encryptMessageForResident(newMessage.trim());
        } catch (error) {
          console.warn('Encryption failed, sending unencrypted:', error);
        }
      }

      const result = await sendMessage(
        habitationId,
        newMessage.trim() || undefined,
        undefined,
        undefined,
        businessCard?.id,
        audioBase64,
        encryptionData
      );

      if (result.success) {
        setNewMessage("");
        setAudioBlob(null);
        setShowVoiceRecorder(false);
        toast({
          title: "Message envoyé",
          description: "Le résident recevra votre message",
        });
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

  if (!habitationInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground">Conversation introuvable</p>
          <Button className="mt-4" onClick={() => navigate("/messages")}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  // Combine messages and replies chronologically
  // For visitor: their sent messages are on the RIGHT (green), replies from resident on LEFT (gray)
  const allMessages = [
    ...conversationData.messages.map(m => ({ type: 'sent' as const, data: m, date: new Date(m.created_at) })),
    ...conversationData.replies.map(r => ({ type: 'reply' as const, data: r, date: new Date(r.created_at) }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Group messages by date
  const messagesWithDateSeparators: { type: 'separator' | 'sent' | 'reply'; data: any; date: Date }[] = [];
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
    <div className="min-h-screen flex flex-col pb-16 bg-[#E5DDD5]">
      {/* WhatsApp-style Header */}
      <div className="sticky top-0 z-10 bg-[#075E54] shadow-md">
        <div className="max-w-2xl mx-auto w-full px-2 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate("/messages")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <Avatar className="w-10 h-10 flex-shrink-0 border-2 border-white/20">
              <AvatarFallback className="bg-white/20">
                <Home className="w-5 h-5 text-white" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{habitationInfo.name}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-white/70 truncate">{habitationInfo.address}</p>
                <div className="flex items-center gap-1 text-[10px] text-white/60" title="Chiffrement E2E">
                  <Lock className="w-2.5 h-2.5" />
                  <span>E2E</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area - WhatsApp chat background */}
      <div className="flex-1 overflow-y-auto px-3 py-4 pb-40 space-y-2 max-w-2xl mx-auto w-full">
        {messagesWithDateSeparators.map((item, index) => {
          if (item.type === 'separator') {
            return (
              <div key={`sep-${index}`} className="flex justify-center my-3">
                <span className="bg-[#E1F2FB] text-[#54656F] text-xs px-3 py-1.5 rounded-lg shadow-sm">
                  {item.data.label}
                </span>
              </div>
            );
          }

          // Sent messages (visitor's own) - RIGHT side, GREEN
          if (item.type === 'sent') {
            const msg = item.data;
            return (
              <div key={`sent-${msg.id}`} className="flex justify-end">
                <div className="max-w-[85%]">
                  {msg.voice_message_url ? (
                    <div className="mb-1">
                      <WhatsAppAudioPlayer 
                        audioUrl={msg.voice_message_url} 
                        isOwn={true}
                        showAvatar={true}
                      />
                      <div className="flex items-center justify-end gap-1 mt-1 mr-2">
                        <span className="text-[11px] text-[#667781]">
                          {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                        </span>
                        {msg.is_read ? (
                          <CheckCheck className="w-4 h-4 text-[#53BDEB]" />
                        ) : (
                          <Check className="w-4 h-4 text-[#667781]" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#D9FDD3] rounded-lg rounded-tr-none px-3 py-2 shadow-sm">
                      <p className="text-sm text-[#111B21] whitespace-pre-wrap">{renderTextWithLinks(msg.message || "")}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        {msg.is_encrypted && <Lock className="w-3 h-3 text-[#667781]" />}
                        <span className="text-[11px] text-[#667781]">
                          {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                        </span>
                        {msg.is_read ? (
                          <CheckCheck className="w-4 h-4 text-[#53BDEB]" />
                        ) : (
                          <Check className="w-4 h-4 text-[#667781]" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Replies from resident - LEFT side, WHITE
          const reply = item.data;
          return (
            <div key={`reply-${reply.id}`} className="flex justify-start">
              <div className="max-w-[85%]">
                {reply.reply_voice_url ? (
                  <div className="mb-1">
                    <WhatsAppAudioPlayer 
                      audioUrl={reply.reply_voice_url} 
                      isOwn={false}
                      showAvatar={true}
                    />
                    <p className="text-[11px] text-[#667781] mt-1 ml-2">
                      {format(new Date(reply.created_at), "HH:mm", { locale: fr })}
                    </p>
                  </div>
                ) : reply.reply_media_url ? (
                  <div className="bg-white rounded-lg rounded-tl-none p-1 shadow-sm overflow-hidden">
                    {reply.reply_media_type === 'video' ? (
                      <video 
                        src={reply.reply_media_url} 
                        controls 
                        className="max-w-full rounded-md max-h-64"
                      />
                    ) : (
                      <img 
                        src={reply.reply_media_url} 
                        alt="Photo" 
                        className="max-w-full rounded-md max-h-64 cursor-pointer"
                        onClick={() => window.open(reply.reply_media_url, '_blank')}
                      />
                    )}
                    {reply.reply_text && (
                      <p className="text-sm text-[#111B21] whitespace-pre-wrap px-2 py-1">{renderTextWithLinks(reply.reply_text)}</p>
                    )}
                    <p className="text-[11px] text-[#667781] px-2 py-1 text-right">
                      {format(new Date(reply.created_at), "HH:mm", { locale: fr })}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 shadow-sm">
                    <p className="text-sm text-[#111B21] whitespace-pre-wrap">{renderTextWithLinks(reply.reply_text || "")}</p>
                    <p className="text-[11px] text-[#667781] mt-1 text-right">
                      {format(new Date(reply.created_at), "HH:mm", { locale: fr })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - WhatsApp style */}
      <div className="fixed bottom-16 left-0 right-0 bg-[#F0F2F5] px-2 py-2">
        <div className="max-w-2xl mx-auto w-full">
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
              {/* Left icons */}
              <div className="flex items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-2 text-[#54656F] hover:text-[#075E54] transition-colors">
                      <Smile className="w-6 h-6" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2 max-h-48 overflow-y-auto" side="top" align="start">
                    <div className="space-y-2">
                      {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                        <div key={category}>
                          <p className="text-xs font-medium text-muted-foreground mb-1">{category}</p>
                          <div className="grid grid-cols-8 gap-1">
                            {emojis.map((emoji, index) => (
                              <button
                                key={index}
                                className="text-lg p-0.5 hover:bg-muted rounded transition-colors"
                                onClick={() => setNewMessage(prev => prev + emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Input Field */}
              <div className="flex-1 bg-white rounded-full px-4 py-2 shadow-sm">
                <Textarea
                  placeholder="Message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full border-0 p-0 min-h-[24px] max-h-24 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 resize-none overflow-y-auto text-[#111B21]"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  style={{ height: 'auto', minHeight: '24px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 96) + 'px';
                  }}
                />
              </div>

              {/* Send/Mic button */}
              {newMessage.trim() ? (
                <button 
                  className="p-3 rounded-full bg-[#075E54] text-white hover:bg-[#064E46] transition-colors shadow-md" 
                  onClick={handleSend} 
                  disabled={sending}
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              ) : (
                <button 
                  className="p-3 rounded-full bg-[#075E54] text-white hover:bg-[#064E46] transition-colors shadow-md"
                  onClick={() => setShowVoiceRecorder(true)}
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ConversationSent;
