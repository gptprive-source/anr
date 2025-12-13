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
  visitor_anr_code: string | null;
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
  // E2E Encryption fields
  encrypted_message?: string | null;
  message_nonce?: string | null;
  visitor_public_key?: string | null;
  is_encrypted?: boolean;
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
  const fetchUnreadCount = async () => {
    if (!habitationId) return;
    
    try {
      const { count, error } = await supabase
        .from("visitor_messages")
        .select("*", { count: "exact", head: true })
        .eq("habitation_id", habitationId)
        .eq("is_read", false);
      
      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error("[useVisitorMessages] Error fetching count:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full messages for residents (with business card join)
  const fetchMessages = async () => {
    if (!habitationId) return;
    
    try {
      const { data, error } = await (supabase
        .from("visitor_messages" as any)
        .select("*, business_card:visitor_business_cards(*)")
        .eq("habitation_id", habitationId)
        .order("created_at", { ascending: false })
        .limit(50) as any); // Limit to 50 messages
      
      if (error) throw error;
      
      const messagesWithCards = (data || []).map((m: any) => ({
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
    }
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

      // Prepare insert data with optional encryption
      const insertData: Record<string, any> = {
        habitation_id: targetHabitationId,
        message: encryptionData ? null : (message || null), // Clear text only if not encrypted
        voice_message_url: voiceMessageUrl,
        visitor_phone: visitorPhone || null,
        business_card_id: businessCardId || null,
      };

      // Add encryption fields if provided
      if (encryptionData) {
        insertData.encrypted_message = encryptionData.encrypted_message;
        insertData.message_nonce = encryptionData.message_nonce;
        insertData.visitor_public_key = encryptionData.visitor_public_key;
        insertData.is_encrypted = true;
      }

      const { data: insertedMessage, error } = await (supabase
        .from("visitor_messages" as any)
        .insert(insertData)
        .select()
        .single() as any);
      
      if (error) throw error;

      // Create notification for the resident(s) of this habitation
      try {
        // Get all residents of this habitation
        const { data: residents } = await supabase
          .from("residents")
          .select("user_id")
          .eq("habitation_id", targetHabitationId)
          .eq("status", "verified");

        if (residents && residents.length > 0) {
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

          // Create notifications for each resident
          const notifications = residents.map(r => ({
            user_id: r.user_id,
            type: "visitor_message",
            title: "Nouveau message",
            message: `${visitorName} vous a envoyé un message`,
            is_read: false,
            data: { message_id: insertedMessage.id, habitation_id: targetHabitationId },
          }));

          await supabase.from("user_notifications").insert(notifications as any);
        }
      } catch (notifError) {
        console.warn("[useVisitorMessages] Could not create notification:", notifError);
        // Don't fail the message send if notification fails
      }

      return { success: true, message: insertedMessage };
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
  const deleteConversation = async (visitorId: string) => {
    try {
      // Get all message IDs for this visitor
      const messagesToDelete = messages.filter(m => {
        const msgVisitorId = m.business_card_id || m.visitor_phone || `anon-${m.id}`;
        return msgVisitorId === visitorId;
      });

      if (messagesToDelete.length === 0) return { success: true };

      // Delete all messages for this visitor
      for (const msg of messagesToDelete) {
        await supabase
          .from("visitor_messages" as any)
          .delete()
          .eq("id", msg.id);
      }

      // Update local state
      const unreadDeleted = messagesToDelete.filter(m => !m.is_read).length;
      setMessages(prev => prev.filter(m => {
        const msgVisitorId = m.business_card_id || m.visitor_phone || `anon-${m.id}`;
        return msgVisitorId !== visitorId;
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
          const newMessage = payload.new as VisitorMessage;
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
