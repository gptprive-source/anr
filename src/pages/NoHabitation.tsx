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
          <div className="w-20 h-20 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center border-2 border-blue-500">
            <Home className="w-10 h-10 text-blue-500" />
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
            className={`cursor-pointer transition-all border-2 ${
              selectedOption === "move" 
                ? "border-blue-500 ring-2 ring-blue-500/20" 
                : "border-blue-500/50 hover:border-blue-500"
            }`}
            onClick={() => setSelectedOption("move")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-500" />
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
            className={`cursor-pointer transition-all border-2 ${
              selectedOption === "invite" 
                ? "border-orange-500 ring-2 ring-orange-500/20" 
                : "border-orange-500/50 hover:border-orange-500"
            }`}
            onClick={() => setSelectedOption("invite")}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-orange-500" />
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