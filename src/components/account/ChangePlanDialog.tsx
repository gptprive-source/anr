import { useState } from "react";
import { Check, Loader2, Home, Building, Building2, Landmark } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChangePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan?: string;
}

const PLAN_CONFIGS = [
  { 
    id: 'particulier', 
    name: 'Particulier', 
    icon: Home, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
    buttonColor: 'bg-blue-500 hover:bg-blue-600 text-white',
    flagKey: 'planParticulierEnabled',
  },
  { 
    id: 'pro', 
    name: 'Pro', 
    icon: Building, 
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500',
    buttonColor: 'bg-orange-500 hover:bg-orange-600 text-white',
    flagKey: 'planProEnabled',
  },
  { 
    id: 'entreprise', 
    name: 'Entreprise', 
    icon: Building2, 
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500',
    buttonColor: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    flagKey: 'planEntrepriseEnabled',
  },
  { 
    id: 'collectivites', 
    name: 'Collectivités', 
    icon: Landmark, 
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500',
    buttonColor: 'bg-purple-500 hover:bg-purple-600 text-white',
    flagKey: 'planCollectivitesEnabled',
  },
];

const ChangePlanDialog = ({ open, onOpenChange, currentPlan }: ChangePlanDialogProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { getConfig } = useAppConfig();
  const { flags } = useFeatureFlags();

  // Filter plans based on feature flags
  const enabledPlans = PLAN_CONFIGS.filter(plan => {
    return flags[plan.flagKey as keyof typeof flags] !== false;
  });

  const getPrice = (planId: string) => {
    const annualPrice = getConfig(`${planId}_annual_price`);
    // Use nullish coalescing - defaults for each plan type
    const defaultPrice = planId === 'particulier' ? 36 : 348;
    const price = annualPrice ?? defaultPrice;
    const monthlyPrice = Math.round(price / 12 * 100) / 100;
    return monthlyPrice;
  };

  const getFeatures = (planId: string): string[] => {
    const features = getConfig(`${planId}_features`);
    return Array.isArray(features) ? features.slice(0, 3) : [];
  };

  const handleSelectPlan = async (planId: string) => {
    const isCurrent = currentPlan?.toLowerCase().includes(planId);
    
    // Si c'est le plan actuel, ouvrir le portail de gestion
    if (isCurrent) {
      setLoading(planId);
      try {
        const { data, error } = await supabase.functions.invoke("customer-portal");
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        
        if (data?.url) {
          window.open(data.url, "_blank");
          onOpenChange(false);
        }
      } catch (error: any) {
        console.error("Error opening portal:", error);
        toast.error(error.message || "Impossible d'ouvrir le portail de gestion");
      } finally {
        setLoading(null);
      }
      return;
    }
    
    // Sinon, changer de plan via Stripe Checkout (paiement requis)
    setLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-plan-change", {
        body: { newPlan: planId }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      if (data?.sameplan) {
        toast.info("Vous êtes déjà sur ce plan");
        onOpenChange(false);
        return;
      }
      
      // Rediriger vers Stripe Checkout pour payer
      if (data?.url) {
        window.open(data.url, "_blank");
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("Error changing plan:", error);
      toast.error(error.message || "Impossible de changer de plan");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Changer d'abonnement</DialogTitle>
          <DialogDescription>
            Sélectionnez un plan puis gérez votre abonnement sur Stripe
          </DialogDescription>
        </DialogHeader>

        <div className={`grid grid-cols-1 md:grid-cols-${Math.min(enabledPlans.length, 4)} gap-4 mt-4`}>
          {enabledPlans.map((plan) => {
            const isCurrent = currentPlan?.toLowerCase().includes(plan.id);
            const price = getPrice(plan.id);
            const features = getFeatures(plan.id);
            const Icon = plan.icon;

            return (
              <div
                key={plan.id}
                className={`relative rounded-xl p-4 border-2 transition-all ${plan.borderColor} ${
                  isCurrent ? plan.bgColor : "bg-background/50"
                }`}
              >
                {isCurrent && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${plan.buttonColor} text-xs px-2 py-0.5 rounded-full`}>
                    Actuel
                  </div>
                )}
                
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-full ${plan.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${plan.color}`} />
                  </div>
                  <h3 className="font-semibold">{plan.name}</h3>
                </div>

                <div className="mb-3">
                  <span className="text-2xl font-bold">{price}€</span>
                  <span className="text-muted-foreground text-sm">/mois</span>
                </div>
                
                <ul className="space-y-1.5 mb-4">
                  {features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs">
                      <Check className={`w-3 h-3 mt-0.5 ${plan.color}`} />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${isCurrent ? 'bg-muted text-foreground hover:bg-muted/80' : plan.buttonColor}`}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loading !== null}
                >
                  {loading === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    "Gérer"
                  ) : (
                    "Choisir"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePlanDialog;
