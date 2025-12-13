import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  text: string;
  isAdmin: boolean;
  createdAt: Date;
  userName?: string;
}

interface Communication {
  id: string;
  title: string;
  content: string;
  sent_at: string;
  sender_id: string;
}

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
}

export default function AdminConversation() {
  const { communicationId, userId } = useParams();
  const navigate = useNavigate();
  const [communication, setCommunication] = useState<Communication | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchConversation = async () => {
    if (!communicationId || !userId) return;

    try {
      // Fetch communication
      const { data: comm } = await supabase
        .from('admin_communications')
        .select('*')
        .eq('id', communicationId)
        .single();

      if (comm) {
        setCommunication(comm);
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();

      if (profile) {
        setUserProfile(profile);
      }

      // Fetch all replies for this communication from this user AND admin replies
      const { data: replies } = await supabase
        .from('communication_replies')
        .select('*')
        .eq('communication_id', communicationId)
        .order('created_at', { ascending: true });

      // Build messages array
      const msgs: Message[] = [];

      // Add original communication as first message (from admin)
      if (comm) {
        msgs.push({
          id: 'original',
          text: comm.content,
          isAdmin: true,
          createdAt: new Date(comm.sent_at),
          userName: 'Équipe ANR'
        });
      }

      // Add replies - determine if from user or admin
      if (replies) {
        for (const reply of replies) {
          const isFromUser = reply.user_id === userId;
          msgs.push({
            id: reply.id,
            text: reply.reply_text,
            isAdmin: !isFromUser,
            createdAt: new Date(reply.created_at),
            userName: isFromUser 
              ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Utilisateur'
              : 'Équipe ANR'
          });
        }
      }

      setMessages(msgs);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversation();

    // Real-time subscription for new replies
    const channel = supabase
      .channel(`admin-conv-${communicationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'communication_replies',
          filter: `communication_id=eq.${communicationId}`
        },
        () => {
          fetchConversation();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communicationId, userId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !communicationId || !userId) return;

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert admin reply
      const { error } = await supabase
        .from('communication_replies')
        .insert({
          communication_id: communicationId,
          user_id: user.id, // Admin's user_id
          reply_text: replyText
        });

      if (error) throw error;

      // Create notification for the user
      await supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          type: 'communication_reply',
          title: '💬 Réponse de l\'équipe ANR',
          message: replyText.substring(0, 150) + (replyText.length > 150 ? '...' : ''),
          data: { 
            communication_id: communicationId,
            is_admin_reply: true
          }
        });

      toast({
        title: "Réponse envoyée",
        description: `Message envoyé à ${userProfile?.first_name || 'l\'utilisateur'}`
      });

      setReplyText('');
      await fetchConversation();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const userName = userProfile 
    ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Utilisateur'
    : 'Utilisateur';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => navigate('/admin/communications')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">{userName}</h1>
            <p className="text-xs text-primary-foreground/70 truncate">
              {communication?.title || 'Conversation'}
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4 bg-[#E5DDD5]">
        <div className="space-y-3 max-w-3xl mx-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 shadow-sm ${
                  msg.isAdmin
                    ? 'bg-[#DCF8C6] rounded-tr-none'
                    : 'bg-white rounded-tl-none'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {msg.isAdmin ? (
                    <Shield className="h-3 w-3 text-primary" />
                  ) : (
                    <User className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium text-muted-foreground">
                    {msg.userName}
                  </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{msg.text}</p>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {format(msg.createdAt, 'dd MMM à HH:mm', { locale: fr })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-background border-t">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Votre réponse..."
            className="resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendReply();
              }
            }}
          />
          <Button
            onClick={handleSendReply}
            disabled={!replyText.trim() || sending}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
