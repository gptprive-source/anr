import { useState } from "react";
import { Loader2, Mail, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChangeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail?: string;
}

const ChangeEmailDialog = ({ open, onOpenChange, currentEmail }: ChangeEmailDialogProps) => {
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [showNewEmail, setShowNewEmail] = useState(false);
  const [showConfirmEmail, setShowConfirmEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      toast.error("Veuillez entrer un email");
      return;
    }

    if (newEmail !== confirmEmail) {
      toast.error("Les emails ne correspondent pas");
      return;
    }

    if (newEmail === currentEmail) {
      toast.error("Le nouvel email doit être différent");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });

      if (error) throw error;

      toast.success("Un email de confirmation a été envoyé à votre nouvelle adresse");
      onOpenChange(false);
      setNewEmail("");
      setConfirmEmail("");
    } catch (error: any) {
      console.error("Error changing email:", error);
      toast.error(error.message || "Impossible de changer l'email");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setNewEmail("");
      setConfirmEmail("");
      setShowNewEmail(false);
      setShowConfirmEmail(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer d'email</DialogTitle>
          <DialogDescription>
            Un email de confirmation sera envoyé à votre nouvelle adresse
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Email actuel</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{currentEmail}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newEmail">Nouvel email</Label>
            <div className="relative">
              <Input
                id="newEmail"
                type={showNewEmail ? "text" : "email"}
                placeholder="nouveau@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewEmail(!showNewEmail)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewEmail ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmEmail">Confirmer le nouvel email</Label>
            <div className="relative">
              <Input
                id="confirmEmail"
                type={showConfirmEmail ? "text" : "email"}
                placeholder="nouveau@email.com"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmEmail(!showConfirmEmail)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmEmail ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmEmail && newEmail !== confirmEmail && (
              <p className="text-xs text-destructive">Les emails ne correspondent pas</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleChangeEmail} 
            disabled={loading || !newEmail.trim() || newEmail !== confirmEmail}
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

export default ChangeEmailDialog;
