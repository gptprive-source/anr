import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Mic, Paperclip, MoreVertical, Phone, Loader2, X, Check, CheckCheck, Copy, Forward, Trash2, Clock, Square, Smile, Video } from "lucide-react";

// Lazy load emoji picker to avoid build issues
const EmojiPicker = lazy(() => 
  Promise.all([
    import("@emoji-mart/react"),
    import("@emoji-mart/data")
  ]).then(([{ default: Picker }, { default: data }]) => ({
    default: (props: { onEmojiSelect: (emoji: { native: string }) => void }) => (
      <Picker data={data} onEmojiSelect={props.onEmojiSelect} theme="light" locale="fr" previewPosition="none" skinTonePosition="none" maxFrequentRows={2} />
    )
  }))
);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useChats, ChatMessage } from "@/hooks/useChats";
import { useAuth } from "@/hooks/useAuth";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import WhatsAppAudioPlayer from "@/components/messages/WhatsAppAudioPlayer";
import ForwardMessageDialog from "@/components/messages/ForwardMessageDialog";
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
  onCopy
}: {
  message: ChatMessage;
  isOwn: boolean;
  onDelete: () => void;
  onDeleteForEveryone: () => void;
  onCopy: () => void;
}) => {
  const [showActions, setShowActions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if message can be deleted for everyone (within 7 minutes)
  const canDeleteForEveryone = isOwn && message.created_at && Date.now() - new Date(message.created_at).getTime() < 7 * 60 * 1000;

  // Close menu when clicking outside
  useEffect(() => {
    if (!showActions) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActions]);

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
            <Phone className="w-4 h-4 text-[#ff1900] bg-white/0" />
            <span className="text-sm font-medium text-black">Appel manqué</span>
          </div>;
      case "call_ended":
        return <div className="flex items-center gap-2 text-primary">
            <Phone className="w-4 h-4" />
            <span className="text-sm font-medium">
              Appel • {message.call_duration_seconds ? `${Math.floor(message.call_duration_seconds / 60)}:${(message.call_duration_seconds % 60).toString().padStart(2, "0")}` : "0:00"}
            </span>
          </div>;
      default:
        return <p className="text-sm whitespace-pre-wrap break-words font-medium text-black">{message.content}</p>;
    }
  };
  return <div className={cn("flex mb-2 group", isOwn ? "justify-end" : "justify-start")}>
      <div className={cn("relative max-w-[80%] px-3 py-2 rounded-lg", isOwn ? "bg-bubble-sent text-bubble-sent-foreground rounded-br-sm" : "bg-muted rounded-bl-sm")} onContextMenu={e => {
      e.preventDefault();
      setShowActions(true);
    }} onClick={() => setShowActions(!showActions)}>
        {/* Forwarded indicator */}
        {message.forwarded_from_id && <div className={cn("flex items-center gap-1 text-xs mb-1", isOwn ? "text-bubble-sent-foreground/70" : "text-muted-foreground")}>
            <Forward className="w-3 h-3" />
            <span>Transféré</span>
          </div>}

        {renderContent()}

        {/* Time and read status */}
        <div className={cn("flex items-center justify-end gap-1 mt-1", isOwn ? "text-bubble-sent-foreground/70" : "text-muted-foreground")}>
          <span className="text-[10px]">
            {message.created_at && formatMessageTime(message.created_at)}
          </span>
          {isOwn && (message.is_read ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />)}
        </div>

        {/* Actions menu */}
        {showActions && <div ref={menuRef} className={cn("absolute top-full mt-1 z-10 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]", isOwn ? "right-0" : "left-0")}>
            {message.message_type === "text" && message.content && <button onClick={e => {
          e.stopPropagation();
          onCopy();
          setShowActions(false);
        }} className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-black">
                <Copy className="w-4 h-4" />
                Copier
              </button>}
            <button onClick={e => {
          e.stopPropagation();
          onDelete();
          setShowActions(false);
        }} className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />
              Supprimer pour moi
            </button>
            {canDeleteForEveryone && <button onClick={e => {
          e.stopPropagation();
          onDeleteForEveryone();
          setShowActions(false);
        }} className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive">
                <Clock className="w-4 h-4" />
                Supprimer pour tous
              </button>}
          </div>}
      </div>
    </div>;
};

