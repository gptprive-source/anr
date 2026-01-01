import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send, Lock, Home, Mic, Loader2, Paperclip, X, Image, Video, Camera, Check, CheckCheck, Smile, MessageSquare, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/hooks/useVisitorDeviceMessages";
import { useVisitorCustomTemplates } from "@/hooks/useVisitorCustomTemplates";
import WhatsAppAudioPlayer from "@/components/messages/WhatsAppAudioPlayer";
import VideoRecorder from "@/components/messages/VideoRecorder";
import VoiceRecorder from "@/components/visitor/VoiceRecorder";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import VisitorFooter from "@/components/layout/VisitorFooter";

// Emoji categories (same as Conversation.tsx)
const EMOJI_CATEGORIES = {
  "😊 Smileys": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "☺️", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬"],
  "👋 Gestes": ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪"],
  "❤️ Coeurs": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "❤️‍🔥", "❤️‍🩹", "💌"],
  "🎉 Objets": ["🎉", "🎊", "🎈", "🎁", "🎀", "🏆", "🏅", "🥇", "🥈", "🥉", "⚽", "🎯", "🎮", "📱", "💻", "📧", "📞", "⏰", "📍", "🏠", "🚪", "🔑", "🔔", "✅", "❌", "⭐", "🌟", "✨", "🔥", "💯"],
};

interface Message {
  id: string;
  type: "sent" | "received";
  text: string | null;
  voice_url: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  is_encrypted: boolean;
  is_read?: boolean;
}

interface HabitationInfo {
  name: string;
  anr_code: string;
  anr_address: string;
  recipientName?: string | null; // Name of the recipient for private conversations
}

const formatDateSeparator = (date: Date) => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  return format(date, "EEEE d MMMM", { locale: fr });
};

