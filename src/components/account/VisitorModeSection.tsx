import { useState } from "react";
import { User, CreditCard, MessageSquare, Plus, Trash2, Building2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVisitorBusinessCard } from "@/hooks/useVisitorBusinessCard";
import { useVisitorCustomTemplates, type VisitorCustomTemplate } from "@/hooks/useVisitorCustomTemplates";
import VisitorBusinessCardManager from "@/components/visitor/VisitorBusinessCardManager";
import SaveCustomTemplateDialog from "@/components/visitor/SaveCustomTemplateDialog";
import EditCustomTemplateDialog from "@/components/visitor/EditCustomTemplateDialog";
import { toast } from "sonner";
interface VisitorModeSectionProps {
  userProfile?: {
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
  } | null;
  userEmail?: string;
  className?: string;
}
const VisitorModeSection = ({
  userProfile,
  userEmail,
  className
}: VisitorModeSectionProps) => {
  const {
    card,
    loading: cardLoading,
    saveCard
  } = useVisitorBusinessCard();
  const {
    templates,
    loading: templatesLoading,
    saveTemplate,
    updateTemplate,
    deleteTemplate
  } = useVisitorCustomTemplates();
  const [showCardManager, setShowCardManager] = useState(false);
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<VisitorCustomTemplate | null>(null);

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
        avatar_url: null
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
  const handleUpdateTemplate = async (templateId: string, name: string, content: string, icon: string) => {
    try {
      await updateTemplate(templateId, name, content, icon);
      toast.success(`Template "${name}" mis à jour`);
    } catch {
      toast.error("Erreur lors de la mise à jour");
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
  return <div className={`bg-card rounded-2xl p-4 shadow-neumorphic space-y-4 ${className || ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">Mode visiteur</p>
          <p className="text-xs text-muted-foreground">Gérez vos infos quand vous visitez d'autres résidences</p>
        </div>
      </div>

      {/* Grid for Business Card and Templates side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Business Card */}
        <div className="rounded-xl p-3 space-y-2 shadow-neumorphic-sm bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <span className="text-sm font-medium text-foreground">Ma carte de visite</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleOpenCardManager} className="text-primary hover:text-primary">
              {card ? "Modifier" : "Créer"}
            </Button>
          </div>
          
          {cardLoading ? <p className="text-xs text-muted-foreground">Chargement...</p> : card ? <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {card.card_type === "company" ? <Building2 className="w-3.5 h-3.5 text-purple-500" /> : <User className="w-3.5 h-3.5 text-purple-500" />}
              <span>{getCardSummary()}</span>
              {card.email && <span>• {card.email}</span>}
              {card.phone && <span>• {card.phone}</span>}
            </div> : <p className="text-xs text-muted-foreground">
              Créez une carte pour vous présenter rapidement aux résidents
            </p>}
        </div>

        {/* Custom Templates */}
        <div className="rounded-xl p-3 space-y-2 shadow-neumorphic-sm bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <span className="text-sm font-medium text-foreground">Mes templates</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowNewTemplateDialog(true)} className="text-primary hover:text-primary">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {templatesLoading ? <p className="text-xs text-muted-foreground">Chargement...</p> : templates.length > 0 ? <div className="space-y-2">
              {templates.map(template => <div key={template.id} className="flex items-center justify-between p-2 rounded-xl bg-card shadow-neumorphic-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <span className="text-sm">{template.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{template.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">{template.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditingTemplate(template)}>
                      <Pencil className="w-3.5 h-3.5 text-amber-500" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteTemplate(template.id, template.name)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>)}
            </div> : <p className="text-xs text-muted-foreground">
              Créez des templates pour laisser des messages rapidement
            </p>}
        </div>
      </div>

      {/* Dialogs */}
      <VisitorBusinessCardManager open={showCardManager} onOpenChange={setShowCardManager} />

      <SaveCustomTemplateDialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog} messageContent="" onSave={handleSaveNewTemplate} />

      <EditCustomTemplateDialog open={!!editingTemplate} onOpenChange={open => !open && setEditingTemplate(null)} template={editingTemplate} onSave={handleUpdateTemplate} />
    </div>;
};
export default VisitorModeSection;