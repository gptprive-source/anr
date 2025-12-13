import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppConfig } from "@/hooks/useAppConfig";

export interface PlanLimits {
  maxResidents: number;
  maxEmployees: number;
  copilotEnabled: boolean;
  geofencingEnabled: boolean;
  schedulingEnabled: boolean;
  facialRecognitionEnabled: boolean;
  planType: string;
  planName: string;
  isProPlan: boolean;
  hasActiveSubscription: boolean;
}

const DEFAULT_LIMITS: PlanLimits = {
  maxResidents: 7,
  maxEmployees: 0,
  copilotEnabled: false,
  geofencingEnabled: false,
  schedulingEnabled: false,
  facialRecognitionEnabled: false,
  planType: "particulier",
  planName: "Particulier",
  isProPlan: false,
  hasActiveSubscription: false,
};

// Plan configurations with their limits
const PLAN_CONFIGS: Record<string, Partial<PlanLimits>> = {
  particulier: {
    maxResidents: 7,
    maxEmployees: 0,
    copilotEnabled: false,
    geofencingEnabled: false,
    schedulingEnabled: false,
    facialRecognitionEnabled: false,
    planName: "Particulier",
    isProPlan: false,
  },
  pro: {
    maxResidents: 10,
    maxEmployees: 10,
    copilotEnabled: true,
    geofencingEnabled: false,
    schedulingEnabled: true,
    facialRecognitionEnabled: false,
    planName: "Pro",
    isProPlan: true,
  },
  entreprise: {
    maxResidents: 50,
    maxEmployees: 100,
    copilotEnabled: true,
    geofencingEnabled: true,
    schedulingEnabled: true,
    facialRecognitionEnabled: true,
    planName: "Entreprise",
    isProPlan: true,
  },
  collectivites: {
    maxResidents: 200,
    maxEmployees: 1000,
    copilotEnabled: true,
    geofencingEnabled: true,
    schedulingEnabled: true,
    facialRecognitionEnabled: true,
    planName: "Collectivités",
    isProPlan: true,
  },
};

export const useUserPlan = () => {
  const { user } = useAuth();
  const { getConfig } = useAppConfig();
  const [planType, setPlanType] = useState<string>("particulier");
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserPlan = async () => {
      if (!user) {
        setPlanType("particulier");
        setHasActiveSubscription(false);
        setLoading(false);
        return;
      }

      try {
        // Fetch subscription with plan_type
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("plan_type, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subscription?.plan_type) {
          setPlanType(subscription.plan_type);
          setHasActiveSubscription(true);
        } else {
          // Check if user is an invited resident of an active habitation
          const { data: resident } = await supabase
            .from("residents")
            .select("habitation_id")
            .eq("user_id", user.id)
            .eq("status", "verified")
            .maybeSingle();

          if (resident?.habitation_id) {
            // Check if this habitation has an active subscription (via owner)
            const { data: ownerResident } = await supabase
              .from("residents")
              .select("user_id")
              .eq("habitation_id", resident.habitation_id)
              .eq("is_owner", true)
              .eq("status", "verified")
              .maybeSingle();

            if (ownerResident?.user_id) {
              const { data: ownerSub } = await supabase
                .from("subscriptions")
                .select("status, plan_type")
                .eq("user_id", ownerResident.user_id)
                .eq("status", "active")
                .maybeSingle();

              if (ownerSub?.status === "active") {
                setHasActiveSubscription(true);
                setPlanType(ownerSub.plan_type || "particulier");
              }
            }
          }

          // Fallback: check if user has a pro company role
          if (!hasActiveSubscription) {
            const { data: companyRole } = await supabase
              .from("pro_company_roles")
              .select("company_id, pro_companies(plan_type)")
              .eq("user_id", user.id)
              .limit(1)
              .maybeSingle();

            if (companyRole?.pro_companies) {
              const company = companyRole.pro_companies as any;
              setPlanType(company.plan_type || "pro");
              setHasActiveSubscription(true);
            } else {
              setPlanType("particulier");
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user plan:", error);
        setPlanType("particulier");
        setHasActiveSubscription(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPlan();
  }, [user]);

  const limits = useMemo<PlanLimits>(() => {
    const baseConfig = PLAN_CONFIGS[planType] || PLAN_CONFIGS.particulier;
    
    // Override with app_config values if they exist for this plan
    const configMaxResidents = getConfig(`${planType}_members_included`);
    const configMaxEmployees = getConfig(`${planType}_max_employees`);
    const configCopilot = getConfig(`${planType}_copilot`);
    const configGeofencing = getConfig(`${planType}_geofencing_avance`);
    const configScheduling = getConfig(`${planType}_scheduling`);
    const configFacialRecognition = getConfig(`${planType}_facial_recognition`);

    return {
      ...DEFAULT_LIMITS,
      ...baseConfig,
      planType,
      hasActiveSubscription,
      maxResidents: configMaxResidents ?? baseConfig.maxResidents ?? DEFAULT_LIMITS.maxResidents,
      maxEmployees: configMaxEmployees ?? baseConfig.maxEmployees ?? DEFAULT_LIMITS.maxEmployees,
      copilotEnabled: configCopilot ?? baseConfig.copilotEnabled ?? DEFAULT_LIMITS.copilotEnabled,
      geofencingEnabled: configGeofencing ?? baseConfig.geofencingEnabled ?? DEFAULT_LIMITS.geofencingEnabled,
      schedulingEnabled: configScheduling ?? baseConfig.schedulingEnabled ?? DEFAULT_LIMITS.schedulingEnabled,
      facialRecognitionEnabled: configFacialRecognition ?? baseConfig.facialRecognitionEnabled ?? DEFAULT_LIMITS.facialRecognitionEnabled,
    };
  }, [planType, hasActiveSubscription, getConfig]);

  return { limits, loading, planType };
};
