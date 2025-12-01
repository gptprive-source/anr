import { useState } from "react";
import { Mail, Loader2, Copy, Check } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleInvite = async () => {
    if (!email.trim() || !user) return;

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

      // Create invitation in database
      const { error: inviteError } = await supabase
        .from("resident_invitations")
        .insert({
          habitation_id: habitationId,
          invited_by: user.id,
          email: email.toLowerCase().trim(),
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
          habitationId,
          invitedBy: user.id,
          code,
          habitationName,
          anrAddress,
        },
      });

      if (emailError) {
        console.error("[InviteResident] Email error:", emailError);
        // Don't fail - invitation is created, user can share the code manually
      }

      setInvitationCode(code);
      toast({
        title: "Invitation créée !",
        description: "Partagez le code avec votre invité",
      });
      onInvitationSent();
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

  const copyCode = () => {
    if (invitationCode) {
      const invitationUrl = `${window.location.origin}/invitation?code=${invitationCode}`;
      navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setEmail("");
    setInvitationCode(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un résident</DialogTitle>
          <DialogDescription>
            {invitationCode
              ? "Partagez ce lien d'invitation (valide 24h)"
              : "Entrez l'email de la personne à inviter"}
          </DialogDescription>
        </DialogHeader>

        {!invitationCode ? (
          <div className="space-y-4 py-4">
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
                disabled={!email.trim() || loading}
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
        ) : (
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">Code d'invitation :</p>
              <p className="text-2xl font-mono font-bold text-primary tracking-wider text-center">
                {invitationCode}
              </p>
            </div>

            <Button onClick={copyCode} variant="outline" className="w-full">
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-success" />
                  Lien copié !
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copier le lien d'invitation
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              L'invité recevra un email avec le lien. Vous pouvez aussi lui partager
              directement le lien copié.
            </p>

            <Button onClick={handleClose} className="w-full">
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteResidentDialog;
