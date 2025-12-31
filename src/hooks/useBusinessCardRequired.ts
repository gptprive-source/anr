import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserType = "particulier" | "professionnel" | "visitor" | null;

interface BusinessCardRequiredResult {
  isComplete: boolean;
  isLoading: boolean;
  userType: UserType;
  profile: {
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
  } | null;
  companyName: string | null;
  anrCode: string | null;
  refetch: () => Promise<void>;
  markAsComplete: () => Promise<boolean>;
}

export const useBusinessCardRequired = (): BusinessCardRequiredResult => {
  const { user } = useAuth();
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState<UserType>(null);
  const [profile, setProfile] = useState<BusinessCardRequiredResult["profile"]>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [anrCode, setAnrCode] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      setUserType("visitor");
      return;
    }

    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone_number, business_card_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          phone_number: profileData.phone_number,
        });
        setIsComplete(profileData.business_card_completed || false);
      }

      // Check if user is a professional (has company role)
      const { data: companyRole } = await supabase
        .from("pro_company_roles")
        .select("company_id, pro_companies(name)")
        .eq("user_id", user.id)
        .maybeSingle();

      if (companyRole) {
        setUserType("professionnel");
        const company = companyRole.pro_companies as { name: string } | null;
        setCompanyName(company?.name || null);

        // Get ANR code from company's habitation
        const { data: companyData } = await supabase
          .from("pro_companies")
          .select("id")
          .eq("id", companyRole.company_id)
          .maybeSingle();

        if (companyData) {
          // For pro, they might have access to multiple ANRs via schedules
          const { data: schedules } = await supabase
            .from("door_scheduled_access")
            .select("anr_id, anrs(code)")
            .eq("granted_to_company", companyRole.company_id)
            .limit(1)
            .maybeSingle();

          if (schedules) {
            const anr = schedules.anrs as { code: string } | null;
            setAnrCode(anr?.code || null);
          }
        }
      } else {
        // Check if user is a resident (particulier)
        const { data: resident } = await supabase
          .from("residents")
          .select("habitation_id, habitations(anr_id, anrs(code))")
          .eq("user_id", user.id)
          .eq("status", "verified")
          .maybeSingle();

        if (resident) {
          setUserType("particulier");
          const habitation = resident.habitations as { anr_id: string; anrs: { code: string } | null } | null;
          setAnrCode(habitation?.anrs?.code || null);
        } else {
          // User has account but no resident/company role - treat as visitor
          setUserType("visitor");
        }
      }
    } catch (error) {
      console.error("[useBusinessCardRequired] Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markAsComplete = async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ business_card_completed: true })
        .eq("id", user.id);

      if (error) throw error;
      setIsComplete(true);
      return true;
    } catch (error) {
      console.error("[useBusinessCardRequired] Error marking complete:", error);
      return false;
    }
  };

  return {
    isComplete,
    isLoading,
    userType,
    profile,
    companyName,
    anrCode,
    refetch: fetchData,
    markAsComplete,
  };
};
