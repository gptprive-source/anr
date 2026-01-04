import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, User, Package, Clock, MapPin, CreditCard, Check, Square, CheckSquare, Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useRelayPoint } from "@/hooks/useRelayPoint";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/layout/BottomNav";

const PARCEL_TYPES = [
  { id: 'standard', label: 'Standard', description: 'Colis classiques jusqu\'à 30kg' },
  { id: 'fragile', label: 'Fragile', description: 'Colis nécessitant une manipulation délicate' },
  { id: 'volumineux', label: 'Volumineux', description: 'Colis de grande taille' },
];

const DAYS = [
  { id: 'lundi', label: 'Lundi' },
  { id: 'mardi', label: 'Mardi' },
  { id: 'mercredi', label: 'Mercredi' },
  { id: 'jeudi', label: 'Jeudi' },
  { id: 'vendredi', label: 'Vendredi' },
  { id: 'samedi', label: 'Samedi' },
  { id: 'dimanche', label: 'Dimanche' },
];

const STEPS = [
  { id: 'type', title: 'Type de relais' },
  { id: 'info', title: 'Informations' },
  { id: 'kyc', title: 'Vérification' },
  { id: 'availability', title: 'Disponibilités' },
  { id: 'payment', title: 'Paiement' },
];

type RelayType = 'professional' | 'individual';

