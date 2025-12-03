import { useState, useEffect } from "react";
import { Loader2, AlertTriangle, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Resident {
  user_id: string;
  is_owner: boolean;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

const DeleteAccountDialog = ({ open, onOpenChange, profile }: DeleteAccountDialogProps) => {
  const [step, setStep] = useState<"confirm" | "transfer">("confirm");
  const [confirmFirstName, setConfirmFirstName] = useState("");
  const [confirmLastName, setConfirmLastName] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [habitationId, setHabitationId] = useState<string | null>(null);
  const [otherResidents, setOtherResidents] = useState<Resident[]>([]);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (open && user) {
      checkOwnerStatus();
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setStep("confirm");
      setConfirmFirstName("");
      setConfirmLastName("");
      setSelectedNewOwner("");
    }
  }, [open]);

  const checkOwnerStatus = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Check if user is owner of any habitation
      const { data: residentData, error: residentError } = await supabase
        .from("residents")
        .select("habitation_id, is_owner")
        .eq("user_id", user.id)
        .eq("status", "verified")
        .eq("is_owner", true)
        .maybeSingle();

      if (residentError) throw residentError;

      if (residentData) {
        setIsOwner(true);
        setHabitationId(residentData.habitation_id);

        // Fetch other residents for this habitation
        const { data: residents, error: residentsError } = await supabase
          .from("residents")
          .select(`
            user_id,
            is_owner,
            profiles:user_id (
              first_name,
              last_name
            )
          `)
          .eq("habitation_id", residentData.habitation_id)
          .eq("status", "verified")
          .neq("user_id", user.id);

        if (residentsError) throw residentsError;
        setOtherResidents(residents as unknown as Resident[]);
      } else {
        setIsOwner(false);
        setHabitationId(null);
        setOtherResidents([]);
      }
    } catch (error) {
      console.error("Error checking owner status:", error);
    } finally {
      setLoading(false);
    }
  };

  const isNameMatch = () => {
    const expectedFirst = (profile?.first_name || "").toLowerCase().trim();
    const expectedLast = (profile?.last_name || "").toLowerCase().trim();
    const enteredFirst = confirmFirstName.toLowerCase().trim();
    const enteredLast = confirmLastName.toLowerCase().trim();
    
    return expectedFirst === enteredFirst && expectedLast === enteredLast;
  };

  const handleConfirmStep = () => {
    if (!isNameMatch()) {
      toast({
        title: "Nom incorrect",
        description: "Le prénom et le nom saisis ne correspondent pas à votre profil",
        variant: "destructive",
      });
      return;
    }

    // If owner with other residents, need to transfer ownership
    if (isOwner && otherResidents.length > 0) {
      setStep("transfer");
    } else {
      // Proceed with deletion directly
      handleDeleteAccount();
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: {
          targetUserId: user.id,
          requestingUserId: user.id,
          habitationId: habitationId,
          newOwnerId: selectedNewOwner || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Compte supprimé",
        description: "Votre compte a été supprimé définitivement",
      });
      
      onOpenChange(false);
      await signOut();
      navigate("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le compte",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Supprimer mon compte
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Votre compte sera définitivement supprimé.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : step === "confirm" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pour confirmer la suppression, veuillez saisir votre prénom et nom exactement comme ils apparaissent sur votre profil :
            </p>
            
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="font-semibold">
                {profile?.first_name} {profile?.last_name}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="confirmFirstName">Prénom</Label>
                <Input
                  id="confirmFirstName"
                  value={confirmFirstName}
                  onChange={(e) => setConfirmFirstName(e.target.value)}
                  placeholder="Saisissez votre prénom"
                />
              </div>
              <div>
                <Label htmlFor="confirmLastName">Nom</Label>
                <Input
                  id="confirmLastName"
                  value={confirmLastName}
                  onChange={(e) => setConfirmLastName(e.target.value)}
                  placeholder="Saisissez votre nom"
                />
              </div>
            </div>

            {isOwner && otherResidents.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  <strong>Attention :</strong> Vous êtes le propriétaire de cette résidence. 
                  Vous devrez désigner un nouveau propriétaire parmi les résidents avant de pouvoir supprimer votre compte.
                </p>
              </div>
            )}

            {isOwner && otherResidents.length === 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Vous êtes le seul résident de cette habitation. L'ANR restera rattachée à l'adresse après la suppression de votre compte.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <UserCheck className="w-5 h-5" />
              <p className="font-medium">Désigner le nouveau propriétaire</p>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Sélectionnez le résident qui deviendra le nouveau propriétaire de cette résidence. 
              Il sera notifié par email de ce transfert.
            </p>

            <Select value={selectedNewOwner} onValueChange={setSelectedNewOwner}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un résident" />
              </SelectTrigger>
              <SelectContent>
                {otherResidents.map((resident) => (
                  <SelectItem key={resident.user_id} value={resident.user_id}>
                    {resident.profiles?.first_name} {resident.profiles?.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          
          {step === "confirm" ? (
            <Button
              variant="destructive"
              onClick={handleConfirmStep}
              disabled={!confirmFirstName || !confirmLastName || deleting}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isOwner && otherResidents.length > 0 ? "Continuer" : "Supprimer définitivement"}
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={!selectedNewOwner || deleting}
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Supprimer et transférer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteAccountDialog;