// Input area component with emoji picker and video recording
const InputArea = ({
  messageText,
  setMessageText,
  sending,
  isRecording,
  isRecordingVideo,
  fileInputRef,
  handleSendMessage,
  handleSendMedia,
  startVoiceRecording,
  stopVoiceRecording,
  startVideoRecording,
  stopVideoRecording,
}: {
  messageText: string;
  setMessageText: (text: string) => void;
  sending: boolean;
  isRecording: boolean;
  isRecordingVideo: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleSendMessage: () => void;
  handleSendMedia: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startVoiceRecording: () => void;
  stopVoiceRecording: () => void;
  startVideoRecording: () => void;
  stopVideoRecording: () => void;
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  const handleEmojiSelect = (emoji: { native: string }) => {
    setMessageText(messageText + emoji.native);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 safe-area-bottom">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-full left-0 right-0 mb-2 flex justify-center z-50">
          <div className="shadow-lg rounded-lg overflow-hidden">
            <Suspense fallback={<div className="p-4 bg-background">Chargement...</div>}>
              <EmojiPicker onEmojiSelect={handleEmojiSelect} />
            </Suspense>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleSendMedia} />
        <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={sending || isRecording || isRecordingVideo}>
          <Paperclip className="w-5 h-5" />
        </Button>
        
        {isRecording ? (
          <>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-full">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm text-destructive">Enregistrement audio...</span>
            </div>
            <Button size="icon" variant="destructive" onClick={stopVoiceRecording}>
              <Square className="w-4 h-4 fill-current" />
            </Button>
          </>
        ) : isRecordingVideo ? (
          <>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-full">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-primary">Enregistrement vidéo...</span>
            </div>
            <Button size="icon" variant="default" onClick={stopVideoRecording}>
              <Square className="w-4 h-4 fill-current" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={sending}
            >
              <Smile className="w-5 h-5" />
            </Button>
            
            <Input
              placeholder="Message"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1"
              disabled={sending}
            />
            
            {messageText.trim() ? (
              <Button size="icon" onClick={handleSendMessage} disabled={sending}>
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="icon" onClick={startVideoRecording} title="Enregistrer une vidéo selfie">
                  <Video className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={startVoiceRecording} title="Enregistrer un message vocal">
                  <Mic className="w-5 h-5" />
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const Chat = () => {
  const {
    recipientId
  } = useParams<{
    recipientId: string;
  }>();
  const navigate = useNavigate();
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
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recipient, setRecipient] = useState<RecipientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [videoRecorder, setVideoRecorder] = useState<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initChatRef = useRef(false);
  const currentRecipientRef = useRef<string | null>(null);

  // Swipe navigation - swipe right to go back to messages
  useSwipeNavigation({
    onSwipeRight: () => navigate("/messages")
  });

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

  // Start video recording (selfie)
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true
      });
      videoStreamRef.current = stream;
      
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
        videoStreamRef.current = null;
        
        const blob = new Blob(chunks, { type: "video/webm" });
        
        // Upload to storage
        const fileName = `video/${user?.id}/${Date.now()}.webm`;
        setSending(true);
        try {
          const { data, error } = await supabase.storage
            .from("visitor-voice-messages")
            .upload(fileName, blob);
          
          if (error) {
            toast.error("Erreur lors de l'upload de la vidéo");
            return;
          }
          
          const { data: urlData } = supabase.storage
            .from("visitor-voice-messages")
            .getPublicUrl(data.path);
          
          if (chatId) {
            await sendMessage(chatId, {
              mediaUrl: urlData.publicUrl,
              mediaType: "video"
            });
          }
        } catch (error) {
          console.error("Error uploading video:", error);
          toast.error("Erreur lors de l'envoi de la vidéo");
        } finally {
          setSending(false);
        }
        
        setIsRecordingVideo(false);
        setVideoRecorder(null);
      };
      
      recorder.start();
      setVideoRecorder(recorder);
      setIsRecordingVideo(true);
    } catch (error) {
      console.error("Error starting video recording:", error);
      toast.error("Impossible d'accéder à la caméra");
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorder && videoRecorder.state !== "inactive") {
      videoRecorder.stop();
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
      {/* Header - Fixed */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-primary text-primary-foreground p-3 shadow-md flex items-center gap-3">
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
          {recipientId && isOnline(recipientId) && <p className="text-xs text-primary-foreground/70">En ligne</p>}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/visitor?target=${recipientId}`)}>
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

      {/* Messages - with top padding for fixed header */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 pt-20">
        {Object.entries(groupedMessages).map(([date, msgs]) => <div key={date}>
            {/* Date separator */}
            <div className="flex justify-center my-4">
              <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
                {date}
              </span>
            </div>
            
            {/* Messages for this date */}
            {msgs.map(message => <MessageBubble key={message.id} message={message} isOwn={message.sender_id === user?.id} onCopy={() => handleCopy(message.content)} onDelete={() => handleDelete(message.id)} onDeleteForEveryone={() => handleDeleteForEveryone(message.id)} />)}
          </div>)}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <InputArea
        messageText={messageText}
        setMessageText={setMessageText}
        sending={sending}
        isRecording={isRecording}
        isRecordingVideo={isRecordingVideo}
        fileInputRef={fileInputRef}
        handleSendMessage={handleSendMessage}
        handleSendMedia={handleSendMedia}
        startVoiceRecording={startVoiceRecording}
        stopVoiceRecording={stopVoiceRecording}
        startVideoRecording={startVideoRecording}
        stopVideoRecording={stopVideoRecording}
      />

      {/* Forward dialog */}
      {forwardingMessage && <ForwardMessageDialog open={!!forwardingMessage} onOpenChange={open => !open && setForwardingMessage(null)} messageId={forwardingMessage.id} chats={chats} currentChatId={chatId || ""} onForward={handleForward} />}
    </div>;
};
export default Chat;