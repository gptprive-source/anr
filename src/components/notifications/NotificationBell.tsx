import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Gift, MessageCircle, Megaphone, Trash2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

export function NotificationBell() {
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
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (roles && roles.length > 0) {
        setIsAdmin(true);
      }
    };
    checkAdminRole();
  }, []);

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
      case "admin_communication":
        return <Megaphone className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const handleNotificationClick = async (notif: typeof notifications[0]) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    setOpen(false);
    
    const data = notif.data as Record<string, unknown> | null;
    
    // If admin and it's a communication_reply, go to admin conversation page
    if (isAdmin && notif.type === "communication_reply" && data?.communication_id) {
      // Get the user_id from the notification data or the reply
      const userId = data.user_id as string;
      if (userId) {
        navigate(`/admin/communications/conversation/${data.communication_id}/${userId}`);
        return;
      }
      // Fallback: go to admin communications
      navigate('/admin/communications');
      return;
    }
    
    // Regular user behavior
    if (notif.type === "admin_communication" && data?.communication_id) {
      navigate(`/notification/communication/${data.communication_id}`);
    } else if (notif.type === "communication_reply" && data?.communication_id) {
      navigate(`/notification/communication/${data.communication_id}`);
    } else {
      // System notifications - just go to messages, no dedicated page
      navigate("/messages");
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
                  className={`p-3 hover:bg-muted/50 transition-colors ${
                    !notif.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div 
                      className="mt-0.5 cursor-pointer"
                      onClick={() => handleNotificationClick(notif)}
                    >
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleNotificationClick(notif)}
                    >
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
                    <div className="flex items-center gap-1">
                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notif.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
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