const RelayRegistration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { relayPoint, isRelayPoint, createRelayPoint, isCreating } = useRelayPoint();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Step 1 - Type
    relay_type: '' as RelayType | '',
    // Step 2 - Basic info
    display_name: '',
    phone: '',
    max_capacity: 10,
    // Step 3 - KYC Professional
    company_name: '',
    legal_form: '',
    siret: '',
    legal_representative_name: '',
    // Step 3 - KYC Common
    id_document_url: '',
    address_proof_url: '',
    // Step 4 - Availability
    accepted_parcel_types: ['standard'] as string[],
    availability_schedule: {} as Record<string, { from: string; to: string }>,
    // Step 5 - Payment
    iban: '',
  });

  const [anrId, setAnrId] = useState<string | null>(null);
  const [anrAddress, setAnrAddress] = useState<string | null>(null);

  // Fetch user's ANR
  useEffect(() => {
    const fetchUserAnr = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from('residents')
        .select('habitations:habitation_id(anr_id, anrs:anr_id(address))')
        .eq('user_id', user.id)
        .eq('status', 'verified')
        .single();

      if (data?.habitations) {
        const hab = data.habitations as any;
        setAnrId(hab.anr_id);
        setAnrAddress(hab.anrs?.address || null);
      }
    };

    fetchUserAnr();
  }, [user?.id]);

  // Redirect if already a relay point
  useEffect(() => {
    if (isRelayPoint) {
      navigate('/relay');
    }
  }, [isRelayPoint, navigate]);

  const handleFileUpload = async (file: File, field: 'id_document_url' | 'address_proof_url') => {
    if (!user?.id) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${field}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('relay-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('relay-documents')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, [field]: urlData.publicUrl }));
      toast.success('Document uploadé avec succès');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleParcelTypeToggle = (typeId: string) => {
    setFormData(prev => ({
      ...prev,
      accepted_parcel_types: prev.accepted_parcel_types.includes(typeId)
        ? prev.accepted_parcel_types.filter(t => t !== typeId)
        : [...prev.accepted_parcel_types, typeId],
    }));
  };

  const handleScheduleChange = (day: string, field: 'from' | 'to', value: string) => {
    setFormData(prev => ({
      ...prev,
      availability_schedule: {
        ...prev.availability_schedule,
        [day]: {
          ...prev.availability_schedule[day],
          [field]: value,
        },
      },
    }));
  };

  const toggleDay = (day: string) => {
    setFormData(prev => {
      const newSchedule = { ...prev.availability_schedule };
      if (newSchedule[day]) {
        delete newSchedule[day];
      } else {
        newSchedule[day] = { from: '09:00', to: '18:00' };
      }
      return { ...prev, availability_schedule: newSchedule };
    });
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Type
        if (!formData.relay_type) {
          toast.error('Veuillez choisir un type de relais');
          return false;
        }
        return true;
      case 1: // Info
        if (!formData.display_name.trim()) {
          toast.error('Veuillez entrer un nom d\'affichage');
          return false;
        }
        return true;
      case 2: // KYC
        if (formData.relay_type === 'professional') {
          if (!formData.company_name || !formData.siret) {
            toast.error('Veuillez remplir les informations entreprise');
            return false;
          }
        }
        if (!formData.id_document_url || !formData.address_proof_url) {
          toast.error('Veuillez uploader tous les documents requis');
          return false;
        }
        return true;
      case 3: // Availability
        if (formData.accepted_parcel_types.length === 0) {
          toast.error('Veuillez sélectionner au moins un type de colis');
          return false;
        }
        if (Object.keys(formData.availability_schedule).length === 0) {
          toast.error('Veuillez définir vos disponibilités');
          return false;
        }
        return true;
      case 4: // Payment
        return true; // IBAN is optional
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!anrId) {
      toast.error('Vous devez avoir une habitation ANR pour devenir relais');
      return;
    }

    if (!validateStep(currentStep)) return;

    try {
      await createRelayPoint({
        anr_id: anrId,
        display_name: formData.display_name,
        phone: formData.phone || undefined,
        max_capacity: formData.max_capacity,
        accepted_parcel_types: formData.accepted_parcel_types,
        availability_schedule: formData.availability_schedule,
        iban: formData.iban || undefined,
        // New fields from migration
        relay_type: formData.relay_type as RelayType,
        company_name: formData.company_name || undefined,
        legal_form: formData.legal_form || undefined,
        siret: formData.siret || undefined,
        legal_representative_name: formData.legal_representative_name || undefined,
        id_document_url: formData.id_document_url || undefined,
        address_proof_url: formData.address_proof_url || undefined,
      });

      toast.success('Inscription relais envoyée ! En attente de vérification.');
      navigate('/relay');
    } catch (error: any) {
      console.error('Error creating relay point:', error);
      toast.error(error.message || 'Erreur lors de l\'inscription');
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => currentStep === 0 ? navigate(-1) : prevStep()} className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Devenir Point Relais</h1>
            <p className="text-sm opacity-80">Étape {currentStep + 1} sur {STEPS.length} - {STEPS[currentStep].title}</p>
          </div>
        </div>
        <Progress value={progress} className="mt-3 h-2" />
      </div>

      <div className="p-4 space-y-6">
        {/* Step 0: Type Selection */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Package className="w-8 h-8 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Quel type de relais êtes-vous ?</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choisissez le profil qui correspond à votre situation. Cela déterminera les documents requis.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card 
                className={`cursor-pointer transition-all ${formData.relay_type === 'professional' ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                onClick={() => setFormData(prev => ({ ...prev, relay_type: 'professional' }))}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${formData.relay_type === 'professional' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Relais Professionnel</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Commerce, entreprise, conciergerie ou gardien. Vous disposez d'un local commercial ou professionnel.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-xs bg-muted px-2 py-1 rounded">SIRET requis</span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">Volume élevé</span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">Facturation pro</span>
                      </div>
                    </div>
                    {formData.relay_type === 'professional' && <Check className="w-6 h-6 text-primary" />}
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${formData.relay_type === 'individual' ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                onClick={() => setFormData(prev => ({ ...prev, relay_type: 'individual' }))}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${formData.relay_type === 'individual' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <User className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Relais Particulier</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Habitant, résidence ou point de confiance. Vous recevez les colis à votre domicile privé.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-xs bg-muted px-2 py-1 rounded">Pièce d'identité</span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">Volume limité</span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">Processus simplifié</span>
                      </div>
                    </div>
                    {formData.relay_type === 'individual' && <Check className="w-6 h-6 text-primary" />}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Informations du relais
                </CardTitle>
                {anrAddress && (
                  <CardDescription>Adresse ANR : {anrAddress}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Nom d'affichage *</Label>
                  <Input
                    id="display_name"
                    placeholder={formData.relay_type === 'professional' ? "Ex: Tabac Presse Martin" : "Ex: Chez Martin"}
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Ce nom sera visible par les livreurs et destinataires</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_capacity">Capacité maximale (colis simultanés)</Label>
                  <Input
                    id="max_capacity"
                    type="number"
                    min={1}
                    max={200}
                    value={formData.max_capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_capacity: parseInt(e.target.value) || 10 }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.relay_type === 'professional' ? 'Recommandé: 20-100 pour un commerce' : 'Recommandé: 5-15 pour un particulier'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: KYC */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {formData.relay_type === 'professional' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Informations entreprise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Raison sociale *</Label>
                    <Input
                      id="company_name"
                      placeholder="SARL Martin Tabac"
                      value={formData.company_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="legal_form">Forme juridique</Label>
                    <Input
                      id="legal_form"
                      placeholder="SARL, SAS, EI..."
                      value={formData.legal_form}
                      onChange={(e) => setFormData(prev => ({ ...prev, legal_form: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siret">SIRET *</Label>
                    <Input
                      id="siret"
                      placeholder="123 456 789 00012"
                      value={formData.siret}
                      onChange={(e) => setFormData(prev => ({ ...prev, siret: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="legal_representative_name">Nom du responsable légal</Label>
                    <Input
                      id="legal_representative_name"
                      placeholder="Jean Martin"
                      value={formData.legal_representative_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, legal_representative_name: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documents justificatifs
                </CardTitle>
                <CardDescription>
                  Ces documents sont nécessaires pour valider votre inscription
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Pièce d'identité *</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'id_document_url');
                      }}
                      disabled={uploading}
                      className="flex-1"
                    />
                    {formData.id_document_url && <Check className="w-5 h-5 text-green-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formData.relay_type === 'professional' ? "Pièce d'identité du responsable légal" : "Carte d'identité ou passeport en cours de validité"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Justificatif d'adresse *</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'address_proof_url');
                      }}
                      disabled={uploading}
                      className="flex-1"
                    />
                    {formData.address_proof_url && <Check className="w-5 h-5 text-green-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formData.relay_type === 'professional' ? "Justificatif d'adresse du local (facture, bail...)" : "Facture de moins de 3 mois ou avis d'imposition"}
                  </p>
                </div>

                {uploading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Upload en cours...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Availability */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Types de colis acceptés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {PARCEL_TYPES.map((type) => (
                  <div
                    key={type.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      formData.accepted_parcel_types.includes(type.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => handleParcelTypeToggle(type.id)}
                  >
                    {formData.accepted_parcel_types.includes(type.id) ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Horaires de disponibilité
                </CardTitle>
                <CardDescription>Quand pouvez-vous recevoir/remettre des colis ?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {DAYS.map((day) => {
                  const isActive = !!formData.availability_schedule[day.id];
                  return (
                    <div key={day.id} className="space-y-2">
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${
                          isActive ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                        onClick={() => toggleDay(day.id)}
                      >
                        <div className="flex items-center gap-3">
                          {isActive ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground" />
                          )}
                          <span className="font-medium">{day.label}</span>
                        </div>
                        {isActive && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-2 ml-8">
                          <Input
                            type="time"
                            value={formData.availability_schedule[day.id]?.from || '09:00'}
                            onChange={(e) => handleScheduleChange(day.id, 'from', e.target.value)}
                            className="w-32"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-muted-foreground">à</span>
                          <Input
                            type="time"
                            value={formData.availability_schedule[day.id]?.to || '18:00'}
                            onChange={(e) => handleScheduleChange(day.id, 'to', e.target.value)}
                            className="w-32"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Payment */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <CreditCard className="w-8 h-8 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-300">Rémunération</h3>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                      Vous gagnez <strong>0,50 €</strong> par dépôt et <strong>0,50 €</strong> par retrait.
                      <br />Soit <strong>1,00 € par colis complet</strong>.
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                      Paiement mensuel automatique par virement SEPA.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Coordonnées bancaires
                </CardTitle>
                <CardDescription>Pour recevoir vos gains (modifiable plus tard)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                    value={formData.iban}
                    onChange={(e) => setFormData(prev => ({ ...prev, iban: e.target.value.toUpperCase() }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Vous pourrez ajouter ou modifier votre IBAN plus tard dans les paramètres
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Récapitulatif</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Type :</span> {formData.relay_type === 'professional' ? 'Professionnel' : 'Particulier'}</p>
                    <p><span className="text-muted-foreground">Nom :</span> {formData.display_name}</p>
                    <p><span className="text-muted-foreground">Capacité :</span> {formData.max_capacity} colis</p>
                    <p><span className="text-muted-foreground">Jours :</span> {Object.keys(formData.availability_schedule).length} jour(s)/semaine</p>
                    {formData.company_name && (
                      <p><span className="text-muted-foreground">Entreprise :</span> {formData.company_name}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button variant="outline" onClick={prevStep} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
          )}
          
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={nextStep} className="flex-1">
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isCreating} className="flex-1">
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Inscription en cours...
                </>
              ) : (
                'Soumettre ma demande'
              )}
            </Button>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default RelayRegistration;
