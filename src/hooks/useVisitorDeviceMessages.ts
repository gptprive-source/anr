import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface VisitorDeviceMessage {
  id: string;
  habitation_id: string;
  message: string | null;
  voice_message_url: string | null;
  media_url: string | null;
  media_type: string | null;
  is_read: boolean;
  created_at: string;
  encrypted_message: string | null;
  is_encrypted: boolean;
  habitation_name?: string;
  anr_code?: string;
  anr_address?: string;
  replies: VisitorDeviceReply[];
}

export interface VisitorDeviceReply {
  id: string;
  reply_text: string | null;
  reply_voice_url: string | null;
  reply_media_url: string | null;
  reply_media_type: string | null;
  is_read: boolean;
  created_at: string;
  resident_id: string;
  encrypted_reply: string | null;
  is_encrypted: boolean;
}

export interface VisitorDeviceNotification {
  id: string;
  device_id: string;
  type: string;
  title: string;
  message: string;
  data: Json | null;
  is_read: boolean;
  created_at: string;
}

// Get or create device ID
export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem("anr_device_id");
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("anr_device_id", deviceId);
  }
  return deviceId;
};

export const useVisitorDeviceMessages = () => {
  const [messages, setMessages] = useState<VisitorDeviceMessage[]>([]);
  const [notifications, setNotifications] = useState<VisitorDeviceNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const deviceId = getDeviceId();

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get business card for this device
      const { data: businessCard, error: cardError } = await supabase
        .from("visitor_business_cards")
        .select("id")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (cardError || !businessCard) {
        console.log("[useVisitorDeviceMessages] No business card found for device:", deviceId);
        setMessages([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Get all messages sent by this device
      const { data: messagesData, error: messagesError } = await supabase
        .from("visitor_messages")
        .select(`
          id,
          habitation_id,
          message,
          voice_message_url,
          media_url,
          media_type,
          is_read,
          created_at,
          encrypted_message,
          is_encrypted,
          deleted_by_visitor
        `)
        .eq("business_card_id", businessCard.id)
        .eq("deleted_by_visitor", false)
        .order("created_at", { ascending: false });

      if (messagesError) {
        console.error("[useVisitorDeviceMessages] Error fetching messages:", messagesError);
        setLoading(false);
        return;
      }

      // Fetch habitation details and replies for each message
      const messagesWithDetails = await Promise.all(
        (messagesData || []).map(async (msg) => {
          // Get habitation details
          const { data: habitation } = await supabase
            .from("habitations")
            .select(`
              name,
              anr:anrs(code, address)
            `)
            .eq("id", msg.habitation_id)
            .single();

          // Get replies for this message
          const { data: replies } = await supabase
            .from("message_replies")
            .select(`
              id,
              reply_text,
              reply_voice_url,
              reply_media_url,
              reply_media_type,
              is_read,
              created_at,
              resident_id,
              encrypted_reply,
              is_encrypted
            `)
            .eq("original_message_id", msg.id)
            .eq("deleted_by_visitor", false)
            .order("created_at", { ascending: true });

          const anrData = habitation?.anr as { code: string; address: string } | null;

          return {
            id: msg.id,
            habitation_id: msg.habitation_id,
            message: msg.message,
            voice_message_url: msg.voice_message_url,
            media_url: msg.media_url,
            media_type: msg.media_type,
            is_read: msg.is_read || false,
            created_at: msg.created_at || new Date().toISOString(),
            encrypted_message: msg.encrypted_message,
            is_encrypted: msg.is_encrypted || false,
            habitation_name: habitation?.name || "Habitation",
            anr_code: anrData?.code,
            anr_address: anrData?.address,
            replies: (replies || []).map(r => ({
              id: r.id,
              reply_text: r.reply_text,
              reply_voice_url: r.reply_voice_url,
              reply_media_url: r.reply_media_url,
              reply_media_type: r.reply_media_type,
              is_read: r.is_read || false,
              created_at: r.created_at || new Date().toISOString(),
              resident_id: r.resident_id,
              encrypted_reply: r.encrypted_reply,
              is_encrypted: r.is_encrypted || false,
            })),
          } as VisitorDeviceMessage;
        })
      );

      setMessages(messagesWithDetails);

      // Calculate unread count (unread replies)
      const unreadReplies = messagesWithDetails.reduce((count, msg) => {
        return count + msg.replies.filter(r => !r.is_read).length;
      }, 0);
      setUnreadCount(unreadReplies);
    } catch (error) {
      console.error("[useVisitorDeviceMessages] Error:", error);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("visitor_device_notifications")
        .select("*")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[useVisitorDeviceMessages] Error fetching notifications:", error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error("[useVisitorDeviceMessages] Error fetching notifications:", error);
    }
  }, [deviceId]);

  const markReplyAsRead = useCallback(async (replyId: string) => {
    const { error } = await supabase
      .from("message_replies")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", replyId);

    if (!error) {
      setMessages(prev => prev.map(msg => ({
        ...msg,
        replies: msg.replies.map(r => 
          r.id === replyId ? { ...r, is_read: true } : r
        )
      })));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from("visitor_device_notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (!error) {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMessages();
    fetchNotifications();
  }, [fetchMessages, fetchNotifications]);

  // Set up real-time subscription for new replies
  useEffect(() => {
    const channel = supabase
      .channel("visitor-device-replies")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_replies",
        },
        (payload) => {
          console.log("[useVisitorDeviceMessages] New reply received:", payload);
          // Refetch to get updated data
          fetchMessages();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "visitor_device_notifications",
          filter: `device_id=eq.${deviceId}`,
        },
        (payload) => {
          console.log("[useVisitorDeviceMessages] New notification:", payload);
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId, fetchMessages, fetchNotifications]);

  return {
    messages,
    notifications,
    unreadCount,
    loading,
    deviceId,
    refetch: fetchMessages,
    markReplyAsRead,
    markNotificationAsRead,
  };
};
