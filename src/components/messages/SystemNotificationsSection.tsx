import { useState } from "react";
import { Bell, Gift, ChevronRight, CheckCheck, Send, MessageCircle, ExternalLink, Reply } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUserNotifications } from "@/hooks/useUserNotifications";
import { useUserCommunications } from "@/hooks/useAdminCommunications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "referral_credited":
      return <Gift className="w-5 h-5 text-green-500" />;
    case "admin_communication":
      return <MessageCircle className="w-5 h-5 text-blue-500" />;
    default:
      return <Bell className="w-5 h-5 text-primary" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "referral_credited":
      return "border-green-500 bg-green-500/5";
    case "admin_communication":
      return "border-blue-500 bg-blue-500/5";
    default:
      return "border-primary bg-primary/5";
  }
};

// Convert URLs in text to clickable links
const renderContentWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {part.length > 40 ? part.substring(0, 40) + "..." : part}
          <ExternalLink className="w-3 h-3" />
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export function SystemNotificationsSection() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useUserNotifications();
  const { 
    communications, 
    unreadCount: unreadCommsCount, 
    markAsRead: markCommAsRead, 
    sendReply 
  } = useUserCommunications();
  
  const [selectedComm, setSelectedComm] = useState<typeof communications[0] | null>(null);
  const [selectedNotif, setSelectedNotif] = useState<typeof notifications[0] | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const totalUnread = unreadCount + unreadCommsCount;
  const hasContent = notifications.length > 0 || communications.length > 0;

  if (!hasContent) {
    return null;
  }

  const handleOpenComm = (comm: typeof communications[0]) => {
    setSelectedComm(comm);
    markCommAsRead(comm.id);
  };

  const handleSendReply = async () => {
    if (!selectedComm || !replyText.trim()) return;
    setSending(true);
    const success = await sendReply(selectedComm.id, replyText.trim());
    setSending(false);
    if (success) {
      setReplyText("");
      setSelectedComm(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Notifications & Communications
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs h-5 ml-1">
              {totalUnread}
            </Badge>
          )}
        </h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 gap-1"
            onClick={() => markAllAsRead()}
          >
            <CheckCheck className="w-3 h-3" />
            Tout marquer lu
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {/* Admin Communications */}
        {communications.map((comm) => (
          <Card
            key={`comm-${comm.id}`}
            className="cursor-pointer transition-all border border-blue-500 bg-blue-500/5"
            onClick={() => handleOpenComm(comm)}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-500/10">
                  <MessageCircle className="w-5 h-5 text-blue-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-foreground">
                        {comm.title}
                      </p>
                      <Badge variant="secondary" className="text-xs">ANR</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(comm.sent_at), {
                        addSuffix: false,
                        locale: fr,
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {comm.content.substring(0, 100)}{comm.content.length > 100 ? "..." : ""}
                  </p>
                  {comm.allow_reply && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-blue-500">
                      <Reply className="w-3 h-3" />
                      Réponse possible
                    </div>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-2" />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* User Notifications */}
        {notifications.slice(0, 5).map((notif) => (
          <Card
            key={notif.id}
            className={`cursor-pointer transition-all border ${
              !notif.is_read ? getNotificationColor(notif.type) : "border-border"
            }`}
            onClick={() => {
              markAsRead(notif.id);
              setSelectedNotif(notif);
            }}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notif.type === "referral_credited" ? "bg-green-500/10" : "bg-primary/10"
                }`}>
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm text-foreground">
                      {notif.title}
                    </p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(notif.created_at), {
                        addSuffix: false,
                        locale: fr,
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {notif.message}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {notifications.length > 5 && (
        <p className="text-xs text-center text-muted-foreground">
          + {notifications.length - 5} autres notifications
        </p>
      )}

      {/* Communication Detail Dialog */}
      <Dialog open={!!selectedComm} onOpenChange={(open) => !open && setSelectedComm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              {selectedComm?.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">ANR</Badge>
              <span>•</span>
              <span>
                {selectedComm && formatDistanceToNow(new Date(selectedComm.sent_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </span>
            </div>
            
            <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
              {selectedComm && renderContentWithLinks(selectedComm.content)}
            </div>

            {selectedComm?.allow_reply && (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium">Répondre à ce message</p>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Votre réponse..."
                  rows={3}
                />
                <Button 
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sending}
                  className="w-full gap-2"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Envoi..." : "Envoyer la réponse"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Detail Dialog */}
      <Dialog open={!!selectedNotif} onOpenChange={(open) => !open && setSelectedNotif(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotif && getNotificationIcon(selectedNotif.type)}
              {selectedNotif?.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              {selectedNotif && formatDistanceToNow(new Date(selectedNotif.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </div>
            
            <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
              {selectedNotif && renderContentWithLinks(selectedNotif.message)}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
