import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Mic, Paperclip, MoreVertical, Phone, Loader2, X, Check, CheckCheck, Copy, Forward, Trash2, Clock, Square, Smile, Video, Share2 } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

// Lazy load emoji picker to avoid build issues
const EmojiPicker = lazy(() => Promise.all([import("@emoji-mart/react"), import("@emoji-mart/data")]).then(([{
  default: Picker
}, {
  default: data
}]) => ({
  default: (props: {
    onEmojiSelect: (emoji: {
      native: string;
    }) => void;
  }) => <Picker data={data} onEmojiSelect={props.onEmojiSelect} theme="light" locale="fr" previewPosition="none" skinTonePosition="none" maxFrequentRows={2} />
})));
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import VideoCameraRecorder from "@/components/chat/VideoCameraRecorder";
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
  onCopy,
  onForward,
  isSelectionMode,
  isSelected,
  onToggleSelect
}: {
  message: ChatMessage;
  isOwn: boolean;
  onDelete: () => void;
  onDeleteForEveryone: () => void;
  onCopy: () => void;
  onForward: () => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
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
            {message.media_type === "video" ? <video src={message.media_url || ""} controls className="rounded-lg w-full" /> : <img src={message.media_url || ""} alt="Media" className="rounded-lg w-full cursor-pointer" onClick={() => !isSelectionMode && window.open(message.media_url || "", "_blank")} />}
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
  const handleClick = () => {
    if (isSelectionMode) {
      onToggleSelect();
    } else {
      setShowActions(!showActions);
    }
  };
  const handleLongPress = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isSelectionMode) {
      e.preventDefault();
      onToggleSelect(); // This will trigger selection mode
    }
  };
  return <div className={cn("flex mb-2 group items-center gap-2", isOwn ? "justify-end" : "justify-start")}>
      {/* Selection checkbox */}
      {isSelectionMode && <button onClick={onToggleSelect} className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0", isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/50 bg-background")}>
          {isSelected && <Check className="w-4 h-4" />}
        </button>}

      <div className={cn("relative max-w-[80%] px-3 py-2 rounded-lg transition-all", isOwn ? "bg-bubble-sent text-bubble-sent-foreground rounded-br-sm" : "bg-muted rounded-bl-sm", isSelectionMode && isSelected && "ring-2 ring-primary ring-offset-2")} onContextMenu={handleLongPress} onClick={handleClick}>
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

        {/* Actions menu - only show when not in selection mode */}
        {showActions && !isSelectionMode && <div ref={menuRef} className={cn("absolute top-full mt-1 z-10 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]", isOwn ? "right-0" : "left-0")}>
            {message.message_type === "text" && message.content && <button onClick={e => {
          e.stopPropagation();
          onCopy();
          setShowActions(false);
        }} className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-foreground">
                <Copy className="w-4 h-4" />
                Copier
              </button>}
            <button onClick={e => {
          e.stopPropagation();
          onToggleSelect(); // Start selection mode
          setShowActions(false);
        }} className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-foreground">
              <Check className="w-4 h-4" />
              Sélectionner
            </button>
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
  fileInputRef,
  handleSendMessage,
  handleSendMedia,
  startVoiceRecording,
  stopVoiceRecording,
  openVideoRecorder
}: {
  messageText: string;
  setMessageText: (text: string) => void;
  sending: boolean;
  isRecording: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleSendMessage: () => void;
  handleSendMedia: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startVoiceRecording: () => void;
  stopVoiceRecording: () => void;
  openVideoRecorder: () => void;
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
  const handleEmojiSelect = (emoji: {
    native: string;
  }) => {
    setMessageText(messageText + emoji.native);
  };
  return <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 safe-area-bottom">
      {/* Emoji Picker */}
      {showEmojiPicker && <div ref={emojiPickerRef} className="absolute bottom-full left-0 right-0 mb-2 flex justify-center z-50">
          <div className="shadow-lg rounded-lg overflow-hidden">
            <Suspense fallback={<div className="p-4 bg-background">Chargement...</div>}>
              <EmojiPicker onEmojiSelect={handleEmojiSelect} />
            </Suspense>
          </div>
        </div>}
      
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleSendMedia} />
      
      {isRecording ? <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-destructive/10 rounded-full">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm text-destructive">Enregistrement audio...</span>
          </div>
          <Button size="icon" variant="destructive" onClick={stopVoiceRecording}>
            <Square className="w-4 h-4 fill-current" />
          </Button>
        </div> : <div className="flex flex-col gap-2">
          {/* 4 boutons au-dessus */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={sending} title="Ajouter un emoji" className="bg-white">
              <Smile className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={sending} title="Envoyer une image/vidéo" className="bg-white">
              <Paperclip className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={openVideoRecorder} disabled={sending} title="Enregistrer une vidéo selfie" className="bg-white">
              <Video className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={startVoiceRecording} disabled={sending} title="Enregistrer un message vocal" className="bg-white">
              <Mic className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Zone de saisie en dessous */}
          <div className="flex items-center gap-2">
            <Input placeholder="Message" value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        }} className="flex-1" disabled={sending} />
            <Button size="icon" onClick={handleSendMessage} disabled={sending || !messageText.trim()}>
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>}
    </div>;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice recorder hook (replaces manual MediaRecorder logic)
  const {
    isRecording,
    duration: recordingDuration,
    audioBlob,
    audioUrl: audioPreviewUrl,
    startRecording,
    stopRecording,
    resetRecording,
    error: recordingError
  } = useVoiceRecorder(60);

  // Video camera recorder
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);

  // Multi-select mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  // Preview dialog for audio
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
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

  // Show recording error
  useEffect(() => {
    if (recordingError) {
      toast.error(recordingError);
    }
  }, [recordingError]);

  // Show preview dialog when recording stops and audio is ready
  useEffect(() => {
    if (audioBlob && audioPreviewUrl && !isRecording) {
      setShowPreviewDialog(true);
    }
  }, [audioBlob, audioPreviewUrl, isRecording]);

  // Confirm and send audio
  const confirmSendAudio = async () => {
    if (!audioBlob || !chatId) return;
    setSending(true);
    try {
      // Determine file extension based on actual blob type
      const audioExtension = audioBlob.type.includes('mp4') || audioBlob.type.includes('aac') || audioBlob.type.includes('mpeg') ? 'mp4' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
      const fileName = `voice/${user?.id}/${Date.now()}.${audioExtension}`;
      const {
        data,
        error
      } = await supabase.storage.from("visitor-voice-messages").upload(fileName, audioBlob, {
        contentType: audioBlob.type
      });
      if (error) {
        toast.error("Erreur lors de l'upload du message vocal");
        return;
      }
      const {
        data: urlData
      } = supabase.storage.from("visitor-voice-messages").getPublicUrl(data.path);
      await sendMessage(chatId, {
        voiceUrl: urlData.publicUrl
      });
      toast.success("Message vocal envoyé");
    } catch (error) {
      console.error("Error sending audio:", error);
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
      cancelPreview();
    }
  };

  // Cancel preview
  const cancelPreview = () => {
    resetRecording();
    setShowPreviewDialog(false);
  };

  // Open video recorder
  const openVideoRecorder = () => {
    setShowVideoRecorder(true);
  };

  // Handle video recorded from VideoCameraRecorder
  const handleVideoRecorded = async (blob: Blob) => {
    setShowVideoRecorder(false);
    if (!chatId) return;
    setSending(true);
    try {
      // Determine file extension based on actual blob type
      const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `video/${user?.id}/${Date.now()}.${extension}`;
      const {
        data,
        error
      } = await supabase.storage.from("visitor-voice-messages").upload(fileName, blob, {
        contentType: blob.type
      });
      if (error) {
        toast.error("Erreur lors de l'upload de la vidéo");
        return;
      }
      const {
        data: urlData
      } = supabase.storage.from("visitor-voice-messages").getPublicUrl(data.path);
      await sendMessage(chatId, {
        mediaUrl: urlData.publicUrl,
        mediaType: "video"
      });
      toast.success("Vidéo envoyée");
    } catch (error) {
      console.error("Error sending video:", error);
      toast.error("Erreur lors de l'envoi de la vidéo");
    } finally {
      setSending(false);
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

  // Multi-select handlers
  const toggleSelectMessage = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      // Enter selection mode if first message selected
      if (newSet.size > 0 && !isSelectionMode) {
        setIsSelectionMode(true);
      }
      // Exit selection mode if no messages selected
      if (newSet.size === 0) {
        setIsSelectionMode(false);
      }
      return newSet;
    });
  };
  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
  };
  const selectAllMessages = () => {
    const allIds = new Set(messages.map(m => m.id));
    setSelectedMessages(allIds);
  };

  // Check if selected messages can be deleted for everyone
  const canDeleteSelectedForEveryone = () => {
    if (selectedMessages.size === 0) return false;
    return Array.from(selectedMessages).every(messageId => {
      const message = messages.find(m => m.id === messageId);
      if (!message) return false;
      const isOwn = message.sender_id === user?.id;
      const withinTimeLimit = message.created_at && Date.now() - new Date(message.created_at).getTime() < 7 * 60 * 1000;
      return isOwn && withinTimeLimit;
    });
  };
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const handleDeleteSelectedForMe = async () => {
    if (selectedMessages.size === 0) return;
    for (const messageId of selectedMessages) {
      await deleteForMe(messageId);
    }
    setMessages(prev => prev.filter(m => !selectedMessages.has(m.id)));
    toast.success(`${selectedMessages.size} message${selectedMessages.size > 1 ? 's' : ''} supprimé${selectedMessages.size > 1 ? 's' : ''}`);
    setShowDeleteDialog(false);
    cancelSelection();
  };
  const handleDeleteSelectedForEveryone = async () => {
    if (selectedMessages.size === 0) return;
    let successCount = 0;
    for (const messageId of selectedMessages) {
      const success = await deleteForEveryone(messageId);
      if (success) successCount++;
    }
    if (successCount === selectedMessages.size) {
      toast.success(`${successCount} message${successCount > 1 ? 's' : ''} supprimé${successCount > 1 ? 's' : ''} pour tous`);
    } else if (successCount > 0) {
      toast.success(`${successCount}/${selectedMessages.size} messages supprimés pour tous`);
    } else {
      toast.error("Impossible de supprimer les messages");
    }
    setShowDeleteDialog(false);
    cancelSelection();
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

      {/* Selection mode header */}
      {isSelectionMode && <div className="fixed top-0 left-0 right-0 z-50 bg-secondary text-secondary-foreground p-3 shadow-md flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-secondary-foreground hover:bg-secondary-foreground/10" onClick={cancelSelection}>
            <X className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium">{selectedMessages.size} sélectionné{selectedMessages.size > 1 ? 's' : ''}</p>
          </div>

          <Button variant="ghost" size="sm" className="text-secondary-foreground hover:bg-secondary-foreground/10" onClick={selectAllMessages}>
            Tout
          </Button>
        </div>}

      {/* Messages - with top padding for fixed header */}
      <div className="flex-1 overflow-y-auto p-4 mb-0 pt-[70px] pb-[73px]">
        {Object.entries(groupedMessages).map(([date, msgs]) => <div key={date} className="my-[57px] mt-0">
            {/* Date separator */}
            <div className="flex justify-center my-4">
              <span className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">
                {date}
              </span>
            </div>
            
            {/* Messages for this date */}
            {msgs.map(message => <MessageBubble key={message.id} message={message} isOwn={message.sender_id === user?.id} onCopy={() => handleCopy(message.content)} onForward={() => setForwardingMessage(message)} onDelete={() => handleDelete(message.id)} onDeleteForEveryone={() => handleDeleteForEveryone(message.id)} isSelectionMode={isSelectionMode} isSelected={selectedMessages.has(message.id)} onToggleSelect={() => toggleSelectMessage(message.id)} />)}
          </div>)}
        <div ref={messagesEndRef} />
      </div>

      {/* Selection mode action bar */}
      {isSelectionMode && <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border p-3 safe-area-bottom">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {/* Copy button - only for text messages */}
            {selectedMessages.size === 1 && (() => {
          const selectedId = Array.from(selectedMessages)[0];
          const selectedMsg = messages.find(m => m.id === selectedId);
          return selectedMsg?.message_type === "text" && selectedMsg?.content;
        })() && <Button variant="outline" onClick={() => {
          const selectedId = Array.from(selectedMessages)[0];
          const selectedMsg = messages.find(m => m.id === selectedId);
          if (selectedMsg?.content) {
            handleCopy(selectedMsg.content);
            cancelSelection();
          }
        }} className="flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Copier
              </Button>}
            {/* Share externally button */}
            <Button variant="outline" onClick={async () => {
          const selectedMsgs = messages.filter(m => selectedMessages.has(m.id));

          // Collect text content
          const textContent = selectedMsgs.filter(m => m.message_type === "text" && m.content).map(m => m.content).join("\n\n");

          // Collect media URLs
          const mediaUrls = selectedMsgs.filter(m => m.media_url || m.voice_url).map(m => m.media_url || m.voice_url).filter(Boolean) as string[];
          if (!textContent && mediaUrls.length === 0) {
            toast.error("Aucun contenu à partager");
            return;
          }
          if (navigator.share) {
            try {
              const files: File[] = [];

              // Download media files for sharing using Supabase SDK
              if (mediaUrls.length > 0) {
                for (const url of mediaUrls) {
                  try {
                    // Extract bucket and path from Supabase URL
                    const supabaseUrl = "https://mkzpdmyymabgsntwmmir.supabase.co/storage/v1/object/public/";
                    if (url.startsWith(supabaseUrl)) {
                      const pathPart = url.replace(supabaseUrl, "");
                      const [bucket, ...pathParts] = pathPart.split("/");
                      const filePath = pathParts.join("/");

                      // Download directly from Supabase storage SDK (avoids CORS)
                      const {
                        data,
                        error
                      } = await supabase.storage.from(bucket).download(filePath);
                      if (data && !error) {
                        const fileName = pathParts[pathParts.length - 1] || 'media';
                        // Determine MIME type from file extension if blob type is empty
                        let mimeType = data.type;
                        if (!mimeType || mimeType === 'application/octet-stream') {
                          const ext = fileName.split('.').pop()?.toLowerCase();
                          const mimeTypes: Record<string, string> = {
                            'jpg': 'image/jpeg',
                            'jpeg': 'image/jpeg',
                            'png': 'image/png',
                            'gif': 'image/gif',
                            'webp': 'image/webp',
                            'mp4': 'video/mp4',
                            'webm': 'video/webm',
                            'mov': 'video/quicktime',
                            'mp3': 'audio/mpeg',
                            'wav': 'audio/wav',
                            'ogg': 'audio/ogg',
                            'm4a': 'audio/mp4'
                          };
                          mimeType = mimeTypes[ext || ''] || 'application/octet-stream';
                        }
                        console.log("Creating file:", fileName, "type:", mimeType, "size:", data.size);
                        const file = new File([data], fileName, {
                          type: mimeType
                        });
                        files.push(file);
                      } else {
                        console.warn("Supabase download error:", error);
                      }
                    } else {
                      // For non-Supabase URLs, try direct fetch
                      const response = await fetch(url);
                      if (response.ok) {
                        const blob = await response.blob();
                        const urlParts = url.split('/');
                        const fileName = urlParts[urlParts.length - 1] || 'media';
                        const file = new File([blob], fileName, {
                          type: blob.type
                        });
                        files.push(file);
                      }
                    }
                  } catch (fetchErr) {
                    console.warn("Could not fetch media for sharing:", fetchErr);
                  }
                }
              }

              // Build share data
              const shareData: ShareData = {};
              if (textContent) {
                shareData.text = textContent;
              }
              if (files.length > 0) {
                shareData.files = files;
              }
              console.log("Share data:", {
                textContent,
                filesCount: files.length,
                files: files.map(f => ({
                  name: f.name,
                  type: f.type,
                  size: f.size
                }))
              });

              // Check if we can share files
              if (files.length > 0) {
                if (navigator.canShare && navigator.canShare(shareData)) {
                  console.log("canShare returned true, sharing...");
                  await navigator.share(shareData);
                  cancelSelection();
                } else {
                  // Try sharing without canShare check (some browsers don't implement canShare)
                  console.log("canShare not available or returned false, trying direct share...");
                  try {
                    await navigator.share(shareData);
                    cancelSelection();
                  } catch (shareErr) {
                    console.error("Direct share failed:", shareErr);
                    // Final fallback - download the file
                    for (const file of files) {
                      const blobUrl = URL.createObjectURL(file);
                      const a = document.createElement('a');
                      a.href = blobUrl;
                      a.download = file.name;
                      a.click();
                      URL.revokeObjectURL(blobUrl);
                    }
                    toast.success("Fichier(s) téléchargé(s)");
                    cancelSelection();
                  }
                }
              } else if (textContent) {
                // Share text only
                await navigator.share({
                  text: textContent
                });
                cancelSelection();
              }
            } catch (err) {
              if ((err as Error).name !== "AbortError") {
                console.error("Share error:", err);
                toast.error("Erreur lors du partage");
              }
            }
          } else {
            // navigator.share not available - download files directly
            if (mediaUrls.length > 0) {
              for (const url of mediaUrls) {
                const a = document.createElement('a');
                a.href = url;
                a.download = url.split('/').pop() || 'media';
                a.target = '_blank';
                a.click();
              }
              toast.success("Fichier(s) téléchargé(s)");
              cancelSelection();
            } else if (textContent) {
              await navigator.clipboard.writeText(textContent);
              toast.success("Texte copié dans le presse-papier");
              cancelSelection();
            }
          }
        }} disabled={selectedMessages.size === 0} className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Partager
            </Button>
            {/* Transfer button */}
            <Button variant="outline" onClick={() => {
          if (selectedMessages.size === 1) {
            const selectedId = Array.from(selectedMessages)[0];
            const selectedMsg = messages.find(m => m.id === selectedId);
            if (selectedMsg) {
              setForwardingMessage(selectedMsg);
              cancelSelection();
            }
          } else {
            toast.info("Sélectionnez un seul message pour le transférer");
          }
        }} disabled={selectedMessages.size !== 1} className="flex items-center gap-2">
              <Forward className="w-4 h-4" />
              Transférer
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={selectedMessages.size === 0} className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Supprimer ({selectedMessages.size})
            </Button>
            <Button variant="outline" onClick={cancelSelection}>
              Annuler
            </Button>
          </div>
        </div>}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer {selectedMessages.size} message{selectedMessages.size > 1 ? 's' : ''} ?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button variant="outline" onClick={handleDeleteSelectedForMe} className="w-full justify-start">
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer pour moi
            </Button>
            {canDeleteSelectedForEveryone() && <Button variant="destructive" onClick={handleDeleteSelectedForEveryone} className="w-full justify-start">
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer pour tous
              </Button>}
            {!canDeleteSelectedForEveryone() && selectedMessages.size > 0 && <p className="text-xs text-muted-foreground text-center">
                Vous ne pouvez supprimer pour tous que vos propres messages envoyés il y a moins de 7 minutes
              </p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Input area - hide when in selection mode */}
      {!isSelectionMode && <InputArea messageText={messageText} setMessageText={setMessageText} sending={sending} isRecording={isRecording} fileInputRef={fileInputRef} handleSendMessage={handleSendMessage} handleSendMedia={handleSendMedia} startVoiceRecording={startRecording} stopVoiceRecording={stopRecording} openVideoRecorder={openVideoRecorder} className="pb-[19px]" />}

      {/* Video Camera Recorder */}
      <VideoCameraRecorder isOpen={showVideoRecorder} onClose={() => setShowVideoRecorder(false)} onVideoRecorded={handleVideoRecorded} />

      {/* Preview dialog for audio before sending */}
      <Dialog open={showPreviewDialog} onOpenChange={open => !open && cancelPreview()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Écouter avant d'envoyer</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-4 py-4">
            {audioPreviewUrl && <audio src={audioPreviewUrl} controls className="w-full" autoPlay={false} />}
          </div>
          
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={cancelPreview} disabled={sending}>
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button onClick={confirmSendAudio} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forward dialog */}
      {forwardingMessage && <ForwardMessageDialog open={!!forwardingMessage} onOpenChange={open => !open && setForwardingMessage(null)} messageId={forwardingMessage.id} chats={chats} currentChatId={chatId || ""} onForward={handleForward} />}
    </div>;
};
export default Chat;