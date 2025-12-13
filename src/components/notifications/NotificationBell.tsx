import { useState, useEffect } from "react";
import { Bell, Check, Gift, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserNotifications } from "@/hooks/useUserNotifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export function NotificationBell() {
  const { 
    notifications, 
    unreadCount, 
    hasNewNotification,
    markAsRead, 
    markAllAsRead,
    clearNewNotificationFlag 
  } = useUserNotifications();
  const [open, setOpen] = useState(false);

  // When popover opens, clear the new notification flag
  useEffect(() => {
    if (open && hasNewNotification) {
      clearNewNotificationFlag();
    }
  }, [open, hasNewNotification, clearNewNotificationFlag]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "referral_credited":
        return <Gift className="h-4 w-4 text-green-500" />;
      case "communication_reply":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`relative ${hasNewNotification ? "animate-notification-shake" : ""}`}
        >
          <Bell 
            className={`h-5 w-5 transition-colors duration-300 ${
              hasNewNotification ? "text-green-500 fill-green-500" : ""
            }`} 
          />
          {unreadCount > 0 && (
            <span 
              className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-white text-xs flex items-center justify-center font-medium transition-colors duration-300 ${
                hasNewNotification ? "bg-green-500 animate-pulse" : "bg-destructive"
              }`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => markAllAsRead()}
            >
              <Check className="h-3 w-3 mr-1" />
              Tout marquer lu
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Aucune notification
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                    !notif.is_read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    if (!notif.is_read) {
                      markAsRead(notif.id);
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
