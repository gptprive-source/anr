import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Building2, User, Phone, Mail, MapPin, Check, CheckCheck, Loader2, Smile, Send, UserPlus, Paperclip, X, Image, Video, Camera, Lock, Ban, ShieldCheck, Trash2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMessageReplies } from "@/hooks/useMessageReplies";
import { useEncryptedMessages } from "@/hooks/useEncryptedMessages";
import { useBlockedVisitors } from "@/hooks/useBlockedVisitors";
import { useSentMessages } from "@/hooks/useSentMessages";
import { useVisitorMessages } from "@/hooks/useVisitorMessages";
import { AddToContactsButton } from "@/components/messages/AddToContactsButton";
import WhatsAppAudioPlayer from "@/components/messages/WhatsAppAudioPlayer";
import VoiceRecorder from "@/components/visitor/VoiceRecorder";
import VideoRecorder from "@/components/messages/VideoRecorder";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import BottomNav from "@/components/layout/BottomNav";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const EMOJI_CATEGORIES = {
  "😊 Smileys": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "☺️", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"],
  "👋 Gestes": ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "💋", "🩸"],
  "👨 Personnes": ["👶", "👧", "🧒", "👦", "👩", "🧑", "👨", "👩‍🦱", "🧑‍🦱", "👨‍🦱", "👩‍🦰", "🧑‍🦰", "👨‍🦰", "👱‍♀️", "👱", "👱‍♂️", "👩‍🦳", "🧑‍🦳", "👨‍🦳", "👩‍🦲", "🧑‍🦲", "👨‍🦲", "🧔‍♀️", "🧔", "🧔‍♂️", "👵", "🧓", "👴", "👲", "👳‍♀️", "👳", "👳‍♂️", "🧕", "👮‍♀️", "👮", "👮‍♂️", "👷‍♀️", "👷", "👷‍♂️", "💂‍♀️", "💂", "💂‍♂️", "🕵️‍♀️", "🕵️", "🕵️‍♂️", "👩‍⚕️", "🧑‍⚕️", "👨‍⚕️"],
  "❤️ Coeurs": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "❤️‍🔥", "❤️‍🩹", "💌", "💤", "💢", "💥", "💦", "💨", "🕳️", "💣", "💬", "👁️‍🗨️", "🗨️"],
  "🐶 Animaux": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🪳", "🦟", "🦗", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳"],
  "🍔 Nourriture": ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠", "🥐", "🥖", "🍞", "🥨", "🥯", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯"],
  "⚽ Sports": ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️‍♀️", "🏋️", "🏋️‍♂️", "🤼‍♀️", "🤼", "🤼‍♂️", "🤸‍♀️", "🤸", "🤸‍♂️", "⛹️‍♀️", "⛹️", "⛹️‍♂️"],
  "🚗 Transport": ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🦯", "🦽", "🦼", "🛴", "🚲", "🛵", "🏍️", "🛺", "🚨", "🚔", "🚍", "🚘", "🚖", "🚡", "🚠", "🚟", "🚃", "🚋", "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "✈️", "🛫", "🛬", "🛩️", "💺", "🛰️", "🚀", "🛸", "🚁", "🛶", "⛵", "🚤", "🛥️", "🛳️", "⛴️", "🚢", "⚓", "🪝", "⛽", "🚧", "🚦", "🚥"],
  "⭐ Symboles": ["⭐", "🌟", "💫", "✨", "⚡", "☄️", "💥", "🔥", "🌈", "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🌬️", "💨", "💧", "💦", "☔", "☂️", "🌊", "🌫️", "✅", "❌", "❓", "❔", "❕", "❗", "⭕", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "🟤", "⚫", "⚪", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫", "⬛", "⬜", "◼️", "◻️", "◾", "◽", "▪️", "▫️", "🔶", "🔷", "🔸", "🔹", "🔺", "🔻", "💠", "🔘", "🔳", "🔲", "🏁", "🚩", "🎌", "🏴", "🏳️", "💯", "🔢", "🔣", "🔤"],
  "🎉 Objets": ["🎉", "🎊", "🎈", "🎁", "🎀", "🎗️", "🎟️", "🎫", "🎖️", "🏆", "🏅", "🥇", "🥈", "🥉", "⚽", "🎯", "🎮", "🕹️", "🎰", "🎲", "🧩", "🎭", "🖼️", "🎨", "🧵", "🪡", "🧶", "🪢", "👓", "🕶️", "🥽", "🥼", "🦺", "👔", "👕", "👖", "🧣", "🧤", "🧥", "🧦", "👗", "👘", "🥻", "🩱", "🩲", "🩳", "👙", "👚", "👛", "👜", "👝", "🛍️", "🎒", "🩴", "👞", "👟", "🥾", "🥿", "👠", "👡", "🩰", "👢", "👑", "👒", "🎩", "🎓", "🧢", "🪖", "⛑️", "📿", "💄", "💍", "💎", "📱", "📲", "💻", "🖥️", "🖨️", "⌨️", "🖱️"]
};

