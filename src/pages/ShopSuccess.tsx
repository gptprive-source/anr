import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2, Package, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/layout/BottomNav";

const ShopSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    
    if (!sessionId) {
      setStatus("error");
      setErrorMessage("Session de paiement non trouvée");
      return;
    }

    const verifyPayment = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-shop-payment", {
          body: { sessionId },
        });

        if (error) throw error;

        if (data?.success) {
          setStatus("success");
          setInvoiceNumber(data.invoiceNumber);
        } else {
          throw new Error(data?.error || "Échec de la vérification");
        }
      } catch (error: any) {
        console.error("Payment verification error:", error);
        setStatus("error");
        setErrorMessage(error.message || "Erreur lors de la vérification du paiement");
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <h1 className="text-lg font-semibold text-center">Confirmation de commande</h1>
      </div>

      <div className="max-w-lg mx-auto p-4 flex items-center justify-center min-h-[60vh]">
        {status === "loading" && (
          <Card className="border-blue-500 w-full">
            <CardContent className="p-8 text-center">
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Vérification en cours...</h2>
              <p className="text-muted-foreground">
                Nous vérifions votre paiement, veuillez patienter.
              </p>
            </CardContent>
          </Card>
        )}

        {status === "success" && (
          <Card className="border-green-500 w-full">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Commande confirmée !</h2>
              <p className="text-muted-foreground mb-4">
                Votre paiement a été accepté. Vous recevrez un email de confirmation avec votre facture.
              </p>
              {invoiceNumber && (
                <p className="text-sm font-mono bg-muted p-2 rounded mb-6">
                  N° Facture: {invoiceNumber}
                </p>
              )}
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate("/orders")} 
                  className="w-full bg-green-500 hover:bg-green-600"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Voir mes commandes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/dashboard")}
                  className="w-full"
                >
                  Retour au tableau de bord
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {status === "error" && (
          <Card className="border-red-500 w-full">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">Erreur</h2>
              <p className="text-muted-foreground mb-6">
                {errorMessage || "Une erreur est survenue lors de la vérification de votre paiement."}
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate("/shop")} 
                  className="w-full"
                >
                  Retourner à la boutique
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/dashboard")}
                  className="w-full"
                >
                  Retour au tableau de bord
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ShopSuccess;