import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppConfig } from "@/hooks/useAppConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChangePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan?: string;
}

const ChangePlanDialog = ({ open, onOpenChange, currentPlan }: ChangePlanDialogProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const { getConfig } = useAppConfig();

  const plans = [
    {
      id: "particulier",
      name: "Particulier",
      price: getConfig("subscription_price") || 12,
      period: "/an",
      features: ["1 habitation", "Appels illimités", "Messages visiteurs"],
    },
    {
      id: "pro",
      name: "Pro",
      price: getConfig("pro_plan_price") || 29,
      period: "/mois",
      features: ["Jusqu'à 30 employés", "Planification avancée", "Rapports détaillés"],
    },
    {
      id: "entreprise",
      name: "Entreprise",
      price: getConfig("entreprise_plan_price") || 99,
      period: "/mois",
      features: ["Employés illimités", "Co-Pilot inclus", "Support prioritaire"],
    },
  ];

  const handleSelectPlan = async (planId: string) => {
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Changer d'abonnement</DialogTitle>
          <DialogDescription>
            Sélectionnez un plan puis gérez votre abonnement sur Stripe
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {plans.map((plan) => {
            const isCurrent = currentPlan?.toLowerCase().includes(plan.id);
            return (
              <div
                key={plan.id}
                className={`relative rounded-xl p-4 border-2 transition-all ${
                  isCurrent
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    Actuel
                  </div>
                )}
                
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{plan.price}€</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isCurrent ? "outline" : "default"}
                  className="w-full mt-4"
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
