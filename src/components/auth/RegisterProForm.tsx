import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Building2, User, MapPin, CreditCard, CheckCircle, Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useAppConfig } from "@/hooks/useAppConfig";

type Step = "company" | "contact" | "plan" | "credentials" | "payment";

interface RegisterProFormProps {
  onBack: () => void;
}

const emailSchema = z.string().email("Email invalide");
const passwordSchema = z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères");
const siretSchema = z.string().regex(/^\d{14}$/, "Le SIRET doit contenir 14 chiffres");

const SECTORS = [
  "Aide à domicile",
  "Services à la personne",
  "Maintenance / Dépannage",
  "Livraison",
  "Soins infirmiers",
  "Ménage / Nettoyage",
  "Jardinage / Espaces verts",
  "Garde d'enfants",
  "Sécurité / Gardiennage",
  "Collectivité territoriale",
  "Autre"
];

// Plan features (static, prices are loaded dynamically)
const PLAN_FEATURES = {
  pro: {
    id: "pro",
    name: "PRO",
    maxEmployees: 30,
    features: [
      "Jusqu'à 30 employés",
      "Horodatage automatique",
      "Signature client",
      "Rapports PDF/CSV",
      "Support email"
    ]
  },
  entreprise: {
    id: "entreprise",
    name: "ENTREPRISE",
    maxEmployees: 200,
    popular: true,
    features: [
      "Jusqu'à 200 employés",
      "Tout PRO inclus",
      "Webhooks intégration RH/Paie",
      "Géofencing avancé",
      "Reconnaissance faciale",
      "Co-Pilot IA inclus",
      "Support prioritaire"
    ]
  },
  collectivite: {
    id: "collectivite",
    name: "COLLECTIVITÉS",
    maxEmployees: 1000,
    features: [
      "Jusqu'à 1000 employés",
      "Tout ENTREPRISE inclus",
      "Multi-sites illimités",
      "API personnalisée",
      "Formation dédiée",
      "Account manager dédié"
    ]
  }
};

