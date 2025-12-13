import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationSound } from "@/hooks/useNotificationSound";

interface UserNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export function useUserNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const { playNotificationSound, vibrate, stopVibrate } = useNotificationSound();
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Cast to our type since we know the structure
      const typedData = (data || []) as unknown as UserNotification[];
      setNotifications(typedData);
      const unread = typedData.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
      setHasNewNotification(unread > 0);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Start vibration when there are unread notifications
  useEffect(() => {
    if (hasNewNotification && unreadCount > 0) {
      // Start periodic vibration
      vibrationIntervalRef.current = setInterval(() => {
        vibrate([100, 50, 100]);
      }, 3000);

      return () => {
        if (vibrationIntervalRef.current) {
          clearInterval(vibrationIntervalRef.current);
          vibrationIntervalRef.current = null;
        }
        stopVibrate();
      };
    }
  }, [hasNewNotification, unreadCount, vibrate, stopVibrate]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("[Notification] New notification received:", payload.new);
          const newNotif = payload.new as unknown as UserNotification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
          setHasNewNotification(true);
          
          // Play sound and vibrate for new notification
          // Sound needs user interaction first on mobile, so we try anyway
          try {
            playNotificationSound();
            console.log("[Notification] Sound played");
          } catch (e) {
            console.error("[Notification] Sound error:", e);
          }
          
          try {
            vibrate([200, 100, 200, 100, 200]);
            console.log("[Notification] Vibration triggered");
          } catch (e) {
            console.error("[Notification] Vibration error:", e);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, playNotificationSound, vibrate]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      const newUnreadCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newUnreadCount);
      
      if (newUnreadCount === 0) {
        setHasNewNotification(false);
        stopVibrate();
        if (vibrationIntervalRef.current) {
          clearInterval(vibrationIntervalRef.current);
          vibrationIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
      setHasNewNotification(false);
      stopVibrate();
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const clearNewNotificationFlag = useCallback(() => {
    setHasNewNotification(false);
    stopVibrate();
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
  }, [stopVibrate]);

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("user_notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      // Update unread count if needed
      const wasUnread = notifications.find(n => n.id === notificationId && !n.is_read);
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    hasNewNotification,
    markAsRead,
    markAllAsRead,
    clearNewNotificationFlag,
    deleteNotification,
    refetch: fetchNotifications,
  };
}
