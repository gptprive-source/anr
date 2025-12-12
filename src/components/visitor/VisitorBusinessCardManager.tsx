import { useState, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useVisitorBusinessCard, VisitorBusinessCard } from "@/hooks/useVisitorBusinessCard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { User, Building2, Loader2, Save, Trash2, CreditCard } from "lucide-react";
import AvatarUpload from "@/components/ui/AvatarUpload";

interface VisitorBusinessCardManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCardSaved?: () => void;
}

const VisitorBusinessCardManager = ({
  open,
  onOpenChange,
  onCardSaved,
}: VisitorBusinessCardManagerProps) => {
  const { card, saveCard, deleteCard, loading } = useVisitorBusinessCard();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userAnrCode, setUserAnrCode] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    card_type: "individual" as "individual" | "company",
    first_name: "",
    last_name: "",
    company_name: "",
    job_title: "",
    phone: "",
    email: "",
    visitor_anr_code: "",
    avatar_url: null as string | null,
  });

  // Fetch user's ANR code if authenticated
  useEffect(() => {
    const fetchUserAnr = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("residents")
        .select(`
          habitation:habitations (
            anr:anrs (code)
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "verified")
        .limit(1)
        .maybeSingle();
      
      if (data?.habitation) {
        const anrCode = (data.habitation as any)?.anr?.code;
        if (anrCode) {
          setUserAnrCode(anrCode);
        }
      }
    };
    
    fetchUserAnr();
  }, [user]);

  // Populate form when card loads or when userAnrCode is available
  useEffect(() => {
    if (card) {
      setFormData({
        card_type: card.card_type || "individual",
        first_name: card.first_name || "",
        last_name: card.last_name || "",
        company_name: card.company_name || "",
        job_title: card.job_title || "",
        phone: card.phone || "",
        email: card.email || "",
        visitor_anr_code: card.visitor_anr_code || userAnrCode || "",
        avatar_url: card.avatar_url || null,
      });
    } else if (userAnrCode && !formData.visitor_anr_code) {
      // Pre-fill ANR code for new cards
      setFormData(prev => ({ ...prev, visitor_anr_code: userAnrCode }));
    }
  }, [card, userAnrCode]);

  const handleSubmit = async () => {
    // Validation
    if (formData.card_type === "individual" && !formData.first_name && !formData.last_name) {
      toast({
        title: "Informations requises",
        description: "Veuillez saisir au moins votre prénom ou nom",
        variant: "destructive",
      });
      return;
    }
    if (formData.card_type === "company" && !formData.company_name) {
      toast({
        title: "Informations requises",
        description: "Veuillez saisir le nom de l'entreprise",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const result = await saveCard(formData);

    if (result.success) {
      toast({ title: "Carte de visite enregistrée" });
      onCardSaved?.();
      onOpenChange(false);
    } else {
      toast({
        title: "Erreur",
        description: result.error || "Impossible de sauvegarder",
        variant: "destructive",
      });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteCard();

    if (result.success) {
      toast({ title: "Carte de visite supprimée" });
      setFormData({
        card_type: "individual",
        first_name: "",
        last_name: "",
        company_name: "",
        job_title: "",
        phone: "",
        email: "",
        visitor_anr_code: "",
        avatar_url: null,
      });
    } else {
      toast({
        title: "Erreur",
        description: result.error || "Impossible de supprimer",
        variant: "destructive",
      });
    }
    setDeleting(false);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Ma carte de visite
          </DialogTitle>
          <DialogDescription>
            Créez votre carte pour la joindre à vos messages
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar upload */}
          <div className="flex justify-center">
            <AvatarUpload
              currentUrl={formData.avatar_url}
              onUpload={(url) => setFormData({ ...formData, avatar_url: url })}
              onRemove={() => setFormData({ ...formData, avatar_url: null })}
              fallbackText={formData.card_type === "company" ? formData.company_name : `${formData.first_name} ${formData.last_name}`}
              size="lg"
            />
          </div>

          {/* Type selection */}
          <div className="space-y-2">
            <Label>Type</Label>
            <RadioGroup
              value={formData.card_type}
              onValueChange={(v) => setFormData({ ...formData, card_type: v as "individual" | "company" })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual" className="flex items-center gap-1 cursor-pointer">
                  <User className="w-4 h-4" />
                  Particulier
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="company" id="company" />
                <Label htmlFor="company" className="flex items-center gap-1 cursor-pointer">
                  <Building2 className="w-4 h-4" />
                  Entreprise
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Individual fields */}
          {formData.card_type === "individual" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Jean"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Dupont"
                />
              </div>
            </div>
          )}

          {/* Company fields */}
          {formData.card_type === "company" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="company_name">Entreprise *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Amazon, La Poste..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_title">Fonction</Label>
                <Input
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="Livreur, Facteur..."
                />
              </div>
            </div>
          )}

          {/* Contact info */}
          <div className="space-y-3 pt-2 border-t">
            <div className="space-y-2">
              <Label htmlFor="card_phone">Téléphone</Label>
              <Input
                id="card_phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="06 12 34 56 78"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card_email">Email</Label>
              <Input
                id="card_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visitor_anr">Mon code ANR (optionnel)</Label>
              <Input
                id="visitor_anr"
                value={formData.visitor_anr_code}
                onChange={(e) => setFormData({ ...formData, visitor_anr_code: e.target.value })}
                placeholder="ABC123"
              />
              <p className="text-xs text-muted-foreground">
                Si vous avez votre propre ANR, le résident pourra vous appeler
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {card && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleting}
                className="text-destructive hover:text-destructive"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={saving} className="flex-1">
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {card ? "Mettre à jour" : "Créer ma carte"}
            </Button>
          </div>

          {/* RGPD notice */}
          <p className="text-xs text-muted-foreground text-center">
            Vos données sont conservées 1 an maximum et peuvent être supprimées à tout moment.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VisitorBusinessCardManager;
