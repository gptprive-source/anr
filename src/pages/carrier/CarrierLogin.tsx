import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Truck, Key, LogIn, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const CarrierLogin = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!apiKey.trim()) {
      setError("Veuillez entrer votre clé API");
      return;
    }

    setIsLoading(true);

    try {
      // Verify API key by calling the carrier-api endpoint
      const response = await fetch(
        `https://mkzpdmyymabgsntwmmir.supabase.co/functions/v1/carrier-api/stats`,
        {
          method: "GET",
          headers: {
            "x-api-key": apiKey.trim(),
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Clé API invalide ou inactive");
        }
        throw new Error("Erreur de connexion");
      }

      // Store API key in sessionStorage
      sessionStorage.setItem("carrier_api_key", apiKey.trim());
      
      toast.success("Connexion réussie");
      navigate("/carrier/dashboard");
    } catch (error: any) {
      console.error("Erreur connexion transporteur:", error);
      setError(error.message || "Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6" />
            <h1 className="text-xl font-semibold">Espace Transporteur</h1>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-6 mt-8">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Key className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Connexion Transporteur</CardTitle>
            <CardDescription>
              Entrez votre clé API pour accéder à votre espace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Clé API</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Entrez votre clé API"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" disabled={isLoading} className="w-full gap-2">
                <LogIn className="w-4 h-4" />
                {isLoading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Vous n'avez pas encore de clé API ?
              </p>
              <Button 
                variant="outline" 
                onClick={() => navigate("/carrier/register")}
                className="w-full"
              >
                Demander un accès
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <h3 className="font-medium mb-2 text-sm">Vous êtes livreur ?</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Accédez à l'interface de scan pour enregistrer vos dépôts et livraisons.
            </p>
            <Button 
              variant="secondary" 
              onClick={() => navigate("/carrier/scan")}
              className="w-full"
            >
              Accéder au scanner livreur
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CarrierLogin;
