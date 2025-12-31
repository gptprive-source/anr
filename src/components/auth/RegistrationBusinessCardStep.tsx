import { useState, useEffect } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import BusinessCardForm, { BusinessCardFormData } from "@/components/onboarding/BusinessCardForm";
import { useVisitorBusinessCard } from "@/hooks/useVisitorBusinessCard";
import { useVisitorCustomTemplates } from "@/hooks/useVisitorCustomTemplates";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RegistrationBusinessCardStepProps {
  userType: "particulier" | "professionnel";
  companyName?: string;
  anrCode?: string;
  onComplete: () => void;
}

const RegistrationBusinessCardStep = ({
  userType,
  companyName,
  anrCode,
  onComplete,
}: RegistrationBusinessCardStepProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { card, saveCard, loading: cardLoading } = useVisitorBusinessCard();
  const { templates: existingTemplates, saveTemplate, deleteTemplate } = useVisitorCustomTemplates();
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{ first_name?: string; last_name?: string; email?: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfileLoading(false);
        return;
      }
      
      try {
        const { data } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", user.id)
          .maybeSingle();
        
        setProfile({
          first_name: data?.first_name || "",
          last_name: data?.last_name || "",
          email: user.email || "",
        });
      } catch (error) {
        console.error("[RegistrationBusinessCardStep] Error fetching profile:", error);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (cardLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const initialData: Partial<BusinessCardFormData> = {
    avatar_url: card?.avatar_url || null,
    company_name: userType === "professionnel" ? (companyName || card?.company_name || "") : "",
    first_name: profile?.first_name || card?.first_name || "",
    last_name: profile?.last_name || card?.last_name || "",
    email: profile?.email || card?.email || "",
    phone: card?.phone || "",
    show_email: true,
    show_phone: true,
    anr_code: anrCode || "",
    templates: existingTemplates.map((t) => ({
      id: t.id,
      title: t.name,
      message: t.content,
    })),
  };

  const handleSubmit = async (data: BusinessCardFormData) => {
    setSaving(true);

    try {
      // Save business card
      const cardResult = await saveCard({
        card_type: userType === "professionnel" ? "company" : "individual",
        first_name: data.first_name,
        last_name: data.last_name,
        company_name: userType === "professionnel" ? data.company_name : null,
        job_title: null,
        phone: data.phone || null,
        email: data.email || null,
        avatar_url: data.avatar_url,
        show_email: data.show_email,
        show_phone: data.show_phone,
        anr_code: data.anr_code || null,
      });

      if (!cardResult.success) {
        throw new Error(cardResult.error || "Erreur lors de la sauvegarde");
      }

      // Sync templates
      const existingIds = new Set(existingTemplates.map((t) => t.id));
      const newTemplateIds = new Set(data.templates.map((t) => t.id));

      for (const template of existingTemplates) {
        if (!newTemplateIds.has(template.id)) {
          await deleteTemplate(template.id);
        }
      }

      for (const template of data.templates) {
        if (!template.title && !template.message) continue;
        
        if (!existingIds.has(template.id)) {
          await saveTemplate(template.title, template.message, "📝");
        } else {
          await supabase
            .from("visitor_custom_templates")
            .update({
              name: template.title,
              content: template.message,
              updated_at: new Date().toISOString(),
            })
            .eq("id", template.id);
        }
      }

      // Mark as complete
      if (user) {
        await supabase
          .from("profiles")
          .update({ business_card_completed: true })
          .eq("id", user.id);
      }

      toast({
        title: "Carte de visite créée",
        description: "Bienvenue sur ANR !",
      });

      onComplete();
    } catch (error: any) {
      console.error("[RegistrationBusinessCardStep] Error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Votre carte de visite</h2>
        <p className="text-muted-foreground">
          Ces informations seront visibles par vos visiteurs
        </p>
      </div>

      <BusinessCardForm
        userType={userType}
        initialData={initialData}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel="Terminer l'inscription"
      />
    </div>
  );
};

export default RegistrationBusinessCardStep;
