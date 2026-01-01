import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_contact_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  message: string | null;
  voice_message_url: string | null;
  media_url: string | null;
  media_type: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  is_mine: boolean;
}

export const useDirectMessages = (contactId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<any>(null);

  const fetchContact = useCallback(async () => {
    if (!contactId || !user) return;
    
    const { data } = await (supabase
      .from("resident_contacts" as any)
      .select("*")
      .eq("id", contactId)
      .eq("user_id", user.id)
      .single() as any);
    
    if (data) {
      setContact(data);
    }
  }, [contactId, user]);

  const fetchMessages = useCallback(async () => {
    if (!contactId || !user || !contact) {
      setLoading(false);
      return;
    }

    try {
      // Get messages I sent to this contact
      const { data: sentMessages, error: sentError } = await (supabase
        .from("direct_messages")
        .select("*")
        .eq("sender_id", user.id)
        .eq("recipient_contact_id", contactId)
        .order("created_at", { ascending: true }) as any);

      if (sentError) throw sentError;

      // Combine and mark as mine
      const allMessages = (sentMessages || []).map((m: any) => ({ 
        ...m, 
        is_mine: true 
      }));

      setMessages(allMessages);
    } catch (error) {
      console.error("[useDirectMessages] Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [contactId, user, contact]);

  const sendMessage = async (params: {
    message?: string;
    voiceBlob?: Blob;
    mediaFile?: File;
  }) => {
    if (!contactId || !user || !contact) {
      return { success: false, error: "Contact non trouvé" };
    }

    try {
      let voice_message_url: string | null = null;
      let media_url: string | null = null;
      let media_type: string | null = null;

      // Upload voice message if exists
      if (params.voiceBlob) {
        const fileName = `voice_${Date.now()}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("direct-messages")
          .upload(`${user.id}/${fileName}`, params.voiceBlob, {
            contentType: "audio/webm"
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from("direct-messages")
            .getPublicUrl(uploadData.path);
          voice_message_url = urlData.publicUrl;
        }
      }

      // Upload media if exists
      if (params.mediaFile) {
        const ext = params.mediaFile.name.split(".").pop();
        const fileName = `media_${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("direct-messages")
          .upload(`${user.id}/${fileName}`, params.mediaFile);

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from("direct-messages")
            .getPublicUrl(uploadData.path);
          media_url = urlData.publicUrl;
          media_type = params.mediaFile.type.startsWith("image/") ? "image" : 
                       params.mediaFile.type.startsWith("video/") ? "video" : "file";
        }
      }

      const { data, error } = await supabase
        .from("direct_messages")
        .insert({
          sender_id: user.id,
          recipient_contact_id: contactId,
          recipient_email: contact.email,
          recipient_phone: contact.phone,
          message: params.message || null,
          voice_message_url,
          media_url,
          media_type
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, { ...data, is_mine: true }]);

      return { success: true, message: data };
    } catch (error: any) {
      console.error("[useDirectMessages] Error sending message:", error);
      return { success: false, error: error.message };
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("direct_messages")
        .delete()
        .eq("id", messageId)
        .eq("sender_id", user?.id);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
      return { success: true };
    } catch (error: any) {
      console.error("[useDirectMessages] Error deleting message:", error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  useEffect(() => {
    if (contact) {
      fetchMessages();
    }
  }, [contact, fetchMessages]);

  useEffect(() => {
    if (!contactId || !user) return;

    const channel = supabase
      .channel(`direct_messages_${contactId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `recipient_contact_id=eq.${contactId}`
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, { ...newMsg, is_mine: newMsg.sender_id === user.id }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId, user]);

  return {
    messages,
    contact,
    loading,
    sendMessage,
    deleteMessage,
    refetch: fetchMessages
  };
};
