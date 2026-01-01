import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

interface VisitorMessage {
  id: string;
  habitation_id: string;
  message: string | null;
  voice_message_url: string | null;
  visitor_phone: string | null;
  visitor_latitude: number | null;
  visitor_longitude: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  business_card_id: string | null;
  business_card?: BusinessCard | null;
  has_reply?: boolean;
  replied_at?: string | null;
  conversation_token?: string | null;
  // Device ID for consistent conversation grouping
  visitor_device_id?: string | null;
  // E2E Encryption fields
  encrypted_message?: string | null;
  message_nonce?: string | null;
  visitor_public_key?: string | null;
  is_encrypted?: boolean;
  // Media fields
  media_url?: string | null;
  media_type?: string | null;
  // Recipient for private messages
  recipient_user_id?: string | null;
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  icon: string | null;
}

export const useVisitorMessages = (habitationId?: string, countOnly = false) => {
  const [messages, setMessages] = useState<VisitorMessage[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [retentionDays, setRetentionDays] = useState(30);

  // Fetch only unread count (fast - for dashboard)
  // Only count messages for this resident OR messages to the whole residence
  const fetchUnreadCount = async () => {
    if (!habitationId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      
      // Fetch unread messages and filter client-side for accuracy
      const { data, error } = await supabase
        .from("visitor_messages")
        .select("id, recipient_user_id")
        .eq("habitation_id", habitationId)
        .eq("is_read", false);
      
      if (error) throw error;
      
      // Filter: only count messages for whole residence OR for this user
      const filteredCount = (data || []).filter((m: any) => {
        if (!m.recipient_user_id) return true;
        return m.recipient_user_id === userId;
      }).length;
      
      setUnreadCount(filteredCount);
    } catch (error) {
      console.error("[useVisitorMessages] Error fetching count:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full messages for residents (with business card join)
  // Only fetch messages for this resident OR messages to the whole residence
  const fetchMessages = async () => {
    if (!habitationId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      
      console.log("[useVisitorMessages] Fetching messages for user:", userId, "habitation:", habitationId);
      
      // Fetch all messages for this habitation, then filter client-side
      // This is more reliable than complex PostgREST OR conditions
      const { data, error } = await (supabase
        .from("visitor_messages" as any)
        .select("*, business_card:visitor_business_cards(*)")
        .eq("habitation_id", habitationId)
        .or("deleted_by_resident.is.null,deleted_by_resident.eq.false")
        .order("created_at", { ascending: false })
        .limit(100) as any);
      
      if (error) throw error;
      
      // Filter messages: only show if recipient_user_id is NULL OR equals current user
      const filteredData = (data || []).filter((m: any) => {
        // If no recipient specified, message is for whole residence
        if (!m.recipient_user_id) return true;
        // If recipient specified, only show to that user
        return m.recipient_user_id === userId;
      });
      
      console.log("[useVisitorMessages] Total messages:", data?.length, "After filter:", filteredData.length);
      
      const messagesWithCards = filteredData.map((m: any) => ({
        ...m,
        business_card: m.business_card || null,
      })) as VisitorMessage[];
      
      setMessages(messagesWithCards);
      setUnreadCount(messagesWithCards.filter(m => !m.is_read).length);
    } catch (error) {
      console.error("[useVisitorMessages] Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch templates (public)
  const fetchTemplates = async () => {
    try {
      const { data, error } = await (supabase
        .from("visitor_message_templates" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }) as any);
      
      if (error) throw error;
      setTemplates((data || []) as MessageTemplate[]);
    } catch (error) {
      console.error("[useVisitorMessages] Error fetching templates:", error);
    }
  };

  // Fetch retention config
  const fetchRetentionConfig = async () => {
    try {
      const { data } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "visitor_messages_retention_days")
        .maybeSingle();
      
      if (data) {
        setRetentionDays(parseInt(String(data.value)) || 30);
      }
    } catch (error) {
      console.error("[useVisitorMessages] Error fetching config:", error);
    }
  };

  // Get or create device ID for tracking visitor conversations
  const getVisitorDeviceId = (): string => {
    const DEVICE_ID_KEY = "anr_visitor_device_id";
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  };

  // Send a message (visitor - no auth required)
  const sendMessage = async (
    targetHabitationId: string,
    message?: string,
    visitorPhone?: string,
    _templateId?: string,
    businessCardId?: string,
    audioBase64?: string,
    encryptionData?: {
      encrypted_message: string;
      message_nonce: string;
      visitor_public_key: string;
    },
    mediaFile?: File,
    recipientUserId?: string | null // For private messages
  ) => {
    try {
      // If audio is provided, upload to storage first
      let voiceMessageUrl: string | null = null;
      if (audioBase64) {
        const fileName = `voice-${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
        const filePath = `visitor-messages/${targetHabitationId}/${fileName}`;
        
        // Convert base64 to Uint8Array
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const { error: uploadError } = await supabase.storage
          .from('visitor-voice-messages')
          .upload(filePath, bytes, {
            contentType: 'audio/webm',
            upsert: false,
          });
        
        if (uploadError) {
          console.error("[useVisitorMessages] Upload error:", uploadError);
          // Continue without voice message if upload fails
        } else {
          const { data: urlData } = supabase.storage
            .from('visitor-voice-messages')
            .getPublicUrl(filePath);
          voiceMessageUrl = urlData.publicUrl;
        }
      }

      // If media file is provided, upload to storage
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop() || 'bin';
        const fileName = `media-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `visitor-messages/${targetHabitationId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('visitor-voice-messages')
          .upload(filePath, mediaFile, {
            contentType: mediaFile.type,
            upsert: false,
          });
        
        if (uploadError) {
          console.error("[useVisitorMessages] Media upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('visitor-voice-messages')
            .getPublicUrl(filePath);
          mediaUrl = urlData.publicUrl;
          mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
        }
      }

      // Prepare insert data with optional encryption
      // IMPORTANT: Always include visitor_device_id so visitors can see their conversations
      const visitorDeviceId = getVisitorDeviceId();
      
      // Check if user is authenticated first
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // For logged-in users, use their existing business card (must be created via onboarding)
      let finalBusinessCardId = businessCardId || null;
      if (currentUser && !finalBusinessCardId) {
        // Try to find existing card - don't auto-create, user must complete onboarding
        const { data: userCard } = await supabase
          .from("visitor_business_cards")
          .select("id")
          .eq("user_id", currentUser.id)
          .maybeSingle();
        
        if (userCard) {
          finalBusinessCardId = userCard.id;
          console.log("[useVisitorMessages] Auto-attached existing business card:", finalBusinessCardId);
        }
        // No auto-creation - user must complete business card onboarding first
      }
      
      const insertData: Record<string, any> = {
        habitation_id: targetHabitationId,
        message: encryptionData ? null : (message || null), // Clear text only if not encrypted
        voice_message_url: voiceMessageUrl,
        visitor_phone: visitorPhone || null,
        business_card_id: finalBusinessCardId,
        media_url: mediaUrl,
        media_type: mediaType,
        visitor_device_id: visitorDeviceId, // Track which device sent this message
        recipient_user_id: recipientUserId || null, // For private messages
      };

      // Add encryption fields if provided
      if (encryptionData) {
        insertData.encrypted_message = encryptionData.encrypted_message;
        insertData.message_nonce = encryptionData.message_nonce;
        insertData.visitor_public_key = encryptionData.visitor_public_key;
        insertData.is_encrypted = true;
      }
      
      let insertedMessageId: string | null = null;
      
      if (currentUser) {
        // Authenticated user - can use select
        const { data: insertedMessage, error } = await (supabase
          .from("visitor_messages" as any)
          .insert(insertData)
          .select()
          .single() as any);
        
        if (error) throw error;
        insertedMessageId = insertedMessage?.id;
      } else {
        // Non-authenticated visitor - just insert without select (RLS blocks select for anon)
        const { error } = await (supabase
          .from("visitor_messages" as any)
          .insert(insertData) as any);
        
        if (error) throw error;
        console.log("[useVisitorMessages] Message inserted successfully (no select for visitor)");
      }

      // Create notification for the resident(s) of this habitation
      // Only notify: owner (is_owner=true) AND invited residents with receive_visitor_messages=true
      try {
        // Get residents who should receive notifications
        const { data: residents } = await supabase
          .from("residents")
          .select("user_id, is_owner, receive_visitor_messages")
          .eq("habitation_id", targetHabitationId)
          .eq("status", "verified");

        if (residents && residents.length > 0) {
          // Filter: if recipientUserId is set, only notify that user
          // Otherwise: owners always receive, others only if receive_visitor_messages is true
          let recipientResidents;
          if (recipientUserId) {
            recipientResidents = residents.filter(r => r.user_id === recipientUserId);
          } else {
            recipientResidents = residents.filter(r => 
              r.is_owner === true || r.receive_visitor_messages === true
            );
          }

          if (recipientResidents.length > 0) {
            // Get visitor name from business card if available
            let visitorName = "Un visiteur";
            if (businessCardId) {
              const { data: card } = await supabase
                .from("visitor_business_cards")
                .select("first_name, last_name, company_name")
                .eq("id", businessCardId)
                .maybeSingle();
              
              if (card) {
                if (card.first_name || card.last_name) {
                  visitorName = `${card.first_name || ""} ${card.last_name || ""}`.trim();
                } else if (card.company_name) {
                  visitorName = card.company_name;
                }
              }
            }

            // Create notifications for eligible residents only
            const notifications = recipientResidents.map(r => ({
              user_id: r.user_id,
              type: "visitor_message",
              title: "Nouveau message",
              message: `${visitorName} vous a envoyé un message`,
              is_read: false,
              data: { message_id: insertedMessageId, habitation_id: targetHabitationId },
            }));

            await supabase.from("user_notifications").insert(notifications as any);
          }
        }
      } catch (notifError) {
        console.warn("[useVisitorMessages] Could not create notification:", notifError);
        // Don't fail the message send if notification fails
      }

      return { success: true, message: insertedMessageId ? { id: insertedMessageId } : null };
    } catch (error: any) {
      console.error("[useVisitorMessages] Error sending message:", error);
      return { success: false, error: error.message };
    }
  };

  // Mark message as read
  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await (supabase
        .from("visitor_messages" as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", messageId) as any);
      
      if (error) throw error;
      
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, is_read: true, read_at: new Date().toISOString() } : m
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return { success: true };
    } catch (error: any) {
      console.error("[useVisitorMessages] Error marking as read:", error);
      return { success: false, error: error.message };
    }
  };

  // Delete message
  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await (supabase
        .from("visitor_messages" as any)
        .delete()
        .eq("id", messageId) as any);
      
      if (error) throw error;
      
      const deletedMessage = messages.find(m => m.id === messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (deletedMessage && !deletedMessage.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      return { success: true };
    } catch (error: any) {
      console.error("[useVisitorMessages] Error deleting message:", error);
      return { success: false, error: error.message };
    }
  };

  // Delete all messages from a specific visitor (conversation)
  // conversationKey can be: visitorId, visitorId__residence, or visitorId__private
  const deleteConversation = async (conversationKey: string) => {
    try {
      // Extract visitorId and conversation type from key
      // Format: visitorId__residence OR visitorId__private OR just visitorId (legacy)
      const isPrivate = conversationKey.includes("__private");
      const isResidence = conversationKey.includes("__residence");
      const visitorId = conversationKey.split("__")[0];
      
      // Get all message IDs for this visitor, filtered by conversation type
      const messagesToDelete = messages.filter(m => {
        const msgVisitorId = m.business_card_id || m.visitor_device_id || m.visitor_phone || `anon-${m.id}`;
        if (msgVisitorId !== visitorId) return false;
        
        // Filter by conversation type if specified
        if (isPrivate) {
          return !!m.recipient_user_id;
        } else if (isResidence) {
          return !m.recipient_user_id;
        }
        // Legacy: delete all messages from this visitor
        return true;
      });

      if (messagesToDelete.length === 0) {
        console.log("[useVisitorMessages] No messages found to delete for conversationKey:", conversationKey);
        return { success: true };
      }

      console.log("[useVisitorMessages] Soft-deleting", messagesToDelete.length, "messages for conversationKey:", conversationKey);

      // Soft delete all messages for this conversation (mark as deleted by resident)
      for (const msg of messagesToDelete) {
        await supabase
          .from("visitor_messages" as any)
          .update({ deleted_by_resident: true })
          .eq("id", msg.id);
      }

      // Update local state - filter by the same logic
      const unreadDeleted = messagesToDelete.filter(m => !m.is_read).length;
      setMessages(prev => prev.filter(m => {
        const msgVisitorId = m.business_card_id || m.visitor_device_id || m.visitor_phone || `anon-${m.id}`;
        if (msgVisitorId !== visitorId) return true; // Keep messages from other visitors
        
        // Filter by conversation type if specified
        if (isPrivate) {
          return !m.recipient_user_id; // Keep residence messages
        } else if (isResidence) {
          return !!m.recipient_user_id; // Keep private messages
        }
        // Legacy: remove all messages from this visitor
        return false;
      }));
      setUnreadCount(prev => Math.max(0, prev - unreadDeleted));
      
      return { success: true };
    } catch (error: any) {
      console.error("[useVisitorMessages] Error deleting conversation:", error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    if (habitationId) {
      if (countOnly) {
        fetchUnreadCount();
      } else {
        fetchMessages();
        fetchTemplates();
        fetchRetentionConfig();
      }
    }
  }, [habitationId, countOnly]);

  // Subscribe to new messages
  useEffect(() => {
    if (!habitationId) return;

    const channel = supabase
      .channel(`visitor-messages-${habitationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "visitor_messages",
          filter: `habitation_id=eq.${habitationId}`,
        },
        (payload) => {
          const newMessage = payload.new as VisitorMessage & { deleted_by_resident?: boolean };
          // Ne pas ajouter les messages déjà supprimés pour ce résident
          if (newMessage.deleted_by_resident === true) {
            console.log("[useVisitorMessages] Ignoring deleted message in realtime");
            return;
          }
          setMessages(prev => [newMessage, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [habitationId]);

  return {
    messages,
    templates,
    unreadCount,
    loading,
    retentionDays,
    sendMessage,
    markAsRead,
    deleteMessage,
    deleteConversation,
    refetch: fetchMessages,
  };
};
