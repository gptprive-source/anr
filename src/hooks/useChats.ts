import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Chat {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count_p1: number | null;
  unread_count_p2: number | null;
  created_at: string | null;
  // Joined data
  other_user?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string | null;
  voice_url: string | null;
  media_url: string | null;
  media_type: string | null;
  message_type: string | null;
  call_duration_seconds: number | null;
  is_read: boolean | null;
  deleted_for_sender: boolean | null;
  deleted_for_recipient: boolean | null;
  deleted_for_everyone: boolean | null;
  deleted_at: string | null;
  forwarded_from_id: string | null;
  created_at: string | null;
}

export interface SendMessageParams {
  content?: string;
  voiceUrl?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
}

export const useChats = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate total unread count
  const unreadCount = chats.reduce((total, chat) => {
    if (!user) return total;
    const isParticipant1 = chat.participant1_id === user.id;
    const count = isParticipant1 ? chat.unread_count_p1 : chat.unread_count_p2;
    return total + (count || 0);
  }, 0);

  // Fetch all chats for current user
  const fetchChats = useCallback(async () => {
    if (!user) {
      setChats([]);
      setLoading(false);
      return;
    }

    try {
      const { data: chatsData, error } = await supabase
        .from("chats")
        .select("*")
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      // Filter out chats deleted for the current user and fetch profiles
      const chatsWithProfiles = await Promise.all(
        (chatsData || [])
          .filter((chat) => {
            // Check if this chat is deleted for the current user
            const isParticipant1 = chat.participant1_id === user.id;
            if (isParticipant1 && chat.deleted_for_p1) return false;
            if (!isParticipant1 && chat.deleted_for_p2) return false;
            return true;
          })
          .map(async (chat) => {
            const otherUserId = chat.participant1_id === user.id 
              ? chat.participant2_id 
              : chat.participant1_id;

            const { data: profile } = await supabase
              .from("profiles")
              .select("id, first_name, last_name, avatar_url")
              .eq("id", otherUserId)
              .maybeSingle();

            return {
              ...chat,
              other_user: profile || {
                id: otherUserId,
                first_name: null,
                last_name: null,
                avatar_url: null,
              },
            };
          })
      );

      setChats(chatsWithProfiles);
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get or create a chat with a recipient
  const getOrCreateChat = useCallback(async (recipientId: string): Promise<Chat | null> => {
    if (!user) return null;

    // Order IDs to match the constraint
    const [p1, p2] = [user.id, recipientId].sort();

    // Check if chat already exists
    const { data: existingChat, error: findError } = await supabase
      .from("chats")
      .select("*")
      .eq("participant1_id", p1)
      .eq("participant2_id", p2)
      .maybeSingle();

    if (findError && findError.code !== "PGRST116") {
      console.error("Error finding chat:", findError);
      return null;
    }

    if (existingChat) {
      // Fetch profile for the other user
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url")
        .eq("id", recipientId)
        .maybeSingle();

      return {
        ...existingChat,
        other_user: profile || { id: recipientId, first_name: null, last_name: null, avatar_url: null },
      };
    }

    // Create new chat
    const { data: newChat, error: createError } = await supabase
      .from("chats")
      .insert({
        participant1_id: p1,
        participant2_id: p2,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating chat:", createError);
      return null;
    }

    // Fetch profile for the other user
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url")
      .eq("id", recipientId)
      .maybeSingle();

    const chatWithProfile = {
      ...newChat,
      other_user: profile || { id: recipientId, first_name: null, last_name: null, avatar_url: null },
    };

    // Add to local state
    setChats(prev => [chatWithProfile, ...prev]);

    return chatWithProfile;
  }, [user]);

  // Get messages for a specific chat
  const getChatMessages = useCallback(async (chatId: string): Promise<ChatMessage[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }

    // Filter out messages deleted for current user
    return (data || []).filter(msg => {
      if (msg.deleted_for_everyone) return false;
      if (msg.sender_id === user.id && msg.deleted_for_sender) return false;
      if (msg.sender_id !== user.id && msg.deleted_for_recipient) return false;
      return true;
    });
  }, [user]);

  // Helper to send push notification
  const sendPushNotification = useCallback(async (recipientId: string, title: string, body: string, data?: Record<string, string>) => {
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_ids: [recipientId],
          title,
          body,
          data,
        },
      });
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }, []);

  // Get recipient ID from chat
  const getRecipientIdFromChat = useCallback((chatId: string): string | null => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat || !user) return null;
    return chat.participant1_id === user.id ? chat.participant2_id : chat.participant1_id;
  }, [chats, user]);

  // Send a message
  const sendMessage = useCallback(async (chatId: string, params: SendMessageParams): Promise<ChatMessage | null> => {
    if (!user) return null;

    const messageType = params.voiceUrl ? "voice" : params.mediaUrl ? "media" : "text";

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content: params.content || null,
        voice_url: params.voiceUrl || null,
        media_url: params.mediaUrl || null,
        media_type: params.mediaType || null,
        message_type: messageType,
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return null;
    }

    // Send push notification to recipient
    const recipientId = getRecipientIdFromChat(chatId);
    if (recipientId) {
      // Get sender's name
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();
      
      const senderName = profile 
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Quelqu'un"
        : "Quelqu'un";
      
      let notifBody = params.content || "";
      if (params.voiceUrl) notifBody = "🎤 Message vocal";
      if (params.mediaUrl) notifBody = "📷 Photo/Vidéo";
      
      await sendPushNotification(
        recipientId,
        `Message de ${senderName}`,
        notifBody,
        { type: "new_message", chat_id: chatId, sender_id: user.id }
      );
    }

    return data;
  }, [user, getRecipientIdFromChat, sendPushNotification]);

  // Send a missed call message
  const sendMissedCall = useCallback(async (recipientId: string): Promise<void> => {
    if (!user) return;

    const chat = await getOrCreateChat(recipientId);
    if (!chat) return;

    await supabase
      .from("chat_messages")
      .insert({
        chat_id: chat.id,
        sender_id: user.id,
        message_type: "missed_call",
      });

    // Send push notification for missed call
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();
    
    const callerName = profile 
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Quelqu'un"
      : "Quelqu'un";
    
    await sendPushNotification(
      recipientId,
      "Appel manqué",
      `${callerName} a essayé de vous appeler`,
      { type: "missed_call", chat_id: chat.id, caller_id: user.id }
    );
  }, [user, getOrCreateChat, sendPushNotification]);

  // Send a call ended message with duration
  const sendCallEnded = useCallback(async (recipientId: string, durationSeconds: number): Promise<void> => {
    if (!user) return;

    const chat = await getOrCreateChat(recipientId);
    if (!chat) return;

    await supabase
      .from("chat_messages")
      .insert({
        chat_id: chat.id,
        sender_id: user.id,
        message_type: "call_ended",
        call_duration_seconds: durationSeconds,
      });
    
    // No push notification needed for call ended (user was in the call)
  }, [user, getOrCreateChat]);

  // Mark all messages in a chat as read
  const markAsRead = useCallback(async (chatId: string): Promise<void> => {
    if (!user) return;

    // Update messages as read
    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("chat_id", chatId)
      .neq("sender_id", user.id);

    // Reset unread count for this user
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    const isParticipant1 = chat.participant1_id === user.id;
    const updateField = isParticipant1 ? "unread_count_p1" : "unread_count_p2";

    await supabase
      .from("chats")
      .update({ [updateField]: 0 })
      .eq("id", chatId);

    // Update local state
    setChats(prev => prev.map(c => 
      c.id === chatId 
        ? { ...c, [updateField]: 0 }
        : c
    ));
  }, [user, chats]);

  // Delete a message for me only
  const deleteForMe = useCallback(async (messageId: string): Promise<void> => {
    if (!user) return;

    const { data: message } = await supabase
      .from("chat_messages")
      .select("sender_id")
      .eq("id", messageId)
      .single();

    if (!message) return;

    const isSender = message.sender_id === user.id;
    const updateField = isSender ? "deleted_for_sender" : "deleted_for_recipient";

    await supabase
      .from("chat_messages")
      .update({ [updateField]: true })
      .eq("id", messageId);
  }, [user]);

  // Delete a message for everyone (within 7 minutes)
  const deleteForEveryone = useCallback(async (messageId: string): Promise<boolean> => {
    if (!user) return false;

    const { data: message } = await supabase
      .from("chat_messages")
      .select("sender_id, created_at")
      .eq("id", messageId)
      .single();

    if (!message) return false;

    // Check if user is the sender
    if (message.sender_id !== user.id) return false;

    // Check if within 7 minutes
    const createdAt = new Date(message.created_at!).getTime();
    const now = Date.now();
    const sevenMinutes = 7 * 60 * 1000;

    if (now - createdAt > sevenMinutes) return false;

    await supabase
      .from("chat_messages")
      .update({ 
        deleted_for_everyone: true, 
        deleted_at: new Date().toISOString() 
      })
      .eq("id", messageId);

    return true;
  }, [user]);

  // Forward a message to another chat
  const forwardMessage = useCallback(async (messageId: string, toChatId: string): Promise<ChatMessage | null> => {
    if (!user) return null;

    // Get original message
    const { data: originalMessage } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("id", messageId)
      .single();

    if (!originalMessage) return null;

    // Create forwarded message
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        chat_id: toChatId,
        sender_id: user.id,
        content: originalMessage.content,
        voice_url: originalMessage.voice_url,
        media_url: originalMessage.media_url,
        media_type: originalMessage.media_type,
        message_type: originalMessage.message_type,
        forwarded_from_id: messageId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error forwarding message:", error);
      return null;
    }

    return data;
  }, [user]);

  // Delete a chat for the current user only (not for the other participant)
  const deleteChat = useCallback(async (chatId: string): Promise<void> => {
    if (!user) return;

    // Find the chat to determine which participant the user is
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    const isParticipant1 = chat.participant1_id === user.id;
    const updateField = isParticipant1 ? "deleted_for_p1" : "deleted_for_p2";

    // Mark as deleted for this user only
    await supabase
      .from("chats")
      .update({ [updateField]: true })
      .eq("id", chatId);

    // Remove from local state
    setChats(prev => prev.filter(c => c.id !== chatId));
  }, [user, chats]);

  // Initial fetch
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Realtime subscription for chats and messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("chats-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chats",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newChat = payload.new as Chat;
            if (newChat.participant1_id === user.id || newChat.participant2_id === user.id) {
              fetchChats(); // Refetch to get profile data
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedChat = payload.new as Chat;
            setChats(prev => prev.map(c => 
              c.id === updatedChat.id 
                ? { ...c, ...updatedChat }
                : c
            ).sort((a, b) => 
              new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()
            ));
          } else if (payload.eventType === "DELETE") {
            const deletedChat = payload.old as Chat;
            setChats(prev => prev.filter(c => c.id !== deletedChat.id));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        () => {
          // Refresh chats to update last_message and unread counts
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchChats]);

  return {
    chats,
    loading,
    unreadCount,
    fetchChats,
    getOrCreateChat,
    getChatMessages,
    sendMessage,
    sendMissedCall,
    sendCallEnded,
    markAsRead,
    deleteForMe,
    deleteForEveryone,
    forwardMessage,
    deleteChat,
  };
};
