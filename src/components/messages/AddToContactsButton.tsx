import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useResidentContacts } from "@/hooks/useResidentContacts";
import { UserPlus, Check, Building2, User, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BusinessCard {
  id?: string;
  card_type: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  // New fields for visitor-added contacts
  contact_user_id?: string | null;
  habitation_id?: string | null;
}

interface AddToContactsButtonProps {
  businessCard: BusinessCard;
  messageId?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
}

export const AddToContactsButton = ({
  businessCard,
  messageId,
  variant = "outline",
  size = "sm",
  className,
}: AddToContactsButtonProps) => {
  const { toast } = useToast();
  const { addContact, checkIfExists } = useResidentContacts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const existingContact = checkIfExists(businessCard.email, businessCard.phone);

  const handleClick = () => {
    if (existingContact) {
      toast({
        title: "Contact existant",
        description: "Ce contact est déjà dans votre carnet",
      });
      return;
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await addContact(businessCard, notes, messageId);
      
      if (result.success) {
        toast({
          title: "Contact ajouté",
          description: "Le contact a été ajouté à votre carnet",
        });
        setDialogOpen(false);
        setNotes("");
      } else if (result.existing) {
        toast({
          title: "Contact existant",
          description: "Ce contact est déjà dans votre carnet",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le contact",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (existingContact) {
    return null;
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={handleClick} className={className}>
        <UserPlus className="w-4 h-4 mr-1" />
        {size !== "icon" && "Ajouter aux contacts"}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Ajouter aux contacts
            </DialogTitle>
          </DialogHeader>

          {/* Contact Preview */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                {businessCard.card_type === "company" ? (
                  <Building2 className="w-5 h-5 text-primary" />
                ) : (
                  <User className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1">
                {businessCard.card_type === "company" ? (
                  <>
                    <p className="font-medium">{businessCard.company_name}</p>
                    {businessCard.first_name && (
                      <p className="text-sm text-muted-foreground">
                        {businessCard.first_name} {businessCard.last_name}
                        {businessCard.job_title && ` - ${businessCard.job_title}`}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-medium">
                      {businessCard.first_name} {businessCard.last_name}
                    </p>
                    {businessCard.job_title && (
                      <p className="text-sm text-muted-foreground">{businessCard.job_title}</p>
                    )}
                  </>
                )}
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                  {businessCard.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" /> {businessCard.phone}
                    </span>
                  )}
                  {businessCard.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" /> {businessCard.email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes personnelles (optionnel)</Label>
            <Textarea
              id="notes"
              placeholder="Ajoutez des notes sur ce contact..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Ajout..." : "Ajouter le contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
