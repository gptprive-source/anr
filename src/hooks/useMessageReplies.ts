import { useState, useEffect, useCallback, useRef } from "react";
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

// Accept a single messageId OR an array of messageIds for fetching all conversation replies
export const useMessageReplies = (messageIds?: string | string[]) => {
  const [replies, setReplies] = useState<MessageReply[]>([]);
  const [loading, setLoading] = useState(false);

  // Normalize to array and stabilize with ref
  const idsArray = messageIds 
    ? (Array.isArray(messageIds) ? messageIds : [messageIds]).filter(Boolean)
    : [];
  
  // Use ref to store the latest IDs for the refetch function
  const idsRef = useRef<string[]>(idsArray);
  idsRef.current = idsArray;

  const fetchReplies = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setReplies([]);
      return;
    }
    
    console.log("[useMessageReplies] fetchReplies called for:", ids.length, "messages");
    setLoading(true);
    try {
      // Filter out replies deleted by resident (since this hook is used by residents)
      // Use .in() to get replies for ALL messages in the conversation
      const { data, error } = await (supabase
        .from("message_replies" as any)
        .select("*")
        .in("original_message_id", ids)
        .or("deleted_by_resident.is.null,deleted_by_resident.eq.false")
        .order("created_at", { ascending: true }) as any);
      
      if (error) throw error;
      console.log("[useMessageReplies] Fetched replies:", data?.length, "for", ids.length, "messages");
      setReplies((data || []) as MessageReply[]);
    } catch (error) {
      console.error("[useMessageReplies] Error fetching replies:", error);
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (idsArray.length > 0) {
      fetchReplies(idsArray);
    }
  }, [JSON.stringify(idsArray)]);

  // Realtime subscription for ALL message IDs
  useEffect(() => {
    if (idsArray.length === 0) return;

    // Subscribe to all message replies at once
    const channelName = `message-replies-${idsArray.slice(0, 3).join("-")}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_replies",
        },
        (payload) => {
          const newReply = payload.new as MessageReply;
          // Only add if it's for one of our messages
          if (idsArray.includes(newReply.original_message_id)) {
            // Avoid duplicates - check if reply already exists
            setReplies(prev => {
              if (prev.some(r => r.id === newReply.id)) {
                return prev;
              }
              return [...prev, newReply];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [JSON.stringify(idsArray)]);

  // Stable refetch function using ref
  const refetch = useCallback(async () => {
    if (idsRef.current.length > 0) {
      console.log("[useMessageReplies] Refetching replies for:", idsRef.current.length, "messages");
      await fetchReplies(idsRef.current);
    }
  }, [fetchReplies]);

  return {
    replies,
    loading,
    sendReply,
    markAsRead,
    deleteReply,
    refetch,
  };
};
