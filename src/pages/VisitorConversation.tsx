import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Lock, Home, Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useVisitorDeviceMessages";
import WhatsAppAudioPlayer from "@/components/messages/WhatsAppAudioPlayer";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import VisitorFooter from "@/components/layout/VisitorFooter";

interface Message {
  id: string;
  type: "sent" | "received";
  text: string | null;
  voice_url: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  is_encrypted: boolean;
}

interface HabitationInfo {
  name: string;
  anr_code: string;
  anr_address: string;
}

const VisitorConversation = () => {
  const { habitationId } = useParams<{ habitationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const deviceId = getDeviceId();

  const [messages, setMessages] = useState<Message[]>([]);
  const [habitationInfo, setHabitationInfo] = useState<HabitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [originalMessageId, setOriginalMessageId] = useState<string | null>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch conversation data
  const fetchConversation = useCallback(async () => {
    if (!habitationId) return;

    try {
      setLoading(true);

      // Get habitation info
      const { data: habitation } = await supabase
        .from("habitations")
        .select(`
          name,
          anr:anrs(code, address)
        `)
        .eq("id", habitationId)
        .single();

      if (habitation) {
        const anrData = habitation.anr as { code: string; address: string } | null;
        setHabitationInfo({
          name: habitation.name,
          anr_code: anrData?.code || "",
          anr_address: anrData?.address || "",
        });
      }

      // Get business card ID for this device to also fetch older messages
      const { data: cards } = await supabase
        .from("visitor_business_cards")
        .select("id")
        .eq("device_id", deviceId)
        .limit(1);
      
      const businessCardId = cards?.[0]?.id || null;

      // Get ALL messages sent to this habitation by this visitor (by device_id OR business_card_id)
      let messagesQuery = supabase
        .from("visitor_messages")
        .select(`
          id,
          message,
          voice_message_url,
          media_url,
          media_type,
          created_at,
          encrypted_message,
          is_encrypted,
          visitor_device_id,
          business_card_id
        `)
        .eq("habitation_id", habitationId)
        .eq("deleted_by_visitor", false)
        .order("created_at", { ascending: true });

      // Filter by device_id OR business_card_id to catch all messages from this visitor
      if (businessCardId) {
        messagesQuery = messagesQuery.or(`visitor_device_id.eq.${deviceId},business_card_id.eq.${businessCardId}`);
      } else {
        messagesQuery = messagesQuery.eq("visitor_device_id", deviceId);
      }

      const { data: sentMessages } = await messagesQuery;

      const allMessages: Message[] = [];
      let firstMessageId: string | null = null;

      // Add sent messages
      (sentMessages || []).forEach((msg) => {
        // Store the first message ID for replies
        if (!firstMessageId) {
          firstMessageId = msg.id;
        }

        allMessages.push({
          id: msg.id,
          type: "sent",
          text: msg.message,
          voice_url: msg.voice_message_url,
          media_url: msg.media_url,
          media_type: msg.media_type,
          created_at: msg.created_at || new Date().toISOString(),
          is_encrypted: msg.is_encrypted || false,
        });
      });

      if (firstMessageId) {
        setOriginalMessageId(firstMessageId);
      }

      // Get replies for ALL sent messages (including older ones)
      const messageIds = (sentMessages || []).map((m) => m.id);
      if (messageIds.length > 0) {
        const { data: replies } = await supabase
          .from("message_replies")
          .select(`
            id,
            original_message_id,
            reply_text,
            reply_voice_url,
            reply_media_url,
            reply_media_type,
            created_at,
            encrypted_reply,
            is_encrypted,
            is_read
          `)
          .in("original_message_id", messageIds)
          .eq("deleted_by_visitor", false)
          .order("created_at", { ascending: true });

        // Add received replies
        (replies || []).forEach((reply) => {
          allMessages.push({
            id: reply.id,
            type: "received",
            text: reply.reply_text,
            voice_url: reply.reply_voice_url,
            media_url: reply.reply_media_url,
            media_type: reply.reply_media_type,
            created_at: reply.created_at || new Date().toISOString(),
            is_encrypted: reply.is_encrypted || false,
          });

          // Mark as read
          if (!reply.is_read) {
            supabase
              .from("message_replies")
              .update({ is_read: true, read_at: new Date().toISOString() })
              .eq("id", reply.id)
              .then();
          }
        });
      }

      // Sort by date
      allMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      setMessages(allMessages);
    } catch (error) {
      console.error("[VisitorConversation] Error:", error);
    } finally {
      setLoading(false);
    }
  }, [habitationId, deviceId]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time subscription for ALL messages in this conversation
  useEffect(() => {
    if (!habitationId) return;

    const channel = supabase
      .channel(`visitor-conv-${habitationId}-${deviceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_replies",
        },
        (payload) => {
          console.log("[VisitorConversation] New reply:", payload);
          // Refetch to check if this reply belongs to our conversation
          fetchConversation();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "visitor_messages",
          filter: `habitation_id=eq.${habitationId}`,
        },
        (payload) => {
          console.log("[VisitorConversation] New message:", payload);
          // Check if it's from our device
          const newMsg = payload.new as { visitor_device_id?: string };
          if (newMsg.visitor_device_id === deviceId) {
            fetchConversation();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [habitationId, deviceId, fetchConversation]);

  // Send message (reply to existing conversation)
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !habitationId) return;

    try {
      setSending(true);

      // Get business card for this device to link visitor identity
      const { data: cards } = await supabase
        .from("visitor_business_cards")
        .select("id")
        .eq("device_id", deviceId)
        .limit(1);
      
      const cardId = cards?.[0]?.id || null;

      // Insert as a new visitor_message (continuing the conversation)
      const { error } = await supabase
        .from("visitor_messages")
        .insert({
          habitation_id: habitationId,
          visitor_device_id: deviceId,
          business_card_id: cardId,
          message: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage("");
      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé au résident.",
      });

      fetchConversation();
    } catch (error) {
      console.error("[VisitorConversation] Send error:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          await sendVoiceMessage(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("[VisitorConversation] Recording error:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'accéder au microphone.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    if (!habitationId) return;

    try {
      setSending(true);

      // Get business card for this device to link visitor identity
      const { data: cards } = await supabase
        .from("visitor_business_cards")
        .select("id")
        .eq("device_id", deviceId)
        .limit(1);
      
      const cardId = cards?.[0]?.id || null;

      // Upload to storage
      const fileName = `voice_${deviceId}_${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("visitor-voice-messages")
        .upload(fileName, audioBlob, { contentType: "audio/webm" });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("visitor-voice-messages")
        .getPublicUrl(fileName);

      // Insert message with both device_id and business_card_id
      const { error } = await supabase
        .from("visitor_messages")
        .insert({
          habitation_id: habitationId,
          visitor_device_id: deviceId,
          business_card_id: cardId,
          voice_message_url: publicUrl.publicUrl,
        });

      if (error) throw error;

      toast({
        title: "Message vocal envoyé",
      });

      fetchConversation();
    } catch (error) {
      console.error("[VisitorConversation] Voice send error:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message vocal.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex flex-col">
        <header className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/visitor-messages")}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Skeleton className="h-6 w-40 bg-primary-foreground/20" />
          </div>
        </header>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
              <Skeleton className="h-16 w-2/3 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/visitor-messages")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Home className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold truncate">
                {habitationInfo?.name || "Conversation"}
              </h1>
              {habitationInfo?.anr_code && (
                <p className="text-xs opacity-80 truncate">
                  {habitationInfo.anr_code}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs opacity-80">
            <Lock className="h-3 w-3" />
            <span>E2E</span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun message dans cette conversation</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.type === "sent" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 shadow-sm",
                  msg.type === "sent"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card text-card-foreground rounded-bl-md"
                )}
              >
                {msg.voice_url ? (
                  <WhatsAppAudioPlayer
                    audioUrl={msg.voice_url}
                    isOwn={msg.type === "sent"}
                  />
                ) : msg.media_url ? (
                  <div className="space-y-2">
                    {msg.media_type?.startsWith("image") ? (
                      <img
                        src={msg.media_url}
                        alt="Media"
                        className="max-w-full rounded-lg"
                      />
                    ) : msg.media_type?.startsWith("video") ? (
                      <video
                        src={msg.media_url}
                        controls
                        className="max-w-full rounded-lg"
                      />
                    ) : (
                      <a
                        href={msg.media_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline"
                      >
                        📎 Pièce jointe
                      </a>
                    )}
                    {msg.text && <p className="text-sm">{msg.text}</p>}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">
                    {msg.text || (msg.is_encrypted ? "🔐 Message chiffré" : "")}
                  </p>
                )}
                <div
                  className={cn(
                    "text-[10px] mt-1 flex items-center gap-1",
                    msg.type === "sent"
                      ? "text-primary-foreground/70 justify-end"
                      : "text-muted-foreground"
                  )}
                >
                  {msg.is_encrypted && <Lock className="h-2.5 w-2.5" />}
                  {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="sticky bottom-20 bg-background border-t border-border p-3">
        {isRecording ? (
          <div className="flex items-center justify-between bg-destructive/10 rounded-full px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
              <span className="text-sm font-medium">{formatTime(recordingTime)}</span>
            </div>
            <Button
              size="icon"
              variant="destructive"
              className="rounded-full"
              onClick={stopRecording}
            >
              <Square className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="flex-shrink-0"
              onClick={startRecording}
              disabled={sending}
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Textarea
              placeholder="Écrire un message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 min-h-[44px] max-h-32 resize-none"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              size="icon"
              className="flex-shrink-0 rounded-full"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      <VisitorFooter />
    </div>
  );
};

export default VisitorConversation;
