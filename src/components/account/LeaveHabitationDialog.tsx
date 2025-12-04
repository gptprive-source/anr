import { useState } from "react";
import { LogOut, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LeaveHabitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitationName?: string;
  onLeft: () => void;
}

const LeaveHabitationDialog = ({
  open,
  onOpenChange,
  habitationName,
  onLeft,
}: LeaveHabitationDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLeave = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Remove user from current habitation
      const { error } = await supabase
        .from("residents")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Vous avez quitté l'habitation");
      onLeft();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error leaving habitation:", error);
      toast.error("Erreur lors de la sortie de l'habitation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-destructive" />
            Quitter l'habitation
          </DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir quitter cette habitation ?
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-destructive/10 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-destructive">Attention</p>
            <p className="text-muted-foreground mt-1">
              En quittant {habitationName || "cette habitation"}, vous ne recevrez plus les appels de l'interphone.
              Vous pourrez rejoindre une autre habitation depuis votre compte.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleLeave}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                En cours...
              </>
            ) : (
              "Quitter"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeaveHabitationDialog;
