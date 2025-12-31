import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BusinessCardForm, { BusinessCardFormData } from "@/components/onboarding/BusinessCardForm";
import { useBusinessCardRequired } from "@/hooks/useBusinessCardRequired";
import { useVisitorBusinessCard } from "@/hooks/useVisitorBusinessCard";
import { useVisitorCustomTemplates } from "@/hooks/useVisitorCustomTemplates";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { MessageTemplate } from "@/components/onboarding/MessageTemplatesEditor";

const OnboardingBusinessCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    isComplete,
    isLoading: checkingComplete,
    userType,
    profile,
    companyName,
    anrCode,
    markAsComplete,
  } = useBusinessCardRequired();
  
  const { card, saveCard } = useVisitorBusinessCard();
  const { templates: existingTemplates, saveTemplate, deleteTemplate } = useVisitorCustomTemplates();
  const [saving, setSaving] = useState(false);

  // Redirect if already complete
  useEffect(() => {
    if (!checkingComplete && isComplete) {
      const destination = userType === "professionnel" ? "/pro" : "/dashboard";
      navigate(destination, { replace: true });
    }
  }, [checkingComplete, isComplete, userType, navigate]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!checkingComplete && !user) {
      navigate("/login", { replace: true });
    }
  }, [checkingComplete, user, navigate]);

  if (checkingComplete || !userType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Build initial data from profile and existing card
  const initialData: Partial<BusinessCardFormData> = {
    avatar_url: card?.avatar_url || null,
    company_name: companyName || card?.company_name || "",
    first_name: profile?.first_name || card?.first_name || "",
    last_name: profile?.last_name || card?.last_name || "",
    email: user?.email || card?.email || "",
    phone: profile?.phone_number || card?.phone || "",
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
        company_name: data.company_name || null,
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

      // Sync templates - delete removed, update existing, add new
      const existingIds = new Set(existingTemplates.map((t) => t.id));
      const newTemplateIds = new Set(data.templates.map((t) => t.id));

      // Delete removed templates
      for (const template of existingTemplates) {
        if (!newTemplateIds.has(template.id)) {
          await deleteTemplate(template.id);
        }
      }

      // Add/update templates
      for (const template of data.templates) {
        if (!template.title && !template.message) continue;
        
        if (!existingIds.has(template.id)) {
          await saveTemplate(template.title, template.message, "📝");
        } else {
          // Update existing via direct call
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
      const success = await markAsComplete();
      if (!success) {
        throw new Error("Erreur lors de la finalisation");
      }

      toast({
        title: "Carte de visite créée",
        description: "Vous pouvez maintenant utiliser l'application",
      });

      // Navigate to appropriate dashboard
      const destination = userType === "professionnel" ? "/pro" : "/dashboard";
      navigate(destination, { replace: true });
    } catch (error: any) {
      console.error("[OnboardingBusinessCard] Error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getTitle = () => {
    switch (userType) {
      case "professionnel":
        return "Carte de visite professionnelle";
      case "particulier":
        return "Votre carte de visite";
      default:
        return "Créez votre carte de visite";
    }
  };

  const getDescription = () => {
    switch (userType) {
      case "professionnel":
        return "Ces informations seront visibles par les résidents que vous contactez";
      case "particulier":
        return "Présentez-vous aux personnes que vous visitez";
      default:
        return "Remplissez vos informations pour utiliser l'application";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessCardForm
            userType={userType === "visitor" ? "visitor" : userType}
            initialData={initialData}
            onSubmit={handleSubmit}
            loading={saving}
            submitLabel="Continuer"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingBusinessCard;
