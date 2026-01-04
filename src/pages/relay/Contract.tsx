import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileSignature, Check, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useRelayPoint } from "@/hooks/useRelayPoint";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/layout/BottomNav";

const CONTRACT_SECTIONS = [
  {
    id: 'role',
    title: 'Article 1 - Rôle du Point Relais',
    content: `Le Point Relais s'engage à :
• Recevoir les colis déposés par les livreurs partenaires
• Conserver les colis en lieu sûr pendant une durée maximale de 14 jours
• Remettre les colis aux destinataires légitimes après vérification d'identité
• Utiliser exclusivement le système de preuve ANR (QR + NFC) pour chaque opération`
  },
  {
    id: 'responsibility',
    title: 'Article 2 - Limitation de responsabilité',
    content: `La responsabilité du Point Relais est limitée à la bonne exécution des opérations de dépôt et retrait. Le Point Relais n'est pas responsable :
• Du contenu des colis
• Des dommages antérieurs au dépôt
• Des retards de livraison par les transporteurs
• De la perte ou vol après remise au destinataire avec preuve valide`
  },
  {
    id: 'pricing',
    title: 'Article 3 - Tarification et rémunération',
    content: `Le Point Relais perçoit une rémunération de :
• 0,50 € par colis déposé (réception du livreur)
• 0,50 € par colis retiré (remise au destinataire)

Soit 1,00 € par colis traité de bout en bout.

Le paiement est effectué mensuellement par virement SEPA sur l'IBAN fourni, sous réserve que le montant minimum de 10 € soit atteint.`
  },
  {
    id: 'proof',
    title: 'Article 4 - Système de preuve ANR',
    content: `Chaque opération doit être validée via le système ANR :
• Scan QR obligatoire pour chaque dépôt et retrait
• Scan NFC obligatoire en mode hors-ligne
• Horodatage et géolocalisation automatiques
• Conservation des preuves pendant 5 ans

Toute opération non tracée ne sera pas rémunérée.`
  },
  {
    id: 'suspension',
    title: 'Article 5 - Suspension et résiliation',
    content: `ANR se réserve le droit de suspendre le Point Relais en cas de :
• Non-respect des procédures de preuve
• Plaintes répétées des destinataires
• Incapacité prolongée à assurer le service
• Fraude ou tentative de fraude

Le Point Relais peut mettre fin au contrat à tout moment avec un préavis de 15 jours, après remise de tous les colis en attente.`
  }
];

const Contract = () => {
  const navigate = useNavigate();
  const { relayPoint, updateRelayPoint, isUpdating } = useRelayPoint();
  
  const [acceptedSections, setAcceptedSections] = useState<Record<string, boolean>>({});
  const [signing, setSigning] = useState(false);

  // Check if relay point needs contract
  if (!relayPoint) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/relay')} className="text-primary-foreground hover:bg-primary/80">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Contrat Point Relais</h1>
          </div>
        </div>
        <div className="p-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3" />
                <p>Vous devez d'abord vous inscrire comme point relais.</p>
                <Button onClick={() => navigate('/relay/register')} className="mt-4">
                  S'inscrire
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Already signed
  if (relayPoint.contract_signed_at) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/relay')} className="text-primary-foreground hover:bg-primary/80">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Contrat Point Relais</h1>
          </div>
        </div>
        <div className="p-4">
          <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <Check className="w-12 h-12 mx-auto mb-3 text-green-600" />
                <h3 className="font-semibold text-green-800 dark:text-green-300">Contrat signé</h3>
                <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                  Vous avez signé le contrat le {new Date(relayPoint.contract_signed_at).toLocaleDateString('fr-FR')}.
                </p>
                <Button variant="outline" onClick={() => navigate('/relay')} className="mt-4">
                  Retour au tableau de bord
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  const allAccepted = CONTRACT_SECTIONS.every(section => acceptedSections[section.id]);

  const handleSign = async () => {
    if (!allAccepted) {
      toast.error('Veuillez accepter toutes les clauses du contrat');
      return;
    }

    setSigning(true);
    try {
      // Get signer info
      const userAgent = navigator.userAgent;
      
      // Create contract record
      const contractHtml = CONTRACT_SECTIONS.map(s => `<h3>${s.title}</h3><p>${s.content}</p>`).join('');
      
      const { error: contractError } = await supabase
        .from('relay_contracts')
        .insert({
          relay_point_id: relayPoint.id,
          contract_html: contractHtml,
          accepted_terms: acceptedSections,
          signer_user_agent: userAgent,
        });

      if (contractError) throw contractError;

      // Update relay point status
      await updateRelayPoint({
        contract_signed_at: new Date().toISOString(),
        status: 'contract_signed' as any,
      });

      toast.success('Contrat signé avec succès !');
      navigate('/relay/training');
    } catch (error: any) {
      console.error('Error signing contract:', error);
      toast.error(error.message || 'Erreur lors de la signature');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/relay')} className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Contrat Point Relais</h1>
            <p className="text-sm opacity-80">Signature électronique</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <FileSignature className="w-6 h-6 text-amber-600 mt-1" />
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-300">Contrat obligatoire</h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Veuillez lire attentivement chaque article et cocher les cases pour accepter les conditions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {CONTRACT_SECTIONS.map((section) => (
          <Card key={section.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32 rounded-md border p-3 bg-muted/30">
                <p className="text-sm whitespace-pre-line">{section.content}</p>
              </ScrollArea>
              <div className="flex items-center gap-2 mt-3">
                <Checkbox
                  id={section.id}
                  checked={acceptedSections[section.id] || false}
                  onCheckedChange={(checked) => 
                    setAcceptedSections(prev => ({ ...prev, [section.id]: checked === true }))
                  }
                />
                <Label htmlFor={section.id} className="text-sm cursor-pointer">
                  J'ai lu et j'accepte cet article
                </Label>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button 
          onClick={handleSign} 
          disabled={!allAccepted || signing}
          className="w-full"
          size="lg"
        >
          {signing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signature en cours...
            </>
          ) : (
            <>
              <FileSignature className="w-4 h-4 mr-2" />
              Signer le contrat
            </>
          )}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Contract;
