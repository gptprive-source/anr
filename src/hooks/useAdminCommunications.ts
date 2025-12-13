import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNotificationSound } from '@/hooks/useNotificationSound';

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
  communication_title?: string;
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
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine final target user IDs
      let finalTargetUserIds = targetUserIds;
      
      if (targetType === 'all') {
        // Fetch all verified residents' user IDs
        const { data: residents, error: residentsError } = await supabase
          .from('residents')
          .select('user_id')
          .eq('status', 'verified');
        
        if (residentsError) throw residentsError;
        
        // Get unique user IDs
        finalTargetUserIds = [...new Set(residents?.map(r => r.user_id).filter(Boolean) || [])];
      }

      // Insert the communication
      const { data: commData, error } = await supabase
        .from('admin_communications')
        .insert({
          title,
          content,
          sender_id: user.id,
          target_type: targetType,
          target_user_ids: targetType === 'specific' ? targetUserIds : [],
          allow_reply: allowReply
        })
        .select('id')
        .single();

      if (error) throw error;

      // Create user_notifications for EACH targeted user
      if (finalTargetUserIds.length > 0) {
        const notifications = finalTargetUserIds.map(userId => ({
          user_id: userId,
          type: 'admin_communication',
          title: `📢 ${title}`,
          message: content.substring(0, 150) + (content.length > 150 ? '...' : ''),
          data: { communication_id: commData.id },
          is_read: false,
        }));

        const { error: notifError } = await supabase
          .from('user_notifications')
          .insert(notifications);

        if (notifError) {
          console.error("Error creating notifications:", notifError);
          // Don't fail the whole operation, communication was sent
        }
      }

      toast({
        title: "Communication envoyée",
        description: `Message envoyé à ${finalTargetUserIds.length} utilisateur(s)`
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

  const fetchReplies = async (communicationId?: string): Promise<CommunicationReply[]> => {
    try {
      let query = supabase
        .from('communication_replies')
        .select('*')
        .order('created_at', { ascending: false });

      if (communicationId) {
        query = query.eq('communication_id', communicationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      if (!data || data.length === 0) return [];

      // Fetch user profiles for all replies
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get communication titles
      const commIds = [...new Set(data.map(r => r.communication_id))];
      const commMap = new Map(communications.map(c => [c.id, c.title]));
      
      // If we don't have all communications in state, fetch them
      const missingCommIds = commIds.filter(id => !commMap.has(id));
      if (missingCommIds.length > 0) {
        const { data: comms } = await supabase
          .from('admin_communications')
          .select('id, title')
          .in('id', missingCommIds);
        
        comms?.forEach(c => commMap.set(c.id, c.title));
      }

      // Enrich replies with user name and communication title
      return data.map(reply => {
        const profile = profileMap.get(reply.user_id);
        const userName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Utilisateur inconnu'
          : 'Utilisateur inconnu';
        
        return {
          ...reply,
          user_name: userName,
          communication_title: commMap.get(reply.communication_id) || 'Communication supprimée'
        };
      });
    } catch (error) {
      console.error('Error fetching replies:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchCommunications();

    // Real-time subscription for new replies
    const channel = supabase
      .channel("admin-communication-replies")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "communication_replies",
        },
        () => {
          // Refetch communications to update reply counts
          fetchCommunications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
  const [communicationReplies, setCommunicationReplies] = useState<CommunicationReply[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasNewCommunication, setHasNewCommunication] = useState(false);
  const { toast } = useToast();
  const { playNotificationSound, vibrate, stopVibrate } = useNotificationSound();
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  const fetchCommunications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      currentUserIdRef.current = user.id;

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
      if (unread > 0) {
        setHasNewCommunication(true);
      }

      // Fetch user's own replies to these communications
      if (userComms.length > 0) {
        const { data: replies } = await supabase
          .from('communication_replies')
          .select('*')
          .eq('user_id', user.id)
          .in('communication_id', userComms.map(c => c.id))
          .order('created_at', { ascending: true });
        
        setCommunicationReplies(replies || []);
      }
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

      // Get the communication to find the sender
      const comm = communications.find(c => c.id === communicationId);

      const { data, error } = await supabase
        .from('communication_replies')
        .insert({
          communication_id: communicationId,
          user_id: user.id,
          reply_text: replyText
        })
        .select()
        .single();

      if (error) throw error;

      // Add the new reply to state
      if (data) {
        setCommunicationReplies(prev => [...prev, data]);
      }

      // Create notification for the admin (sender of the communication)
      if (comm?.sender_id && comm.sender_id !== user.id) {
        // Get user profile for notification message
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        const userName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Un utilisateur'
          : 'Un utilisateur';

        await supabase
          .from('user_notifications')
          .insert({
            user_id: comm.sender_id,
            type: 'communication_reply',
            title: 'Nouvelle réponse',
            message: `${userName} a répondu à votre communication "${comm.title}"`,
            data: { 
              communication_id: communicationId,
              reply_id: data.id,
              user_name: userName
            }
          });
      }

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

  // Start vibration when there are unread communications
  useEffect(() => {
    if (hasNewCommunication && unreadCount > 0) {
      vibrationIntervalRef.current = setInterval(() => {
        vibrate([100, 50, 100]);
      }, 3000);

      return () => {
        if (vibrationIntervalRef.current) {
          clearInterval(vibrationIntervalRef.current);
          vibrationIntervalRef.current = null;
        }
        stopVibrate();
      };
    }
  }, [hasNewCommunication, unreadCount, vibrate, stopVibrate]);

  // Real-time subscription for new communications
  useEffect(() => {
    fetchCommunications();

    const channel = supabase
      .channel("user-communications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_communications",
        },
        async (payload) => {
          const newComm = payload.new as any;
          const userId = currentUserIdRef.current;
          
          // Check if this communication is for this user
          if (userId && (newComm.target_type === 'all' || newComm.target_user_ids?.includes(userId))) {
            setCommunications(prev => [newComm, ...prev]);
            setUnreadCount(prev => prev + 1);
            setHasNewCommunication(true);
            
            // Play sound and vibrate
            playNotificationSound();
            vibrate([200, 100, 200, 100, 200]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
      }
    };
  }, [playNotificationSound, vibrate]);

  const clearNewCommunicationFlag = () => {
    setHasNewCommunication(false);
    stopVibrate();
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
  };

  return {
    communications,
    communicationReplies,
    unreadCount,
    hasNewCommunication,
    loading,
    markAsRead,
    sendReply,
    clearNewCommunicationFlag,
    refetch: fetchCommunications
  };
}
