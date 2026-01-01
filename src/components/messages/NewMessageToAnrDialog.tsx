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
import { Send, Loader2, MapPin, Home, Search, AlertCircle, User, Users, ChevronRight, ArrowLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useResidentContacts } from "@/hooks/useResidentContacts";

interface NewMessageToAnrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Habitation {
  id: string;
  name: string;
  anr_address: string;
  owner_name?: string;
}

interface Resident {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_owner: boolean;
}

type Step = 'search' | 'select-habitation' | 'select-recipient';

const NewMessageToAnrDialog = ({ open, onOpenChange }: NewMessageToAnrDialogProps) => {
  const navigate = useNavigate();
  const { contacts } = useResidentContacts();
  const [step, setStep] = useState<Step>('search');
  const [anrCode, setAnrCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [habitations, setHabitations] = useState<Habitation[]>([]);
  const [selectedHabitation, setSelectedHabitation] = useState<Habitation | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('search');
      setAnrCode("");
      setHabitations([]);
      setSelectedHabitation(null);
      setResidents([]);
      setError(null);
    }
  }, [open]);

  // Filter contacts that have habitation_id (residents previously added)
  const contactsWithHabitation = contacts.filter(c => c.habitation_id && c.contact_user_id);

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

      // Fetch owner names for each habitation
      const habsWithOwners = await Promise.all(habs.map(async (h) => {
        // Get owner resident
        const { data: ownerResident } = await supabase
          .from("residents")
          .select("user_id")
          .eq("habitation_id", h.id)
          .eq("is_owner", true)
          .eq("status", "verified")
          .maybeSingle();

        let ownerName = "";
        if (ownerResident?.user_id) {
          // Try business card first
          const { data: bc } = await supabase
            .from("visitor_business_cards")
            .select("first_name, last_name")
            .eq("user_id", ownerResident.user_id)
            .maybeSingle();

          if (bc?.first_name || bc?.last_name) {
            ownerName = `${bc.first_name || ""} ${bc.last_name || ""}`.trim();
          } else {
            // Fallback to profile
            const { data: profile } = await supabase
              .from("profiles")
              .select("first_name, last_name")
              .eq("id", ownerResident.user_id)
              .maybeSingle();

            if (profile?.first_name || profile?.last_name) {
              ownerName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
            }
          }
        }

        return {
          id: h.id,
          name: h.name,
          anr_address: anr.address,
          owner_name: ownerName
        };
      }));

      setHabitations(habsWithOwners);

      // If only one habitation, auto-select it and move to recipient selection
      if (habsWithOwners.length === 1) {
        setSelectedHabitation(habsWithOwners[0]);
        await loadResidents(habsWithOwners[0].id);
        setStep('select-recipient');
      } else {
        setStep('select-habitation');
      }

    } catch (err: any) {
      console.error("Error searching ANR:", err);
      setError("Erreur lors de la recherche. Veuillez réessayer.");
    } finally {
      setSearching(false);
    }
  };

  const loadResidents = async (habitationId: string) => {
    setLoadingResidents(true);
    try {
      // Get residents for this habitation with their profile info
      const { data: residentsData, error: resError } = await supabase
        .from("residents")
        .select("id, user_id, is_owner")
        .eq("habitation_id", habitationId)
        .eq("status", "verified");

      if (resError) throw resError;

      if (residentsData && residentsData.length > 0) {
        // Fetch profile info for each resident
        const userIds = residentsData.map(r => r.user_id);
        
        // Get profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url")
          .in("id", userIds);

        // Get business cards for avatars (more complete info)
        const { data: businessCards } = await supabase
          .from("visitor_business_cards")
          .select("user_id, first_name, last_name, avatar_url, phone, email")
          .in("user_id", userIds);

        // Merge data
        const residentsWithInfo = residentsData.map(r => {
          const profile = profiles?.find(p => p.id === r.user_id);
          const businessCard = businessCards?.find(bc => bc.user_id === r.user_id);
          
          return {
            id: r.id,
            user_id: r.user_id,
            first_name: businessCard?.first_name || profile?.first_name || null,
            last_name: businessCard?.last_name || profile?.last_name || null,
            avatar_url: businessCard?.avatar_url || profile?.avatar_url || null,
            is_owner: r.is_owner,
          };
        });

        setResidents(residentsWithInfo);
      }
    } catch (err) {
      console.error("Error loading residents:", err);
    } finally {
      setLoadingResidents(false);
    }
  };

  const handleSelectHabitation = async (hab: Habitation) => {
    setSelectedHabitation(hab);
    await loadResidents(hab.id);
    setStep('select-recipient');
  };

  const handleGoToResidence = () => {
    if (selectedHabitation) {
      onOpenChange(false);
      navigate(`/visitor-conversation/${selectedHabitation.id}__residence`);
    }
  };

  const handleGoToResident = (resident: Resident) => {
    if (selectedHabitation) {
      onOpenChange(false);
      // Navigate to private conversation with this resident
      navigate(`/visitor-conversation/${selectedHabitation.id}__private_${resident.user_id}`);
    }
  };

  const handleContactClick = (contact: typeof contactsWithHabitation[0]) => {
    onOpenChange(false);
    navigate(`/visitor-conversation/${contact.habitation_id}__private_${contact.contact_user_id}`);
  };

  const handleBack = () => {
    if (step === 'select-recipient') {
      if (habitations.length > 1) {
        setStep('select-habitation');
      } else {
        setStep('search');
        setHabitations([]);
        setSelectedHabitation(null);
      }
    } else if (step === 'select-habitation') {
      setStep('search');
      setHabitations([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== 'search' && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 mr-1">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <Send className="w-5 h-5 text-primary" />
            Nouveau message
          </DialogTitle>
          <DialogDescription>
            {step === 'search' && "Entrez le code ANR ou choisissez un contact"}
            {step === 'select-habitation' && "Sélectionnez une habitation"}
            {step === 'select-recipient' && "Choisissez le destinataire"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Search ANR or select from contacts */}
          {step === 'search' && (
            <>
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

              {/* Saved contacts with habitation */}
              {contactsWithHabitation.length > 0 && (
                <div className="space-y-2 pt-2">
                  <Label className="text-sm text-muted-foreground">Ou choisissez un contact enregistré</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {contactsWithHabitation.map((contact) => (
                      <div
                        key={contact.id}
                        onClick={() => handleContactClick(contact)}
                        className="p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {contact.avatar_url && (
                              <AvatarImage src={contact.avatar_url} />
                            )}
                            <AvatarFallback className="bg-primary/10">
                              <User className="w-5 h-5 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {contact.first_name} {contact.last_name}
                            </p>
                            {contact.email && (
                              <p className="text-xs text-muted-foreground truncate">
                                {contact.email}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 2: Select habitation (if multiple) */}
          {step === 'select-habitation' && habitations.length > 0 && (
            <div className="space-y-2">
              {habitations.map((hab, index) => (
                <div
                  key={hab.id}
                  onClick={() => handleSelectHabitation(hab)}
                  className="p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {hab.owner_name || "Résident"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {hab.anr_address}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Select recipient (residence or specific resident) */}
          {step === 'select-recipient' && selectedHabitation && (
            <div className="space-y-3">
              {/* Option: Send to whole residence */}
              <div
                onClick={handleGoToResidence}
                className="p-4 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{selectedHabitation.owner_name || "Résident"}</p>
                    <p className="text-xs text-muted-foreground">
                      Message visible par tous les résidents
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {/* Divider */}
              {residents.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      ou message privé
                    </span>
                  </div>
                </div>
              )}

              {/* Loading residents */}
              {loadingResidents && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Individual residents */}
              {!loadingResidents && residents.length > 0 && (
                <div className="space-y-2">
                  {residents.map((resident) => (
                    <div
                      key={resident.id}
                      onClick={() => handleGoToResident(resident)}
                      className="p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {resident.avatar_url && (
                            <AvatarImage src={resident.avatar_url} />
                          )}
                          <AvatarFallback className="bg-green-500/10">
                            <User className="w-5 h-5 text-green-500" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {resident.first_name || resident.last_name 
                              ? `${resident.first_name || ""} ${resident.last_name || ""}`.trim()
                              : "Résident"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {resident.is_owner ? "Propriétaire" : "Résident"} • Message privé
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewMessageToAnrDialog;
