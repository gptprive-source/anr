import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Building2, User, Phone, Mail, MapPin, Check, CheckCheck, Loader2, Smile, Send, UserPlus, Paperclip, X, Image, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMessageReplies } from "@/hooks/useMessageReplies";
import { AddToContactsButton } from "@/components/messages/AddToContactsButton";
import WhatsAppAudioPlayer from "@/components/messages/WhatsAppAudioPlayer";
import VoiceRecorder from "@/components/visitor/VoiceRecorder";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import BottomNav from "@/components/layout/BottomNav";

const EMOJI_CATEGORIES = {
  "😊 Smileys": [
    "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩",
    "😘", "😗", "☺️", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔",
    "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷",
    "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐",
    "😕", "😟", "🙁", "☹️", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭",
    "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "😈", "👿", "💀", "☠️",
    "💩", "🤡", "👹", "👺", "👻", "👽", "👾", "🤖", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"
  ],
  "👋 Gestes": [
    "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆",
    "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️",
    "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀",
    "👁️", "👅", "👄", "💋", "🩸"
  ],
  "👨 Personnes": [
    "👶", "👧", "🧒", "👦", "👩", "🧑", "👨", "👩‍🦱", "🧑‍🦱", "👨‍🦱", "👩‍🦰", "🧑‍🦰", "👨‍🦰", "👱‍♀️", "👱", "👱‍♂️",
    "👩‍🦳", "🧑‍🦳", "👨‍🦳", "👩‍🦲", "🧑‍🦲", "👨‍🦲", "🧔‍♀️", "🧔", "🧔‍♂️", "👵", "🧓", "👴", "👲", "👳‍♀️", "👳", "👳‍♂️",
    "🧕", "👮‍♀️", "👮", "👮‍♂️", "👷‍♀️", "👷", "👷‍♂️", "💂‍♀️", "💂", "💂‍♂️", "🕵️‍♀️", "🕵️", "🕵️‍♂️", "👩‍⚕️", "🧑‍⚕️", "👨‍⚕️"
  ],
  "❤️ Coeurs": [
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖",
    "💘", "💝", "💟", "❤️‍🔥", "❤️‍🩹", "💌", "💤", "💢", "💥", "💦", "💨", "🕳️", "💣", "💬", "👁️‍🗨️", "🗨️"
  ],
  "🐶 Animaux": [
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵",
    "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗",
    "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🪳", "🦟", "🦗", "🕷️", "🕸️",
    "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳"
  ],
  "🍔 Nourriture": [
    "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥",
    "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅", "🥔", "🍠",
    "🥐", "🥖", "🍞", "🥨", "🥯", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴",
    "🌭", "🍔", "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🍝", "🍜",
    "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧",
    "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯"
  ],
  "⚽ Sports": [
    "⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍",
    "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌",
    "🎿", "⛷️", "🏂", "🪂", "🏋️‍♀️", "🏋️", "🏋️‍♂️", "🤼‍♀️", "🤼", "🤼‍♂️", "🤸‍♀️", "🤸", "🤸‍♂️", "⛹️‍♀️", "⛹️", "⛹️‍♂️"
  ],
  "🚗 Transport": [
    "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🦯", "🦽",
    "🦼", "🛴", "🚲", "🛵", "🏍️", "🛺", "🚨", "🚔", "🚍", "🚘", "🚖", "🚡", "🚠", "🚟", "🚃", "🚋",
    "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "✈️", "🛫", "🛬", "🛩️", "💺", "🛰️",
    "🚀", "🛸", "🚁", "🛶", "⛵", "🚤", "🛥️", "🛳️", "⛴️", "🚢", "⚓", "🪝", "⛽", "🚧", "🚦", "🚥"
  ],
  "⭐ Symboles": [
    "⭐", "🌟", "💫", "✨", "⚡", "☄️", "💥", "🔥", "🌈", "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️",
    "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🌬️", "💨", "💧", "💦", "☔", "☂️", "🌊", "🌫️", "✅", "❌",
    "❓", "❔", "❕", "❗", "⭕", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "🟤", "⚫", "⚪", "🟥", "🟧",
    "🟨", "🟩", "🟦", "🟪", "🟫", "⬛", "⬜", "◼️", "◻️", "◾", "◽", "▪️", "▫️", "🔶", "🔷", "🔸",
    "🔹", "🔺", "🔻", "💠", "🔘", "🔳", "🔲", "🏁", "🚩", "🎌", "🏴", "🏳️", "💯", "🔢", "🔣", "🔤"
  ],
  "🎉 Objets": [
    "🎉", "🎊", "🎈", "🎁", "🎀", "🎗️", "🎟️", "🎫", "🎖️", "🏆", "🏅", "🥇", "🥈", "🥉", "⚽", "🎯",
    "🎮", "🕹️", "🎰", "🎲", "🧩", "🎭", "🖼️", "🎨", "🧵", "🪡", "🧶", "🪢", "👓", "🕶️", "🥽", "🥼",
    "🦺", "👔", "👕", "👖", "🧣", "🧤", "🧥", "🧦", "👗", "👘", "🥻", "🩱", "🩲", "🩳", "👙", "👚",
    "👛", "👜", "👝", "🛍️", "🎒", "🩴", "👞", "👟", "🥾", "🥿", "👠", "👡", "🩰", "👢", "👑", "👒",
    "🎩", "🎓", "🧢", "🪖", "⛑️", "📿", "💄", "💍", "💎", "📱", "📲", "💻", "🖥️", "🖨️", "⌨️", "🖱️"
  ]
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
  visitor_anr_code: string | null;
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
}

