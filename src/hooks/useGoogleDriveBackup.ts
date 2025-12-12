import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { encryptBackup, decryptBackup } from "@/lib/backupEncryption";

interface BackupFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
}

interface GoogleDriveStatus {
  connected: boolean;
  email?: string;
  expiresAt?: string;
}

export function useGoogleDriveBackup() {
  const [status, setStatus] = useState<GoogleDriveStatus>({ connected: false });
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check connection status
  const checkStatus = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('google-drive-backup/status', {
        body: { userId: user.id }
      });

      if (response.data) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  }, [user]);

  // Initial status check
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Listen for OAuth popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'google-drive-connected') {
        setStatus({ connected: true, email: event.data.email });
        toast({
          title: "Google Drive connecté",
          description: `Connecté en tant que ${event.data.email}`
        });
        listBackups();
      } else if (event.data?.type === 'google-drive-error') {
        toast({
          title: "Erreur de connexion",
          description: event.data.error,
          variant: "destructive"
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [toast]);

  // Connect to Google Drive
  const connect = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Non authentifié');
      }

      const response = await supabase.functions.invoke('google-drive-backup/auth-url', {
        body: { 
          userId: user.id,
          redirectUrl: window.location.pathname
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Open OAuth popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        response.data.authUrl,
        'google-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error: any) {
      console.error('Connect error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de se connecter à Google Drive",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Disconnect from Google Drive
  const disconnect = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('google-drive-backup/disconnect', {
        body: { userId: user.id }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setStatus({ connected: false });
      setBackups([]);
      
      toast({
        title: "Déconnecté",
        description: "Google Drive déconnecté avec succès"
      });
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de se déconnecter",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // List backups
  const listBackups = async () => {
    if (!user || !status.connected) return;
    
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('google-drive-backup/list', {
        body: { userId: user.id }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setBackups(response.data.backups || []);
    } catch (error: any) {
      console.error('List error:', error);
      if (error.message?.includes('Session expirée')) {
        setStatus({ connected: false });
      }
    } finally {
      setLoading(false);
    }
  };

  // Upload backup to Google Drive
  const uploadBackup = async (backupData: object, password: string): Promise<boolean> => {
    if (!user || !status.connected) return false;
    
    setUploading(true);
    try {
      // Encrypt the backup
      const encryptedBuffer = await encryptBackup(backupData, password);
      
      // Convert to base64 for transmission
      const bytes = new Uint8Array(encryptedBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);

      const filename = `anr-backup-${new Date().toISOString().split('T')[0]}.anr-backup`;

      const response = await supabase.functions.invoke('google-drive-backup/upload', {
        body: { 
          userId: user.id,
          backupData: base64Data,
          filename
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Sauvegarde réussie",
        description: "Vos messages ont été sauvegardés sur Google Drive"
      });

      await listBackups();
      return true;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: error.message || "Impossible de sauvegarder sur Google Drive",
        variant: "destructive"
      });
      return false;
    } finally {
      setUploading(false);
    }
  };

  // Download and restore backup from Google Drive
  const downloadBackup = async (password: string, fileId?: string): Promise<object | null> => {
    if (!user || !status.connected) return null;
    
    setDownloading(true);
    try {
      const response = await supabase.functions.invoke('google-drive-backup/download', {
        body: { 
          userId: user.id,
          fileId
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Decode base64
      const binary = atob(response.data.backupData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Decrypt
      const decryptedData = await decryptBackup(bytes.buffer, password);
      
      return decryptedData;
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Erreur de restauration",
        description: error.message === "The operation failed for an operation-specific reason"
          ? "Mot de passe incorrect"
          : error.message || "Impossible de restaurer depuis Google Drive",
        variant: "destructive"
      });
      return null;
    } finally {
      setDownloading(false);
    }
  };

  return {
    status,
    backups,
    loading,
    uploading,
    downloading,
    connect,
    disconnect,
    listBackups,
    uploadBackup,
    downloadBackup,
    checkStatus
  };
}
