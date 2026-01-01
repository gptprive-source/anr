import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send, Mic, Paperclip, MoreVertical, Phone, Loader2, X, Check, CheckCheck, Copy, Forward, Trash2, Clock, Square, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useChats, ChatMessage } from "@/hooks/useChats";
import { useAuth } from "@/hooks/useAuth";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import WhatsAppAudioPlayer from "@/components/messages/WhatsAppAudioPlayer";
import ForwardMessageDialog from "@/components/messages/ForwardMessageDialog";

// ANR context passed from scanner/landing
interface AnrContext {
  anrCode?: string;
  anrId?: string;
  habitationId?: string;
  address?: string;
}
interface RecipientProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}
const formatMessageDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  return format(date, "EEEE d MMMM yyyy", {
    locale: fr
  });
};
const formatMessageTime = (dateString: string): string => {
  return format(new Date(dateString), "HH:mm");
};
const MessageBubble = ({
  message,
  isOwn,
  onDelete,
  onDeleteForEveryone,
  onForward,
  onCopy
}: {
  message: ChatMessage;
  isOwn: boolean;
  onDelete: () => void;
  onDeleteForEveryone: () => void;
  onForward: () => void;
  onCopy: () => void;
}) => {
  const [showActions, setShowActions] = useState(false);

  // Check if message can be deleted for everyone (within 7 minutes)
  const canDeleteForEveryone = isOwn && message.created_at && Date.now() - new Date(message.created_at).getTime() < 7 * 60 * 1000;

  // Handle deleted messages
  if (message.deleted_for_everyone) {
    return <div className={cn("flex mb-2", isOwn ? "justify-end" : "justify-start")}>
        <div className="px-3 py-2 rounded-lg bg-muted/50 border border-dashed border-border italic text-muted-foreground text-sm">
          Ce message a été supprimé
        </div>
      </div>;
  }
  const renderContent = () => {
    switch (message.message_type) {
      case "voice":
        return <WhatsAppAudioPlayer audioUrl={message.voice_url || ""} isOwn={isOwn} showAvatar={false} />;
      case "media":
        return <div className="max-w-[250px]">
            {message.media_type === "video" ? <video src={message.media_url || ""} controls className="rounded-lg w-full" /> : <img src={message.media_url || ""} alt="Media" className="rounded-lg w-full cursor-pointer" onClick={() => window.open(message.media_url || "", "_blank")} />}
            {message.content && <p className="mt-2 text-sm">{message.content}</p>}
          </div>;
      case "missed_call":
        return <div className="flex items-center gap-2 text-destructive">
            <Phone className="w-4 h-4 text-[#050505]" />
            <span className="text-sm font-semibold text-black">Appel manqué</span>
          </div>;
      case "call_ended":
        return <div className="flex items-center gap-2 text-primary">
            <Phone className="w-4 h-4" />
            <span className="text-sm">
              Appel • {message.call_duration_seconds ? `${Math.floor(message.call_duration_seconds / 60)}:${(message.call_duration_seconds % 60).toString().padStart(2, "0")}` : "0:00"}
            </span>
          </div>;
      default:
        return <p className="text-sm whitespace-pre-wrap break-words font-semibold">{message.content}</p>;
    }
  };
  return (
    <>
      {/* Overlay to close menu when clicking outside */}
      {showActions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowActions(false)}
        />
      )}
      <div className={cn("flex mb-2 group", isOwn ? "justify-end" : "justify-start")}>
        <div 
          className={cn("relative max-w-[80%] px-3 py-2 rounded-lg", isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm")} 
          onContextMenu={e => {
            e.preventDefault();
            setShowActions(true);
          }} 
          onClick={() => setShowActions(!showActions)}
        >
          {/* Forwarded indicator */}
          {message.forwarded_from_id && (
            <div className={cn("flex items-center gap-1 text-xs mb-1", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
              <Forward className="w-3 h-3" />
              <span>Transféré</span>
            </div>
          )}

          {renderContent()}

          {/* Time and read status */}
          <div className={cn("flex items-center justify-end gap-1 mt-1", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
            <span className="text-[10px]">
              {message.created_at && formatMessageTime(message.created_at)}
            </span>
            {isOwn && (message.is_read ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />)}
          </div>

          {/* Actions menu */}
          {showActions && (
            <div className={cn("absolute top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]", isOwn ? "right-0" : "left-0")}>
              {message.message_type === "text" && message.content && (
                <button 
                  onClick={e => {
                    e.stopPropagation();
                    onCopy();
                    setShowActions(false);
                  }} 
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copier
                </button>
              )}
              <button 
                onClick={e => {
                  e.stopPropagation();
                  onForward();
                  setShowActions(false);
                }} 
                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
              >
                <Forward className="w-4 h-4" />
                Transférer
              </button>
              <button 
                onClick={e => {
                  e.stopPropagation();
                  onDelete();
                  setShowActions(false);
                }} 
                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer pour moi
              </button>
              {canDeleteForEveryone && (
                <button 
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteForEveryone();
                    setShowActions(false);
                  }} 
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                >
                  <Clock className="w-4 h-4" />
                  Supprimer pour tous
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
const Chat = () => {
  const {
    recipientId
  } = useParams<{
    recipientId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user
  } = useAuth();
  const {
    isOnline
  } = useOnlinePresence();
  const {
    getOrCreateChat,
    getChatMessages,
    sendMessage,
    markAsRead,
    deleteForMe,
    deleteForEveryone,
    forwardMessage,
    deleteChat,
    chats
  } = useChats();

  // Get ANR context from navigation state (when coming from ANR scan)
  const anrContext: AnrContext = {
    anrCode: location.state?.anrCode,
    anrId: location.state?.anrId,
    habitationId: location.state?.habitationId,
    address: location.state?.address
  };
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recipient, setRecipient] = useState<RecipientProfile | null>(null);
  const [recipientAnr, setRecipientAnr] = useState<{ code: string; habitationId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initChatRef = useRef(false);
  const currentRecipientRef = useRef<string | null>(null);

  // Handle call button - navigates to call page with ANR context
  const handleCallClick = () => {
    // Priority: navigation state context > fetched recipient ANR
    const anrCode = anrContext.anrCode || recipientAnr?.code;
    const habitationId = anrContext.habitationId || recipientAnr?.habitationId;

    console.log("[Chat] handleCallClick - anrContext:", anrContext);
    console.log("[Chat] handleCallClick - recipientAnr:", recipientAnr);
    console.log("[Chat] Navigating to call with anrCode:", anrCode, "habitationId:", habitationId);

    if (anrCode) {
      navigate(`/call/${anrCode}`, {
        state: {
          habitationId,
          targetUserId: recipientId
        }
      });
    } else {
      console.log("[Chat] No ANR code found, redirecting to visitor scanner");
      navigate(`/visitor?target=${recipientId}`);
    }
  };

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, []);

  // Initialize chat - only runs once per recipientId
  useEffect(() => {
    // Skip if already initialized for this recipient
    if (currentRecipientRef.current === recipientId && initChatRef.current) {
      return;
    }
    const initChat = async () => {
      if (!recipientId || !user) return;

      // Mark as initializing for this recipient
      currentRecipientRef.current = recipientId;
      initChatRef.current = true;
      setLoading(true);
      try {
        // Get or create chat
        const chat = await getOrCreateChat(recipientId);
        if (chat) {
          setChatId(chat.id);

          // Fetch messages
          const msgs = await getChatMessages(chat.id);
          setMessages(msgs);

          // Mark as read
          await markAsRead(chat.id);
        }

        // Fetch recipient profile
        const {
          data: profile
        } = await supabase.from("profiles").select("id, first_name, last_name, avatar_url").eq("id", recipientId).maybeSingle();
        setRecipient(profile);

        // Fetch recipient's ANR for calling (if they are a resident)
        const { data: residentData } = await supabase
          .from("residents")
          .select("habitation_id")
          .eq("user_id", recipientId)
          .maybeSingle();

        if (residentData?.habitation_id) {
          const { data: habData } = await supabase
            .from("habitations")
            .select("id, anr_id")
            .eq("id", residentData.habitation_id)
            .maybeSingle();
          
          if (habData?.anr_id) {
            const { data: anrData } = await supabase
              .from("anrs")
              .select("code")
              .eq("id", habData.anr_id)
              .maybeSingle();
            
            if (anrData?.code) {
              setRecipientAnr({
                code: anrData.code,
                habitationId: habData.id
              });
            }
          }
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
        // Reset on error to allow retry
        initChatRef.current = false;
      } finally {
        setLoading(false);
      }
    };
    initChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientId, user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase.channel(`chat-messages-${chatId}`).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "chat_messages",
      filter: `chat_id=eq.${chatId}`
    }, async payload => {
      if (payload.eventType === "INSERT") {
        const newMessage = payload.new as ChatMessage;
        setMessages(prev => [...prev, newMessage]);

        // Mark as read if from other user
        if (newMessage.sender_id !== user?.id) {
          await markAsRead(chatId);
        }
      } else if (payload.eventType === "UPDATE") {
        const updatedMessage = payload.new as ChatMessage;
        setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
      } else if (payload.eventType === "DELETE") {
        const deletedMessage = payload.old as ChatMessage;
        setMessages(prev => prev.filter(m => m.id !== deletedMessage.id));
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user?.id, markAsRead]);

  // Send text message
  const handleSendMessage = async () => {
    if (!chatId || !messageText.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(chatId, {
        content: messageText.trim()
      });
      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  // Start voice recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, {
          type: "audio/webm"
        });

        // Upload to storage
        const fileName = `voice/${user?.id}/${Date.now()}.webm`;
        const {
          data,
          error
        } = await supabase.storage.from("visitor-voice-messages").upload(fileName, blob);
        if (error) {
          toast.error("Erreur lors de l'upload du message vocal");
          return;
        }
        const {
          data: urlData
        } = supabase.storage.from("visitor-voice-messages").getPublicUrl(data.path);
        if (chatId) {
          await sendMessage(chatId, {
            voiceUrl: urlData.publicUrl
          });
        }
        setIsRecording(false);
        setMediaRecorder(null);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast.error("Impossible d'accéder au microphone");
    }
  };
  const stopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  };

  // Send media
  const handleSendMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!chatId || !e.target.files?.length) return;
    const file = e.target.files[0];
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("Format non supporté. Utilisez une image ou une vidéo.");
      return;
    }
    setSending(true);
    try {
      // Upload to Supabase storage
      const fileName = `${user?.id}/${Date.now()}_${file.name}`;
      const {
        data,
        error
      } = await supabase.storage.from("avatars") // Using existing bucket, could create a dedicated one
      .upload(fileName, file);
      if (error) throw error;
      const {
        data: urlData
      } = supabase.storage.from("avatars").getPublicUrl(data.path);
      await sendMessage(chatId, {
        mediaUrl: urlData.publicUrl,
        mediaType: isVideo ? "video" : "image"
      });
    } catch (error) {
      console.error("Error sending media:", error);
      toast.error("Erreur lors de l'envoi du fichier");
    } finally {
      setSending(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle message actions
  const handleCopy = (content: string | null) => {
    if (content) {
      navigator.clipboard.writeText(content);
      toast.success("Copié dans le presse-papiers");
    }
  };
  const handleDelete = async (messageId: string) => {
    await deleteForMe(messageId);
    setMessages(prev => prev.filter(m => m.id !== messageId));
    toast.success("Message supprimé");
  };
  const handleDeleteForEveryone = async (messageId: string) => {
    const success = await deleteForEveryone(messageId);
    if (success) {
      toast.success("Message supprimé pour tous");
    } else {
      toast.error("Impossible de supprimer ce message");
    }
  };
  const handleForward = async (messageId: string, toChatId: string) => {
    await forwardMessage(messageId, toChatId);
    setForwardingMessage(null);
    toast.success("Message transféré");
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    if (!message.created_at) return groups;
    const date = formatMessageDate(message.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessage[]>);
  const displayName = recipient?.first_name && recipient?.last_name ? `${recipient.first_name} ${recipient.last_name}` : recipient?.first_name || "Utilisateur";
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-3 shadow-md flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/messages")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={recipient?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {recipientId && isOnline(recipientId) && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-primary rounded-full" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{displayName}</p>
          {anrContext.address ? <p className="text-xs text-primary-foreground/70 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {anrContext.address.length > 30 ? anrContext.address.substring(0, 30) + '...' : anrContext.address}
            </p> : recipientId && isOnline(recipientId) && <p className="text-xs text-primary-foreground/70">En ligne</p>}
        </div>

        {/* Call button - always visible */}
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={handleCallClick}>
          <Phone className="w-5 h-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCallClick}>
              <Phone className="w-4 h-4 mr-2" />
              Appeler
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={async () => {
            if (chatId) {
              await deleteChat(chatId);
              toast.success("Conversation supprimée");
              navigate("/messages");
            }
          }}>
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer la conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {Object.entries(groupedMessages).map(([date, msgs]) => <div key={date}>
            {/* Date separator */}
            <div className="flex justify-center my-4">
              <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
                {date}
              </span>
            </div>
            
            {/* Messages for this date */}
            {msgs.map(message => <MessageBubble key={message.id} message={message} isOwn={message.sender_id === user?.id} onCopy={() => handleCopy(message.content)} onDelete={() => handleDelete(message.id)} onDeleteForEveryone={() => handleDeleteForEveryone(message.id)} onForward={() => setForwardingMessage(message)} />)}
          </div>)}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 safe-area-bottom">
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleSendMedia} />
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={sending || isRecording}>
            <Paperclip className="w-5 h-5" />
          </Button>
          
          {isRecording ? <>
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-full">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm text-destructive">Enregistrement...</span>
              </div>
              <Button size="icon" variant="destructive" onClick={stopVoiceRecording}>
                <Square className="w-4 h-4 fill-current" />
              </Button>
            </> : <>
              <Input placeholder="Message" value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }} className="flex-1" disabled={sending} />
              
              {messageText.trim() ? <Button size="icon" onClick={handleSendMessage} disabled={sending}>
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button> : <Button variant="ghost" size="icon" onClick={startVoiceRecording}>
                  <Mic className="w-5 h-5" />
                </Button>}
            </>}
        </div>
      </div>

      {/* Forward dialog */}
      {forwardingMessage && <ForwardMessageDialog open={!!forwardingMessage} onOpenChange={open => !open && setForwardingMessage(null)} messageId={forwardingMessage.id} chats={chats} currentChatId={chatId || ""} onForward={handleForward} />}
    </div>;
};
export default Chat;