const formatDateSeparator = (date: Date) => {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  return format(date, "EEEE d MMMM", { locale: fr });
};

const Conversation = () => {
  const { visitorId } = useParams<{ visitorId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [visitorMessages, setVisitorMessages] = useState<VisitorMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [habitationId, setHabitationId] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get the first message ID for replies hook
  const firstMessageId = visitorMessages[0]?.id || "";
  const { replies, sendReply, loading: repliesLoading } = useMessageReplies(firstMessageId);

  // Fetch all messages from this visitor
  useEffect(() => {
    const fetchVisitorMessages = async () => {
      if (!visitorId || !user) return;

      try {
        // First get user's habitation
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

        // Determine if visitorId is a business_card_id, message ID (anon-xxx), or visitor_phone
        let query = supabase
          .from("visitor_messages" as any)
          .select("*, business_card:visitor_business_cards(*)")
          .eq("habitation_id", residentData.habitation_id)
          .order("created_at", { ascending: true });

        // Check if visitorId is an anon-{messageId} pattern
        const isAnonId = visitorId.startsWith("anon-");
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitorId);
        
        if (isAnonId) {
          // Extract the message ID and fetch that specific message
          const messageId = visitorId.replace("anon-", "");
          query = query.eq("id", messageId);
        } else if (isUuid) {
          query = query.eq("business_card_id", visitorId);
        } else {
          // It's a phone number or device ID
          query = query.eq("visitor_phone", visitorId);
        }

        const { data, error } = await (query as any);

        if (error) throw error;

        if (!data || data.length === 0) {
          toast({
            title: "Erreur",
            description: "Conversation introuvable",
            variant: "destructive",
          });
          navigate("/messages");
          return;
        }

        setVisitorMessages(data as VisitorMessage[]);

        // Mark all as read
        const unreadIds = data.filter((m: any) => !m.is_read).map((m: any) => m.id);
        if (unreadIds.length > 0) {
          await supabase
            .from("visitor_messages" as any)
            .update({ is_read: true, read_at: new Date().toISOString() })
            .in("id", unreadIds);
        }
      } catch (error) {
        console.error("[Conversation] Error:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger la conversation",
          variant: "destructive",
        });
        navigate("/messages");
      } finally {
        setLoading(false);
      }
    };

    fetchVisitorMessages();
  }, [visitorId, user]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visitorMessages, replies]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 10 Mo",
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast({
        title: "Type de fichier non supporté",
        description: "Seules les photos et vidéos sont acceptées",
        variant: "destructive",
      });
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
    if (!habitationId || !firstMessageId || (!replyText.trim() && !audioBlob && !selectedMedia)) return;

    setSending(true);
    try {
      let audioBase64: string | undefined;
      if (audioBlob) {
        const buffer = await audioBlob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        audioBase64 = btoa(String.fromCharCode(...bytes));
      }

      const result = await sendReply(
        firstMessageId,
        habitationId,
        replyText.trim() || undefined,
        audioBase64,
        selectedMedia || undefined
      );

      if (result.success) {
        setReplyText("");
        setAudioBlob(null);
        setShowVoiceRecorder(false);
        clearSelectedMedia();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (visitorMessages.length === 0) {
    return null;
  }

  // Get visitor info from first message with business card
  const messageWithCard = visitorMessages.find(m => m.business_card);
  const card = messageWithCard?.business_card;
  const isCompany = card?.card_type === "company";
  const displayName = card
    ? isCompany
      ? card.company_name
      : `${card.first_name || ""} ${card.last_name || ""}`.trim()
    : visitorMessages[0]?.visitor_phone || "Visiteur";

  // Combine visitor messages and replies in chronological order
  const allMessages = [
    ...visitorMessages.map(m => ({ type: 'visitor' as const, data: m, date: new Date(m.created_at) })),
    ...replies.map(r => ({ type: 'reply' as const, data: r, date: new Date(r.created_at) }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Group messages by date for separators
  const messagesWithDateSeparators: { type: 'separator' | 'visitor' | 'reply'; data: any; date: Date }[] = [];
  let lastDateStr = "";
  
  allMessages.forEach((msg) => {
    const dateStr = format(msg.date, "yyyy-MM-dd");
    if (dateStr !== lastDateStr) {
      messagesWithDateSeparators.push({ type: 'separator', data: { label: formatDateSeparator(msg.date) }, date: msg.date });
      lastDateStr = dateStr;
    }
    messagesWithDateSeparators.push(msg);
  });

  return (
    <div className="min-h-screen flex flex-col pb-20">
      {/* Sticky Header with Contact Info */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-2xl mx-auto w-full p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/messages")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>

            {card ? (
              <AddToContactsButton 
                businessCard={card} 
                messageId={visitorMessages[0]?.id} 
                size="icon" 
                variant="ghost"
                className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
              />
            ) : (
              <AddToContactsButton 
                businessCard={{
                  id: visitorId || "",
                  card_type: "individual",
                  first_name: displayName !== "Visiteur" ? displayName : null,
                  last_name: null,
                  company_name: null,
                  job_title: null,
                  phone: visitorMessages[0]?.visitor_phone || null,
                  email: null,
                  visitor_anr_code: null,
                }} 
                messageId={visitorMessages[0]?.id} 
                size="icon" 
                variant="ghost"
                className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
              />
            )}
            
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isCompany ? "bg-orange-500/10" : "bg-purple-500/10"}`}>
              {isCompany ? (
                <Building2 className="w-5 h-5 text-orange-500" />
              ) : (
                <User className="w-5 h-5 text-purple-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{displayName}</p>
              {card?.job_title && (
                <p className="text-xs text-muted-foreground truncate">{card.job_title}</p>
              )}
            </div>
          </div>

          {/* Contact Info inside sticky header */}
          {card && (card.phone || card.email || card.visitor_anr_code) && (
            <div className="p-3 bg-background/50 rounded-lg border border-purple-500 overflow-hidden">
              <div className="flex items-center gap-3 text-sm flex-nowrap overflow-x-auto">
                {card.phone && (
                  <a 
                    href={`tel:${card.phone}`} 
                    className="flex items-center gap-1 text-blue-500 hover:underline cursor-pointer flex-shrink-0"
                  >
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">{card.phone}</span>
                  </a>
                )}
                {card.email && (
                  <a 
                    href={`mailto:${card.email}`} 
                    className="flex items-center gap-1 text-orange-500 hover:underline cursor-pointer min-w-0"
                  >
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{card.email}</span>
                  </a>
                )}
                {card.visitor_anr_code && (
                  <span className="flex items-center gap-1 text-green-500 flex-shrink-0">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">ANR: {card.visitor_anr_code}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-2xl mx-auto w-full">
        {messagesWithDateSeparators.map((item, index) => {
          if (item.type === 'separator') {
            return (
              <div key={`sep-${index}`} className="flex justify-center my-3">
                <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-lg">
                  {item.data.label}
                </span>
              </div>
            );
          }

          if (item.type === 'visitor') {
            const msg = item.data;
            return (
              <div key={`visitor-${msg.id}`} className="flex justify-start">
                <div className="max-w-[85%]">
                  {msg.voice_message_url ? (
                    <div className="mb-1">
                      <WhatsAppAudioPlayer 
                        audioUrl={msg.voice_message_url} 
                        isOwn={false}
                        showAvatar={true}
                      />
                      <p className="text-xs text-muted-foreground mt-1 ml-2">
                        {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-background/50 rounded-xl rounded-tl-sm px-3 py-2 border border-blue-500">
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        {format(new Date(msg.created_at), "HH:mm", { locale: fr })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          } else {
            const reply = item.data;
            return (
              <div key={`reply-${reply.id}`} className="flex justify-end">
                <div className="max-w-[85%]">
                  {/* Media message */}
                  {reply.reply_media_url && (
                    <div className="mb-1">
                      <div className="bg-green-500/10 rounded-xl rounded-tr-sm p-1 border border-green-500 overflow-hidden">
                        {reply.reply_media_type === 'video' ? (
                          <video 
                            src={reply.reply_media_url} 
                            controls 
                            className="max-w-full rounded-lg max-h-64"
                          />
                        ) : (
                          <img 
                            src={reply.reply_media_url} 
                            alt="Photo envoyée" 
                            className="max-w-full rounded-lg max-h-64 cursor-pointer"
                            onClick={() => window.open(reply.reply_media_url, '_blank')}
                          />
                        )}
                        {reply.reply_text && (
                          <p className="text-sm whitespace-pre-wrap px-2 py-1">{reply.reply_text}</p>
                        )}
                        <div className="flex items-center justify-end gap-1 px-2 py-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(reply.created_at), "HH:mm", { locale: fr })}
                          </span>
                          {reply.is_read ? (
                            <CheckCheck className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Check className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Voice message */}
                  {reply.reply_voice_url && !reply.reply_media_url && (
                    <div className="mb-1">
                      <WhatsAppAudioPlayer 
                        audioUrl={reply.reply_voice_url} 
                        isOwn={true}
                        showAvatar={true}
                      />
                      <div className="flex items-center justify-end gap-1 mt-1 mr-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(reply.created_at), "HH:mm", { locale: fr })}
                        </span>
                        {reply.is_read ? (
                          <CheckCheck className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Check className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  )}
                  {/* Text only message */}
                  {!reply.reply_voice_url && !reply.reply_media_url && reply.reply_text && (
                    <div className="bg-green-500/10 rounded-xl rounded-tr-sm px-3 py-2 border border-green-500">
                      <p className="text-sm whitespace-pre-wrap">{reply.reply_text}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(reply.created_at), "HH:mm", { locale: fr })}
                        </span>
                        {reply.is_read ? (
                          <CheckCheck className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Check className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="sticky bottom-20 bg-background px-4 py-3 max-w-2xl mx-auto w-full">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Media Preview */}
        {selectedMedia && mediaPreview && (
          <div className="mb-3 relative inline-block">
            <div className="relative rounded-lg overflow-hidden border border-blue-500 max-w-48">
              {selectedMedia.type.startsWith('video/') ? (
                <video src={mediaPreview} className="max-h-32 object-cover" />
              ) : (
                <img src={mediaPreview} alt="Preview" className="max-h-32 object-cover" />
              )}
              <button
                onClick={clearSelectedMedia}
                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 rounded text-xs text-white flex items-center gap-1">
                {selectedMedia.type.startsWith('video/') ? <Video className="w-3 h-3" /> : <Image className="w-3 h-3" />}
                {(selectedMedia.size / 1024 / 1024).toFixed(1)} Mo
              </div>
            </div>
          </div>
        )}

        {showVoiceRecorder ? (
          <VoiceRecorder 
            onRecordingComplete={(blob) => setAudioBlob(blob)}
            onSend={handleSend}
            onCancel={() => {
              setShowVoiceRecorder(false);
              setAudioBlob(null);
            }}
            sending={sending}
            audioBlob={audioBlob}
          />
        ) : (
          <div className="flex items-center gap-2">
            {/* Attachment Button */}
            <button 
              className="p-2 text-muted-foreground hover:text-blue-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-6 h-6" />
            </button>

            {/* Emoji Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <Smile className="w-6 h-6" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-2 max-h-72 overflow-y-auto" side="top" align="start">
                <div className="space-y-3">
                  {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                    <div key={category}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{category}</p>
                      <div className="grid grid-cols-8 gap-1">
                        {emojis.map((emoji, index) => (
                          <button
                            key={index}
                            className="text-xl p-1 hover:bg-muted rounded transition-colors"
                            onClick={() => setReplyText(prev => prev + emoji)}
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

            {/* Input Field */}
            <div className="flex-1 bg-background/50 rounded-full px-4 py-2 flex items-center border border-purple-500">
              <Input
                placeholder="Entrez un message"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="border-0 p-0 h-auto bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && (replyText.trim() || selectedMedia)) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>

            {/* Mic/Send button - changes based on text input or media */}
            <button 
              className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              onClick={() => {
                if (replyText.trim() || selectedMedia) {
                  handleSend();
                } else {
                  setShowVoiceRecorder(true);
                }
              }}
              disabled={sending}
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (replyText.trim() || selectedMedia) ? (
                <Send className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Conversation;
