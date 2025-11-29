import { useState } from "react";
import { ArrowLeftRight, User, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Resident {
  id: string;
  user_id: string;
  is_owner: boolean;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface TransferCallDialogProps {
  residents: Resident[];
  onTransfer: (userId: string) => Promise<void>;
  disabled?: boolean;
}

const TransferCallDialog = ({ residents, onTransfer, disabled }: TransferCallDialogProps) => {
  const [open, setOpen] = useState(false);
  const [transferring, setTransferring] = useState<string | null>(null);

  const handleTransfer = async (userId: string) => {
    setTransferring(userId);
    try {
      await onTransfer(userId);
      setOpen(false);
    } catch (error) {
      console.error("Error transferring call:", error);
    } finally {
      setTransferring(null);
    }
  };

  const getResidentName = (resident: Resident) => {
    if (resident.profiles?.first_name || resident.profiles?.last_name) {
      return `${resident.profiles.first_name || ""} ${resident.profiles.last_name || ""}`.trim();
    }
    return "Résident";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon-lg" disabled={disabled || residents.length === 0}>
          <ArrowLeftRight className="w-6 h-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transférer l'appel</DialogTitle>
          <DialogDescription>
            Sélectionnez un résident pour lui transférer l'appel
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {residents.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucun autre résident disponible
            </p>
          ) : (
            residents.map((resident) => (
              <Button
                key={resident.id}
                variant="outline"
                className="w-full justify-start gap-3 h-14"
                onClick={() => handleTransfer(resident.user_id)}
                disabled={transferring !== null}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{getResidentName(resident)}</p>
                  <p className="text-xs text-muted-foreground">
                    {resident.is_owner ? "Propriétaire" : "Résident"}
                  </p>
                </div>
                {transferring === resident.user_id && (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransferCallDialog;
