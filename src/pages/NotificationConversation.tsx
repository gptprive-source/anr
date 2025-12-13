import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Loader2, Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useUserCommunications } from "@/hooks/useAdminCommunications";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import BottomNav from "@/components/layout/BottomNav";

const formatDateSeparator = (date: Date) => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  return format(date, "EEEE d MMMM", { locale: fr });
};

interface CommunicationReply {
  id: string;
  communication_id: string;
  user_id: string;
  reply_text: string;
  created_at: string;
  is_admin?: boolean;
}

const NotificationConversation = () => {
  const { communicationId } = useParams<{ communicationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<CommunicationReply[]>([]);

  const { communications, markAsRead: markCommAsRead, sendReply } = useUserCommunications();

  // Find the communication
  const communication = communications.find(c => c.id === communicationId);

  // Fetch replies directly from database with real-time subscription
  useEffect(() => {
    if (!communicationId || !user) return;

    const fetchReplies = async () => {
      const { data } = await supabase
        .from('communication_replies')
        .select('*')
        .eq('communication_id', communicationId)
        .order('created_at', { ascending: true });

      if (data) {
        // Mark replies as admin or user
        setReplies(data.map(r => ({
          ...r,
          is_admin: r.user_id !== user.id
        })));
      }
    };

    fetchReplies();

    // Real-time subscription for new replies
    const channel = supabase
      .channel(`conv-replies-${communicationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'communication_replies',
        filter: `communication_id=eq.${communicationId}`
      }, () => fetchReplies())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communicationId, user]);

  useEffect(() => {
    if (communications.length > 0) {
      setLoading(false);
      
      // Mark as read
      if (communication) {
        markCommAsRead(communication.id);
        
        // Auto-delete corresponding notifications for this communication
        if (user?.id) {
          supabase
            .from("user_notifications")
            .select("id, data")
            .eq("user_id", user.id)
            .in("type", ["admin_communication", "communication_reply"])
            .then(({ data: notifs }) => {
              if (notifs) {
                const notifIdsToDelete = notifs
                  .filter(n => n.data && (n.data as any).communication_id === communication.id)
                  .map(n => n.id);
                
                if (notifIdsToDelete.length > 0) {
                  supabase.from("user_notifications").delete().in("id", notifIdsToDelete);
                }
              }
            });
        }
      }
    }
  }, [communications, communication, user]);

  // Scroll to bottom
  useEffect(() => {
    if (!loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [loading, replies]);

  const handleSendReply = async () => {
    if (!communication || !replyText.trim()) return;
    setSending(true);
    const success = await sendReply(communication.id, replyText.trim());
    setSending(false);
    if (success) {
      setReplyText("");
      toast({
        title: "Réponse envoyée",
        description: "Votre message a été transmis à l'équipe ANR"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!communication) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Communication introuvable</p>
        <Button onClick={() => navigate("/messages")}>
          Retour aux messages
        </Button>
      </div>
    );
  }

  // Build messages list
  const messages: { type: 'anr' | 'user'; content: string; date: Date; title?: string }[] = [];

  // Add initial communication
  messages.push({
    type: 'anr',
    title: communication.title,
    content: communication.content,
    date: new Date(communication.sent_at)
  });

  // Add all replies (user and admin)
  replies.forEach(reply => {
    messages.push({
      type: reply.is_admin ? 'anr' : 'user',
      content: reply.reply_text,
      date: new Date(reply.created_at),
      title: reply.is_admin ? 'Réponse de l\'équipe ANR' : undefined
    });
  });

  // Sort by date
  messages.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Group by date for separators
  const messagesWithSeparators: { type: 'separator' | 'anr' | 'user'; data: any; date: Date }[] = [];
  let lastDateStr = "";
  messages.forEach(msg => {
    const dateStr = format(msg.date, "yyyy-MM-dd");
    if (dateStr !== lastDateStr) {
      messagesWithSeparators.push({
        type: 'separator',
        data: { label: formatDateSeparator(msg.date) },
        date: msg.date
      });
      lastDateStr = dateStr;
    }
    messagesWithSeparators.push({
      type: msg.type,
      data: msg,
      date: msg.date
    });
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#E5DDD5]">
      {/* Header - WhatsApp style */}
      <div className="sticky top-0 z-10 bg-[#075E54] text-white p-3 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/messages")}
            className="text-white hover:bg-white/20 h-9 w-9"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <Avatar className="h-10 w-10 border-2 border-white/30">
            <AvatarFallback className="bg-primary text-white font-bold">
              ANR
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-base truncate">
                ANR
              </h1>
              <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                Système
              </Badge>
            </div>
            <p className="text-xs text-white/70 truncate">
              {communication.title}
            </p>
          </div>

          <MessageCircle className="w-5 h-5 text-blue-300" />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 pb-32">
        {messagesWithSeparators.map((item, index) => {
          if (item.type === 'separator') {
            return (
              <div key={`sep-${index}`} className="flex justify-center my-3">
                <span className="bg-white/90 text-gray-600 text-xs px-3 py-1 rounded-full shadow-sm">
                  {item.data.label}
                </span>
              </div>
            );
          }

          const isAnr = item.type === 'anr';
          const msg = item.data;

          return (
            <div
              key={`msg-${index}`}
              className={`flex mb-2 ${isAnr ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 shadow-sm ${
                  isAnr 
                    ? "bg-white rounded-tl-none" 
                    : "bg-[#DCF8C6] rounded-tr-none"
                }`}
              >
                {isAnr && msg.title && (
                  <p className="font-semibold text-sm text-primary mb-1">
                    {msg.title}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words text-gray-800">
                  {msg.content}
                </p>
                <div className={`flex items-center gap-1 mt-1 ${isAnr ? "justify-start" : "justify-end"}`}>
                  <span className="text-[10px] text-gray-500">
                    {format(msg.date, "HH:mm", { locale: fr })}
                  </span>
                  {isAnr && (
                    <Lock className="w-3 h-3 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area - always show for communications */}
      <div className="fixed bottom-16 left-0 right-0 bg-[#F0F0F0] p-2 border-t border-gray-200">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Répondre à ANR..."
              className="min-h-[40px] max-h-[120px] py-2 px-4 pr-10 resize-none rounded-full bg-white border-0 shadow-sm text-sm"
              rows={1}
              disabled={sending}
            />
          </div>

          <Button
            size="icon"
            className="h-10 w-10 rounded-full bg-[#075E54] hover:bg-[#064940] flex-shrink-0"
            onClick={handleSendReply}
            disabled={!replyText.trim() || sending}
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default NotificationConversation;
