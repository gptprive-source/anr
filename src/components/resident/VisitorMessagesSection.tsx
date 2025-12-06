import { useState } from "react";
import { MessageSquare, Phone, Trash2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useVisitorMessages } from "@/hooks/useVisitorMessages";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface VisitorMessagesSectionProps {
  habitationId: string;
}

const VisitorMessagesSection = ({ habitationId }: VisitorMessagesSectionProps) => {
  const { messages, unreadCount, loading, markAsRead, deleteMessage } = useVisitorMessages(habitationId);
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleMarkAsRead = async (messageId: string) => {
    const result = await markAsRead(messageId);
    if (!result.success) {
      toast({
        title: "Erreur",
        description: "Impossible de marquer comme lu",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (messageId: string) => {
    setDeletingId(messageId);
    const result = await deleteMessage(messageId);
    if (result.success) {
      toast({ title: "Message supprimé" });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le message",
        variant: "destructive",
      });
    }
    setDeletingId(null);
  };

  if (loading) return null;
  if (messages.length === 0) return null;

  const displayedMessages = expanded ? messages : messages.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Messages visiteurs</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {messages.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Voir moins
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Voir tout ({messages.length})
              </>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {displayedMessages.map((msg) => (
          <Card
            key={msg.id}
            className={`transition-colors ${!msg.is_read ? "border-primary/50 bg-primary/5" : ""}`}
          >
            <CardContent className="p-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                    {msg.visitor_phone && (
                      <a
                        href={`tel:${msg.visitor_phone}`}
                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        {msg.visitor_phone}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {!msg.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMarkAsRead(msg.id)}
                      title="Marquer comme lu"
                    >
                      <Check className="w-4 h-4 text-success" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(msg.id)}
                    disabled={deletingId === msg.id}
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default VisitorMessagesSection;
