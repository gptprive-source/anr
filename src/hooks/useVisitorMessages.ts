import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface VisitorMessage {
  id: string;
  habitation_id: string;
  call_id: string | null;
  message: string;
  visitor_phone: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  expires_at: string;
}

interface MessageTemplate {
  id: string;
  label: string;
  message: string;
  icon: string;
}

export const useVisitorMessages = (habitationId?: string) => {
  const [messages, setMessages] = useState<VisitorMessage[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [retentionDays, setRetentionDays] = useState(30);

  // Fetch messages for residents
  const fetchMessages = async () => {
    if (!habitationId) return;
    
    try {
      const { data, error } = await (supabase
        .from("visitor_messages" as any)
        .select("*")
        .eq("habitation_id", habitationId)
        .order("created_at", { ascending: false }) as any);
      
      if (error) throw error;
      
      setMessages((data || []) as VisitorMessage[]);
      setUnreadCount(((data || []) as VisitorMessage[]).filter(m => !m.is_read).length);
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
        .order("usage_count", { ascending: false }) as any);
      
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
    message: string,
    visitorPhone?: string,
    callId?: string,
    templateId?: string
  ) => {
    try {
      const { error } = await (supabase
        .from("visitor_messages" as any)
        .insert({
          habitation_id: targetHabitationId,
          message,
          visitor_phone: visitorPhone || null,
          call_id: callId || null,
        }) as any);
      
      if (error) throw error;

      // Increment template usage if used (ignore errors)
      if (templateId) {
        await (supabase
          .from("visitor_message_templates" as any)
          .update({ usage_count: supabase.rpc as any })
          .eq("id", templateId) as any).catch(() => {});
      }

      return { success: true };
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

  useEffect(() => {
    fetchTemplates();
    fetchRetentionConfig();
    if (habitationId) {
      fetchMessages();
    }
  }, [habitationId]);

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
    refetch: fetchMessages,
  };
};
