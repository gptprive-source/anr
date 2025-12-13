import { useNavigate } from "react-router-dom";
import { Bell, Gift, ChevronRight, CheckCheck, MessageCircle, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserNotifications } from "@/hooks/useUserNotifications";
import { useUserCommunications, UserCommunication } from "@/hooks/useAdminCommunications";
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

export function SystemNotificationsSection() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    hasNewNotification,
    markAsRead,
    markAllAsRead,
    clearNewNotificationFlag,
    deleteNotification
  } = useUserNotifications();
  const {
    communications,
    unreadCount: unreadCommsCount,
    hasNewCommunication,
    markAsRead: markCommAsRead,
    clearNewCommunicationFlag,
    deleteCommunicationForUser
  } = useUserCommunications();

  const totalUnread = unreadCount + unreadCommsCount;
  const hasContent = notifications.length > 0 || communications.length > 0;

  if (!hasContent) {
    return null;
  }

  const handleOpenComm = (comm: typeof communications[0]) => {
    markCommAsRead(comm.id);
    clearNewCommunicationFlag();
    navigate(`/notification/communication/${comm.id}`);
  };

  const handleOpenNotif = (notif: typeof notifications[0]) => {
    markAsRead(notif.id);
    clearNewNotificationFlag();
    navigate(`/notification/notification/${notif.id}`);
  };

  const handleDeleteComm = (e: React.MouseEvent, commId: string) => {
    e.stopPropagation();
    deleteCommunicationForUser(commId);
  };

  const handleDeleteNotif = (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    deleteNotification(notifId);
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
          <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => markAllAsRead()}>
            <CheckCheck className="w-3 w-3" />
            Tout marquer lu
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {[
          ...communications.map(comm => ({ 
            type: 'comm' as const, 
            data: comm, 
            date: new Date(comm.sent_at),
            isRead: comm.is_read
          })),
          ...notifications.slice(0, 5).map(notif => ({ 
            type: 'notif' as const, 
            data: notif, 
            date: new Date(notif.created_at),
            isRead: notif.is_read
          }))
        ]
          .sort((a, b) => {
            if (!a.isRead && b.isRead) return -1;
            if (a.isRead && !b.isRead) return 1;
            return b.date.getTime() - a.date.getTime();
          })
          .map((item) => {
            if (item.type === 'comm') {
              const comm = item.data;
              const borderClass = comm.is_read ? "border-blue-500" : "border-red-500";
              return (
                <Card key={`comm-${comm.id}`} onClick={() => handleOpenComm(comm)} className={`cursor-pointer transition-all border-2 ${borderClass}`}>
                  <CardContent className="p-3 bg-white rounded-xl">
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
                            {!comm.is_read && <Badge variant="destructive" className="text-xs">Non lu</Badge>}
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDistanceToNow(new Date(comm.sent_at), {
                              addSuffix: false,
                              locale: fr
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {comm.content.substring(0, 100)}{comm.content.length > 100 ? "..." : ""}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 flex-shrink-0"
                        onClick={(e) => handleDeleteComm(e, comm.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            } else {
              const notif = item.data;
              const borderClass = notif.is_read ? "border-blue-500" : "border-red-500";
              return (
                <Card key={notif.id} className={`cursor-pointer transition-all border-2 ${borderClass}`} onClick={() => handleOpenNotif(notif)}>
                  <CardContent className="p-3 bg-white rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notif.type === "referral_credited" ? "bg-green-500/10" : "bg-primary/10"}`}>
                        {getNotificationIcon(notif.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-foreground">
                              {notif.title}
                            </p>
                            {!notif.is_read && <Badge variant="destructive" className="text-xs">Non lu</Badge>}
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatDistanceToNow(new Date(notif.created_at), {
                              addSuffix: false,
                              locale: fr
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 flex-shrink-0"
                        onClick={(e) => handleDeleteNotif(e, notif.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }
          })}
      </div>

      {notifications.length > 5 && (
        <p className="text-xs text-center text-muted-foreground">
          + {notifications.length - 5} autres notifications
        </p>
      )}
    </div>
  );
}