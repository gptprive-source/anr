import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface SupportRequest {
  id: string;
  userName: string;
  userEmail: string;
  createdAt: string;
}

interface SupportAlertContextType {
  pendingRequest: SupportRequest | null;
  dismissAlert: () => void;
  answeredIds: Set<string>;
  markAsAnswered: (id: string) => void;
}

const SupportAlertContext = createContext<SupportAlertContextType | undefined>(undefined);

export const SupportAlertProvider = ({ children }: { children: ReactNode }) => {
  const { isAdmin } = useAdminAuth();
  const [pendingRequest, setPendingRequest] = useState<SupportRequest | null>(null);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Check for pending support requests
  const checkPendingRequests = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const { data: conversations, error } = await supabase
        .from('support_conversations')
        .select('id, user_id, created_at, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        console.error("[SupportAlert] Error checking requests:", error);
        return;
      }

      if (conversations && conversations.length > 0) {
        const conv = conversations[0];
        
        // Skip if already dismissed or answered
        if (dismissedIds.has(conv.id) || answeredIds.has(conv.id)) {
          return;
        }

        // Get user info
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', conv.user_id)
          .single();

        // Get user email from auth (via edge function or stored)
        const userName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() 
          : 'Utilisateur';

        setPendingRequest({
          id: conv.id,
          userName,
          userEmail: '', // We don't have direct access to auth.users
          createdAt: conv.created_at,
        });
      } else {
        setPendingRequest(null);
      }
    } catch (error) {
      console.error("[SupportAlert] Error:", error);
    }
  }, [isAdmin, dismissedIds, answeredIds]);

  // Initial check and polling
  useEffect(() => {
    if (!isAdmin) return;

    checkPendingRequests();
    const interval = setInterval(checkPendingRequests, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [isAdmin, checkPendingRequests]);

  // Real-time subscription for new support requests
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('support-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_conversations',
        },
        (payload) => {
          console.log("[SupportAlert] New support request:", payload);
          checkPendingRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_conversations',
        },
        (payload) => {
          console.log("[SupportAlert] Support request updated:", payload);
          const updated = payload.new as any;
          if (updated.status !== 'pending') {
            // Request was answered, clear alert
            if (pendingRequest?.id === updated.id) {
              setPendingRequest(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, checkPendingRequests, pendingRequest?.id]);

  const dismissAlert = useCallback(() => {
    if (pendingRequest) {
      setDismissedIds(prev => new Set([...prev, pendingRequest.id]));
      setPendingRequest(null);
    }
  }, [pendingRequest]);

  const markAsAnswered = useCallback((id: string) => {
    setAnsweredIds(prev => new Set([...prev, id]));
    if (pendingRequest?.id === id) {
      setPendingRequest(null);
    }
  }, [pendingRequest]);

  return (
    <SupportAlertContext.Provider
      value={{
        pendingRequest,
        dismissAlert,
        answeredIds,
        markAsAnswered,
      }}
    >
      {children}
    </SupportAlertContext.Provider>
  );
};

export const useSupportAlert = () => {
  const context = useContext(SupportAlertContext);
  if (!context) {
    throw new Error("useSupportAlert must be used within a SupportAlertProvider");
  }
  return context;
};
