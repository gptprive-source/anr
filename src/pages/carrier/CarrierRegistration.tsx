import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Truck, Building2, Mail, Phone, MapPin, FileText, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FormData {
  company_name: string;
  siret: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  billing_email: string;
  notes: string;
}

const CarrierRegistration = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    company_name: "",
    siret: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    billing_email: "",
    notes: ""
  });

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.company_name || !formData.contact_email || !formData.contact_name) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("carriers").insert({
        company_name: formData.company_name,
        siret: formData.siret || null,
        contact_name: formData.contact_name,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone || null,
        address: formData.address || null,
        billing_email: formData.billing_email || formData.contact_email,
        is_active: false,
        is_verified: false,
        api_enabled: false
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Demande d'inscription envoyée avec succès");
    } catch (error: any) {
      console.error("Erreur inscription transporteur:", error);
      toast.error("Erreur lors de l'inscription: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
          <div className="flex items-center gap-4 max-w-4xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Truck className="w-6 h-6" />
              <h1 className="text-xl font-semibold">Inscription Transporteur</h1>
            </div>
          </div>
        </header>

        <main className="p-4 max-w-2xl mx-auto">
          <Card className="text-center">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Demande envoyée !</h2>
                <p className="text-muted-foreground">
                  Votre demande d'inscription a bien été enregistrée.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                <h3 className="font-semibold">Prochaines étapes :</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Notre équipe va vérifier vos informations</li>
                  <li>Vous recevrez un email de validation sous 24-48h</li>
                  <li>Votre clé API vous sera envoyée par email sécurisé</li>
                  <li>Vous pourrez alors accéder à votre espace transporteur</li>
                </ol>
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={() => navigate("/carrier/login")} className="w-full">
                  J'ai déjà ma clé API
                </Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Retour à l'accueil
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6" />
            <h1 className="text-xl font-semibold">Inscription Transporteur</h1>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Informations entreprise
            </CardTitle>
            <CardDescription>
              Inscrivez votre société de transport pour accéder à l'API ANR et optimiser vos livraisons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Nom de l'entreprise *</Label>
                  <Input
                    id="company_name"
                    placeholder="Ex: Express Livraison SARL"
                    value={formData.company_name}
                    onChange={(e) => handleChange("company_name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET (optionnel)</Label>
                  <Input
                    id="siret"
                    placeholder="Ex: 123 456 789 00012"
                    value={formData.siret}
                    onChange={(e) => handleChange("siret", e.target.value)}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Contact principal
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Nom du contact *</Label>
                    <Input
                      id="contact_name"
                      placeholder="Ex: Jean Dupont"
                      value={formData.contact_name}
                      onChange={(e) => handleChange("contact_name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      placeholder="contact@entreprise.com"
                      value={formData.contact_email}
                      onChange={(e) => handleChange("contact_email", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Téléphone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="contact_phone"
                        placeholder="06 12 34 56 78"
                        value={formData.contact_phone}
                        onChange={(e) => handleChange("contact_phone", e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing_email">Email facturation</Label>
                    <Input
                      id="billing_email"
                      type="email"
                      placeholder="facturation@entreprise.com"
                      value={formData.billing_email}
                      onChange={(e) => handleChange("billing_email", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Adresse du siège
                </Label>
                <Textarea
                  id="address"
                  placeholder="Adresse complète de l'entreprise"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  rows={2}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Informations complémentaires
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Volume de colis estimé, zones de livraison, etc."
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  rows={3}
                />
              </div>

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-blue-900">Comment ça fonctionne ?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Après validation, vous recevrez une clé API par email</li>
                  <li>• Cette clé permet d'accéder à l'API ANR pour créer et suivre vos colis</li>
                  <li>• Vos livreurs pourront scanner les ANR pour prouver les livraisons</li>
                  <li>• Facturation mensuelle basée sur le volume de colis</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate("/carrier/login")} className="flex-1">
                  J'ai déjà un compte
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 gap-2">
                  <Send className="w-4 h-4" />
                  {isSubmitting ? "Envoi..." : "Envoyer ma demande"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CarrierRegistration;
