import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  getOrCreateResidentKeys,
  getOrCreateVisitorKeys,
  isEncryptionSupported,
} from "@/lib/encryption";

interface ConversationKey {
  id: string;
  conversation_id: string;
  habitation_id: string;
  resident_public_key: string | null;
  visitor_public_key: string | null;
}

export const useEncryptedMessages = (habitationId?: string) => {
  const sharedKeyCache = useRef<Map<string, CryptoKey>>(new Map());

  /**
   * Get or create conversation keys for resident
   */
  const getResidentConversationKeys = useCallback(
    async (conversationId: string): Promise<{ publicKey: string; sharedKey: CryptoKey | null }> => {
      if (!isEncryptionSupported()) {
        console.warn("[Encryption] Web Crypto API not supported");
        return { publicKey: "", sharedKey: null };
      }

      // Check cache first
      const cachedKey = sharedKeyCache.current.get(`resident-${conversationId}`);
      
      // Get or create resident keypair
      const { keyPair, publicKeyExport, isNew } = await getOrCreateResidentKeys(conversationId);

      // If we have a cached shared key and didn't create new keys, use it
      if (cachedKey && !isNew) {
        return { publicKey: publicKeyExport, sharedKey: cachedKey };
      }

      // Fetch conversation keys from database
      const { data: convKey } = await (supabase
        .from("conversation_keys" as any)
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("habitation_id", habitationId)
        .maybeSingle() as any);

      // If we have visitor's public key, derive shared key
      if (convKey?.visitor_public_key) {
        try {
          const visitorPublicKey = await importPublicKey(convKey.visitor_public_key);
          const sharedKey = await deriveSharedKey(keyPair.privateKey, visitorPublicKey);
          sharedKeyCache.current.set(`resident-${conversationId}`, sharedKey);
          return { publicKey: publicKeyExport, sharedKey };
        } catch (error) {
          console.error("[Encryption] Failed to derive shared key:", error);
        }
      }

      // Update or insert resident public key in database
      if (habitationId) {
        if (convKey) {
          await (supabase
            .from("conversation_keys" as any)
            .update({ resident_public_key: publicKeyExport })
            .eq("id", convKey.id) as any);
        } else {
          await (supabase
            .from("conversation_keys" as any)
            .insert({
              conversation_id: conversationId,
              habitation_id: habitationId,
              resident_public_key: publicKeyExport,
            }) as any);
        }
      }

      return { publicKey: publicKeyExport, sharedKey: null };
    },
    [habitationId]
  );

  /**
   * Get or create conversation keys for visitor
   */
  const getVisitorConversationKeys = useCallback(
    async (
      conversationId: string,
      targetHabitationId: string
    ): Promise<{ publicKey: string; sharedKey: CryptoKey | null }> => {
      if (!isEncryptionSupported()) {
        console.warn("[Encryption] Web Crypto API not supported");
        return { publicKey: "", sharedKey: null };
      }

      // Check cache first
      const cachedKey = sharedKeyCache.current.get(`visitor-${conversationId}`);

      // Get or create visitor keypair
      const { keyPair, publicKeyExport, isNew } = await getOrCreateVisitorKeys(conversationId);

      // If we have a cached shared key and didn't create new keys, use it
      if (cachedKey && !isNew) {
        return { publicKey: publicKeyExport, sharedKey: cachedKey };
      }

      // Fetch conversation keys from database
      const { data: convKey } = await (supabase
        .from("conversation_keys" as any)
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("habitation_id", targetHabitationId)
        .maybeSingle() as any);

      // If we have resident's public key, derive shared key
      if (convKey?.resident_public_key) {
        try {
          const residentPublicKey = await importPublicKey(convKey.resident_public_key);
          const sharedKey = await deriveSharedKey(keyPair.privateKey, residentPublicKey);
          sharedKeyCache.current.set(`visitor-${conversationId}`, sharedKey);
          return { publicKey: publicKeyExport, sharedKey };
        } catch (error) {
          console.error("[Encryption] Failed to derive shared key:", error);
        }
      }

      // Update or insert visitor public key in database
      if (convKey) {
        await (supabase
          .from("conversation_keys" as any)
          .update({ visitor_public_key: publicKeyExport })
          .eq("id", convKey.id) as any);
      } else {
        await (supabase
          .from("conversation_keys" as any)
          .insert({
            conversation_id: conversationId,
            habitation_id: targetHabitationId,
            visitor_public_key: publicKeyExport,
          }) as any);
      }

      return { publicKey: publicKeyExport, sharedKey: null };
    },
    []
  );

  /**
   * Encrypt a message for sending
   */
  const encryptForSending = useCallback(
    async (
      message: string,
      conversationId: string,
      isResident: boolean,
      targetHabitationId?: string
    ): Promise<{ encrypted: string; nonce: string; publicKey: string } | null> => {
      try {
        const { publicKey, sharedKey } = isResident
          ? await getResidentConversationKeys(conversationId)
          : await getVisitorConversationKeys(conversationId, targetHabitationId || "");

        if (!sharedKey) {
          // No shared key yet - return public key for key exchange, message will be sent unencrypted
          console.log("[Encryption] No shared key available, message will include public key for exchange");
          return null;
        }

        const { encrypted, nonce } = await encryptMessage(message, sharedKey);
        return { encrypted, nonce, publicKey };
      } catch (error) {
        console.error("[Encryption] Failed to encrypt message:", error);
        return null;
      }
    },
    [getResidentConversationKeys, getVisitorConversationKeys]
  );

  /**
   * Decrypt a received message
   */
  const decryptReceived = useCallback(
    async (
      encrypted: string,
      nonce: string,
      conversationId: string,
      senderPublicKey: string,
      isResident: boolean,
      targetHabitationId?: string
    ): Promise<string | null> => {
      try {
        // Get our keypair
        const { keyPair } = isResident
          ? await getOrCreateResidentKeys(conversationId)
          : await getOrCreateVisitorKeys(conversationId);

        // Import sender's public key and derive shared key
        const senderKey = await importPublicKey(senderPublicKey);
        const sharedKey = await deriveSharedKey(keyPair.privateKey, senderKey);

        // Cache the shared key
        const cacheKey = isResident ? `resident-${conversationId}` : `visitor-${conversationId}`;
        sharedKeyCache.current.set(cacheKey, sharedKey);

        // Decrypt the message
        return await decryptMessage(encrypted, nonce, sharedKey);
      } catch (error) {
        console.error("[Encryption] Failed to decrypt message:", error);
        return null;
      }
    },
    []
  );

  /**
   * Initialize encryption for a conversation (called when opening a conversation)
   */
  const initializeConversation = useCallback(
    async (conversationId: string, isResident: boolean, targetHabitationId?: string) => {
      if (isResident) {
        return await getResidentConversationKeys(conversationId);
      } else {
        return await getVisitorConversationKeys(conversationId, targetHabitationId || "");
      }
    },
    [getResidentConversationKeys, getVisitorConversationKeys]
  );

  return {
    encryptForSending,
    decryptReceived,
    initializeConversation,
    isSupported: isEncryptionSupported(),
  };
};
