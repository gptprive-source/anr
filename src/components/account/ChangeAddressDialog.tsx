import { useState } from "react";
import { MapPin, Home, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { geocodeAddress } from "@/lib/geocoding";

interface ChangeAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAddress?: string;
  onAddressChanged: () => void;
}

const ChangeAddressDialog = ({
  open,
  onOpenChange,
  currentAddress,
  onAddressChanged,
}: ChangeAddressDialogProps) => {
  const [step, setStep] = useState<"input" | "confirm" | "scan">("input");
  const [newAddress, setNewAddress] = useState("");
  const [habitationName, setHabitationName] = useState("");
  const [floor, setFloor] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [geocodedData, setGeocodedData] = useState<{
    latitude: number;
    longitude: number;
    displayName: string;
  } | null>(null);

  const handleAddressSubmit = async () => {
    if (!newAddress.trim()) {
      toast.error("Veuillez saisir une adresse");
      return;
    }

    setIsLoading(true);
    try {
      const result = await geocodeAddress(newAddress);
      if (!result) {
        toast.error("Adresse non trouvée. Veuillez vérifier et réessayer.");
        return;
      }
      setGeocodedData(result);
      setStep("confirm");
    } catch (error) {
      toast.error("Erreur lors de la vérification de l'adresse");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAddress = async () => {
    if (!geocodedData || !habitationName.trim()) {
      toast.error("Veuillez remplir le nom de l'habitation");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Check if ANR exists at this location (within ~100m)
      const { data: existingAnrs } = await supabase
        .from("anrs")
        .select("*")
        .gte("latitude", geocodedData.latitude - 0.001)
        .lte("latitude", geocodedData.latitude + 0.001)
        .gte("longitude", geocodedData.longitude - 0.001)
        .lte("longitude", geocodedData.longitude + 0.001);

      let anrId: string;
      let isNewAnr = false;

      if (existingAnrs && existingAnrs.length > 0) {
        // Use existing ANR
        anrId = existingAnrs[0].id;
        toast.info("ANR existante détectée à cette adresse");
      } else {
        // Create new ANR
        const anrCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data: newAnr, error: anrError } = await supabase
          .from("anrs")
          .insert({
            code: anrCode,
            address: geocodedData.displayName,
            latitude: geocodedData.latitude,
            longitude: geocodedData.longitude,
          })
          .select()
          .single();

        if (anrError) throw anrError;
        anrId = newAnr.id;
        isNewAnr = true;
      }

      // Remove user from current habitation
      await supabase
        .from("residents")
        .delete()
        .eq("user_id", user.id);

      // Create new habitation
      const { data: newHabitation, error: habError } = await supabase
        .from("habitations")
        .insert({
          anr_id: anrId,
          name: habitationName,
          floor: floor || null,
        })
        .select()
        .single();

      if (habError) throw habError;

      // Add user as owner of new habitation
      const { error: resError } = await supabase
        .from("residents")
        .insert({
          user_id: user.id,
          habitation_id: newHabitation.id,
          is_owner: true,
          status: "verified",
        });

      if (resError) throw resError;

      // If new ANR, create free Doming order
      if (isNewAnr) {
        await supabase.from("doming_orders").insert({
          user_id: user.id,
          anr_id: anrId,
          quantity: 1,
          unit_price: 0,
          total_price: 0,
          is_free: true,
          status: "pending",
          shipping_address: geocodedData.displayName,
        });
        toast.success("Nouvelle ANR créée ! Un Doming gratuit vous sera envoyé.");
      } else {
        toast.success("Adresse mise à jour avec succès !");
      }

      onAddressChanged();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error changing address:", error);
      toast.error("Erreur lors du changement d'adresse");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep("input");
    setNewAddress("");
    setHabitationName("");
    setFloor("");
    setGeocodedData(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Changer d'adresse
          </DialogTitle>
          <DialogDescription>
            {step === "input" && "Saisissez votre nouvelle adresse postale"}
            {step === "confirm" && "Confirmez les informations de votre habitation"}
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            {currentAddress && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Adresse actuelle</p>
                <p className="text-sm">{currentAddress}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newAddress">Nouvelle adresse</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newAddress"
                  placeholder="123 rue de la Paix, 75001 Paris"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              onClick={handleAddressSubmit}
              disabled={isLoading || !newAddress.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vérification...
                </>
              ) : (
                "Continuer"
              )}
            </Button>
          </div>
        )}

        {step === "confirm" && geocodedData && (
          <div className="space-y-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Adresse vérifiée</p>
              <p className="text-sm font-medium">{geocodedData.displayName}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="habitationName">Nom de l'habitation *</Label>
              <Input
                id="habitationName"
                placeholder="ex: Famille Dupont, Appt 3B..."
                value={habitationName}
                onChange={(e) => setHabitationName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="floor">Étage (optionnel)</Label>
              <Input
                id="floor"
                placeholder="ex: RDC, 2ème étage..."
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("input")}
                className="flex-1"
              >
                Retour
              </Button>
              <Button
                onClick={handleConfirmAddress}
                disabled={isLoading || !habitationName.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    En cours...
                  </>
                ) : (
                  "Confirmer"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ChangeAddressDialog;
