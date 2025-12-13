import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminCommunication {
  id: string;
  title: string;
  content: string;
  sender_id: string;
  target_type: string;
  target_user_ids: string[];
  allow_reply: boolean;
  is_active: boolean;
  sent_at: string;
  created_at: string;
  read_count?: number;
  reply_count?: number;
}

export interface AdminCommunicationTyped {
  id: string;
  title: string;
  content: string;
  sender_id: string;
  target_type: 'all' | 'specific';
  target_user_ids: string[];
  allow_reply: boolean;
  is_active: boolean;
  sent_at: string;
  created_at: string;
  read_count?: number;
  reply_count?: number;
}

export interface CommunicationReply {
  id: string;
  communication_id: string;
  user_id: string;
  reply_text: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export function useAdminCommunications() {
  const [communications, setCommunications] = useState<AdminCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCommunications = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_communications')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setCommunications(data || []);
    } catch (error) {
      console.error('Error fetching communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendCommunication = async (
    title: string,
    content: string,
    targetType: 'all' | 'specific',
    targetUserIds: string[],
    allowReply: boolean
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('admin_communications')
        .insert({
          title,
          content,
          sender_id: user.id,
          target_type: targetType,
          target_user_ids: targetType === 'specific' ? targetUserIds : [],
          allow_reply: allowReply
        });

      if (error) throw error;

      toast({
        title: "Communication envoyée",
        description: targetType === 'all' 
          ? "Message envoyé à tous les utilisateurs" 
          : `Message envoyé à ${targetUserIds.length} utilisateur(s)`
      });

      await fetchCommunications();
      return true;
    } catch (error) {
      console.error('Error sending communication:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la communication",
        variant: "destructive"
      });
      return false;
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_communications')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      await fetchCommunications();
    } catch (error) {
      console.error('Error toggling communication:', error);
    }
  };

  const deleteCommunication = async (id: string) => {
    try {
      const { error } = await supabase
        .from('admin_communications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCommunications();
      toast({ title: "Communication supprimée" });
    } catch (error) {
      console.error('Error deleting communication:', error);
    }
  };

  const fetchReplies = async (communicationId: string): Promise<CommunicationReply[]> => {
    try {
      const { data, error } = await supabase
        .from('communication_replies')
        .select('*')
        .eq('communication_id', communicationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching replies:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchCommunications();
  }, []);

  return {
    communications,
    loading,
    sendCommunication,
    toggleActive,
    deleteCommunication,
    fetchReplies,
    refetch: fetchCommunications
  };
}

export function useUserCommunications() {
  const [communications, setCommunications] = useState<AdminCommunication[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCommunications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch communications targeted to this user
      const { data: comms, error } = await supabase
        .from('admin_communications')
        .select('*')
        .eq('is_active', true)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Filter communications for this user
      const userComms = (comms || []).filter(c => 
        c.target_type === 'all' || c.target_user_ids.includes(user.id)
      );

      // Fetch read status
      const { data: reads } = await supabase
        .from('user_communication_reads')
        .select('communication_id')
        .eq('user_id', user.id);

      const readIds = new Set((reads || []).map(r => r.communication_id));
      const unread = userComms.filter(c => !readIds.has(c.id)).length;

      setCommunications(userComms);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching user communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (communicationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_communication_reads')
        .upsert({
          communication_id: communicationId,
          user_id: user.id
        }, { onConflict: 'communication_id,user_id' });

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const sendReply = async (communicationId: string, replyText: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('communication_replies')
        .insert({
          communication_id: communicationId,
          user_id: user.id,
          reply_text: replyText
        });

      if (error) throw error;

      toast({
        title: "Réponse envoyée",
        description: "Votre réponse a été transmise à l'équipe ANR"
      });

      return true;
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réponse",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchCommunications();
  }, []);

  return {
    communications,
    unreadCount,
    loading,
    markAsRead,
    sendReply,
    refetch: fetchCommunications
  };
}
