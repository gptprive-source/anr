import { useState } from "react";
import { Loader2, Phone, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ChangePhoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPhone?: string;
  onPhoneChanged?: () => void;
}

const ChangePhoneDialog = ({ open, onOpenChange, currentPhone, onPhoneChanged }: ChangePhoneDialogProps) => {
  const [newPhone, setNewPhone] = useState("");
  const [confirmPhone, setConfirmPhone] = useState("");
  const [showNewPhone, setShowNewPhone] = useState(false);
  const [showConfirmPhone, setShowConfirmPhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleChangePhone = async () => {
    if (!newPhone.trim()) {
      toast.error("Veuillez entrer un numéro de téléphone");
      return;
    }

    if (newPhone !== confirmPhone) {
      toast.error("Les numéros ne correspondent pas");
      return;
    }

    if (newPhone === currentPhone) {
      toast.error("Le nouveau numéro doit être différent");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ phone_number: newPhone.trim() })
        .eq("id", user?.id);

      if (error) throw error;

      toast.success("Numéro de téléphone mis à jour");
      onOpenChange(false);
      setNewPhone("");
      setConfirmPhone("");
      onPhoneChanged?.();
    } catch (error: any) {
      console.error("Error changing phone:", error);
      toast.error(error.message || "Impossible de changer le numéro");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setNewPhone("");
      setConfirmPhone("");
      setShowNewPhone(false);
      setShowConfirmPhone(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer de numéro de téléphone</DialogTitle>
          <DialogDescription>
            Entrez votre nouveau numéro deux fois pour confirmer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Numéro actuel</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{currentPhone || "Non renseigné"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPhone">Nouveau numéro</Label>
            <div className="relative">
              <Input
                id="newPhone"
                type={showNewPhone ? "text" : "tel"}
                placeholder="+33 6 12 34 56 78"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPhone(!showNewPhone)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPhone ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPhone">Confirmer le nouveau numéro</Label>
            <div className="relative">
              <Input
                id="confirmPhone"
                type={showConfirmPhone ? "text" : "tel"}
                placeholder="+33 6 12 34 56 78"
                value={confirmPhone}
                onChange={(e) => setConfirmPhone(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPhone(!showConfirmPhone)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPhone ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPhone && newPhone !== confirmPhone && (
              <p className="text-xs text-destructive">Les numéros ne correspondent pas</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleChangePhone} 
            disabled={loading || !newPhone.trim() || newPhone !== confirmPhone}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Confirmer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePhoneDialog;
