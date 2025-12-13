import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, MapPin, Home, Search, AlertCircle } from "lucide-react";

interface NewMessageToAnrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Habitation {
  id: string;
  name: string;
  anr_address: string;
}

const NewMessageToAnrDialog = ({ open, onOpenChange }: NewMessageToAnrDialogProps) => {
  const navigate = useNavigate();
  const [anrCode, setAnrCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [habitations, setHabitations] = useState<Habitation[]>([]);
  const [selectedHabitation, setSelectedHabitation] = useState<Habitation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setAnrCode("");
      setHabitations([]);
      setSelectedHabitation(null);
      setError(null);
    }
  }, [open]);

  const handleSearch = async () => {
    if (!anrCode.trim()) {
      setError("Veuillez entrer un code ANR");
      return;
    }

    setSearching(true);
    setError(null);
    setHabitations([]);

    try {
      // Find the ANR by code
      const { data: anr, error: anrError } = await supabase
        .from("anrs")
        .select("id, code, address")
        .eq("code", anrCode.trim().toUpperCase())
        .maybeSingle();

      if (anrError) throw anrError;

      if (!anr) {
        setError("Code ANR introuvable. Vérifiez le code et réessayez.");
        setSearching(false);
        return;
      }

      // Get habitations for this ANR
      const { data: habs, error: habError } = await supabase
        .from("habitations")
        .select("id, name")
        .eq("anr_id", anr.id);

      if (habError) throw habError;

      if (!habs || habs.length === 0) {
        setError("Aucune habitation trouvée pour ce code ANR.");
        setSearching(false);
        return;
      }

      // Map habitations with ANR address
      const habsWithAddress = habs.map(h => ({
        id: h.id,
        name: h.name,
        anr_address: anr.address
      }));

      setHabitations(habsWithAddress);

      // If only one habitation, auto-select it
      if (habsWithAddress.length === 1) {
        setSelectedHabitation(habsWithAddress[0]);
      }

    } catch (err: any) {
      console.error("Error searching ANR:", err);
      setError("Erreur lors de la recherche. Veuillez réessayer.");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectHabitation = (hab: Habitation) => {
    setSelectedHabitation(hab);
  };

  const handleGoToConversation = () => {
    if (selectedHabitation) {
      onOpenChange(false);
      navigate(`/conversation-sent/${selectedHabitation.id}`);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Nouveau message
            </DialogTitle>
            <DialogDescription>
              Entrez le code ANR du destinataire pour envoyer un message
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* ANR Code input */}
            <div className="space-y-2">
              <Label htmlFor="anr-code">Code ANR</Label>
              <div className="flex gap-2">
                <Input
                  id="anr-code"
                  value={anrCode}
                  onChange={(e) => setAnrCode(e.target.value.toUpperCase())}
                  placeholder="Ex: ABC123"
                  className="uppercase"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching || !anrCode.trim()}>
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Habitations list */}
            {habitations.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  {habitations.length > 1 ? "Sélectionnez une habitation" : "Habitation trouvée"}
                </Label>
                <div className="space-y-2">
                  {habitations.map((hab) => (
                    <div
                      key={hab.id}
                      onClick={() => handleSelectHabitation(hab)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedHabitation?.id === hab.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Home className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{hab.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {hab.anr_address}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Send button */}
            {selectedHabitation && (
              <Button onClick={handleGoToConversation} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                Écrire à {selectedHabitation.name}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NewMessageToAnrDialog;
