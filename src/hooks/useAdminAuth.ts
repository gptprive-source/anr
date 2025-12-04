import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

type AdminRole = 'admin' | 'super_admin' | 'moderator' | 'analyst';

interface AdminAuthState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  role: AdminRole | null;
  loading: boolean;
}

export const useAdminAuth = (): AdminAuthState => {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isSuperAdmin: false,
    role: null,
    loading: true,
  });

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setState({ isAdmin: false, isSuperAdmin: false, role: null, loading: false });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking admin role:', error);
          setState({ isAdmin: false, isSuperAdmin: false, role: null, loading: false });
          return;
        }

        const role = data?.role as AdminRole | null;
        const adminRoles: AdminRole[] = ['admin', 'super_admin'];
        
        setState({
          isAdmin: role ? adminRoles.includes(role) : false,
          isSuperAdmin: role === 'super_admin',
          role,
          loading: false,
        });
      } catch (err) {
        console.error('Error checking admin role:', err);
        setState({ isAdmin: false, isSuperAdmin: false, role: null, loading: false });
      }
    };

    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

  return state;
};
