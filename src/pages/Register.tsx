import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Building, Building2, Landmark, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RegisterForm from "@/components/auth/RegisterForm";
import RegisterProForm from "@/components/auth/RegisterProForm";
import VisitorFooter from "@/components/layout/VisitorFooter";
import { useAppConfig } from "@/hooks/useAppConfig";

type AccountType = "choice" | "particulier" | "pro" | "entreprise" | "collectivites";

const PLAN_CONFIGS = [
  { 
    id: 'particulier', 
    name: 'Particulier', 
    icon: Home, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/50',
    priceFormat: 'annual',
    isPro: false,
  },
  { 
    id: 'pro', 
    name: 'Pro', 
    icon: Building, 
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/50',
    priceFormat: 'monthly',
    isPro: true,
  },
  { 
    id: 'entreprise', 
    name: 'Entreprise', 
    icon: Building2, 
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/50',
    priceFormat: 'monthly',
    isPro: true,
  },
  { 
    id: 'collectivites', 
    name: 'Collectivités', 
    icon: Landmark, 
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/50',
    priceFormat: 'monthly',
    isPro: true,
  },
];

const Register = () => {
  const [accountType, setAccountType] = useState<AccountType>("choice");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const navigate = useNavigate();
  const { getConfig } = useAppConfig();

  const getPrice = (planId: string) => {
    const annualPrice = getConfig(`${planId}_annual_price`);
    const plan = PLAN_CONFIGS.find(p => p.id === planId);
    
    if (plan?.priceFormat === 'annual') {
      return { value: annualPrice || 12, suffix: '€/an' };
    } else {
      const monthlyPrice = annualPrice ? Math.round(annualPrice / 12 * 100) / 100 : 29;
      return { value: monthlyPrice, suffix: '€/mois' };
    }
  };

  const getDescription = (planId: string) => {
    return getConfig(`${planId}_description`) || '';
  };

  const getFeatures = (planId: string): string[] => {
    const features = getConfig(`${planId}_features`);
    return Array.isArray(features) ? features : [];
  };

  // Handle account type selection
  const handlePlanSelect = (planId: string) => {
    if (planId === 'particulier') {
      setAccountType('particulier');
    } else {
      setSelectedPlan(planId);
      setAccountType('entreprise');
    }
  };

  if (accountType === "particulier") {
    return (
      <>
        <RegisterForm onBack={() => setAccountType("choice")} />
        <VisitorFooter />
      </>
    );
  }

  if (accountType === "entreprise" || accountType === "pro" || accountType === "collectivites") {
    return (
      <>
        <RegisterProForm onBack={() => setAccountType("choice")} initialPlan={selectedPlan || 'pro'} />
        <VisitorFooter />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 pb-24">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Créer un compte ANR</h1>
            <p className="text-muted-foreground">
              Choisissez l'offre qui correspond à vos besoins
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLAN_CONFIGS.map((plan) => {
              const PlanIcon = plan.icon;
              const price = getPrice(plan.id);
              const description = getDescription(plan.id);
              const features = getFeatures(plan.id);

              return (
                <Card 
                  key={plan.id}
                  className={`p-6 cursor-pointer hover:border-primary transition-all duration-200 group relative overflow-hidden ${plan.borderColor} hover:shadow-lg`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
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
                        {plan.isPro && (
                          <Badge className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs">
                            PRO
                          </Badge>
                        )}
                      </div>
                      
                      {description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {description}
                        </p>
                      )}
                      
                      {features.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                          {features.slice(0, 5).map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <Check className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                          {features.length > 5 && (
                            <li className="text-primary text-xs">+ {features.length - 5} autres avantages</li>
                          )}
                        </ul>
                      )}
                      
                      <div className={`text-sm font-medium ${plan.color}`}>
                        À partir de {price.value}{price.suffix}
                      </div>
                    </div>
                  </div>
                </Card>
              );
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
    </>
  );
};

export default Register;
