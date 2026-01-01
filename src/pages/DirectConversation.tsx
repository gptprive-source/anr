import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, User, Phone, Mail, Send, Loader2, Mic, Paperclip, X, Image, Video, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useDirectMessages } from "@/hooks/useDirectMessages";
import { useToast } from "@/hooks/use-toast";
import VoiceRecorder from "@/components/visitor/VoiceRecorder";
import WhatsAppAudioPlayer from "@/components/messages/WhatsAppAudioPlayer";
import BottomNav from "@/components/layout/BottomNav";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const formatDateSeparator = (date: Date) => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  return format(date, "EEEE d MMMM", { locale: fr });
};

const DirectConversation = () => {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { messages, contact, loading, sendMessage, deleteMessage } = useDirectMessages(contactId);

  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() && !audioBlob && !selectedMedia) return;

    setSending(true);
    const result = await sendMessage({
      message: messageText.trim() || undefined,
      voiceBlob: audioBlob || undefined,
      mediaFile: selectedMedia || undefined
    });

    if (result.success) {
      setMessageText("");
      setAudioBlob(null);
      setSelectedMedia(null);
      setMediaPreview(null);
    } else {
      toast({
        title: "Erreur",
        description: result.error || "Impossible d'envoyer le message",
        variant: "destructive"
      });
    }
    setSending(false);
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedMedia(file);
      const reader = new FileReader();
      reader.onload = () => setMediaPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async () => {
    if (!messageToDelete) return;
    const result = await deleteMessage(messageToDelete);
    if (result.success) {
      toast({ title: "Message supprimé" });
    }
    setMessageToDelete(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Contact introuvable</p>
          <Button variant="link" onClick={() => navigate("/contacts")}>
            Retour aux contacts
          </Button>
        </div>
      </div>
    );
  }

  const displayName = contact.contact_type === "company"
    ? contact.company_name
    : `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Contact";

  // Group messages by date
  let lastDate = "";

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-primary text-primary-foreground p-3 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/contacts")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Avatar className="h-10 w-10 border-2 border-primary-foreground/20">
            <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
              {contact.contact_type === "company" ? (
                <Building2 className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{displayName}</p>
            <div className="flex items-center gap-2 text-xs text-primary-foreground/70">
              {contact.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {contact.phone}
                </span>
              )}
              {contact.email && (
                <span className="flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3" /> {contact.email}
                </span>
              )}
            </div>
          </div>
          <Badge variant="outline" className="bg-orange-500/20 text-orange-100 border-orange-500/50 text-xs">
            Sans ANR
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <p className="mb-2">Aucun message</p>
              <p className="text-sm">Envoyez un message à {displayName}</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const msgDate = format(new Date(msg.created_at), "yyyy-MM-dd");
            const showDateSeparator = msgDate !== lastDate;
            lastDate = msgDate;

            return (
              <div key={msg.id}>
                {showDateSeparator && (
                  <div className="flex justify-center my-4">
                    <Badge variant="secondary" className="text-xs font-normal">
                      {formatDateSeparator(new Date(msg.created_at))}
                    </Badge>
                  </div>
                )}
                <div className={`flex ${msg.is_mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 relative group ${
                      msg.is_mine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {/* Media */}
                    {msg.media_url && msg.media_type === "image" && (
                      <img
                        src={msg.media_url}
                        alt="Image"
                        className="max-w-full rounded-lg mb-2"
                      />
                    )}
                    {msg.media_url && msg.media_type === "video" && (
                      <video
                        src={msg.media_url}
                        controls
                        className="max-w-full rounded-lg mb-2"
                      />
                    )}

                    {/* Voice */}
                    {msg.voice_message_url && (
                      <WhatsAppAudioPlayer audioUrl={msg.voice_message_url} isOwn={msg.is_mine} />
                    )}

                    {/* Text */}
                    {msg.message && (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>
                    )}

                    {/* Time */}
                    <p className={`text-xs mt-1 ${msg.is_mine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {format(new Date(msg.created_at), "HH:mm")}
                    </p>

                    {/* Delete button (only for own messages) */}
                    {msg.is_mine && (
                      <button
                        onClick={() => setMessageToDelete(msg.id)}
                        className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="sticky bottom-16 border-t bg-background p-3">
        {/* Media Preview */}
        {mediaPreview && (
          <div className="mb-2 relative inline-block">
            <img src={mediaPreview} alt="Preview" className="h-20 rounded-lg" />
            <button
              onClick={() => {
                setSelectedMedia(null);
                setMediaPreview(null);
              }}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Voice Recorder */}
        {showVoiceRecorder && (
          <div className="mb-2">
            <VoiceRecorder
              onRecordingComplete={(blob) => {
                setAudioBlob(blob);
                setShowVoiceRecorder(false);
              }}
              maxDuration={60}
            />
          </div>
        )}

        {/* Audio Preview */}
        {audioBlob && (
          <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded-lg">
            <WhatsAppAudioPlayer audioUrl={URL.createObjectURL(audioBlob)} isOwn />
            <button
              onClick={() => setAudioBlob(null)}
              className="p-1 hover:bg-destructive/10 rounded-full"
            >
              <X className="w-4 h-4 text-destructive" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            <input
              type="file"
              accept="image/*,video/*"
              ref={fileInputRef}
              onChange={handleMediaSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
              disabled={sending}
            >
              <Mic className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>

          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Votre message..."
            className="flex-1 min-h-[44px] max-h-32 resize-none"
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
            onClick={handleSend}
            disabled={sending || (!messageText.trim() && !audioBlob && !selectedMedia)}
            className="rounded-full h-11 w-11"
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!messageToDelete} onOpenChange={() => setMessageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DirectConversation;
