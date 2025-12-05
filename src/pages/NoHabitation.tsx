import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, UserPlus, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BottomNav from "@/components/layout/BottomNav";

const NoHabitation = () => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<"move" | "invite" | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-24">
      <div className="max-w-lg mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="pt-8 text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Home className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Votre compte est actif</h1>
          <p className="text-muted-foreground leading-relaxed">
            Bonne nouvelle : votre abonnement interphone est toujours valide ! 
            Il ne vous reste plus qu'à le rattacher à votre nouvelle adresse.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <Card 
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              selectedOption === "move" ? "border-primary ring-2 ring-primary/20" : ""
            }`}
            onClick={() => setSelectedOption("move")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">J'emménage quelque part</CardTitle>
                  <CardDescription>
                    Je connais ma nouvelle adresse
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Renseignez votre nouvelle adresse et scannez l'ANR sur place 
              pour activer votre interphone. Si aucun badge n'est installé, 
              nous vous en enverrons un gratuitement.
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              selectedOption === "invite" ? "border-primary ring-2 ring-primary/20" : ""
            }`}
            onClick={() => setSelectedOption("invite")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Je rejoins une habitation</CardTitle>
                  <CardDescription>
                    Quelqu'un m'a invité à son adresse
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Si vous partagez un logement avec quelqu'un qui utilise déjà ANR, 
              demandez-lui de vous envoyer une invitation depuis son application.
            </CardContent>
          </Card>
        </div>

        {/* Action Button */}
        {selectedOption && (
          <Button 
            className="w-full"
            size="lg"
            onClick={() => {
              if (selectedOption === "move") {
                navigate("/account", { state: { openAddressChange: true } });
              } else {
                // Just show info - user needs to wait for invitation email
                navigate("/account");
              }
            }}
          >
            {selectedOption === "move" ? "Renseigner mon adresse" : "Accéder à mon compte"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {/* Info footer */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          Votre abonnement reste actif et sera automatiquement lié 
          à votre prochaine habitation. Aucun paiement supplémentaire requis.
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default NoHabitation;