interface BusinessCard {
  id: string;
  card_type: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface VisitorMessage {
  id: string;
  habitation_id: string;
  message: string | null;
  voice_message_url: string | null;
  visitor_phone: string | null;
  is_read: boolean;
  created_at: string;
  business_card_id: string | null;
  business_card?: BusinessCard | null;
  encrypted_message?: string | null;
  message_nonce?: string | null;
  visitor_public_key?: string | null;
  is_encrypted?: boolean;
  decrypted_message?: string | null;
  media_url?: string | null;
  media_type?: string | null;
}

type ConversationType = 'received_from_visitor' | 'sent_to_anr';

const formatDateSeparator = (date: Date) => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  return format(date, "EEEE d MMMM", { locale: fr });
};

const renderTextWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-600 break-all" onClick={e => e.stopPropagation()}>{part}</a>;
    }
    return <span key={index}>{part}</span>;
  });
};

const Conversation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State
  const [conversationType, setConversationType] = useState<ConversationType | null>(null);
  const [visitorMessages, setVisitorMessages] = useState<VisitorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [habitationId, setHabitationId] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [habitationInfo, setHabitationInfo] = useState<{ name: string; address: string } | null>(null);
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [messageToDelete, setMessageToDelete] = useState<{ id: string; isMine: boolean; isRead: boolean } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Hooks for "received from visitor" mode (resident viewing)
  const firstMessageId = visitorMessages[0]?.id || "";
  const { replies, sendReply, deleteReply, loading: repliesLoading, refetch: refetchReplies } = useMessageReplies(firstMessageId);
  const { isSupported: encryptionSupported } = useEncryptedMessages(habitationId || undefined);
  const { isBlocked, blockVisitor, unblockVisitor } = useBlockedVisitors();
  const currentVisitorBlocked = id && conversationType === 'received_from_visitor' ? isBlocked(id) : false;

  // Hooks for "sent to ANR" mode (visitor/user sending to another ANR)
  const { messages: sentMessagesFromHook, replies: sentReplies, getConversationMessages, markReplyAsRead, businessCard, deleteSentMessage, refetch: refetchSentMessages } = useSentMessages();
  const { sendMessage } = useVisitorMessages();
  const { encryptMessageForResident, isReady: encryptionReady } = useEncryptedMessages(id || undefined);

  // Get sent conversation data
  const sentConversationData = id && conversationType === 'sent_to_anr' ? getConversationMessages(id) : { messages: [], replies: [] };
  const allSentMessages = conversationType === 'sent_to_anr' 
    ? [...sentConversationData.messages, ...localMessages.filter(lm => !sentConversationData.messages.find((m: any) => m.id === lm.id))]
    : [];

  // Detect conversation type
  useEffect(() => {
    const detectConversationType = async () => {
      if (!id || !user) return;

      try {
        // First check if id is a habitation_id (sent_to_anr mode)
        const { data: habitation } = await supabase
          .from("habitations")
          .select("id, name, anr:anrs(address)")
          .eq("id", id)
          .maybeSingle();

        if (habitation) {
          setConversationType('sent_to_anr');
          setHabitationInfo({
            name: habitation.name || "Résidence",
            address: (habitation.anr as any)?.address || "",
          });
          setLoading(false);
          return;
        }

        // Otherwise it's received_from_visitor mode
        setConversationType('received_from_visitor');

        // Get user's habitation for received messages
        const { data: residentData } = await supabase
          .from("residents")
          .select("habitation_id")
          .eq("user_id", user.id)
          .eq("status", "verified")
          .maybeSingle();

        if (!residentData?.habitation_id) {
          navigate("/messages");
          return;
        }

        setHabitationId(residentData.habitation_id);

        // Fetch visitor messages
        let query = supabase.from("visitor_messages" as any)
          .select("*, business_card:visitor_business_cards(*)")
          .eq("habitation_id", residentData.habitation_id)
          .order("created_at", { ascending: true });

        const isAnonId = id.startsWith("anon-");
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        if (isAnonId) {
          const messageId = id.replace("anon-", "");
          query = query.eq("id", messageId);
        } else if (isUuid) {
          query = query.eq("business_card_id", id);
        } else {
          query = query.eq("visitor_phone", id);
        }

        const { data, error } = await (query as any);
        if (error) throw error;

        if (!data || data.length === 0) {
          toast({ title: "Erreur", description: "Conversation introuvable", variant: "destructive" });
          navigate("/messages");
          return;
        }

        setVisitorMessages(data as VisitorMessage[]);

        // Mark as read
        const unreadIds = data.filter((m: any) => !m.is_read).map((m: any) => m.id);
        if (unreadIds.length > 0) {
          await supabase.from("visitor_messages" as any).update({
            is_read: true,
            read_at: new Date().toISOString()
          }).in("id", unreadIds);
        }

        // Delete corresponding notifications
        if (user?.id && data.length > 0) {
          const messageIds = data.map((m: any) => m.id);
          const { data: notifs } = await supabase
            .from("user_notifications")
            .select("id, data")
            .eq("user_id", user.id)
            .eq("type", "visitor_message");

          if (notifs) {
            const notifIdsToDelete = notifs
              .filter(n => n.data && messageIds.includes((n.data as any).message_id))
              .map(n => n.id);

            if (notifIdsToDelete.length > 0) {
              await supabase.from("user_notifications").delete().in("id", notifIdsToDelete);
            }
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("[Conversation] Error:", error);
        toast({ title: "Erreur", description: "Impossible de charger la conversation", variant: "destructive" });
        navigate("/messages");
      }
    };

    detectConversationType();
  }, [id, user]);

  // Mark sent replies as read
  useEffect(() => {
    if (conversationType !== 'sent_to_anr') return;
    
    const unreadReplies = sentConversationData.replies.filter((r: any) => !r.is_read);
    unreadReplies.forEach((r: any) => markReplyAsRead(r.id));

    if (user?.id && unreadReplies.length > 0) {
      const replyIds = unreadReplies.map((r: any) => r.id);
      supabase
        .from("user_notifications")
        .select("id, data")
        .eq("user_id", user.id)
        .eq("type", "message_reply")
        .then(({ data: notifs }) => {
          if (notifs) {
            const notifIdsToDelete = notifs
              .filter(n => n.data && replyIds.includes((n.data as any).reply_id))
              .map(n => n.id);

            if (notifIdsToDelete.length > 0) {
              supabase.from("user_notifications").delete().in("id", notifIdsToDelete);
            }
          }
        });
    }
  }, [sentConversationData.replies, conversationType, user]);

  // Scroll handling
  const hasScrolledRef = useRef(false);
  useLayoutEffect(() => {
    const hasMessages = conversationType === 'sent_to_anr' 
      ? allSentMessages.length > 0 || sentConversationData.replies.length > 0
      : visitorMessages.length > 0;

    if (!loading && hasMessages && !hasScrolledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      hasScrolledRef.current = true;
    }
  }, [loading, visitorMessages.length, allSentMessages.length, sentConversationData.replies.length, conversationType]);

  useEffect(() => {
    if (hasScrolledRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [replies.length, sentConversationData.replies.length]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 10 Mo", variant: "destructive" });
      return;
    }

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({ title: "Type de fichier non supporté", description: "Seules les photos et vidéos sont acceptées", variant: "destructive" });
      return;
    }

    setSelectedMedia(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const clearSelectedMedia = () => {
    setSelectedMedia(null);
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!id) return;

    if (conversationType === 'received_from_visitor') {
      // Resident replying to visitor
      if (!habitationId || !firstMessageId || (!replyText.trim() && !audioBlob && !selectedMedia && !videoBlob)) return;
      
      setSending(true);
      try {
        let audioBase64: string | undefined;
        if (audioBlob) {
          const buffer = await audioBlob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          audioBase64 = btoa(String.fromCharCode(...bytes));
        }

        let mediaToSend = selectedMedia;
        if (videoBlob && !selectedMedia) {
          mediaToSend = new File([videoBlob], `selfie-${Date.now()}.webm`, { type: videoBlob.type || 'video/webm' });
        }

        const result = await sendReply(firstMessageId, habitationId, replyText.trim() || undefined, audioBase64, mediaToSend || undefined);
        if (result.success) {
          setReplyText("");
          setAudioBlob(null);
          setVideoBlob(null);
          setShowVoiceRecorder(false);
          setShowVideoRecorder(false);
          clearSelectedMedia();
        } else {
          throw new Error(result.error);
        }
      } catch (error: any) {
        toast({ title: "Erreur", description: error.message || "Impossible d'envoyer", variant: "destructive" });
      } finally {
        setSending(false);
      }
    } else {
      // User sending to another ANR
      if (!replyText.trim() && !audioBlob && !selectedMedia && !videoBlob) return;

      const messageText = replyText.trim();
      setSending(true);

      try {
        let audioBase64: string | undefined;
        if (audioBlob) {
          const buffer = await audioBlob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          audioBase64 = btoa(String.fromCharCode(...bytes));
        }

        // Prepare media file (photo, video, or video selfie)
        let mediaToSend: File | undefined;
        if (selectedMedia) {
          mediaToSend = selectedMedia;
        } else if (videoBlob) {
          mediaToSend = new File([videoBlob], `selfie-${Date.now()}.webm`, { type: videoBlob.type || 'video/webm' });
        }

        // Encrypt if ready
        let encryptionData: { encrypted_message: string; message_nonce: string; visitor_public_key: string } | undefined;
        if (encryptionReady && messageText) {
          try {
            encryptionData = await encryptMessageForResident(messageText);
          } catch (error) {
            console.warn('Encryption failed, sending unencrypted:', error);
          }
        }

        const result = await sendMessage(
          id,
          messageText || undefined,
          undefined,
          undefined,
          businessCard?.id,
          audioBase64,
          encryptionData,
          mediaToSend
        );

        if (result.success) {
          if (result.message) {
            setLocalMessages(prev => [...prev, { ...result.message, message: messageText || null }]);
          }
          setReplyText("");
          setAudioBlob(null);
          setVideoBlob(null);
          setShowVoiceRecorder(false);
          setShowVideoRecorder(false);
          clearSelectedMedia();
          setTimeout(() => refetchSentMessages(), 500);
          toast({ title: "Message envoyé", description: "Le résident recevra une notification" });
        } else {
          throw new Error(result.error);
        }
      } catch (error: any) {
        toast({ title: "Erreur", description: error.message || "Impossible d'envoyer", variant: "destructive" });
      } finally {
        setSending(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Handle "sent_to_anr" mode with no habitation found
  if (conversationType === 'sent_to_anr' && !habitationInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Home className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Habitation introuvable</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cette résidence n'existe plus ou a été supprimée.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate("/messages")}>Retour</Button>
            <Button onClick={() => navigate("/visitor")}>Scanner une ANR</Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle "received_from_visitor" mode with no messages
  if (conversationType === 'received_from_visitor' && visitorMessages.length === 0) {
    return null;
  }

  // Prepare messages for rendering
  let allMessagesForDisplay: { type: 'separator' | 'mine' | 'theirs'; data: any; date: Date }[] = [];

  if (conversationType === 'received_from_visitor') {
    // Resident view: visitor messages on left (theirs), replies on right (mine)
    const messageWithCard = visitorMessages.find(m => m.business_card);
    const card = messageWithCard?.business_card;
    const isCompany = card?.card_type === "company";
    const displayName = card
      ? isCompany ? card.company_name : `${card.first_name || ""} ${card.last_name || ""}`.trim()
      : visitorMessages[0]?.visitor_phone || "Visiteur";

    const combined = [
      ...visitorMessages.map(m => ({ type: 'theirs' as const, data: m, date: new Date(m.created_at) })),
      ...replies.map(r => ({ type: 'mine' as const, data: r, date: new Date(r.created_at) }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    let lastDateStr = "";
    combined.forEach(msg => {
      const dateStr = format(msg.date, "yyyy-MM-dd");
      if (dateStr !== lastDateStr) {
        allMessagesForDisplay.push({ type: 'separator', data: { label: formatDateSeparator(msg.date) }, date: msg.date });
        lastDateStr = dateStr;
      }
      allMessagesForDisplay.push(msg);
    });
  } else {
    // Sent to ANR view: my sent messages on right (mine), replies on left (theirs)
    const combined = [
      ...allSentMessages.map(m => ({ type: 'mine' as const, data: m, date: new Date(m.created_at) })),
      ...sentConversationData.replies.map((r: any) => ({ type: 'theirs' as const, data: r, date: new Date(r.created_at) }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    let lastDateStr = "";
    combined.forEach(msg => {
      const dateStr = format(msg.date, "yyyy-MM-dd");
      if (dateStr !== lastDateStr) {
        allMessagesForDisplay.push({ type: 'separator', data: { label: formatDateSeparator(msg.date) }, date: msg.date });
        lastDateStr = dateStr;
      }
      allMessagesForDisplay.push(msg);
    });
  }

  // Delete message handlers
  const handleDeleteForMe = async () => {
    if (!messageToDelete) return;
    
    console.log("[Conversation] handleDeleteForMe:", messageToDelete, "type:", conversationType);
    
    try {
      if (conversationType === 'received_from_visitor') {
        // Resident is deleting - use deleted_by_resident
        if (messageToDelete.isMine) {
          // My reply as resident - soft delete for resident
          const { error } = await supabase
            .from("message_replies")
            .update({ deleted_by_resident: true })
            .eq("id", messageToDelete.id);
          
          if (error) {
            console.error("[Conversation] Error soft deleting reply:", error);
            throw error;
          }
          
          // Force immediate state update by filtering replies locally first
          // Then refetch to sync with DB
          await refetchReplies();
        } else {
          // Visitor's message - soft delete for RESIDENT
          const { error } = await supabase
            .from("visitor_messages")
            .update({ deleted_by_resident: true })
            .eq("id", messageToDelete.id);
          
          if (error) {
            console.error("[Conversation] Error soft deleting visitor message:", error);
            throw error;
          }
          
          // Update local state immediately
          setVisitorMessages(prev => prev.filter(m => m.id !== messageToDelete.id));
        }
      } else {
        // Sender is deleting - use deleted_by_visitor
        if (messageToDelete.isMine) {
          // My sent message - use hook's deleteSentMessage which updates internal state
          const result = await deleteSentMessage(messageToDelete.id);
          if (!result.success) {
            console.error("[Conversation] Error soft deleting sent message:", result.error);
            throw new Error(result.error);
          }
          // Also filter localMessages for optimistic UI messages
          setLocalMessages(prev => prev.filter(m => m.id !== messageToDelete.id));
        } else {
          // Recipient's reply - soft delete for visitor
          const { error } = await supabase
            .from("message_replies")
            .update({ deleted_by_visitor: true })
            .eq("id", messageToDelete.id);
          
          if (error) {
            console.error("[Conversation] Error soft deleting recipient reply:", error);
            throw error;
          }
          
          // Refetch to sync display
          await refetchSentMessages();
        }
      }
      
      setShowDeleteDialog(false);
      setMessageToDelete(null);
      toast({ title: "Message supprimé" });
    } catch (error) {
      console.error("[Conversation] Delete error:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer le message", variant: "destructive" });
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!messageToDelete) return;
    
    console.log("[Conversation] handleDeleteForEveryone:", messageToDelete, "type:", conversationType);
    
    try {
      if (conversationType === 'received_from_visitor') {
        if (messageToDelete.isMine) {
          // Hard delete my reply
          const { error } = await supabase.from("message_replies").delete().eq("id", messageToDelete.id);
          if (error) throw error;
          await refetchReplies();
        } else {
          // Hard delete visitor's message
          const { error } = await supabase.from("visitor_messages").delete().eq("id", messageToDelete.id);
          if (error) throw error;
          setVisitorMessages(prev => prev.filter(m => m.id !== messageToDelete.id));
        }
      } else {
        if (messageToDelete.isMine) {
          // Hard delete my sent message
          const { error } = await supabase.from("visitor_messages").delete().eq("id", messageToDelete.id);
          if (error) throw error;
          setLocalMessages(prev => prev.filter(m => m.id !== messageToDelete.id));
          await refetchSentMessages();
        } else {
          // Hard delete recipient's reply
          const { error } = await supabase.from("message_replies").delete().eq("id", messageToDelete.id);
          if (error) throw error;
          await refetchSentMessages();
        }
      }
      
      setShowDeleteDialog(false);
      setMessageToDelete(null);
      toast({ title: "Message supprimé pour tout le monde" });
    } catch (error) {
      console.error("[Conversation] Delete everyone error:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer le message", variant: "destructive" });
    }
  };

  // Get header info
  const getHeaderInfo = () => {
    if (conversationType === 'sent_to_anr') {
      return {
        icon: <Home className="w-5 h-5 text-white" />,
        name: habitationInfo?.name || "Résidence",
        subtitle: habitationInfo?.address || "",
        avatarUrl: null,
        isCompany: false
      };
    } else {
      const messageWithCard = visitorMessages.find(m => m.business_card);
      const card = messageWithCard?.business_card;
      const isCompany = card?.card_type === "company";
      const displayName = card
        ? isCompany ? card.company_name : `${card.first_name || ""} ${card.last_name || ""}`.trim()
        : visitorMessages[0]?.visitor_phone || "Visiteur";
      return {
        icon: isCompany ? <Building2 className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />,
        name: displayName || "Visiteur",
        subtitle: card?.job_title || null,
        avatarUrl: card?.avatar_url || null,
        isCompany,
        card
      };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="min-h-screen flex flex-col pb-16 bg-secondary/30">
      {/* Blue Header */}
      <div className="sticky top-0 z-10 bg-primary shadow-md">
        <div className="max-w-2xl mx-auto w-full px-2 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate("/messages")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <Avatar className="w-10 h-10 flex-shrink-0 border-2 border-white/20">
              {headerInfo.avatarUrl ? <AvatarImage src={headerInfo.avatarUrl} alt={headerInfo.name} /> : null}
              <AvatarFallback className="bg-white/20">{headerInfo.icon}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white truncate">{headerInfo.name}</p>
                {currentVisitorBlocked && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">Bloqué</span>}
              </div>
              <div className="flex items-center gap-2">
                {headerInfo.subtitle && <p className="text-xs text-white/70 truncate">{headerInfo.subtitle}</p>}
                <div className="flex items-center gap-1 text-[10px] text-white/60" title="Chiffrement E2E">
                  <Lock className="w-2.5 h-2.5" />
                  <span className="text-xs">E2E</span>
                </div>
              </div>
            </div>

            {/* Contact & Block buttons only for received_from_visitor mode */}
            {conversationType === 'received_from_visitor' && (
              <>
                {(headerInfo as any).card ? (
                  <AddToContactsButton businessCard={(headerInfo as any).card} messageId={visitorMessages[0]?.id} size="icon" variant="ghost" className="text-white hover:bg-white/10" />
                ) : (
                  <AddToContactsButton businessCard={{
                    id: id || "",
                    card_type: "individual",
                    first_name: headerInfo.name !== "Visiteur" ? headerInfo.name : null,
                    last_name: null,
                    company_name: null,
                    job_title: null,
                    phone: visitorMessages[0]?.visitor_phone || null,
                    email: null
                  }} messageId={visitorMessages[0]?.id} size="icon" variant="ghost" className="text-white hover:bg-white/10" />
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className={currentVisitorBlocked ? "text-green-400 hover:bg-white/10" : "text-red-400 hover:bg-white/10"}>
                      {currentVisitorBlocked ? <ShieldCheck className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {currentVisitorBlocked ? "Débloquer ce visiteur ?" : "Bloquer ce visiteur ?"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {currentVisitorBlocked 
                          ? "Vous pourrez à nouveau recevoir des messages de ce visiteur." 
                          : "Vous ne recevrez plus de messages de ce visiteur. Cette action est réversible."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction 
                        className={currentVisitorBlocked ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}
                        onClick={() => {
                          if (currentVisitorBlocked) {
                            unblockVisitor(id || "");
                          } else {
                            blockVisitor(id || "", headerInfo.name);
                          }
                        }}
                      >
                        {currentVisitorBlocked ? "Débloquer" : "Bloquer"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 pb-40 space-y-2 max-w-2xl mx-auto w-full">
        {/* Empty conversation welcome */}
        {allMessagesForDisplay.filter(m => m.type !== 'separator').length === 0 && (
          <div className="flex justify-center my-8">
            <div className="bg-[#E1F2FB] text-[#54656F] text-sm px-4 py-3 rounded-lg shadow-sm text-center max-w-xs">
              <p className="font-medium mb-1">📝 Nouvelle conversation</p>
              <p className="text-xs">Envoyez votre premier message</p>
            </div>
          </div>
        )}

        {allMessagesForDisplay.map((item, index) => {
          if (item.type === 'separator') {
            return (
              <div key={`sep-${index}`} className="flex justify-center my-3">
                <span className="bg-[#E1F2FB] text-[#54656F] text-xs px-3 py-1.5 rounded-lg shadow-sm">
                  {item.data.label}
                </span>
              </div>
            );
          }

          const msg = item.data;
          const isMine = item.type === 'mine';

          // Determine content type
          const hasVoice = msg.voice_message_url || msg.reply_voice_url;
          const hasMedia = msg.reply_media_url || msg.media_url;
          const mediaUrl = msg.reply_media_url || msg.media_url;
          const mediaType = msg.reply_media_type || msg.media_type;
          const text = msg.message || msg.reply_text || "";

          return (
            <div key={`msg-${msg.id}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
              {/* Trash icon for theirs (left side) */}
              {!isMine && (
                <button
                  onClick={() => {
                    setMessageToDelete({ id: msg.id, isMine: false, isRead: msg.is_read || false });
                    setShowDeleteDialog(true);
                  }}
                  className="opacity-70 hover:opacity-100 p-1 text-muted-foreground hover:bg-muted rounded self-center mr-1"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              {/* Trash icon for mine (left side of my message) */}
              {isMine && (
                <button
                  onClick={() => {
                    setMessageToDelete({ id: msg.id, isMine: true, isRead: msg.is_read || false });
                    setShowDeleteDialog(true);
                  }}
                  className="opacity-70 hover:opacity-100 p-1 text-muted-foreground hover:bg-muted rounded self-center mr-1"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              
              <div className="max-w-[85%]">
              {/* Voice message (with optional text) */}
                {hasVoice && (
                  <div className={`${isMine ? 'bg-[#D9FDD3] rounded-tr-none' : 'bg-white rounded-tl-none'} rounded-lg p-2 shadow-sm`}>
                    <WhatsAppAudioPlayer 
                      audioUrl={msg.voice_message_url || msg.reply_voice_url} 
                      isOwn={isMine} 
                      showAvatar={true} 
                    />
                    {/* Show text below audio if both exist */}
                    {text && (
                      <p className="text-sm text-[#111B21] whitespace-pre-wrap px-1 mt-2">{renderTextWithLinks(text)}</p>
                    )}
                    <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                      {msg.is_encrypted && <Lock className="w-3 h-3 text-[#667781]" />}
                      <span className="text-[11px] text-[#667781]">
                        {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                      </span>
                      {isMine && (msg.is_read ? <CheckCheck className="w-4 h-4 text-[#53BDEB]" /> : <Check className="w-4 h-4 text-[#667781]" />)}
                    </div>
                  </div>
                )}

                {/* Media message */}
                {hasMedia && !hasVoice && (
                  <div className={`${isMine ? 'bg-[#D9FDD3] rounded-tr-none' : 'bg-white rounded-tl-none'} rounded-lg p-1 shadow-sm overflow-hidden`}>
                    {mediaType === 'video' ? (
                      <video src={mediaUrl} controls className="max-w-full rounded-md max-h-64" />
                    ) : (
                      <img 
                        src={mediaUrl} 
                        alt="Photo" 
                        className="max-w-full rounded-md max-h-64 cursor-pointer"
                        onClick={() => window.open(mediaUrl, '_blank')}
                      />
                    )}
                    {text && <p className="text-sm text-[#111B21] whitespace-pre-wrap px-2 py-1">{renderTextWithLinks(text)}</p>}
                    <div className={`flex items-center gap-1 px-2 py-1 ${isMine ? 'justify-end' : ''}`}>
                      <span className="text-[11px] text-[#667781]">
                        {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                      </span>
                      {isMine && (msg.is_read ? <CheckCheck className="w-4 h-4 text-[#53BDEB]" /> : <Check className="w-4 h-4 text-[#667781]" />)}
                    </div>
                  </div>
                )}

                {/* Text message */}
                {!hasVoice && !hasMedia && text && (
                  <div className={`${isMine ? 'bg-[#D9FDD3] rounded-tr-none' : 'bg-white rounded-tl-none'} rounded-lg px-3 py-2 shadow-sm`}>
                    <p className="text-sm text-[#111B21] whitespace-pre-wrap">{renderTextWithLinks(text)}</p>
                    <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                      {msg.is_encrypted && <Lock className="w-3 h-3 text-[#667781]" />}
                      <span className="text-[11px] text-[#667781]">
                        {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                      </span>
                      {isMine && (msg.is_read ? <CheckCheck className="w-4 h-4 text-[#53BDEB]" /> : <Check className="w-4 h-4 text-[#667781]" />)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="fixed bottom-16 left-0 right-0 bg-[#F0F2F5] px-2 py-2">
        <div className="max-w-2xl mx-auto w-full">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

          {/* Media Preview */}
          {selectedMedia && mediaPreview && (
            <div className="mb-2 relative inline-block">
              <div className="relative rounded-lg overflow-hidden bg-white shadow-sm max-w-48">
                {selectedMedia.type.startsWith('video/') 
                  ? <video src={mediaPreview} className="max-h-32 object-cover" />
                  : <img src={mediaPreview} alt="Preview" className="max-h-32 object-cover" />
                }
                <button onClick={clearSelectedMedia} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80">
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 rounded text-xs text-white flex items-center gap-1">
                  {selectedMedia.type.startsWith('video/') ? <Video className="w-3 h-3" /> : <Image className="w-3 h-3" />}
                  {(selectedMedia.size / 1024 / 1024).toFixed(1)} Mo
                </div>
              </div>
            </div>
          )}

          {showVideoRecorder ? (
            <VideoRecorder 
              onRecordingComplete={blob => setVideoBlob(blob)} 
              onSend={handleSend} 
              onCancel={() => { setShowVideoRecorder(false); setVideoBlob(null); }} 
              sending={sending} 
              videoBlob={videoBlob} 
            />
          ) : showVoiceRecorder ? (
            <VoiceRecorder 
              onRecordingComplete={blob => setAudioBlob(blob)} 
              onSend={handleSend} 
              onCancel={() => { setShowVoiceRecorder(false); setAudioBlob(null); }} 
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
                              <button key={i} className="text-xl p-1 hover:bg-muted rounded transition-colors" onClick={() => setReplyText(prev => prev + emoji)}>
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <button className="p-2 text-[#54656F] hover:text-[#075E54] transition-colors" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="w-6 h-6" />
                </button>

                <button className="p-2 text-[#54656F] hover:text-[#075E54] transition-colors" onClick={() => setShowVideoRecorder(true)}>
                  <Camera className="w-6 h-6" />
                </button>
              </div>

              {/* Input */}
              <div className="flex-1 bg-white rounded-full px-4 py-2 shadow-sm">
                <Textarea 
                  placeholder="Message" 
                  value={replyText} 
                  onChange={e => setReplyText(e.target.value)} 
                  className="w-full border-0 p-0 min-h-[24px] max-h-24 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 resize-none overflow-y-auto text-[#111B21]" 
                  rows={1}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey && (replyText.trim() || selectedMedia)) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  style={{ height: 'auto', minHeight: '24px' }}
                  onInput={e => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 96) + 'px';
                  }}
                />
              </div>

              {/* Send/Mic button */}
              {replyText.trim() || selectedMedia ? (
                <button className="p-3 rounded-full bg-[#075E54] text-white hover:bg-[#064E46] transition-colors shadow-md" onClick={handleSend} disabled={sending}>
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              ) : (
                <button onClick={() => setShowVoiceRecorder(true)} className="p-3 rounded-full text-white transition-colors shadow-md bg-[#2266ba]">
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Message Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Choisissez comment supprimer ce message
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-4">
            {/* Show "Delete for everyone" only if message not read AND it's my message */}
            {messageToDelete?.isMine && !messageToDelete?.isRead && (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleDeleteForEveryone}
              >
                <Trash2 className="w-4 h-4" />
                Supprimer pour tout le monde
              </Button>
            )}
            {/* If message is read AND it's mine, show explanatory message */}
            {messageToDelete?.isMine && messageToDelete?.isRead && (
              <p className="text-sm text-muted-foreground text-center py-2 bg-muted/50 rounded-md">
                Ce message a été lu, vous ne pouvez plus le supprimer pour tout le monde
              </p>
            )}
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleDeleteForMe}
            >
              <Trash2 className="w-4 h-4" />
              Supprimer pour moi uniquement
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMessageToDelete(null)}>Annuler</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default Conversation;
