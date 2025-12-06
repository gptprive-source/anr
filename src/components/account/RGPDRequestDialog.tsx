import { useState } from "react";
import { FileText, Loader2, Send, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSupportChat } from "@/contexts/SupportChatContext";

interface RGPDRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REQUEST_TYPES = [
  {
    value: "access",
    label: "Droit d'accès",
    description: "Obtenir une copie de toutes vos données personnelles"
  },
  {
    value: "rectification",
    label: "Droit de rectification",
    description: "Corriger des données inexactes vous concernant"
  },
  {
    value: "erasure",
    label: "Droit à l'effacement",
    description: "Supprimer vos données personnelles"
  },
  {
    value: "portability",
    label: "Droit à la portabilité",
    description: "Récupérer vos données dans un format réutilisable"
  },
  {
    value: "restriction",
    label: "Droit à la limitation",
    description: "Limiter le traitement de vos données"
  },
  {
    value: "objection",
    label: "Droit d'opposition",
    description: "S'opposer au traitement de vos données"
  }
];

const RGPDRequestDialog = ({ open, onOpenChange }: RGPDRequestDialogProps) => {
  const [requestType, setRequestType] = useState<string>("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittingAI, setSubmittingAI] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { openWithRGPDRequest } = useSupportChat();

  const getTypeLabel = (value: string) => {
    return REQUEST_TYPES.find(t => t.value === value)?.label || value;
  };

  const insertRequest = async () => {
    if (!user) throw new Error("Utilisateur non connecté");
    
    const { data, error } = await supabase.from("rgpd_rights_requests").insert({
      user_id: user.id,
      user_email: user.email || "",
      request_type: requestType,
      request_details: details.trim() || null,
      status: "pending"
    }).select().single();

    if (error) throw error;
    return data;
  };

  const handleSubmit = async () => {
    if (!requestType || !user) return;

    setSubmitting(true);
    try {
      await insertRequest();

      toast({
        title: "Demande envoyée",
        description: "Votre demande RGPD a été enregistrée. Nous vous répondrons dans les 30 jours."
      });

      // Reset form
      setRequestType("");
      setDetails("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting RGPD request:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre demande. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessWithAI = async () => {
    if (!requestType || !user) return;

    setSubmittingAI(true);
    try {
      const request = await insertRequest();

      toast({
        title: "Demande enregistrée",
        description: "Ouverture de l'assistant IA pour traiter votre demande..."
      });

      // Reset form and close dialog
      setRequestType("");
      setDetails("");
      onOpenChange(false);

      // Open chat with RGPD context
      openWithRGPDRequest({
        requestId: request.id,
        type: requestType,
        typeLabel: getTypeLabel(requestType),
        details: details.trim()
      });
    } catch (error: any) {
      console.error("Error submitting RGPD request:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre demande. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setSubmittingAI(false);
    }
  };

  const isSubmitting = submitting || submittingAI;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Exercer mes droits RGPD
          </DialogTitle>
          <DialogDescription>
            Conformément au RGPD, vous pouvez exercer vos droits sur vos données personnelles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Type de demande *</Label>
            <RadioGroup value={requestType} onValueChange={setRequestType} className="space-y-3">
              {REQUEST_TYPES.map((type) => (
                <div
                  key={type.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    requestType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setRequestType(type.value)}
                >
                  <RadioGroupItem value={type.value} id={type.value} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={type.value} className="font-medium cursor-pointer">
                      {type.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {type.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details" className="text-sm font-medium">
              Précisions (optionnel)
            </Label>
            <Textarea
              id="details"
              placeholder="Décrivez votre demande plus en détail si nécessaire..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {details.length}/1000
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Information :</strong> Votre demande sera enregistrée et traitée conformément au RGPD.
              Vous recevrez une confirmation par email à l'adresse {user?.email}.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleProcessWithAI}
              disabled={!requestType || isSubmitting}
              className="w-full gap-2"
              variant="default"
            >
              {submittingAI ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Bot className="w-4 h-4" />
                  Traiter immédiatement avec l'IA
                </>
              )}
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={!requestType || isSubmitting}
              variant="outline"
              className="w-full gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer ma demande (traitement sous 30 jours)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RGPDRequestDialog;
