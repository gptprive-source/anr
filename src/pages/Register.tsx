import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import RegisterForm from "@/components/auth/RegisterForm";
import RegisterProForm from "@/components/auth/RegisterProForm";
import VisitorFooter from "@/components/layout/VisitorFooter";
import { useAppConfig } from "@/hooks/useAppConfig";

type AccountType = "choice" | "particulier" | "entreprise";

const Register = () => {
  const [accountType, setAccountType] = useState<AccountType>("choice");
  const navigate = useNavigate();
  const { getConfig } = useAppConfig();
  
  const proPlanPrice = getConfig('pro_plan_price') || 29;

  if (accountType === "particulier") {
    return (
      <>
        <RegisterForm onBack={() => setAccountType("choice")} />
        <VisitorFooter />
      </>
    );
  }

  if (accountType === "entreprise") {
    return (
      <>
        <RegisterProForm onBack={() => setAccountType("choice")} />
        <VisitorFooter />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 pb-24">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Créer un compte ANR</h1>
            <p className="text-muted-foreground">
              Choisissez le type de compte que vous souhaitez créer
            </p>
          </div>

          <div className="space-y-4">
            {/* Particulier Card */}
            <Card 
              className="p-6 cursor-pointer hover:border-primary transition-colors group"
              onClick={() => setAccountType("particulier")}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <Home className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg mb-1 flex items-center gap-2">
                    Particulier
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    Pour les propriétaires et locataires souhaitant installer un interphone numérique à leur domicile.
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ 1 Doming gratuit pour nouvelle adresse</li>
                    <li>✓ Jusqu'à 7 résidents par habitation</li>
                    <li>✓ Appels vidéo avec les visiteurs</li>
                    <li>✓ Accès programmés (nounou, livreurs...)</li>
                  </ul>
                  <div className="mt-3 text-sm font-medium text-primary">
                    À partir de 12€/an
                  </div>
                </div>
              </div>
            </Card>

            {/* Entreprise Card */}
            <Card 
              className="p-6 cursor-pointer hover:border-primary transition-colors group border-2"
              onClick={() => setAccountType("entreprise")}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-500/20 text-blue-600">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      Entreprise / Collectivité
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h2>
                    <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-full">
                      PRO
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Pour les entreprises de services à domicile, aide à la personne, maintenance, collectivités...
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ Gestion des employés et missions</li>
                    <li>✓ Horodatage entrées/sorties automatique</li>
                    <li>✓ Signature client digitale</li>
                    <li>✓ Rapports et exports</li>
                    <li>✓ Géofencing et reconnaissance faciale</li>
                    <li>✓ Webhooks pour intégration RH/Paie</li>
                  </ul>
                  <div className="mt-3 text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    À partir de {proPlanPrice}€/mois
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
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