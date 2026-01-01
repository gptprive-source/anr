import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface BusinessCard {
  id: string;
  card_type: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface SentMessage {
  id: string;
  habitation_id: string;
  message: string | null;
  voice_message_url: string | null;
  is_read: boolean;
  created_at: string;
  business_card_id: string | null;
  encrypted_message?: string | null;
  is_encrypted?: boolean;
  media_url?: string | null;
  media_type?: string | null;
  recipient_user_id?: string | null;
}

interface MessageReply {
  id: string;
  original_message_id: string;
  reply_text: string | null;
  reply_voice_url: string | null;
  reply_media_url: string | null;
  reply_media_type: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  is_encrypted?: boolean;
}

interface Conversation {
  habitationId: string;
  habitationName: string;
  residentName: string; // Name of the owner/resident OR recipient for private
  anrAddress: string;
  lastMessage: string | null;
  lastMessageDate: Date;
  unreadRepliesCount: number;
  totalMessages: number;
  hasReplies: boolean;
  // New fields for private conversations
  recipientUserId: string | null; // null = residence, string = private
  isPrivate: boolean;
  conversationKey: string; // Unique key: habitationId__residence OR habitationId__private_userId
}

export const useSentMessages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [replies, setReplies] = useState<MessageReply[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadRepliesCount, setUnreadRepliesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [businessCard, setBusinessCard] = useState<BusinessCard | null>(null);

  // Fetch visitor's business card
  const fetchBusinessCard = async () => {
    if (!user) return null;

    const { data } = await supabase
      .from("visitor_business_cards")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    setBusinessCard(data);
    return data;
  };

  // Get device ID for anonymous visitors - MUST match the key used in useVisitorMessages
  const getDeviceId = () => {
    const DEVICE_ID_KEY = 'anr_visitor_device_id';
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  };

  // Fetch sent messages and replies - grouped by habitation + recipient
  const fetchSentMessages = async () => {
    if (!user) return;

    console.log("[useSentMessages] fetchSentMessages called for user:", user.id);

    try {
      // Get visitor's business card (optional)
      const card = await fetchBusinessCard();
      const deviceId = getDeviceId();
      
      console.log("[useSentMessages] Searching with user_id:", user.id, "card:", card?.id || "none", "device:", deviceId);

      // Fetch messages sent by this visitor via MULTIPLE identifiers:
      let orConditions: string[] = [];
      
      if (card?.id) {
        orConditions.push(`business_card_id.eq.${card.id}`);
      }
      orConditions.push(`visitor_device_id.eq.${deviceId}`);
      
      // Also fetch all business cards linked to this user
      const { data: userCards } = await supabase
        .from("visitor_business_cards")
        .select("id")
        .eq("user_id", user.id);
      
      if (userCards && userCards.length > 0) {
        for (const uc of userCards) {
          if (uc.id !== card?.id) {
            orConditions.push(`business_card_id.eq.${uc.id}`);
          }
        }
      }

      const { data: messagesData, error: messagesError } = await (supabase
        .from("visitor_messages" as any)
        .select("*, recipient_user_id")
        .or(orConditions.join(","))
        .order("created_at", { ascending: false }) as any);

      if (messagesError) throw messagesError;

      // Filter out messages deleted by visitor
      const sentMessages = ((messagesData || []) as SentMessage[]).filter(
        (m: any) => m.deleted_by_visitor !== true
      );
      console.log("[useSentMessages] Fetched messages:", sentMessages.length);
      setMessages(sentMessages);

      if (sentMessages.length === 0) {
        setConversations([]);
        setReplies([]);
        setUnreadRepliesCount(0);
        setLoading(false);
        return;
      }

      // Fetch replies to these messages
      const messageIds = sentMessages.map(m => m.id);
      const { data: repliesData, error: repliesError } = await (supabase
        .from("message_replies" as any)
        .select("*")
        .in("original_message_id", messageIds)
        .or("deleted_by_visitor.is.null,deleted_by_visitor.eq.false")
        .order("created_at", { ascending: false }) as any);

      if (repliesError) throw repliesError;

      const allReplies = (repliesData || []) as MessageReply[];
      console.log("[useSentMessages] Fetched replies:", allReplies.length);
      setReplies(allReplies);

      // Calculate unread replies count
      const unread = allReplies.filter(r => !r.is_read).length;
      setUnreadRepliesCount(unread);

      // Group by habitation + recipient_user_id to create separate conversations
      // Key format: habitationId__residence OR habitationId__private_userId
      const conversationsMap = new Map<string, Conversation>();

      for (const msg of sentMessages) {
        const habId = msg.habitation_id;
        const recipientId = msg.recipient_user_id;
        const isPrivate = !!recipientId;
        const conversationKey = isPrivate 
          ? `${habId}__private_${recipientId}` 
          : `${habId}__residence`;
        
        const msgReplies = allReplies.filter(r => r.original_message_id === msg.id);
        const hasUnreadReplies = msgReplies.some(r => !r.is_read);
        
        // Get last activity (message or reply)
        const lastReplyDate = msgReplies.length > 0 
          ? new Date(msgReplies[0].created_at) 
          : null;
        const msgDate = new Date(msg.created_at);
        const lastActivityDate = lastReplyDate && lastReplyDate > msgDate ? lastReplyDate : msgDate;
        const lastActivityText = lastReplyDate && lastReplyDate > msgDate
          ? (msgReplies[0].reply_text || "🎤 Message vocal")
          : (msg.message || "🎤 Message vocal");

        const existing = conversationsMap.get(conversationKey);
        if (existing) {
          existing.totalMessages++;
          if (hasUnreadReplies) {
            existing.unreadRepliesCount += msgReplies.filter(r => !r.is_read).length;
          }
          if (lastActivityDate > existing.lastMessageDate) {
            existing.lastMessageDate = lastActivityDate;
            existing.lastMessage = lastActivityText;
          }
          if (msgReplies.length > 0) {
            existing.hasReplies = true;
          }
        } else {
          conversationsMap.set(conversationKey, {
            habitationId: habId,
            habitationName: "", // Will be fetched separately
            residentName: "", // Will be fetched separately
            anrAddress: "",
            lastMessage: lastActivityText,
            lastMessageDate: lastActivityDate,
            unreadRepliesCount: msgReplies.filter(r => !r.is_read).length,
            totalMessages: 1,
            hasReplies: msgReplies.length > 0,
            recipientUserId: recipientId || null,
            isPrivate,
            conversationKey,
          });
        }
      }

      // Fetch habitation details and recipient names
      const habIds = [...new Set(Array.from(conversationsMap.values()).map(c => c.habitationId))];
      const recipientIds = [...new Set(
        Array.from(conversationsMap.values())
          .filter(c => c.recipientUserId)
          .map(c => c.recipientUserId!)
      )];
      
      // Cache for habitation and profile data
      const habCache = new Map<string, { name: string; address: string; ownerName: string }>();
      const profileCache = new Map<string, string>();

      if (habIds.length > 0) {
        // Fetch habitations with ANR address
        const { data: habData } = await supabase
          .from("habitations")
          .select("id, name, anr:anrs(address)")
          .in("id", habIds);

        // Fetch owner/resident profiles for each habitation
        const { data: residentsData } = await supabase
          .from("residents")
          .select("habitation_id, user_id, is_owner, profiles:profiles(first_name, last_name)")
          .in("habitation_id", habIds)
          .eq("status", "verified")
          .eq("is_owner", true);

        if (habData) {
          for (const hab of habData as any[]) {
            const owner = residentsData?.find(r => r.habitation_id === hab.id);
            let ownerName = hab.name || "Résidence";
            if (owner?.profiles) {
              const profile = owner.profiles as any;
              const firstName = profile.first_name || "";
              const lastName = profile.last_name || "";
              ownerName = `${firstName} ${lastName}`.trim() || hab.name || "Résidence";
            }
            habCache.set(hab.id, {
              name: hab.name || "Résidence",
              address: hab.anr?.address || "",
              ownerName,
            });
          }
        }
      }

      // Fetch profiles for private message recipients
      if (recipientIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", recipientIds);

        if (profilesData) {
          for (const profile of profilesData) {
            const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Résident";
            profileCache.set(profile.id, name);
          }
        }
      }

      // Update conversation names
      for (const conv of conversationsMap.values()) {
        const habInfo = habCache.get(conv.habitationId);
        if (habInfo) {
          conv.habitationName = habInfo.name;
          conv.anrAddress = habInfo.address;
          
          if (conv.isPrivate && conv.recipientUserId) {
            // For private conversations, show just the recipient name
            const recipientName = profileCache.get(conv.recipientUserId) || "Résident";
            conv.residentName = recipientName;
          } else {
            // For residence conversations, show owner name
            conv.residentName = habInfo.ownerName;
          }
        }
      }

      // Sort conversations by last message date
      const sortedConversations = Array.from(conversationsMap.values())
        .sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime());

      console.log("[useSentMessages] Created conversations:", sortedConversations.length, sortedConversations.map(c => c.conversationKey));
      setConversations(sortedConversations);
    } catch (error) {
      console.error("[useSentMessages] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mark reply as read
  const markReplyAsRead = async (replyId: string) => {
    try {
      const { error } = await (supabase
        .from("message_replies" as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", replyId) as any);

      if (error) throw error;

      setReplies(prev => prev.map(r =>
        r.id === replyId ? { ...r, is_read: true, read_at: new Date().toISOString() } : r
      ));
      setUnreadRepliesCount(prev => Math.max(0, prev - 1));

      return { success: true };
    } catch (error: any) {
      console.error("[useSentMessages] Error marking reply as read:", error);
      return { success: false, error: error.message };
    }
  };

  // Get messages and replies for a specific conversation (by conversation key)
  const getConversationMessages = (conversationKey: string) => {
    // Parse conversation key to get habitationId and recipientUserId
    const isPrivate = conversationKey.includes("__private_");
    const habitationId = conversationKey.split("__")[0];
    const recipientUserId = isPrivate ? conversationKey.split("__private_")[1] : null;
    
    const habMessages = messages.filter(m => {
      if (m.habitation_id !== habitationId) return false;
      if (isPrivate) {
        return m.recipient_user_id === recipientUserId;
      } else {
        return !m.recipient_user_id;
      }
    });
    
    const messageIds = habMessages.map(m => m.id);
    const habReplies = replies.filter(r => messageIds.includes(r.original_message_id));
    return { messages: habMessages, replies: habReplies };
  };

  // Soft delete a sent message
  const deleteSentMessage = async (messageId: string) => {
    console.log("[useSentMessages] deleteSentMessage called for:", messageId);
    try {
      const { error } = await (supabase
        .from("visitor_messages" as any)
        .update({ deleted_by_visitor: true })
        .eq("id", messageId) as any);
      
      if (error) throw error;
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
      console.log("[useSentMessages] Message deleted from local state");
      
      return { success: true };
    } catch (error: any) {
      console.error("[useSentMessages] Error deleting message:", error);
      return { success: false, error: error.message };
    }
  };

  // Soft delete an entire conversation by conversation key
  const deleteConversation = async (conversationKey: string) => {
    try {
      // Parse conversation key
      const isPrivate = conversationKey.includes("__private_");
      const isResidence = conversationKey.includes("__residence");
      const habitationId = conversationKey.split("__")[0];
      const recipientUserId = isPrivate ? conversationKey.split("__private_")[1] : null;
      
      // Find messages for this specific conversation
      const messagesToDelete = messages.filter(m => {
        if (m.habitation_id !== habitationId) return false;
        if (isPrivate && recipientUserId) {
          return m.recipient_user_id === recipientUserId;
        } else if (isResidence) {
          return !m.recipient_user_id;
        }
        return true; // Legacy key format - delete all for this habitation
      });
      
      const messageIds = messagesToDelete.map(m => m.id);
      
      if (messageIds.length > 0) {
        const { error } = await (supabase
          .from("visitor_messages" as any)
          .update({ deleted_by_visitor: true })
          .in("id", messageIds) as any);
        
        if (error) throw error;
      }
      
      // Update local state
      setMessages(prev => prev.filter(m => !messageIds.includes(m.id)));
      setConversations(prev => prev.filter(c => c.conversationKey !== conversationKey));
      
      return { success: true };
    } catch (error: any) {
      console.error("[useSentMessages] Error deleting conversation:", error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    fetchSentMessages();
  }, [user]);

  // Subscribe to new replies
  useEffect(() => {
    if (!user || !businessCard) return;

    const messageIds = messages.map(m => m.id);
    if (messageIds.length === 0) return;

    const channel = supabase
      .channel(`visitor-replies-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_replies",
        },
        (payload) => {
          const newReply = payload.new as MessageReply;
          if (messageIds.includes(newReply.original_message_id)) {
            setReplies(prev => [newReply, ...prev]);
            setUnreadRepliesCount(prev => prev + 1);
            fetchSentMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, businessCard, messages]);

  return {
    messages,
    replies,
    conversations,
    unreadRepliesCount,
    loading,
    businessCard,
    markReplyAsRead,
    getConversationMessages,
    deleteSentMessage,
    deleteConversation,
    refetch: fetchSentMessages,
  };
};
