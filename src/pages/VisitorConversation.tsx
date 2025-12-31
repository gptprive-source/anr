import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Lock, Home, Mic, Square, Loader2, Paperclip, Video, X, Image, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useVisitorDeviceMessages";
import WhatsAppAudioPlayer from "@/components/messages/WhatsAppAudioPlayer";
import VideoRecorder from "@/components/messages/VideoRecorder";
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

  // Video recording
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  // File attachment
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch conversation data
  const fetchConversation = useCallback(async () => {
    if (!habitationId) {
      console.log("[VisitorConversation] No habitationId, skipping fetch");
      setLoading(false);
      return;
    }

    try {
      console.log("[VisitorConversation] Fetching conversation for", habitationId);
      setLoading(true);

      // Get habitation info - use maybeSingle to avoid errors when not found
      const { data: habitation, error: habError } = await supabase
        .from("habitations")
        .select(`
          name,
          anr:anrs(code, address)
        `)
        .eq("id", habitationId)
        .maybeSingle();

      if (habError) {
        console.error("[VisitorConversation] Error fetching habitation:", habError);
      }

      if (habitation) {
        const anrData = habitation.anr as { code: string; address: string } | null;
        setHabitationInfo({
          name: habitation.name,
          anr_code: anrData?.code || "",
          anr_address: anrData?.address || "",
        });
        console.log("[VisitorConversation] Habitation found:", habitation.name);
      } else {
        console.log("[VisitorConversation] No habitation found for id:", habitationId);
      }

      // Get business card ID for this device to also fetch older messages
      const { data: cards } = await supabase
        .from("visitor_business_cards")
        .select("id")
        .eq("device_id", deviceId)
        .limit(1);
      
      const businessCardId = cards?.[0]?.id || null;

      // Get ALL messages sent to this habitation by this visitor (by device_id OR business_card_id)
      // Include deleted messages to fetch their replies
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
          business_card_id,
          deleted_by_visitor
        `)
        .eq("habitation_id", habitationId)
        .order("created_at", { ascending: true });

      // Filter by device_id OR business_card_id to catch all messages from this visitor
      if (businessCardId) {
        messagesQuery = messagesQuery.or(`visitor_device_id.eq.${deviceId},business_card_id.eq.${businessCardId}`);
      } else {
        messagesQuery = messagesQuery.eq("visitor_device_id", deviceId);
      }

      const { data: sentMessages } = await messagesQuery;

      const allMessages: Message[] = [];
      let mostRecentNonDeletedMessageId: string | null = null;

      // Add sent messages (only non-deleted ones for display)
      (sentMessages || []).forEach((msg) => {
        // Track the most recent non-deleted message for new replies
        if (!msg.deleted_by_visitor) {
          mostRecentNonDeletedMessageId = msg.id;
          
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
        }
      });

      if (mostRecentNonDeletedMessageId) {
        setOriginalMessageId(mostRecentNonDeletedMessageId);
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
      console.log("[VisitorConversation] Total messages loaded:", allMessages.length);
      setMessages(allMessages);
    } catch (error) {
      console.error("[VisitorConversation] Error fetching conversation:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la conversation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [habitationId, deviceId, toast]);

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

    console.log("[VisitorConversation] Setting up realtime subscription for", habitationId);

    const channel = supabase
      .channel(`visitor-conv-${habitationId}-${deviceId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "message_replies",
        },
        (payload) => {
          console.log("[VisitorConversation] Reply change detected:", payload);
          // Small delay to ensure DB is updated before refetching
          setTimeout(() => {
            console.log("[VisitorConversation] Refetching after reply change");
            fetchConversation();
          }, 150);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events
          schema: "public",
          table: "visitor_messages",
          filter: `habitation_id=eq.${habitationId}`,
        },
        (payload) => {
          console.log("[VisitorConversation] Message change detected:", payload);
          setTimeout(() => {
            console.log("[VisitorConversation] Refetching after message change");
            fetchConversation();
          }, 150);
        }
      )
      .subscribe((status) => {
        console.log("[VisitorConversation] Subscription status:", status);
      });

    return () => {
      console.log("[VisitorConversation] Removing channel");
      supabase.removeChannel(channel);
    };
  }, [habitationId, deviceId, fetchConversation]);

  // Helper to get or create business card for current user
  const getOrCreateBusinessCard = async (): Promise<string | null> => {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // For authenticated users, search by user_id first
      const { data: userCards } = await supabase
        .from("visitor_business_cards")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      
      if (userCards?.[0]?.id) {
        console.log("[VisitorConversation] Found existing card for user:", userCards[0].id);
        return userCards[0].id;
      }
      
      // No card exists for this user - create one from their profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();
      
      if (profile && (profile.first_name || profile.last_name)) {
        const { data: newCard } = await supabase
          .from("visitor_business_cards")
          .insert({
            user_id: user.id,
            device_id: deviceId,
            card_type: "individual",
            first_name: profile.first_name || null,
            last_name: profile.last_name || null,
            email: user.email || null,
          })
          .select("id")
          .single();
        
        if (newCard) {
          console.log("[VisitorConversation] Created new card for user:", newCard.id);
          return newCard.id;
        }
      }
    }
    
    // For non-authenticated visitors, search by device_id
    const { data: deviceCards } = await supabase
      .from("visitor_business_cards")
      .select("id")
      .eq("device_id", deviceId)
      .limit(1);
    
    return deviceCards?.[0]?.id || null;
  };

  // Send message (reply to existing conversation)
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !habitationId) {
      console.log("[VisitorConversation] Cannot send - missing message/file or habitationId");
      return;
    }

    try {
      setSending(true);
      console.log("[VisitorConversation] Sending message to", habitationId);

      // Get or create business card (prioritizes user_id for logged-in users)
      const cardId = await getOrCreateBusinessCard();
      console.log("[VisitorConversation] Business card id:", cardId || "none");

      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `visitor_${deviceId}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("visitor-voice-messages")
          .upload(fileName, selectedFile, { contentType: selectedFile.type });

        if (uploadError) {
          console.error("[VisitorConversation] File upload error:", uploadError);
          throw uploadError;
        }

        const { data: publicUrl } = supabase.storage
          .from("visitor-voice-messages")
          .getPublicUrl(fileName);

        mediaUrl = publicUrl.publicUrl;
        mediaType = selectedFile.type;
        console.log("[VisitorConversation] File uploaded:", mediaUrl);
      }

      // Insert as a new visitor_message (continuing the conversation)
      const { error } = await supabase
        .from("visitor_messages")
        .insert({
          habitation_id: habitationId,
          visitor_device_id: deviceId,
          business_card_id: cardId,
          message: newMessage.trim() || null,
          media_url: mediaUrl,
          media_type: mediaType,
        });

      if (error) {
        console.error("[VisitorConversation] Insert error:", error);
        throw error;
      }

      console.log("[VisitorConversation] Message sent successfully");
      setNewMessage("");
      clearSelectedFile();
      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé au résident.",
      });

      // Wait a bit before refreshing to let DB update
      setTimeout(() => fetchConversation(), 300);
    } catch (error: any) {
      console.error("[VisitorConversation] Send error:", error);
      toast({
        title: "Erreur",
        description: error?.message || "Impossible d'envoyer le message.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  // File attachment handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 10 Mo.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    // Create preview for images and videos
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const clearSelectedFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Video recording handlers
  const handleVideoRecordingComplete = (blob: Blob) => {
    setVideoBlob(blob);
  };

  const sendVideoMessage = async () => {
    if (!videoBlob || !habitationId) return;

    try {
      setSending(true);
      console.log("[VisitorConversation] Sending video message");

      const cardId = await getOrCreateBusinessCard();

      // Upload video
      const fileName = `video_${deviceId}_${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("visitor-voice-messages")
        .upload(fileName, videoBlob, { contentType: "video/webm" });

      if (uploadError) {
        console.error("[VisitorConversation] Video upload error:", uploadError);
        throw uploadError;
      }

      const { data: publicUrl } = supabase.storage
        .from("visitor-voice-messages")
        .getPublicUrl(fileName);

      // Insert message
      const { error } = await supabase
        .from("visitor_messages")
        .insert({
          habitation_id: habitationId,
          visitor_device_id: deviceId,
          business_card_id: cardId,
          media_url: publicUrl.publicUrl,
          media_type: "video/webm",
        });

      if (error) throw error;

      console.log("[VisitorConversation] Video message sent successfully");
      toast({ title: "Vidéo envoyée" });
      setShowVideoRecorder(false);
      setVideoBlob(null);
      setTimeout(() => fetchConversation(), 300);
    } catch (error: any) {
      console.error("[VisitorConversation] Video send error:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la vidéo.",
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
      console.log("[VisitorConversation] Sending voice message");

      // Get or create business card (prioritizes user_id for logged-in users)
      const cardId = await getOrCreateBusinessCard();

      // Upload to storage
      const fileName = `voice_${deviceId}_${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("visitor-voice-messages")
        .upload(fileName, audioBlob, { contentType: "audio/webm" });

      if (uploadError) {
        console.error("[VisitorConversation] Upload error:", uploadError);
        throw uploadError;
      }

      const { data: publicUrl } = supabase.storage
        .from("visitor-voice-messages")
        .getPublicUrl(fileName);

      // Insert message with device_id and business_card_id
      const { error } = await supabase
        .from("visitor_messages")
        .insert({
          habitation_id: habitationId,
          visitor_device_id: deviceId,
          business_card_id: cardId,
          voice_message_url: publicUrl.publicUrl,
        });

      if (error) {
        console.error("[VisitorConversation] Insert voice error:", error);
        throw error;
      }

      console.log("[VisitorConversation] Voice message sent successfully");
      toast({
        title: "Message vocal envoyé",
      });

      setTimeout(() => fetchConversation(), 300);
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
          <div className="text-center py-12 text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Le résident n'est pas disponible</p>
            <p>Laissez-lui un message texte ou vocal ci-dessous.</p>
            <p className="text-sm">Il recevra une notification et pourra vous répondre.</p>
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Video Recorder Overlay */}
      {showVideoRecorder && (
        <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <VideoRecorder
              onRecordingComplete={handleVideoRecordingComplete}
              onSend={sendVideoMessage}
              onCancel={() => {
                setShowVideoRecorder(false);
                setVideoBlob(null);
              }}
              sending={sending}
              videoBlob={videoBlob}
            />
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="sticky bottom-20 bg-background border-t border-border p-3 space-y-2">
        {/* File preview */}
        {selectedFile && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            {filePreview && selectedFile.type.startsWith("image/") ? (
              <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
            ) : filePreview && selectedFile.type.startsWith("video/") ? (
              <video src={filePreview} className="w-12 h-12 object-cover rounded" />
            ) : (
              <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} Ko
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="flex-shrink-0"
              onClick={clearSelectedFile}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

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
            {/* Attachment button */}
            <Button
              size="icon"
              variant="ghost"
              className="flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            
            {/* Video button */}
            <Button
              size="icon"
              variant="ghost"
              className="flex-shrink-0"
              onClick={() => setShowVideoRecorder(true)}
              disabled={sending}
            >
              <Video className="h-5 w-5" />
            </Button>
            
            {/* Mic button */}
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
              disabled={(!newMessage.trim() && !selectedFile) || sending}
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
