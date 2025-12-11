import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, Minus, Plus, CreditCard, Truck, QrCode, DoorOpen, Loader2, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAppConfig } from "@/hooks/useAppConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/layout/BottomNav";

const DOMING_PRICE_ID = "price_1SdGbkEDmI80OIpdI5a5sjf2"; // 7€
const DOOR_MODULE_PRICE_ID = "price_1SdGr2EDmI80OIpd91Jb96nN"; // 149€

const Shop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { flags, loading: flagsLoading } = useFeatureFlags();
  const { getConfig } = useAppConfig();
  
  const [domingQuantity, setDomingQuantity] = useState(1);
  const [doorModuleQuantity, setDoorModuleQuantity] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Shipping info
  const [shippingInfo, setShippingInfo] = useState({
    firstName: "",
    lastName: "",
    address: "",
    postalCode: "",
    city: "",
    phone: "",
  });

  const domingPrice = getConfig("doming_price") || 7;
  const doorModulePrice = 149;

  const domingTotal = domingQuantity * domingPrice;
  const doorModuleTotal = doorModuleQuantity * doorModulePrice;
  const totalAmount = domingTotal + doorModuleTotal;

  const canCheckout = (domingQuantity > 0 || doorModuleQuantity > 0) && 
    shippingInfo.firstName && 
    shippingInfo.lastName && 
    shippingInfo.address && 
    shippingInfo.postalCode && 
    shippingInfo.city;

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour commander");
      navigate("/login");
      return;
    }

    if (!canCheckout) {
      toast.error("Veuillez remplir toutes les informations de livraison");
      return;
    }

    setIsProcessing(true);

    try {
      const items = [];
      
      if (domingQuantity > 0) {
        items.push({
          priceId: DOMING_PRICE_ID,
          quantity: domingQuantity,
          name: "Doming QR/NFC"
        });
      }
      
      if (doorModuleQuantity > 0 && flags.doorOpeningEnabled) {
        items.push({
          priceId: DOOR_MODULE_PRICE_ID,
          quantity: doorModuleQuantity,
          name: "Boîtier Gâche Électrique"
        });
      }

      const { data, error } = await supabase.functions.invoke("create-shop-checkout", {
        body: {
          items,
          shippingInfo,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Erreur lors de la création de la commande");
    } finally {
      setIsProcessing(false);
    }
  };

  if (flagsLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Boutique ANR</h1>
            <p className="text-sm opacity-80">Commander du matériel</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Products */}
        <Card className="border-blue-500 border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Articles</CardTitle>
                <CardDescription>Sélectionnez vos produits</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Doming */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-orange-500">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <QrCode className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Doming QR/NFC</h3>
                  <p className="text-sm text-muted-foreground">Badge résine pour votre interphone</p>
                  <Badge variant="secondary" className="mt-1">{domingPrice}€ / unité</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDomingQuantity(Math.max(0, domingQuantity - 1))}
                  disabled={domingQuantity === 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-semibold">{domingQuantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDomingQuantity(domingQuantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Door Module - Only show if feature enabled */}
            {flags.doorOpeningEnabled && (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-purple-500">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <DoorOpen className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Boîtier Gâche Électrique</h3>
                    <p className="text-sm text-muted-foreground">Module ESP32 pour ouverture de porte</p>
                    <Badge variant="secondary" className="mt-1">{doorModulePrice}€ / unité</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDoorModuleQuantity(Math.max(0, doorModuleQuantity - 1))}
                    disabled={doorModuleQuantity === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold">{doorModuleQuantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDoorModuleQuantity(doorModuleQuantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shipping Info */}
        <Card className="border-green-500 border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Truck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Adresse de livraison</CardTitle>
                <CardDescription>Où souhaitez-vous recevoir votre commande ?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  value={shippingInfo.firstName}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, firstName: e.target.value })}
                  placeholder="Jean"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  value={shippingInfo.lastName}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, lastName: e.target.value })}
                  placeholder="Dupont"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Adresse *</Label>
              <Input
                id="address"
                value={shippingInfo.address}
                onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                placeholder="21 avenue des Champs-Élysées"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Code postal *</Label>
                <Input
                  id="postalCode"
                  value={shippingInfo.postalCode}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })}
                  placeholder="75008"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ville *</Label>
                <Input
                  id="city"
                  value={shippingInfo.city}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                  placeholder="Paris"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone (optionnel)</Label>
              <Input
                id="phone"
                type="tel"
                value={shippingInfo.phone}
                onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                placeholder="06 12 34 56 78"
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="border-pink-500 border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/10">
                <CreditCard className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Récapitulatif</CardTitle>
                <CardDescription>Vérifiez votre commande</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {domingQuantity > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Doming QR/NFC x{domingQuantity}</span>
                <span className="font-medium">{domingTotal}€</span>
              </div>
            )}
            
            {doorModuleQuantity > 0 && flags.doorOpeningEnabled && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Boîtier Gâche x{doorModuleQuantity}</span>
                <span className="font-medium">{doorModuleTotal}€</span>
              </div>
            )}

            {(domingQuantity > 0 || doorModuleQuantity > 0) && (
              <>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{totalAmount}€</span>
                </div>
              </>
            )}

            {domingQuantity === 0 && doorModuleQuantity === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Sélectionnez au moins un article
              </p>
            )}

            <Button
              className="w-full mt-4"
              size="lg"
              disabled={!canCheckout || isProcessing}
              onClick={handleCheckout}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création de la commande...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Payer {totalAmount > 0 ? `${totalAmount}€` : ""}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Paiement sécurisé par Stripe. Livraison sous 5-7 jours ouvrés.
            </p>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Shop;
