import { useState } from "react";
import { Mail, Loader2, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface InviteResidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitationId: string;
  habitationName: string;
  anrAddress: string;
  onInvitationSent: () => void;
}

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const InviteResidentDialog = ({
  open,
  onOpenChange,
  habitationId,
  habitationName,
  anrAddress,
  onInvitationSent,
}: InviteResidentDialogProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleInvite = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !user) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Email invalide",
        description: "Veuillez entrer une adresse email valide",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const code = generateCode();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create invitation in database with first_name and last_name
      const { error: inviteError } = await supabase
        .from("resident_invitations")
        .insert({
          habitation_id: habitationId,
          invited_by: user.id,
          email: email.toLowerCase().trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          code,
          expires_at: expiresAt.toISOString(),
        });

      if (inviteError) {
        if (inviteError.code === "23505") {
          throw new Error("Une invitation a déjà été envoyée à cet email");
        }
        throw inviteError;
      }

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke("send-invitation", {
        body: {
          email: email.toLowerCase().trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          habitationId,
          invitedBy: user.id,
          code,
          habitationName,
          anrAddress,
        },
      });

      if (emailError) {
        console.error("[InviteResident] Email error:", emailError);
        // Don't fail - invitation is created
      }

      toast({
        title: "Invitation envoyée !",
        description: `Un email a été envoyé à ${firstName} ${lastName}`,
      });
      onInvitationSent();
      handleClose();
    } catch (error: any) {
      console.error("[InviteResident] Error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un résident</DialogTitle>
          <DialogDescription>
            Entrez les informations de la personne à inviter
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="firstName"
                  placeholder="Prénom"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                placeholder="Nom"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Adresse email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="exemple@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Annuler
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!firstName.trim() || !lastName.trim() || !email.trim() || loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Inviter"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteResidentDialog;
