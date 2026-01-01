import { useState, useMemo } from "react";
import { MessageSquare, Search, Plus, Loader2, Mic, Image, Phone, PhoneMissed, DoorOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/layout/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChats, Chat } from "@/hooks/useChats";
import { useAuth } from "@/hooks/useAuth";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import NewChatDialog from "@/components/messages/NewChatDialog";
const formatMessageTime = (dateString: string | null): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isToday(date)) {
    return format(date, "HH:mm");
  } else if (isYesterday(date)) {
    return "Hier";
  } else {
    return format(date, "dd/MM/yy");
  }
};
const getMessageIcon = (preview: string | null) => {
  if (!preview) return null;
  if (preview.includes("🎤")) return <Mic className="w-4 h-4 text-muted-foreground" />;
  if (preview.includes("📷")) return <Image className="w-4 h-4 text-muted-foreground" />;
  if (preview.includes("Appel manqué")) return <PhoneMissed className="w-4 h-4 text-destructive" />;
  if (preview.includes("Appel terminé")) return <Phone className="w-4 h-4 text-primary" />;
  return null;
};
const ChatListItem = ({
  chat,
  userId,
  isOnline,
  onClick
}: {
  chat: Chat;
  userId: string;
  isOnline: boolean;
  onClick: () => void;
}) => {
  const isParticipant1 = chat.participant1_id === userId;
  const unreadCount = isParticipant1 ? chat.unread_count_p1 : chat.unread_count_p2;
  const hasUnread = (unreadCount || 0) > 0;
  const displayName = chat.other_user?.first_name && chat.other_user?.last_name ? `${chat.other_user.first_name} ${chat.other_user.last_name}` : chat.other_user?.first_name || "Utilisateur";
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const messageIcon = getMessageIcon(chat.last_message_preview);
  const previewText = chat.last_message_preview?.replace(/^[🎤📷📞]\s*/, "") || "Aucun message";
  return <button onClick={onClick} className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors border-b border-border/50">
      <div className="relative">
        <Avatar className="h-12 w-12 flex-shrink-0">
          <AvatarImage src={chat.other_user?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        {isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />}
      </div>
      
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("font-medium truncate", hasUnread && "text-foreground")}>
            {displayName}
          </span>
          <span className={cn("text-xs flex-shrink-0", hasUnread ? "text-primary font-medium" : "text-muted-foreground")}>
            {formatMessageTime(chat.last_message_at)}
          </span>
        </div>
        
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {messageIcon}
            <span className={cn("text-sm truncate", hasUnread ? "text-foreground font-medium" : "text-muted-foreground")}>
              {previewText}
            </span>
          </div>
          
          {hasUnread && <span className="flex-shrink-0 min-w-[20px] h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center px-1.5">
              {unreadCount! > 99 ? "99+" : unreadCount}
            </span>}
        </div>
      </div>
    </button>;
};
const Messages = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    chats,
    loading,
    unreadCount
  } = useChats();
  const {
    isOnline
  } = useOnlinePresence();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const userId = user?.id;

  // Filter chats by search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter(chat => {
      const name = `${chat.other_user?.first_name || ""} ${chat.other_user?.last_name || ""}`.toLowerCase();
      return name.includes(query);
    });
  }, [chats, searchQuery]);
  const handleChatClick = (chat: Chat) => {
    const recipientId = chat.participant1_id === userId ? chat.participant2_id : chat.participant1_id;
    navigate(`/chat/${recipientId}`);
  };
  const handleNewChat = (recipientId: string) => {
    setShowNewChatDialog(false);
    navigate(`/chat/${recipientId}`);
  };
  return <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Messages</h1>
            {unreadCount > 0 && <span className="min-w-[20px] h-5 bg-primary-foreground text-primary text-xs font-bold rounded-full flex items-center justify-center px-1.5">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>}
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/visitor")} className="bg-[#fcfcfc] text-[#084f91]">
            <DoorOpen className="w-4 h-4 mr-2" />
            Appel Interphone
          </Button>
        </div>
        
        {/* Search bar */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/60" />
          <Input type="text" placeholder="Rechercher une conversation..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60" />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1">
        {loading ? <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div> : filteredChats.length === 0 ? <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            {searchQuery ? <>
                <p className="text-foreground font-medium">Aucun résultat</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Aucune conversation ne correspond à "{searchQuery}"
                </p>
              </> : <>
                <p className="text-foreground font-medium">Aucune conversation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Commencez une nouvelle conversation en appuyant sur le bouton +
                </p>
              </>}
          </div> : <div className="divide-y divide-border/50">
            {filteredChats.map(chat => {
          const recipientId = chat.participant1_id === userId ? chat.participant2_id : chat.participant1_id;
          return <ChatListItem key={chat.id} chat={chat} userId={userId || ""} isOnline={isOnline(recipientId)} onClick={() => handleChatClick(chat)} />;
        })}
          </div>}
      </div>

      {/* FAB for new message */}
      <Button onClick={() => setShowNewChatDialog(true)} className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-lg z-40" size="icon">
        <Plus className="w-6 h-6" />
      </Button>

      {/* New chat dialog */}
      <NewChatDialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog} onSelectRecipient={handleNewChat} />

      <BottomNav />
    </div>;
};
export default Messages;