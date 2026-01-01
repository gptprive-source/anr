import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Mic, Loader2, Paperclip, X, Check, CheckCheck, Smile, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useMessages, Message, Conversation } from "@/hooks/useMessages";
import { useToast } from "@/hooks/use-toast";
import WhatsAppAudioPlayer from "@/components/messages/WhatsAppAudioPlayer";
import VoiceRecorder from "@/components/visitor/VoiceRecorder";
import BottomNav from "@/components/layout/BottomNav";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const EMOJI_LIST = ["😀", "😊", "😍", "🥰", "😎", "🤔", "👍", "👋", "❤️", "🎉", "✅", "🙏", "💪", "🔥", "⭐", "📞", "🏠", "🔑"];

const formatDateSeparator = (date: Date) => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  return format(date, "EEEE d MMMM", { locale: fr });
};

const UnifiedConversation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { conversations, getConversationMessages, sendMessage, markAsRead, deleteMessage, deleteConversation, loading } = useMessages();

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [fallbackConversation, setFallbackConversation] = useState<Conversation | null>(null);
  const [loadingFallback, setLoadingFallback] = useState(false);

  // Parse ID: format can be "userId" or "userId__habitationId"
  const parsedId = id?.includes("__") ? id.split("__") : [id, null];
  const recipientId = parsedId[0] || "";
  const habitationIdFromUrl = parsedId[1];

  // Get conversation info - try exact match first, then by recipientId
  const conversation = conversations.find((c) => c.id === id) || 
                       conversations.find((c) => c.recipientId === recipientId);
  
  const conversationMessages = recipientId ? getConversationMessages(recipientId) : [];

  // Fetch recipient info if no existing conversation
  useEffect(() => {
    if (!id || conversation || loading || loadingFallback) return;
    
    const fetchRecipientInfo = async () => {
      setLoadingFallback(true);
      try {
        // Fetch profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url")
          .eq("id", recipientId)
          .maybeSingle();

        if (!profile) {
          setLoadingFallback(false);
          return;
        }

        let habitationInfo: { id: string; name: string; anr?: { address: string } | null } | null = null;
        if (habitationIdFromUrl) {
          const { data: hab } = await supabase
            .from("habitations")
            .select("id, name, anr:anrs(address)")
            .eq("id", habitationIdFromUrl)
            .maybeSingle();
          habitationInfo = hab as typeof habitationInfo;
        }

        const recipientName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Utilisateur";

        setFallbackConversation({
          id: id,
          recipientId: recipientId,
          recipientName: recipientName,
          recipientAvatarUrl: profile.avatar_url,
          habitationId: habitationIdFromUrl,
          habitationName: habitationInfo?.name || null,
          anrAddress: habitationInfo?.anr?.address || null,
          lastMessage: null,
          lastMessageDate: new Date(),
          unreadCount: 0,
          totalMessages: 0,
        });
      } catch (err) {
        console.error("Error fetching recipient info:", err);
      } finally {
        setLoadingFallback(false);
      }
    };

    fetchRecipientInfo();
  }, [id, conversation, loading, loadingFallback, recipientId, habitationIdFromUrl]);

  // Use existing conversation or fallback
  const activeConversation = conversation || fallbackConversation;

  // Mark messages as read
  useEffect(() => {
    if (!user || !recipientId) return;
    
    conversationMessages.forEach((msg) => {
      if (msg.recipient_id === user.id && !msg.is_read) {
        markAsRead(msg.id);
      }
    });
  }, [conversationMessages, user, recipientId, markAsRead]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Handle send
  const handleSend = async () => {
    if (!activeConversation) return;
    if (!newMessage.trim() && !audioBlob && !selectedFile) return;

    setSending(true);
    try {
      const result = await sendMessage({
        recipientId: activeConversation.recipientId,
        habitationId: activeConversation.habitationId || undefined,
        message: newMessage.trim() || undefined,
        voiceBlob: audioBlob || undefined,
        mediaFile: selectedFile || undefined,
      });

      if (result.success) {
        setNewMessage("");
        setAudioBlob(null);
        setSelectedFile(null);
        setFilePreview(null);
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Impossible d'envoyer le message",
          variant: "destructive",
        });
      }
    } finally {
      setSending(false);
    }
  };

  // Handle delete message
  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;
    await deleteMessage(messageToDelete);
    setMessageToDelete(null);
    setShowDeleteDialog(false);
  };

  // Handle voice recording complete
  const handleVoiceComplete = (blob: Blob) => {
    setAudioBlob(blob);
    setShowVoiceRecorder(false);
  };

  if (loading || loadingFallback) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeConversation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">Conversation introuvable</p>
        <Button onClick={() => navigate("/messages")}>Retour aux messages</Button>
      </div>
    );
  }

  // Group messages by date
  const messagesByDate = conversationMessages.reduce((acc, msg) => {
    const date = formatDateSeparator(new Date(msg.created_at));
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  return (
    <div className="min-h-screen flex flex-col pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/messages")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="h-10 w-10">
            {activeConversation.recipientAvatarUrl ? (
              <AvatarImage src={activeConversation.recipientAvatarUrl} />
            ) : (
              <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                {activeConversation.recipientName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{activeConversation.recipientName}</h1>
            {activeConversation.habitationName && (
              <p className="text-xs text-primary-foreground/70 truncate">
                {activeConversation.habitationName}
                {activeConversation.anrAddress && ` • ${activeConversation.anrAddress}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(messagesByDate).map(([date, msgs]) => (
          <div key={date}>
            <div className="text-center text-xs text-muted-foreground my-4">{date}</div>
            {msgs.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={cn("flex mb-2", isMine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2 relative group",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    )}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (isMine) {
                        setMessageToDelete(msg.id);
                        setShowDeleteDialog(true);
                      }
                    }}
                  >
                    {/* Text message */}
                    {msg.message && <p className="whitespace-pre-wrap break-words">{msg.message}</p>}

                    {/* Voice message */}
                    {msg.voice_message_url && (
                      <WhatsAppAudioPlayer audioUrl={msg.voice_message_url} />
                    )}

                    {/* Media */}
                    {msg.media_url && (
                      <div className="mt-2">
                        {msg.media_type === "video" ? (
                          <video src={msg.media_url} controls className="max-w-full rounded-lg" />
                        ) : (
                          <img src={msg.media_url} alt="Media" className="max-w-full rounded-lg" />
                        )}
                      </div>
                    )}

                    {/* Timestamp & read status */}
                    <div className={cn("flex items-center gap-1 mt-1", isMine ? "justify-end" : "justify-start")}>
                      <span className={cn("text-xs", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {format(new Date(msg.created_at), "HH:mm")}
                      </span>
                      {isMine && (
                        msg.is_read ? (
                          <CheckCheck className="w-4 h-4 text-primary-foreground/70" />
                        ) : (
                          <Check className="w-4 h-4 text-primary-foreground/70" />
                        )
                      )}
                    </div>

                    {/* Delete button on hover (for own messages) */}
                    {isMine && (
                      <button
                        onClick={() => {
                          setMessageToDelete(msg.id);
                          setShowDeleteDialog(true);
                        }}
                        className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Recorder Overlay */}
      {showVoiceRecorder && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <VoiceRecorder
            onRecordingComplete={handleVoiceComplete}
            onCancel={() => setShowVoiceRecorder(false)}
            onSend={() => {
              if (audioBlob) {
                handleSend();
                setShowVoiceRecorder(false);
              }
            }}
          />
        </div>
      )}

      {/* Audio Preview */}
      {audioBlob && (
        <div className="px-4 py-2 bg-muted border-t flex items-center gap-2">
          <WhatsAppAudioPlayer audioUrl={URL.createObjectURL(audioBlob)} />
          <Button variant="ghost" size="icon" onClick={() => setAudioBlob(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* File Preview */}
      {filePreview && selectedFile && (
        <div className="px-4 py-2 bg-muted border-t flex items-center gap-2">
          {selectedFile.type.startsWith("video/") ? (
            <video src={filePreview} className="h-16 rounded" />
          ) : (
            <img src={filePreview} alt="Preview" className="h-16 rounded" />
          )}
          <span className="text-sm truncate flex-1">{selectedFile.name}</span>
          <Button variant="ghost" size="icon" onClick={() => { setSelectedFile(null); setFilePreview(null); }}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="sticky bottom-20 bg-background border-t p-4">
        <div className="flex items-end gap-2">
          {/* Emoji Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Smile className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-6 gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setNewMessage((prev) => prev + emoji)}
                    className="text-xl p-1 hover:bg-muted rounded"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* File Input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,video/*"
            onChange={handleFileSelect}
          />
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="w-5 h-5" />
          </Button>

          {/* Voice Recorder */}
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setShowVoiceRecorder(true)}>
            <Mic className="w-5 h-5" />
          </Button>

          {/* Text Input */}
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Votre message..."
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={sending || (!newMessage.trim() && !audioBlob && !selectedFile)}
            className="shrink-0"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le message sera supprimé de votre côté uniquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default UnifiedConversation;
