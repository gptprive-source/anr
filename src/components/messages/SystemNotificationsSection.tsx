import { useNavigate } from "react-router-dom";
import { Bell, Gift, ChevronRight, CheckCheck, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export function SystemNotificationsSection() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useUserNotifications();
  const { 
    communications, 
    unreadCount: unreadCommsCount, 
    markAsRead: markCommAsRead
  } = useUserCommunications();

  const totalUnread = unreadCount + unreadCommsCount;
  const hasContent = notifications.length > 0 || communications.length > 0;

  if (!hasContent) {
    return null;
  }

  const handleOpenComm = (comm: typeof communications[0]) => {
    markCommAsRead(comm.id);
    navigate(`/notification/communication/${comm.id}`);
  };

  const handleOpenNotif = (notif: typeof notifications[0]) => {
    markAsRead(notif.id);
    navigate(`/notification/notification/${notif.id}`);
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
            onClick={() => handleOpenNotif(notif)}
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
    </div>
  );
}
