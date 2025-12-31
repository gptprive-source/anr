import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Building, Building2, Landmark, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RegisterForm from "@/components/auth/RegisterForm";
import RegisterProForm from "@/components/auth/RegisterProForm";
import VisitorFooter from "@/components/layout/VisitorFooter";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
type AccountType = "choice" | "particulier" | "pro" | "entreprise" | "collectivites";
const PLAN_CONFIGS = [{
  id: 'particulier',
  name: 'Particulier',
  icon: Home,
  color: 'text-blue-500',
  bgColor: 'bg-blue-500/10',
  borderColor: 'border-blue-500',
  priceFormat: 'annual',
  isPro: false
}, {
  id: 'pro',
  name: 'Pro',
  icon: Building,
  color: 'text-orange-500',
  bgColor: 'bg-orange-500/10',
  borderColor: 'border-orange-500',
  priceFormat: 'monthly',
  isPro: true
}, {
  id: 'entreprise',
  name: 'Entreprise',
  icon: Building2,
  color: 'text-yellow-500',
  bgColor: 'bg-yellow-500/10',
  borderColor: 'border-yellow-500',
  priceFormat: 'monthly',
  isPro: true
}, {
  id: 'collectivites',
  name: 'Collectivités',
  icon: Landmark,
  color: 'text-purple-500',
  bgColor: 'bg-purple-500/10',
  borderColor: 'border-purple-500',
  priceFormat: 'monthly',
  isPro: true
}];
const Register = () => {
  // Restore account type from localStorage if returning after email verification
  const [accountType, setAccountType] = useState<AccountType>(() => {
    const saved = localStorage.getItem("anr_register_account_type") as AccountType;
    return saved || "choice";
  });
  const [selectedPlan, setSelectedPlan] = useState<string | null>(() => {
    return localStorage.getItem("anr_register_selected_plan") || null;
  });
  const navigate = useNavigate();
  const {
    getConfig,
    isLoading: configLoading
  } = useAppConfig();
  const {
    flags,
    loading: flagsLoading
  } = useFeatureFlags();

  // Filter plans based on feature flags
  const enabledPlans = PLAN_CONFIGS.filter(plan => {
    if (plan.id === 'particulier') return flags.planParticulierEnabled;
    if (plan.id === 'pro') return flags.planProEnabled;
    if (plan.id === 'entreprise') return flags.planEntrepriseEnabled;
    if (plan.id === 'collectivites') return flags.planCollectivitesEnabled;
    return true;
  });
  const getPrice = (planId: string) => {
    const annualPrice = getConfig(`${planId}_annual_price`);
    // For particuliers, show annual price directly (36€/an)
    if (planId === 'particulier') {
      // Use nullish coalescing to only fallback if truly null/undefined
      const price = annualPrice ?? 36;
      return {
        value: price,
        isAnnual: true
      };
    }
    // For pro plans, show monthly price
    const price = annualPrice ?? 348; // Default pro annual price
    const monthlyPrice = Math.round(price / 12 * 100) / 100;
    return {
      value: monthlyPrice,
      isAnnual: false
    };
  };
  const getDescription = (planId: string) => {
    return getConfig(`${planId}_description`) || '';
  };
  const getFeatures = (planId: string): string[] => {
    const features = getConfig(`${planId}_features`);
    return Array.isArray(features) ? features : [];
  };
  const getMembersInfo = (planId: string) => {
    return {
      membersIncluded: getConfig(`${planId}_members_included`) || 0,
      maxExtraMembers: getConfig(`${planId}_max_extra_members`) || 0,
      extraMemberPrice: getConfig(`${planId}_extra_member_price`) || 0
    };
  };

  // Handle account type selection and persist to localStorage
  const handlePlanSelect = (planId: string) => {
    if (planId === 'particulier') {
      localStorage.setItem("anr_register_account_type", "particulier");
      setAccountType('particulier');
    } else {
      localStorage.setItem("anr_register_account_type", "entreprise");
      localStorage.setItem("anr_register_selected_plan", planId);
      setSelectedPlan(planId);
      setAccountType('entreprise');
    }
  };
  
  // Clear account type from localStorage when going back to choice
  const handleBackToChoice = () => {
    localStorage.removeItem("anr_register_account_type");
    localStorage.removeItem("anr_register_selected_plan");
    setAccountType("choice");
  };
  if (accountType === "particulier") {
    return <>
        <RegisterForm onBack={handleBackToChoice} />
        <VisitorFooter />
      </>;
  }
  if (accountType === "entreprise" || accountType === "pro" || accountType === "collectivites") {
    return <>
        <RegisterProForm onBack={handleBackToChoice} initialPlan={selectedPlan || 'pro'} />
        <VisitorFooter />
      </>;
  }
  if (flagsLoading || configLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }

  // If only one plan is enabled, go directly to that form
  if (enabledPlans.length === 1) {
    const onlyPlan = enabledPlans[0];
    if (onlyPlan.id === 'particulier') {
      return <>
          <RegisterForm onBack={() => navigate("/")} />
          <VisitorFooter />
        </>;
    } else {
      return <>
          <RegisterProForm onBack={() => navigate("/")} initialPlan={onlyPlan.id} />
          <VisitorFooter />
        </>;
    }
  }
  return <>
      <div className="min-h-screen flex items-center justify-center p-4 pb-24">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Créer un compte ANR</h1>
            <p className="text-muted-foreground">
              Choisissez l'offre qui correspond à vos besoins
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enabledPlans.map(plan => {
            const PlanIcon = plan.icon;
            const price = getPrice(plan.id);
            const description = getDescription(plan.id);
            const features = getFeatures(plan.id);
            const membersInfo = getMembersInfo(plan.id);
            return <Card key={plan.id} className={`p-6 cursor-pointer hover:border-primary transition-all duration-200 group relative overflow-hidden border ${plan.borderColor} hover:shadow-lg`} onClick={() => handlePlanSelect(plan.id)}>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${plan.bgColor}`}>
                      <PlanIcon className={`h-6 w-6 ${plan.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="font-semibold text-lg flex items-center gap-2">
                          {plan.name}
                          <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </h2>
                        {plan.isPro && <Badge className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs">
                            PRO
                          </Badge>}
                      </div>
                      
                      {description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {description}
                        </p>}
                      
                      {features.length > 0 && <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                          {features.slice(0, 5).map((feature, idx) => <li key={idx} className="flex items-start gap-1.5">
                              <Check className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                              <span>{feature}</span>
                            </li>)}
                          {features.length > 5 && <li className="text-primary text-xs">+ {features.length - 5} autres avantages</li>}
                        </ul>}

                      {(membersInfo.membersIncluded > 0 || membersInfo.maxExtraMembers > 0) && <div className="text-xs text-muted-foreground space-y-1 mb-3 border-t border-border/50 pt-3">
                          {membersInfo.membersIncluded > 0 && <div className="flex justify-between">
                              <span>Membres inclus</span>
                              <span className="font-medium text-foreground">{membersInfo.membersIncluded}</span>
                            </div>}
                          {membersInfo.maxExtraMembers > 0}
                          {membersInfo.extraMemberPrice > 0}
                        </div>}
                      
                      <div className={`text-sm font-medium ${plan.color}`}>
                        {price.value}€/{price.isAnnual ? 'an' : 'mois'}
                      </div>
                    </div>
                  </div>
                </Card>;
          })}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Déjà inscrit ?{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/login")}>
              Se connecter
            </Button>
          </p>
        </div>
      </div>
      <VisitorFooter />
    </>;
};
export default Register;