const RegisterProForm = ({ onBack }: RegisterProFormProps) => {
  const [step, setStep] = useState<Step>("company");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getConfig, isLoading: configLoading } = useAppConfig();

  // Load dynamic pricing from config
  const proPlanPrice = getConfig('pro_plan_price') || 29;
  const entreprisePlanPrice = getConfig('entreprise_plan_price') || 99;
  const collectivitesPlanPrice = getConfig('collectivites_plan_price') || 199;
  const copilotAddonPrice = getConfig('copilot_addon_price') || 9.99;
  const geofencingAddonPrice = getConfig('geofencing_addon_price') || 4.99;
  const facialRecognitionAddonPrice = getConfig('facial_recognition_addon_price') || 7.99;

  // Build dynamic PLANS array with prices from config
  const PLANS = [
    {
      ...PLAN_FEATURES.pro,
      price: `${proPlanPrice}€/mois`,
      priceValue: proPlanPrice
    },
    {
      ...PLAN_FEATURES.entreprise,
      price: `${entreprisePlanPrice}€/mois`,
      priceValue: entreprisePlanPrice
    },
    {
      ...PLAN_FEATURES.collectivite,
      price: `${collectivitesPlanPrice}€/mois`,
      priceValue: collectivitesPlanPrice
    }
  ];

  // Company info
  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [siret, setSiret] = useState("");
  const [sector, setSector] = useState("");

  // Contact info
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");

  // Plan
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [employeeCount, setEmployeeCount] = useState([30]);
  const [wantsCopilot, setWantsCopilot] = useState(false);
  const [wantsGeofencing, setWantsGeofencing] = useState(false);
  const [wantsFaceRecognition, setWantsFaceRecognition] = useState(false);

  // Credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptCgu, setAcceptCgu] = useState(false);

  const handleCompanySubmit = () => {
    if (!companyName.trim() || !siret.trim() || !sector) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    const siretValidation = siretSchema.safeParse(siret.replace(/\s/g, ""));
    if (!siretValidation.success) {
      toast({
        title: "Erreur",
        description: siretValidation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    setStep("contact");
  };

  const handleContactSubmit = () => {
    if (!contactFirstName.trim() || !contactLastName.trim() || !contactEmail.trim() || !address.trim() || !postalCode.trim() || !city.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    const emailValidation = emailSchema.safeParse(contactEmail.trim());
    if (!emailValidation.success) {
      toast({
        title: "Erreur",
        description: emailValidation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    setEmail(contactEmail);
    setStep("plan");
  };

  const handlePlanSubmit = () => {
    setStep("credentials");
  };

  const calculateTotalPrice = () => {
    const plan = PLANS.find(p => p.id === selectedPlan);
    let total = plan?.priceValue || proPlanPrice;
    
    if (selectedPlan === "pro") {
      if (wantsCopilot) total += copilotAddonPrice;
      if (wantsGeofencing) total += geofencingAddonPrice;
      if (wantsFaceRecognition) total += facialRecognitionAddonPrice;
    }
    
    return total.toFixed(2);
  };

  const handleCredentialsSubmit = async () => {
    const emailValidation = emailSchema.safeParse(email.trim());
    const passwordValidation = passwordSchema.safeParse(password);

    if (!emailValidation.success) {
      toast({
        title: "Erreur",
        description: emailValidation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    if (!passwordValidation.success) {
      toast({
        title: "Erreur",
        description: passwordValidation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive"
      });
      return;
    }

    if (!acceptCgu) {
      toast({
        title: "Erreur",
        description: "Vous devez accepter les CGU",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Create user account first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: contactFirstName,
            last_name: contactLastName
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erreur lors de la création du compte");

      // 2. Redirect to Stripe checkout
      const companyData = {
        name: companyName,
        legal_name: legalName || companyName,
        siret: siret.replace(/\s/g, ""),
        sector,
        contact_name: `${contactFirstName} ${contactLastName}`,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        address,
        postal_code: postalCode,
        city,
      };

      const addons = {
        copilot: selectedPlan !== "pro" || wantsCopilot,
        geofencing: selectedPlan !== "pro" || wantsGeofencing,
        face_recognition: selectedPlan !== "pro" || wantsFaceRecognition,
      };

      const { data, error } = await supabase.functions.invoke("create-pro-checkout", {
        body: {
          plan: selectedPlan,
          employeeCount: employeeCount[0],
          addons,
          companyData,
          userEmail: email.trim(),
          userId: authData.user.id
        }
      });

      if (error) throw error;
      if (!data?.url) throw new Error("Erreur lors de la création de la session de paiement");

      // Redirect to Stripe
      window.location.href = data.url;
      
    } catch (error: any) {
      if (error.message?.includes("already registered")) {
        toast({
          title: "Compte existant",
          description: "Cet email est déjà associé à un compte. Redirection vers la connexion..."
        });
        setTimeout(() => navigate("/login"), 2000);
      } else {
        toast({
          title: "Erreur",
          description: error.message || "Erreur lors de la création du compte",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getMaxEmployeesForPlan = () => {
    const plan = PLANS.find(p => p.id === selectedPlan);
    return plan?.maxEmployees || 30;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pb-24">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex justify-center gap-2 mb-8">
          {["company", "contact", "plan", "credentials"].map((s, i) => (
            <div
              key={s}
              className={`h-1 w-8 rounded-full transition-colors ${
                ["company", "contact", "plan", "credentials"].indexOf(step) >= i
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500"
                  : "bg-secondary"
              }`}
            />
          ))}
        </div>

        <div className="glass-effect rounded-3xl p-8 card-shadow">
          {step === "company" && (
            <div className="space-y-6" data-copilot-id="pro-register-company-step">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-500/20 flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold">Informations entreprise</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Renseignez les informations de votre entreprise
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Nom commercial *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ma Société"
                    data-copilot-id="company-name-input"
                  />
                </div>

                <div>
                  <Label htmlFor="legalName">Raison sociale</Label>
                  <Input
                    id="legalName"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="MA SOCIETE SAS"
                  />
                </div>

                <div>
                  <Label htmlFor="siret">Numéro SIRET *</Label>
                  <Input
                    id="siret"
                    value={siret}
                    onChange={(e) => setSiret(e.target.value)}
                    placeholder="123 456 789 00012"
                    maxLength={17}
                    data-copilot-id="siret-input"
                  />
                </div>

                <div>
                  <Label htmlFor="sector">Secteur d'activité *</Label>
                  <Select value={sector} onValueChange={setSector}>
                    <SelectTrigger data-copilot-id="sector-select">
                      <SelectValue placeholder="Sélectionnez votre secteur" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onBack} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <Button onClick={handleCompanySubmit} className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500">
                  Continuer
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === "contact" && (
            <div className="space-y-6" data-copilot-id="pro-register-contact-step">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-500/20 flex items-center justify-center mb-4">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold">Contact principal</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Vos coordonnées de contact
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="contactFirstName">Prénom *</Label>
                    <Input
                      id="contactFirstName"
                      value={contactFirstName}
                      onChange={(e) => setContactFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactLastName">Nom *</Label>
                    <Input
                      id="contactLastName"
                      value={contactLastName}
                      onChange={(e) => setContactLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="contactEmail">Email professionnel *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="contactPhone">Téléphone</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="address">Adresse *</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="postalCode">Code postal *</Label>
                    <Input
                      id="postalCode"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      maxLength={5}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="city">Ville *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("company")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <Button onClick={handleContactSubmit} className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500">
                  Continuer
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === "plan" && (
            <div className="space-y-6" data-copilot-id="pro-register-plan-step">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-500/20 flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold">Choisissez votre plan</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Sélectionnez l'offre adaptée à vos besoins
                </p>
              </div>

              <div className="space-y-3">
                {PLANS.map(plan => (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPlan === plan.id
                        ? "border-blue-600 bg-blue-600/5"
                        : "border-border hover:border-blue-600/50"
                    }`}
                    onClick={() => {
                      setSelectedPlan(plan.id);
                      setEmployeeCount([Math.min(employeeCount[0], plan.maxEmployees)]);
                    }}
                    data-copilot-id={`plan-${plan.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{plan.name}</span>
                        {'popular' in plan && plan.popular && (
                          <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-full">
                            Populaire
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-blue-600">{plan.price}</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {plan.features.map((f, i) => (
                        <li key={i}>✓ {f}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Employee count slider */}
              <div className="p-4 bg-muted/50 rounded-xl">
                <Label className="mb-3 block">
                  Nombre d'employés prévus: <span className="font-bold">{employeeCount[0]}</span>
                </Label>
                <Slider
                  value={employeeCount}
                  onValueChange={setEmployeeCount}
                  min={10}
                  max={getMaxEmployeesForPlan()}
                  step={10}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>10</span>
                  <span>{getMaxEmployeesForPlan()}</span>
                </div>
              </div>

              {/* PRO addons */}
              {selectedPlan === "pro" && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-xl">
                  <Label>Options supplémentaires (PRO)</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="copilot"
                        checked={wantsCopilot}
                        onCheckedChange={(c) => setWantsCopilot(c === true)}
                      />
                      <label htmlFor="copilot" className="text-sm">
                        Co-Pilot IA (+{copilotAddonPrice}€/mois)
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="geofencing"
                        checked={wantsGeofencing}
                        onCheckedChange={(c) => setWantsGeofencing(c === true)}
                      />
                      <label htmlFor="geofencing" className="text-sm">
                        Géofencing avancé (+{geofencingAddonPrice}€/mois)
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="faceRecog"
                        checked={wantsFaceRecognition}
                        onCheckedChange={(c) => setWantsFaceRecognition(c === true)}
                      />
                      <label htmlFor="faceRecog" className="text-sm">
                        Reconnaissance faciale (+{facialRecognitionAddonPrice}€/mois)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Price summary */}
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total mensuel</span>
                  <span className="text-xl font-bold text-primary">{calculateTotalPrice()}€/mois</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("contact")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <Button onClick={handlePlanSubmit} className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500">
                  Continuer
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === "credentials" && (
            <div className="space-y-6" data-copilot-id="pro-register-credentials-step">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-r from-blue-600/20 to-cyan-500/20 flex items-center justify-center mb-4">
                  <Lock className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold">Créez votre compte</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Définissez vos identifiants puis procédez au paiement
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive mt-1">Les mots de passe ne correspondent pas</p>
                  )}
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="cgu"
                    checked={acceptCgu}
                    onCheckedChange={(c) => setAcceptCgu(c === true)}
                  />
                  <label htmlFor="cgu" className="text-sm text-muted-foreground">
                    J'accepte les{" "}
                    <a href="/cgu" target="_blank" className="text-primary underline">
                      CGU
                    </a>{" "}
                    et la{" "}
                    <a href="/privacy" target="_blank" className="text-primary underline">
                      politique de confidentialité
                    </a>
                  </label>
                </div>
              </div>

              {/* Final price */}
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="font-medium">À payer maintenant</span>
                  <span className="text-xl font-bold text-primary">{calculateTotalPrice()}€/mois</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Vous serez redirigé vers Stripe pour le paiement sécurisé
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("plan")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <Button
                  onClick={handleCredentialsSubmit}
                  disabled={loading || !acceptCgu || password !== confirmPassword}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500"
                  data-copilot-id="pro-submit-btn"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Payer et créer
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterProForm;
