import { useState } from "react";
import { User, CreditCard, MessageSquare, Plus, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVisitorBusinessCard } from "@/hooks/useVisitorBusinessCard";
import { useVisitorCustomTemplates } from "@/hooks/useVisitorCustomTemplates";
import VisitorBusinessCardManager from "@/components/visitor/VisitorBusinessCardManager";
import SaveCustomTemplateDialog from "@/components/visitor/SaveCustomTemplateDialog";
import { toast } from "sonner";

interface VisitorModeSectionProps {
  userProfile?: {
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
  } | null;
  userEmail?: string;
}

const VisitorModeSection = ({ userProfile, userEmail }: VisitorModeSectionProps) => {
  const { card, loading: cardLoading, saveCard } = useVisitorBusinessCard();
  const { templates, loading: templatesLoading, saveTemplate, deleteTemplate } = useVisitorCustomTemplates();
  const [showCardManager, setShowCardManager] = useState(false);
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);

  // Pre-fill business card with resident profile if empty
  const handleOpenCardManager = async () => {
    if (!card && userProfile) {
      // Auto-fill with resident profile data
      await saveCard({
        card_type: "individual",
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        phone: userProfile.phone_number,
        email: userEmail || null,
        company_name: null,
        job_title: null,
        visitor_anr_code: null,
      });
    }
    setShowCardManager(true);
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    try {
      await deleteTemplate(templateId);
      toast.success(`Template "${templateName}" supprimé`);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSaveNewTemplate = async (name: string, content: string, icon: string) => {
    try {
      await saveTemplate(name, content, icon);
      toast.success(`Template "${name}" créé`);
    } catch {
      toast.error("Erreur lors de la création");
    }
  };

  const getCardSummary = () => {
    if (!card) return "Non configurée";
    if (card.card_type === "company") {
      return card.company_name || "Entreprise";
    }
    const name = [card.first_name, card.last_name].filter(Boolean).join(" ");
    return name || "Particulier";
  };

  return (
    <div className="glass-effect rounded-2xl p-4 card-shadow space-y-4 border-2 border-indigo-500">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border-2 border-indigo-500">
          <User className="w-5 h-5 text-indigo-500" />
        </div>
        <div className="flex-1">
          <p className="font-medium">Mode visiteur</p>
          <p className="text-xs text-muted-foreground">Gérez vos infos quand vous visitez d'autres résidences</p>
        </div>
      </div>

      {/* Business Card */}
      <div className="border-2 border-purple-500 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center">
              <CreditCard className="w-3 h-3 text-purple-500" />
            </div>
            <span className="text-sm font-medium">Ma carte de visite</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleOpenCardManager}>
            {card ? "Modifier" : "Créer"}
          </Button>
        </div>
        
        {cardLoading ? (
          <p className="text-xs text-muted-foreground">Chargement...</p>
        ) : card ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {card.card_type === "company" ? (
              <Building2 className="w-3 h-3 text-purple-500" />
            ) : (
              <User className="w-3 h-3 text-purple-500" />
            )}
            <span>{getCardSummary()}</span>
            {card.email && <span>• {card.email}</span>}
            {card.phone && <span>• {card.phone}</span>}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Créez une carte pour vous présenter rapidement aux résidents
          </p>
        )}
      </div>

      {/* Custom Templates */}
      <div className="border-2 border-cyan-500 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <MessageSquare className="w-3 h-3 text-cyan-500" />
            </div>
            <span className="text-sm font-medium">Mes templates de messages</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowNewTemplateDialog(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {templatesLoading ? (
          <p className="text-xs text-muted-foreground">Chargement...</p>
        ) : templates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <Badge 
                key={template.id} 
                variant="secondary" 
                className="flex items-center gap-1 pr-1"
              >
                <span>{template.icon}</span>
                <span className="max-w-[100px] truncate">{template.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                  onClick={() => handleDeleteTemplate(template.id, template.name)}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Créez des templates pour laisser des messages rapidement
          </p>
        )}
      </div>

      {/* Dialogs */}
      <VisitorBusinessCardManager
        open={showCardManager}
        onOpenChange={setShowCardManager}
      />

      <SaveCustomTemplateDialog
        open={showNewTemplateDialog}
        onOpenChange={setShowNewTemplateDialog}
        messageContent=""
        onSave={handleSaveNewTemplate}
      />
    </div>
  );
};

export default VisitorModeSection;