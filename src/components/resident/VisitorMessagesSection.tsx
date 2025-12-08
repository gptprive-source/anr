import { useState } from "react";
import { MessageSquare, Phone, Trash2, Check, User, Building2, Mail, MapPin, Briefcase, ArrowRight, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useVisitorMessages } from "@/hooks/useVisitorMessages";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface VisitorMessagesSectionProps {
  habitationId: string;
}

const VisitorMessagesSection = ({ habitationId }: VisitorMessagesSectionProps) => {
  const { messages, unreadCount, loading, markAsRead, deleteMessage } = useVisitorMessages(habitationId);
  const { toast } = useToast();
  const navigate = useNavigate();
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

  // Only show the latest message
  const latestMessage = messages[0];
  const card = latestMessage?.business_card;
  const isCompany = card?.card_type === "company";
  const displayName = card
    ? isCompany
      ? card.company_name
      : `${card.first_name || ""} ${card.last_name || ""}`.trim()
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Dernier message</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/messages")}
          className="text-xs"
        >
          Voir tous ({messages.length})
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <Card
        className={`transition-colors ${!latestMessage.is_read ? "border-primary/50 bg-primary/5" : ""}`}
      >
        <CardContent className="p-3">
          {/* Business Card Display */}
          {card && (
            <div className="flex items-start gap-3 p-2 mb-2 bg-muted/50 rounded-lg border border-border/50">
              <div className="p-1.5 rounded-full bg-primary/10 flex-shrink-0">
                {isCompany ? (
                  <Building2 className="w-4 h-4 text-primary" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-medium text-sm">{displayName}</p>
                {card.job_title && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {card.job_title}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  {card.phone && (
                    <a
                      href={`tel:${card.phone}`}
                      className="text-primary flex items-center gap-1 hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      {card.phone}
                    </a>
                  )}
                  {card.email && (
                    <a
                      href={`mailto:${card.email}`}
                      className="text-primary flex items-center gap-1 hover:underline"
                    >
                      <Mail className="w-3 h-3" />
                      {card.email}
                    </a>
                  )}
                  {card.visitor_anr_code && (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      ANR: {card.visitor_anr_code}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              {latestMessage.message && (
                <p className="text-sm whitespace-pre-wrap break-words">{latestMessage.message}</p>
              )}
              
              {/* Voice message player */}
              {latestMessage.voice_message_url && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-lg">
                  <Mic className="w-4 h-4 text-primary flex-shrink-0" />
                  <audio src={latestMessage.voice_message_url} controls className="flex-1 h-8" />
                </div>
              )}
              
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(latestMessage.created_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </span>
                {!card && latestMessage.visitor_phone && (
                  <a
                    href={`tel:${latestMessage.visitor_phone}`}
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    {latestMessage.visitor_phone}
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {!latestMessage.is_read && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleMarkAsRead(latestMessage.id)}
                  title="Marquer comme lu"
                >
                  <Check className="w-4 h-4 text-success" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDelete(latestMessage.id)}
                disabled={deletingId === latestMessage.id}
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VisitorMessagesSection;
