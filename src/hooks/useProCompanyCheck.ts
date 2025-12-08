import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProCompany {
  id: string;
  name: string;
  plan_type: string;
  is_active: boolean;
}

export const useProCompanyCheck = () => {
  const { user } = useAuth();
  const [proCompany, setProCompany] = useState<ProCompany | null>(null);
  const [isProUser, setIsProUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProStatus = async () => {
      if (!user) {
        setProCompany(null);
        setIsProUser(false);
        setLoading(false);
        return;
      }

      try {
        // Check if user has a company role
        const { data: roles } = await supabase
          .from("pro_company_roles")
          .select("company_id, role")
          .eq("user_id", user.id);

        if (!roles || roles.length === 0) {
          setProCompany(null);
          setIsProUser(false);
          setLoading(false);
          return;
        }

        // Get company details
        const { data: company } = await supabase
          .from("pro_companies")
          .select("id, name, plan_type, is_active")
          .eq("id", roles[0].company_id)
          .single();

        if (company && company.is_active) {
          setProCompany(company);
          setIsProUser(true);
        } else {
          setProCompany(null);
          setIsProUser(false);
        }
      } catch (error) {
        console.error("Error checking PRO status:", error);
        setProCompany(null);
        setIsProUser(false);
      } finally {
        setLoading(false);
      }
    };

    checkProStatus();
  }, [user]);

  return { proCompany, isProUser, loading };
};
