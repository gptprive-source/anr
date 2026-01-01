import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Chat } from "@/hooks/useChats";

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  chats: Chat[];
  currentChatId: string;
  onForward: (messageId: string, toChatId: string) => void;
}

const ForwardMessageDialog = ({
  open,
  onOpenChange,
  messageId,
  chats,
  currentChatId,
  onForward,
}: ForwardMessageDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [forwarding, setForwarding] = useState(false);

  // Filter out current chat and apply search
  const filteredChats = chats.filter(chat => {
    if (chat.id === currentChatId) return false;
    if (!searchQuery.trim()) return true;
    
    const name = `${chat.other_user?.first_name || ""} ${chat.other_user?.last_name || ""}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const handleForward = async (toChatId: string) => {
    setForwarding(true);
    try {
      await onForward(messageId, toChatId);
    } finally {
      setForwarding(false);
    }
  };

  const getInitials = (chat: Chat) => {
    const first = chat.other_user?.first_name?.[0] || "";
    const last = chat.other_user?.last_name?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transférer le message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {forwarding ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "Aucune conversation trouvée" : "Aucune conversation disponible"}
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => handleForward(chat.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={chat.other_user?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(chat)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {chat.other_user?.first_name} {chat.other_user?.last_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardMessageDialog;
