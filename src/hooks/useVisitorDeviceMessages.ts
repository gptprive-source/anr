import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

// Single message in a conversation
export interface VisitorDeviceMessageItem {
  id: string;
  message: string | null;
  voice_message_url: string | null;
  media_url: string | null;
  media_type: string | null;
  is_read: boolean;
  created_at: string;
  encrypted_message: string | null;
  is_encrypted: boolean;
  replies: VisitorDeviceReply[];
}

// Conversation grouped by habitation_id + recipient (separate for residence vs private)
export interface VisitorDeviceConversation {
  habitation_id: string;
  habitation_name: string;
  anr_code?: string;
  anr_address?: string;
  messages: VisitorDeviceMessageItem[];
  last_activity: string;
  unread_count: number;
  // New fields for private messages
  recipient_user_id?: string | null; // null = residence, string = private to specific resident
  recipient_name?: string | null; // Name of the recipient resident (if private)
  is_private: boolean; // true if this is a private conversation
  conversation_key: string; // Unique key: habitationId__residence OR habitationId__private_userId
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

// Get or create device ID - MUST use same key as useVisitorBusinessCard
const DEVICE_ID_KEY = "anr_visitor_device_id";

export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const useVisitorDeviceMessages = () => {
  const [conversations, setConversations] = useState<VisitorDeviceConversation[]>([]);
  const [notifications, setNotifications] = useState<VisitorDeviceNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const deviceId = getDeviceId();

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get all messages sent by this device directly using visitor_device_id
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
          deleted_by_visitor,
          recipient_user_id
        `)
        .eq("visitor_device_id", deviceId)
        .eq("deleted_by_visitor", false)
        .order("created_at", { ascending: true }); // Chronological order

      if (messagesError) {
        console.error("[useVisitorDeviceMessages] Error fetching messages:", messagesError);
        setConversations([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // Group messages by habitation_id + recipient_user_id (separate residence vs private)
      // Key format: habitationId__residence OR habitationId__private_userId
      const conversationMap = new Map<string, typeof messagesData>();
      for (const msg of messagesData || []) {
        const isPrivate = !!msg.recipient_user_id;
        const conversationKey = isPrivate 
          ? `${msg.habitation_id}__private_${msg.recipient_user_id}`
          : `${msg.habitation_id}__residence`;
        const existing = conversationMap.get(conversationKey) || [];
        existing.push(msg);
        conversationMap.set(conversationKey, existing);
      }

      // Build conversations for each conversation key
      const conversationsData: VisitorDeviceConversation[] = [];
      
      // Cache habitation data to avoid duplicate queries
      const habitationCache = new Map<string, { name: string; anr: { code: string; address: string } | null }>();
      
      for (const [conversationKey, msgs] of conversationMap.entries()) {
        // Parse conversation key to get habitationId and recipient info
        const isPrivate = conversationKey.includes("__private_");
        const habitationId = conversationKey.split("__")[0];
        const recipientUserId = isPrivate ? conversationKey.split("__private_")[1] : null;
        
        // Get habitation details (cached)
        let habitationData = habitationCache.get(habitationId);
        if (!habitationData) {
          const { data: habitation } = await supabase
            .from("habitations")
            .select(`
              name,
              anr:anrs(code, address)
            `)
            .eq("id", habitationId)
            .maybeSingle();
          
          habitationData = {
            name: habitation?.name || "Habitation",
            anr: habitation?.anr as { code: string; address: string } | null
          };
          habitationCache.set(habitationId, habitationData);
        }

        // Get recipient name if private message
        let recipientName: string | null = null;
        if (isPrivate && recipientUserId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", recipientUserId)
            .maybeSingle();
          
          if (profile) {
            recipientName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Résident";
          }
        }

        // Get replies for ALL messages in this conversation
        const messageIds = msgs.map(m => m.id);
        const { data: allReplies } = await supabase
          .from("message_replies")
          .select(`
            id,
            original_message_id,
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
          .in("original_message_id", messageIds)
          .eq("deleted_by_visitor", false)
          .order("created_at", { ascending: true });

        // Build message items with their replies
        const messageItems: VisitorDeviceMessageItem[] = msgs.map(msg => {
          const msgReplies = (allReplies || [])
            .filter(r => r.original_message_id === msg.id)
            .map(r => ({
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
            }));

          return {
            id: msg.id,
            message: msg.message,
            voice_message_url: msg.voice_message_url,
            media_url: msg.media_url,
            media_type: msg.media_type,
            is_read: msg.is_read || false,
            created_at: msg.created_at || new Date().toISOString(),
            encrypted_message: msg.encrypted_message,
            is_encrypted: msg.is_encrypted || false,
            replies: msgReplies,
          };
        });

        // Calculate last activity and unread count for this conversation
        let lastActivity = msgs[msgs.length - 1]?.created_at || new Date().toISOString();
        let unreadRepliesCount = 0;
        
        for (const msgItem of messageItems) {
          for (const reply of msgItem.replies) {
            if (!reply.is_read) unreadRepliesCount++;
            if (new Date(reply.created_at) > new Date(lastActivity)) {
              lastActivity = reply.created_at;
            }
          }
        }

        // Build display name with recipient info
        const displayName = isPrivate && recipientName 
          ? `${habitationData.name} - ${recipientName}`
          : habitationData.name;

        conversationsData.push({
          habitation_id: habitationId,
          habitation_name: displayName,
          anr_code: habitationData.anr?.code,
          anr_address: habitationData.anr?.address,
          messages: messageItems,
          last_activity: lastActivity,
          unread_count: unreadRepliesCount,
          recipient_user_id: recipientUserId,
          recipient_name: recipientName,
          is_private: isPrivate,
          conversation_key: conversationKey,
        });
      }

      // Sort conversations by last activity (most recent first)
      conversationsData.sort((a, b) => 
        new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
      );

      setConversations(conversationsData);

      // Calculate total unread count
      const totalUnread = conversationsData.reduce((sum, conv) => sum + conv.unread_count, 0);
      setUnreadCount(totalUnread);
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
      setConversations(prev => prev.map(conv => ({
        ...conv,
        messages: conv.messages.map(msg => ({
          ...msg,
          replies: msg.replies.map(r => 
            r.id === replyId ? { ...r, is_read: true } : r
          )
        })),
        unread_count: conv.messages.reduce((count, msg) => 
          count + msg.replies.filter(r => r.id !== replyId && !r.is_read).length, 0
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

  // Set up real-time subscription for new replies and updates
  useEffect(() => {
    const channel = supabase
      .channel("visitor-device-replies")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "message_replies",
        },
        (payload) => {
          console.log("[useVisitorDeviceMessages] Reply change:", payload);
          // Small delay to ensure DB is updated before refetching
          setTimeout(() => fetchMessages(), 100);
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
    conversations,
    notifications,
    unreadCount,
    loading,
    deviceId,
    refetch: fetchMessages,
    markReplyAsRead,
    markNotificationAsRead,
  };
};