const VisitorConversation = () => {
  const { habitationId: conversationKey } = useParams<{ habitationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const deviceId = getDeviceId();
  
  // Parse conversation key to extract habitationId and recipient info
  // Format: habitationId__residence OR habitationId__private_userId OR just habitationId (legacy)
  const isPrivateConversation = conversationKey?.includes("__private_") || false;
  const isResidenceConversation = conversationKey?.includes("__residence") || false;
  const isLegacyUrl = !isPrivateConversation && !isResidenceConversation;
  const habitationId = conversationKey?.split("__")[0] || conversationKey;
  const recipientUserIdFromKey = isPrivateConversation ? conversationKey?.split("__private_")[1] : null;
  
  // Get targetUserId from navigation state (for NEW private messages) OR from URL (for existing conversations)
  const targetUserId = recipientUserIdFromKey || (location.state as { targetUserId?: string })?.targetUserId || null;
  
  // For legacy URLs, redirect to messages list so user can pick the right conversation
  useEffect(() => {
    if (isLegacyUrl && habitationId) {
      console.log("[VisitorConversation] Legacy URL detected, redirecting to messages list");
      navigate("/messages", { replace: true });
    }
  }, [isLegacyUrl, habitationId, navigate]);

  // Templates
  const { templates: customTemplates, incrementUsage } = useVisitorCustomTemplates();
  const [showTemplates, setShowTemplates] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [habitationInfo, setHabitationInfo] = useState<HabitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [originalMessageId, setOriginalMessageId] = useState<string | null>(null);

  // Voice recording
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Video recording
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  // File attachment
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle template selection
  const handleTemplateClick = (template: { id: string; content: string }) => {
    setNewMessage(template.content);
    incrementUsage(template.id);
    setShowTemplates(false);
  };

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

      // Fetch recipient name for private conversations
      let recipientName: string | null = null;
      if (isPrivateConversation && targetUserId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", targetUserId)
          .maybeSingle();
        
        if (profile) {
          recipientName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Résident";
        }
      }

      if (habitation) {
        const anrData = habitation.anr as { code: string; address: string } | null;
        setHabitationInfo({
          name: habitation.name,
          anr_code: anrData?.code || "",
          anr_address: anrData?.address || "",
          recipientName,
        });
        console.log("[VisitorConversation] Habitation found:", habitation.name, "recipient:", recipientName);
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
      // Also include recipient_user_id for filtering
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
          deleted_by_visitor,
          recipient_user_id
        `)
        .eq("habitation_id", habitationId)
        .order("created_at", { ascending: true });

      // Filter by device_id OR business_card_id to catch all messages from this visitor
      if (businessCardId) {
        messagesQuery = messagesQuery.or(`visitor_device_id.eq.${deviceId},business_card_id.eq.${businessCardId}`);
      } else {
        messagesQuery = messagesQuery.eq("visitor_device_id", deviceId);
      }

      const { data: sentMessagesRaw } = await messagesQuery;
      
      // Filter messages by recipient_user_id based on conversation type
      const sentMessages = (sentMessagesRaw || []).filter((msg: any) => {
        if (isPrivateConversation) {
          // Private conversation: only show messages to this specific recipient
          return msg.recipient_user_id === targetUserId;
        } else if (isResidenceConversation) {
          // Residence conversation: only show messages to the whole residence
          return !msg.recipient_user_id;
        }
        // This shouldn't happen as legacy URLs redirect, but fallback to residence messages
        return !msg.recipient_user_id;
      });

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
      // Include recipient_user_id for private messages
      const { error } = await supabase
        .from("visitor_messages")
        .insert({
          habitation_id: habitationId,
          visitor_device_id: deviceId,
          business_card_id: cardId,
          message: newMessage.trim() || null,
          media_url: mediaUrl,
          media_type: mediaType,
          recipient_user_id: targetUserId, // Private message to specific resident
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

      // Insert message with recipient_user_id for private messages
      const { error } = await supabase
        .from("visitor_messages")
        .insert({
          habitation_id: habitationId,
          visitor_device_id: deviceId,
          business_card_id: cardId,
          media_url: publicUrl.publicUrl,
          media_type: "video/webm",
          recipient_user_id: targetUserId,
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

  // Voice recording handler using VoiceRecorder component
  const handleSendVoice = async () => {
    if (!audioBlob || !habitationId) return;
    await sendVoiceMessage(audioBlob);
    setAudioBlob(null);
    setShowVoiceRecorder(false);
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

      // Insert message with device_id, business_card_id, and recipient_user_id for private messages
      const { error } = await supabase
        .from("visitor_messages")
        .insert({
          habitation_id: habitationId,
          visitor_device_id: deviceId,
          business_card_id: cardId,
          voice_message_url: publicUrl.publicUrl,
          recipient_user_id: targetUserId,
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


  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex flex-col">
        <header className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/messages")}
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
    <div className="min-h-screen flex flex-col pb-16 bg-secondary/30">
      {/* Blue Header - WhatsApp style */}
      <div className="sticky top-0 z-10 bg-primary shadow-md">
        <div className="max-w-2xl mx-auto w-full px-2 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => navigate("/messages")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <Avatar className="w-10 h-10 flex-shrink-0 border-2 border-white/20">
              <AvatarFallback className="bg-white/20">
                {isPrivateConversation ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Home className="w-5 h-5 text-white" />
                )}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">
                {isPrivateConversation && habitationInfo?.recipientName 
                  ? habitationInfo.recipientName 
                  : (habitationInfo?.name || "Résidence")}
              </p>
              <div className="flex items-center gap-2">
                {isPrivateConversation && habitationInfo?.name && (
                  <p className="text-xs text-white/70 truncate">{habitationInfo.name}</p>
                )}
                {!isPrivateConversation && habitationInfo?.anr_address && (
                  <p className="text-xs text-white/70 truncate">{habitationInfo.anr_address}</p>
                )}
                <div className="flex items-center gap-1 text-[10px] text-white/60" title="Chiffrement E2E">
                  <Lock className="w-2.5 h-2.5" />
                  <span className="text-xs">E2E</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area - WhatsApp style */}
      <div className="flex-1 overflow-y-auto px-3 py-4 pb-40 space-y-2 max-w-2xl mx-auto w-full">
        {/* Empty conversation welcome */}
        {messages.length === 0 && (
          <div className="flex justify-center my-8">
            <div className="bg-[#E1F2FB] text-[#54656F] text-sm px-4 py-3 rounded-lg shadow-sm text-center max-w-xs">
              <p className="font-medium mb-1">📝 Le résident n'est pas disponible</p>
              <p className="text-xs">Laissez-lui un message texte ou vocal ci-dessous.</p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.type === "sent";
          const hasVoice = msg.voice_url;
          const hasMedia = msg.media_url;

          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 shadow-sm relative",
                  isMine
                    ? "bg-[#D9FDD3] text-[#111B21] rounded-tr-none"
                    : "bg-white text-[#111B21] rounded-tl-none"
                )}
              >
                {/* Voice message */}
                {hasVoice ? (
                  <WhatsAppAudioPlayer audioUrl={msg.voice_url!} isOwn={isMine} />
                ) : hasMedia ? (
                  <div className="space-y-1">
                    {msg.media_type?.startsWith("image") ? (
                      <img src={msg.media_url!} alt="Media" className="max-w-full rounded-lg" />
                    ) : msg.media_type?.startsWith("video") ? (
                      <video src={msg.media_url!} controls className="max-w-full rounded-lg" />
                    ) : (
                      <a
                        href={msg.media_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 underline flex items-center gap-1"
                      >
                        <Paperclip className="w-4 h-4" />
                        Pièce jointe
                      </a>
                    )}
                    {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">
                    {msg.text || (msg.is_encrypted ? "🔐 Message chiffré" : "")}
                  </p>
                )}

                {/* Time and status */}
                <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                  {msg.is_encrypted && <Lock className="w-3 h-3 text-[#667781]" />}
                  <span className="text-[11px] text-[#667781]">
                    {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                  </span>
                  {isMine && (msg.is_read ? (
                    <CheckCheck className="w-4 h-4 text-[#53BDEB]" />
                  ) : (
                    <Check className="w-4 h-4 text-[#667781]" />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
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


      {/* Input Area - WhatsApp style */}
      <div className="fixed bottom-16 left-0 right-0 bg-[#F0F2F5] px-2 py-2">
        <div className="max-w-2xl mx-auto w-full">
          {/* Templates Section */}
          {showTemplates && customTemplates.length > 0 && (
            <div className="mb-2 p-2 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Mes templates
                </p>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="p-1 hover:bg-muted rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {customTemplates.map((template) => (
                  <Badge
                    key={template.id}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/10 transition-colors py-1.5 px-3"
                    onClick={() => handleTemplateClick(template)}
                  >
                    <span className="mr-1">{template.icon}</span>
                    {template.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Media Preview */}
          {selectedFile && filePreview && (
            <div className="mb-2 relative inline-block">
              <div className="relative rounded-lg overflow-hidden bg-white shadow-sm max-w-48">
                {selectedFile.type.startsWith('video/') ? (
                  <video src={filePreview} className="max-h-32 object-cover" />
                ) : selectedFile.type.startsWith('image/') ? (
                  <img src={filePreview} alt="Preview" className="max-h-32 object-cover" />
                ) : (
                  <div className="h-16 w-32 flex items-center justify-center bg-muted">
                    <Paperclip className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <button
                  onClick={clearSelectedFile}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 rounded text-xs text-white flex items-center gap-1">
                  {selectedFile.type.startsWith('video/') ? <Video className="w-3 h-3" /> : <Image className="w-3 h-3" />}
                  {(selectedFile.size / 1024 / 1024).toFixed(1)} Mo
                </div>
              </div>
            </div>
          )}

          {showVideoRecorder ? (
            <VideoRecorder
              onRecordingComplete={(blob) => setVideoBlob(blob)}
              onSend={sendVideoMessage}
              onCancel={() => {
                setShowVideoRecorder(false);
                setVideoBlob(null);
              }}
              sending={sending}
              videoBlob={videoBlob}
            />
          ) : showVoiceRecorder ? (
            <VoiceRecorder
              onRecordingComplete={(blob) => setAudioBlob(blob)}
              onSend={handleSendVoice}
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
                  <PopoverContent className="w-80 p-2 max-h-72 overflow-y-auto" side="top" align="start">
                    <div className="space-y-3">
                      {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                        <div key={category}>
                          <p className="text-xs font-medium text-muted-foreground mb-1">{category}</p>
                          <div className="grid grid-cols-8 gap-1">
                            {emojis.map((emoji, i) => (
                              <button
                                key={i}
                                className="text-xl p-1 hover:bg-muted rounded transition-colors"
                                onClick={() => setNewMessage((prev) => prev + emoji)}
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

                {/* Templates button - only show if templates exist */}
                {customTemplates.length > 0 && (
                  <button
                    className={cn(
                      "p-2 transition-colors",
                      showTemplates ? "text-[#075E54]" : "text-[#54656F] hover:text-[#075E54]"
                    )}
                    onClick={() => setShowTemplates(!showTemplates)}
                    title="Mes templates"
                  >
                    <MessageSquare className="w-6 h-6" />
                  </button>
                )}

                <button
                  className="p-2 text-[#54656F] hover:text-[#075E54] transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-6 h-6" />
                </button>

                <button
                  className="p-2 text-[#54656F] hover:text-[#075E54] transition-colors"
                  onClick={() => setShowVideoRecorder(true)}
                >
                  <Camera className="w-6 h-6" />
                </button>
              </div>

              {/* Input */}
              <div className="flex-1 bg-white rounded-full px-4 py-2 shadow-sm">
                <Textarea
                  placeholder="Message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full border-0 p-0 min-h-[24px] max-h-24 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 resize-none overflow-y-auto text-[#111B21]"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && (newMessage.trim() || selectedFile)) {
                      e.preventDefault();
                      handleSendMessage();
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
              {newMessage.trim() || selectedFile ? (
                <button
                  className="p-3 rounded-full bg-[#075E54] text-white hover:bg-[#064E46] transition-colors shadow-md"
                  onClick={handleSendMessage}
                  disabled={sending}
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              ) : (
                <button
                  onClick={() => setShowVoiceRecorder(true)}
                  className="p-3 rounded-full text-white transition-colors shadow-md bg-[#2266ba]"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <VisitorFooter />
    </div>
  );
};

export default VisitorConversation;
