import { useState } from "react";
import { Loader2, UserPlus, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const phoneSchema = z.string().regex(/^\+?[0-9]{10,15}$/, "Numéro de téléphone invalide");

interface AddResidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitationId: string;
  onResidentAdded: () => void;
}

const AddResidentDialog = ({ open, onOpenChange, habitationId, onResidentAdded }: AddResidentDialogProps) => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatPhone = (value: string) => {
    return value.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  };

  const handleSubmit = async () => {
    const formattedPhone = formatPhone(phone);
    const validation = phoneSchema.safeParse(formattedPhone);
    
    if (!validation.success) {
      toast({
        title: "Erreur",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Check if user exists with this phone number
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone_number", formattedPhone)
        .maybeSingle();

      if (!existingProfile) {
        // User doesn't exist yet - create invitation
        toast({
          title: "Invitation envoyée",
          description: "L'utilisateur devra créer un compte avec ce numéro pour rejoindre votre habitation.",
        });
        // TODO: Create pending resident record or send invite
        onOpenChange(false);
        setPhone("");
        return;
      }

      // Check if already a resident of this habitation
      const { data: existingResident } = await supabase
        .from("residents")
        .select("id")
        .eq("habitation_id", habitationId)
        .eq("user_id", existingProfile.id)
        .maybeSingle();

      if (existingResident) {
        toast({
          title: "Déjà résident",
          description: "Cette personne est déjà un résident de cette habitation.",
          variant: "destructive",
        });
        return;
      }

      // Add as pending resident (needs to verify their phone)
      const { error } = await supabase
        .from("residents")
        .insert({
          habitation_id: habitationId,
          user_id: existingProfile.id,
          is_owner: false,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Résident ajouté",
        description: "Le nouveau résident a été ajouté avec succès.",
      });

      onResidentAdded();
      onOpenChange(false);
      setPhone("");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le résident",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Ajouter un résident
          </DialogTitle>
          <DialogDescription>
            Entrez le numéro de téléphone de la personne à ajouter comme résident. Elle recevra les appels de l'interphone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50">
            <Phone className="w-5 h-5 text-muted-foreground" />
            <Input
              type="tel"
              placeholder="+33 6 12 34 56 78"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border-0 bg-transparent p-0 focus-visible:ring-0"
              disabled={loading}
            />
          </div>
          
          <p className="text-xs text-muted-foreground">
            Maximum 5 résidents par habitation. Chaque résident doit vérifier son numéro.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!phone.trim() || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddResidentDialog;
