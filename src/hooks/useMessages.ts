import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  habitation_id: string | null;
  message: string | null;
  voice_message_url: string | null;
  media_url: string | null;
  media_type: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  deleted_by_sender: boolean;
  deleted_by_recipient: boolean;
  // Joined data
  sender?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    company_name?: string | null;
  };
  recipient?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
  habitation?: {
    id: string;
    name: string;
    anr_address?: string;
  };
}

export interface Conversation {
  id: string; // recipientId or habitationId
  recipientId: string;
  recipientName: string;
  recipientAvatarUrl: string | null;
  habitationId: string | null;
  habitationName: string | null;
  anrAddress: string | null;
  lastMessage: string | null;
  lastMessageDate: Date;
  unreadCount: number;
  totalMessages: number;
}

export const useMessages = (conversationUserId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all messages for current user
  const fetchMessages = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch messages where user is sender or recipient
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          habitation:habitations(id, name, anr:anrs(address))
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      // Enrich with sender/recipient profiles
      const userIds = new Set<string>();
      (data || []).forEach((m: any) => {
        userIds.add(m.sender_id);
        userIds.add(m.recipient_id);
      });

      // Fetch profiles for all users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url")
        .in("id", Array.from(userIds));

      const profileMap = new Map();
      (profiles || []).forEach((p: any) => {
        profileMap.set(p.id, p);
      });

      const enrichedMessages = (data || []).map((m: any) => ({
        ...m,
        sender: profileMap.get(m.sender_id) || { id: m.sender_id, first_name: null, last_name: null, avatar_url: null },
        recipient: profileMap.get(m.recipient_id) || { id: m.recipient_id, first_name: null, last_name: null, avatar_url: null },
        habitation: m.habitation ? {
          id: m.habitation.id,
          name: m.habitation.name,
          anr_address: m.habitation.anr?.address || null,
        } : null,
      }));

      setMessages(enrichedMessages);
    } catch (err) {
      console.error("[useMessages] Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === user.id || newMsg.recipient_id === user.id) {
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchMessages]);

  // Group messages into conversations
  const conversations = useMemo(() => {
    if (!user) return [];

    const convMap = new Map<string, Conversation>();

    messages.forEach((msg) => {
      // Skip messages deleted by current user
      if (msg.sender_id === user.id && msg.deleted_by_sender) return;
      if (msg.recipient_id === user.id && msg.deleted_by_recipient) return;

      // Determine the "other" user in the conversation
      const otherUserId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
      const otherUser = msg.sender_id === user.id ? msg.recipient : msg.sender;

      // Conversation key: other user ID + habitation (if any)
      const convKey = msg.habitation_id ? `${otherUserId}__${msg.habitation_id}` : otherUserId;

      const existing = convMap.get(convKey);
      const msgDate = new Date(msg.created_at);
      const isUnread = msg.recipient_id === user.id && !msg.is_read;

      if (existing) {
        if (msgDate > existing.lastMessageDate) {
          existing.lastMessage = msg.message || (msg.voice_message_url ? "🎤 Message vocal" : msg.media_url ? "📎 Média" : null);
          existing.lastMessageDate = msgDate;
        }
        if (isUnread) existing.unreadCount++;
        existing.totalMessages++;
      } else {
        convMap.set(convKey, {
          id: convKey,
          recipientId: otherUserId,
          recipientName: otherUser 
            ? `${otherUser.first_name || ""} ${otherUser.last_name || ""}`.trim() || "Utilisateur"
            : "Utilisateur",
          recipientAvatarUrl: otherUser?.avatar_url || null,
          habitationId: msg.habitation_id,
          habitationName: msg.habitation?.name || null,
          anrAddress: msg.habitation?.anr_address || null,
          lastMessage: msg.message || (msg.voice_message_url ? "🎤 Message vocal" : msg.media_url ? "📎 Média" : null),
          lastMessageDate: msgDate,
          unreadCount: isUnread ? 1 : 0,
          totalMessages: 1,
        });
      }
    });

    return Array.from(convMap.values()).sort(
      (a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime()
    );
  }, [messages, user]);

  // Get messages for a specific conversation
  const getConversationMessages = useCallback((conversationId: string) => {
    if (!user) return [];

    // Parse conversation ID: recipientId or recipientId__habitationId
    const parts = conversationId.split("__");
    const recipientId = parts[0];
    const habitationId = parts[1] || null;

    return messages
      .filter((msg) => {
        const isParticipant = 
          (msg.sender_id === user.id && msg.recipient_id === recipientId) ||
          (msg.sender_id === recipientId && msg.recipient_id === user.id);
        
        if (!isParticipant) return false;
        
        // Filter by habitation if specified
        if (habitationId && msg.habitation_id !== habitationId) return false;
        
        // Exclude deleted messages
        if (msg.sender_id === user.id && msg.deleted_by_sender) return false;
        if (msg.recipient_id === user.id && msg.deleted_by_recipient) return false;

        return true;
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, user]);

  // Send a message
  const sendMessage = async (params: {
    recipientId: string;
    habitationId?: string;
    message?: string;
    voiceBlob?: Blob;
    mediaFile?: File;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Non connecté" };

    try {
      let voiceMessageUrl: string | null = null;
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      // Upload voice message if provided
      if (params.voiceBlob) {
        const fileName = `voice-${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
        const filePath = `messages/${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("visitor-voice-messages")
          .upload(filePath, params.voiceBlob, { contentType: "audio/webm" });
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("visitor-voice-messages")
            .getPublicUrl(filePath);
          voiceMessageUrl = urlData.publicUrl;
        }
      }

      // Upload media file if provided
      if (params.mediaFile) {
        const fileExt = params.mediaFile.name.split(".").pop() || "bin";
        const fileName = `media-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `messages/${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("visitor-voice-messages")
          .upload(filePath, params.mediaFile, { contentType: params.mediaFile.type });
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("visitor-voice-messages")
            .getPublicUrl(filePath);
          mediaUrl = urlData.publicUrl;
          mediaType = params.mediaFile.type.startsWith("video/") ? "video" : "image";
        }
      }

      // Insert message
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: params.recipientId,
        habitation_id: params.habitationId || null,
        message: params.message || null,
        voice_message_url: voiceMessageUrl,
        media_url: mediaUrl,
        media_type: mediaType,
      });

      if (error) throw error;

      await fetchMessages();
      return { success: true };
    } catch (err: any) {
      console.error("[useMessages] Error sending message:", err);
      return { success: false, error: err.message };
    }
  };

  // Mark message as read
  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", messageId);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_read: true, read_at: new Date().toISOString() } : m
        )
      );
    } catch (err) {
      console.error("[useMessages] Error marking as read:", err);
    }
  };

  // Soft delete message
  const deleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;

      const updateField = msg.sender_id === user.id ? "deleted_by_sender" : "deleted_by_recipient";
      
      const { error } = await supabase
        .from("messages")
        .update({ [updateField]: true })
        .eq("id", messageId);

      if (error) throw error;

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error("[useMessages] Error deleting message:", err);
    }
  };

  // Delete entire conversation
  const deleteConversation = async (conversationId: string) => {
    if (!user) return;

    const conversationMessages = getConversationMessages(conversationId);
    
    for (const msg of conversationMessages) {
      await deleteMessage(msg.id);
    }
  };

  // Calculate unread count
  const unreadCount = useMemo(() => {
    if (!user) return 0;
    return messages.filter(
      (m) => m.recipient_id === user.id && !m.is_read && !m.deleted_by_recipient
    ).length;
  }, [messages, user]);

  return {
    messages,
    conversations,
    loading,
    unreadCount,
    getConversationMessages,
    sendMessage,
    markAsRead,
    deleteMessage,
    deleteConversation,
    refetch: fetchMessages,
  };
};
