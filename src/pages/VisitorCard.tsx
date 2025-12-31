import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CreditCard } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BusinessCardForm, { BusinessCardFormData } from "@/components/onboarding/BusinessCardForm";
import { useVisitorBusinessCard } from "@/hooks/useVisitorBusinessCard";
import { useVisitorCustomTemplates } from "@/hooks/useVisitorCustomTemplates";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import VisitorFooter from "@/components/layout/VisitorFooter";

const VisitorCard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { card, saveCard, loading: cardLoading } = useVisitorBusinessCard();
  const { templates: existingTemplates, saveTemplate, deleteTemplate } = useVisitorCustomTemplates();
  const [saving, setSaving] = useState(false);

  const redirectTo = searchParams.get("redirect") || "/visitor";

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/visitor-login?redirect=${encodeURIComponent(redirectTo)}`, { replace: true });
    }
  }, [authLoading, user, navigate, redirectTo]);

  // Check if already complete
  useEffect(() => {
    const checkComplete = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_card_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.business_card_completed) {
        navigate(redirectTo, { replace: true });
      }
    };

    if (!authLoading && user) {
      checkComplete();
    }
  }, [authLoading, user, navigate, redirectTo]);

  if (authLoading || cardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const initialData: Partial<BusinessCardFormData> = {
    avatar_url: card?.avatar_url || null,
    company_name: card?.company_name || "",
    first_name: card?.first_name || "",
    last_name: card?.last_name || "",
    email: user?.email || card?.email || "",
    phone: card?.phone || "",
    show_email: true,
    show_phone: true,
    anr_code: "",
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
        card_type: data.company_name ? "company" : "individual",
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
        description: "Vous pouvez maintenant contacter les résidents",
      });

      navigate(redirectTo, { replace: true });
    } catch (error: any) {
      console.error("[VisitorCard] Error:", error);
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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Votre carte de visite</CardTitle>
            <CardDescription>
              Présentez-vous aux résidents que vous souhaitez contacter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BusinessCardForm
              userType="visitor"
              initialData={initialData}
              onSubmit={handleSubmit}
              loading={saving}
              submitLabel="Continuer"
            />
          </CardContent>
        </Card>
      </div>
      <VisitorFooter />
    </div>
  );
};

export default VisitorCard;
