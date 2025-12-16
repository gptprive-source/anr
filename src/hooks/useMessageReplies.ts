import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MessageReply {
  id: string;
  original_message_id: string;
  resident_id: string;
  habitation_id: string;
  reply_text: string | null;
  reply_voice_url: string | null;
  reply_media_url: string | null;
  reply_media_type: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  // E2E Encryption fields
  encrypted_reply?: string | null;
  reply_nonce?: string | null;
  is_encrypted?: boolean;
}

export const useMessageReplies = (messageId?: string) => {
  const [replies, setReplies] = useState<MessageReply[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReplies = async (msgId: string) => {
    setLoading(true);
    try {
      // Filter out replies deleted by resident (since this hook is used by residents)
      const { data, error } = await (supabase
        .from("message_replies" as any)
        .select("*")
        .eq("original_message_id", msgId)
        .or("deleted_by_resident.is.null,deleted_by_resident.eq.false")
        .order("created_at", { ascending: true }) as any);
      
      if (error) throw error;
      setReplies((data || []) as MessageReply[]);
    } catch (error) {
      console.error("[useMessageReplies] Error fetching replies:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async (
    originalMessageId: string,
    habitationId: string,
    replyText?: string,
    audioBase64?: string,
    mediaFile?: File,
    encryptionData?: {
      encrypted_reply: string;
      reply_nonce: string;
    }
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Non authentifié");

      let replyVoiceUrl: string | null = null;
      let replyMediaUrl: string | null = null;
      let replyMediaType: string | null = null;
      
      // Upload audio if provided
      if (audioBase64) {
        const fileName = `reply-${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
        const filePath = `message-replies/${habitationId}/${fileName}`;
        
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
          console.error("[useMessageReplies] Upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('visitor-voice-messages')
            .getPublicUrl(filePath);
          replyVoiceUrl = urlData.publicUrl;
        }
      }

      // Upload media file if provided
      if (mediaFile) {
        const ext = mediaFile.name.split('.').pop() || 'bin';
        const fileName = `media-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `message-replies/${habitationId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('visitor-voice-messages')
          .upload(filePath, mediaFile, {
            contentType: mediaFile.type,
            upsert: false,
          });
        
        if (uploadError) {
          console.error("[useMessageReplies] Media upload error:", uploadError);
          throw new Error("Erreur lors de l'upload du fichier");
        } else {
          const { data: urlData } = supabase.storage
            .from('visitor-voice-messages')
            .getPublicUrl(filePath);
          replyMediaUrl = urlData.publicUrl;
          replyMediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
        }
      }

      // Prepare insert data with optional encryption
      const insertData: Record<string, any> = {
        original_message_id: originalMessageId,
        resident_id: userData.user.id,
        habitation_id: habitationId,
        reply_text: encryptionData ? null : (replyText || null), // Clear text only if not encrypted
        reply_voice_url: replyVoiceUrl,
        reply_media_url: replyMediaUrl,
        reply_media_type: replyMediaType,
      };

      // Add encryption fields if provided
      if (encryptionData) {
        insertData.encrypted_reply = encryptionData.encrypted_reply;
        insertData.reply_nonce = encryptionData.reply_nonce;
        insertData.is_encrypted = true;
      }

      const { data, error } = await (supabase
        .from("message_replies" as any)
        .insert(insertData)
        .select()
        .single() as any);
      
      if (error) throw error;

      setReplies(prev => [...prev, data as MessageReply]);
      return { success: true, reply: data };
    } catch (error: any) {
      console.error("[useMessageReplies] Error sending reply:", error);
      return { success: false, error: error.message };
    }
  };

  const markAsRead = async (replyId: string) => {
    try {
      const { error } = await (supabase
        .from("message_replies" as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", replyId) as any);
      
      if (error) throw error;
      
      setReplies(prev => prev.map(r => 
        r.id === replyId ? { ...r, is_read: true, read_at: new Date().toISOString() } : r
      ));
      return { success: true };
    } catch (error: any) {
      console.error("[useMessageReplies] Error marking as read:", error);
      return { success: false, error: error.message };
    }
  };

  const deleteReply = async (replyId: string) => {
    try {
      const { error } = await (supabase
        .from("message_replies" as any)
        .delete()
        .eq("id", replyId) as any);
      
      if (error) throw error;
      
      setReplies(prev => prev.filter(r => r.id !== replyId));
      return { success: true };
    } catch (error: any) {
      console.error("[useMessageReplies] Error deleting reply:", error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    if (messageId) {
      fetchReplies(messageId);
    }
  }, [messageId]);

  // Realtime subscription
  useEffect(() => {
    if (!messageId) return;

    const channel = supabase
      .channel(`message-replies-${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_replies",
          filter: `original_message_id=eq.${messageId}`,
        },
        (payload) => {
          const newReply = payload.new as MessageReply;
          setReplies(prev => [...prev, newReply]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  return {
    replies,
    loading,
    sendReply,
    markAsRead,
    deleteReply,
    refetch: () => messageId && fetchReplies(messageId),
  };
};
