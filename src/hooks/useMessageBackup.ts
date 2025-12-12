import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { encryptBackup, decryptBackup, downloadBackupFile, readBackupFile } from "@/lib/backupEncryption";
import { useToast } from "@/hooks/use-toast";

interface BackupData {
  version: string;
  createdAt: string;
  userId: string;
  messages: any[];
  replies: any[];
  encryptionKeys: any[];
}

export function useMessageBackup() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const exportMessages = async (password: string): Promise<boolean> => {
    if (!user) return false;
    
    setExporting(true);
    try {
      // Fetch user's habitation
      const { data: resident } = await supabase
        .from("residents")
        .select("habitation_id")
        .eq("user_id", user.id)
        .eq("status", "verified")
        .maybeSingle();

      if (!resident?.habitation_id) {
        toast({
          title: "Erreur",
          description: "Aucune habitation trouvée",
          variant: "destructive"
        });
        return false;
      }

      // Fetch messages
      const { data: messages, error: msgError } = await supabase
        .from("visitor_messages")
        .select("*")
        .eq("habitation_id", resident.habitation_id);

      if (msgError) throw msgError;

      // Fetch replies
      const { data: replies, error: replyError } = await supabase
        .from("message_replies")
        .select("*")
        .eq("habitation_id", resident.habitation_id);

      if (replyError) throw replyError;

      // Fetch encryption keys
      const { data: keys, error: keysError } = await supabase
        .from("conversation_keys")
        .select("*")
        .eq("habitation_id", resident.habitation_id);

      if (keysError) throw keysError;

      // Get local encryption keys from localStorage
      const localKeys: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("anr_resident_keys_")) {
          localKeys[key] = localStorage.getItem(key) || "";
        }
      }

      const backupData: BackupData = {
        version: "1.0",
        createdAt: new Date().toISOString(),
        userId: user.id,
        messages: messages || [],
        replies: replies || [],
        encryptionKeys: keys || []
      };

      // Add local keys to backup
      (backupData as any).localEncryptionKeys = localKeys;

      // Encrypt and download
      const encryptedData = await encryptBackup(backupData, password);
      const filename = `anr-backup-${new Date().toISOString().split("T")[0]}.anr-backup`;
      downloadBackupFile(encryptedData, filename);

      toast({
        title: "Export réussi",
        description: "Vos messages ont été exportés et chiffrés"
      });

      return true;
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Erreur d'export",
        description: error.message || "Impossible d'exporter les messages",
        variant: "destructive"
      });
      return false;
    } finally {
      setExporting(false);
    }
  };

  const importMessages = async (file: File, password: string): Promise<boolean> => {
    if (!user) return false;
    
    setImporting(true);
    try {
      const encryptedData = await readBackupFile(file);
      const backupData = await decryptBackup(encryptedData, password) as BackupData & { localEncryptionKeys?: Record<string, string> };

      // Validate backup
      if (!backupData.version || !backupData.messages) {
        throw new Error("Format de sauvegarde invalide");
      }

      // Restore local encryption keys
      if (backupData.localEncryptionKeys) {
        for (const [key, value] of Object.entries(backupData.localEncryptionKeys)) {
          localStorage.setItem(key, value);
        }
      }

      toast({
        title: "Import réussi",
        description: `${backupData.messages.length} messages et clés de chiffrement restaurés`
      });

      return true;
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Erreur d'import",
        description: error.message === "The operation failed for an operation-specific reason" 
          ? "Mot de passe incorrect" 
          : error.message || "Impossible d'importer les messages",
        variant: "destructive"
      });
      return false;
    } finally {
      setImporting(false);
    }
  };

  return {
    exportMessages,
    importMessages,
    exporting,
    importing
  };
}
