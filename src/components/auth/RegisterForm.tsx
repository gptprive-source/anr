import { useState } from "react";
import { Mail, User, MapPin, ArrowRight, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { geocodeAddress } from "@/lib/geocoding";

type Step = "credentials" | "profile" | "address" | "success";

const emailSchema = z.string().email("Email invalide");
const passwordSchema = z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères");

const RegisterForm = () => {
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCredentialsSubmit = async () => {
    const emailValidation = emailSchema.safeParse(email);
    const passwordValidation = passwordSchema.safeParse(password);

    if (!emailValidation.success) {
      toast({
        title: "Erreur",
        description: emailValidation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (!passwordValidation.success) {
      toast({
        title: "Erreur",
        description: passwordValidation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Sign up with email and password
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        setUserId(data.user.id);
      }

      setStep("profile");
      toast({
        title: "Compte créé",
        description: "Complétez maintenant votre profil",
      });
    } catch (error: any) {
      // Handle "user already registered" error
      if (error.message?.includes("already registered") || error.message?.includes("User already registered")) {
        toast({
          title: "Compte existant",
          description: "Cet email est déjà associé à un compte. Redirection vers la connexion...",
        });
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        toast({
          title: "Erreur",
          description: error.message || "Erreur lors de la création du compte",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Utilisateur non connecté");
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setStep("address");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder le profil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSubmit = async () => {
    if (!address.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une adresse",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Utilisateur non connecté");
      }

      // Geocode the address
      const geoResult = await geocodeAddress(address.trim());
      
      if (!geoResult) {
        toast({
          title: "Adresse non trouvée",
          description: "Impossible de localiser cette adresse. Vérifiez et réessayez.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Generate ANR code
      const anrCode = `ANR-${Date.now().toString(36).toUpperCase()}`;
      const { latitude, longitude } = geoResult;

      // Check if ANR already exists for this address
      const { data: existingAnr } = await supabase
        .from("anrs")
        .select("id")
        .eq("address", address.trim())
        .maybeSingle();

      let anrId: string;
      let isExistingAnr = false;

      if (existingAnr) {
        anrId = existingAnr.id;
        isExistingAnr = true;
      } else {
        const { data: newAnr, error: anrError } = await supabase
          .from("anrs")
          .insert({
            code: anrCode,
            address: address.trim(),
            latitude,
            longitude,
          })
          .select("id")
          .single();

        if (anrError) throw anrError;
        anrId = newAnr.id;
      }

      // Count existing habitations for this ANR to determine residence number
      const { count: habitationCount } = await supabase
        .from("habitations")
        .select("*", { count: "exact", head: true })
        .eq("anr_id", anrId);

      const residenceNumber = (habitationCount || 0) + 1;
      const habitationName = `Résidence ${residenceNumber} - ${firstName} ${lastName}`;

      // Create habitation
      const { data: habitation, error: habError } = await supabase
        .from("habitations")
        .insert({
          anr_id: anrId,
          name: habitationName,
        })
        .select("id")
        .single();

      if (habError) throw habError;

      // Create resident as owner
      const { error: resError } = await supabase
        .from("residents")
        .insert({
          habitation_id: habitation.id,
          user_id: user.id,
          is_owner: true,
          status: "verified",
        });

      if (resError) throw resError;

      // Move to success step
      setStep("success");
      
      toast({
        title: isExistingAnr ? "Habitation ajoutée" : "ANR créé",
        description: isExistingAnr 
          ? `Vous êtes maintenant Résidence ${residenceNumber} à cette adresse`
          : "Votre ANR a été créé avec succès",
      });

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'ANR",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {["credentials", "profile", "address", "success"].map((s, i) => (
            <div
              key={s}
              className={`h-1 w-12 rounded-full transition-colors ${
                ["credentials", "profile", "address", "success"].indexOf(step) >= i
                  ? "bg-primary"
                  : "bg-secondary"
              }`}
            />
          ))}
        </div>

        <div className="glass-effect rounded-3xl p-8 card-shadow">
        {step === "credentials" && (
            <CredentialsStep
              email={email}
              password={password}
              setEmail={setEmail}
              setPassword={setPassword}
              onSubmit={handleCredentialsSubmit}
              loading={loading}
            />
          )}
          {step === "profile" && (
            <ProfileStep
              firstName={firstName}
              lastName={lastName}
              setFirstName={setFirstName}
              setLastName={setLastName}
              onSubmit={handleProfileSubmit}
              loading={loading}
            />
          )}
          {step === "address" && (
            <AddressStep
              address={address}
              setAddress={setAddress}
              onSubmit={handleAddressSubmit}
              loading={loading}
            />
          )}
          {step === "success" && (
            <SuccessStep onGoToDashboard={() => navigate("/dashboard")} />
          )}
        </div>

        {step === "credentials" && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            Déjà inscrit ?{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/login")}>
              Se connecter
            </Button>
          </p>
        )}
      </div>
    </div>
  );
};

const CredentialsStep = ({
  email,
  password,
  setEmail,
  setPassword,
  onSubmit,
  loading,
}: {
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Mail className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Créez votre ANR</h2>
      <p className="text-muted-foreground">
        Entrez vos informations de connexion
      </p>
    </div>

    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="votre@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="Minimum 6 caractères"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10"
            disabled={loading}
          />
        </div>
      </div>

      <Button
        variant="hero"
        className="w-full"
        onClick={onSubmit}
        disabled={!email.trim() || !password.trim() || loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuer"}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </Button>
    </div>
  </div>
);

const ProfileStep = ({
  firstName,
  lastName,
  setFirstName,
  setLastName,
  onSubmit,
  loading,
}: {
  firstName: string;
  lastName: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <User className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Vos informations</h2>
      <p className="text-muted-foreground">
        Ces informations seront visibles par vos visiteurs
      </p>
    </div>

    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="firstName">Prénom</Label>
        <Input
          id="firstName"
          placeholder="Prénom"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Nom</Label>
        <Input
          id="lastName"
          placeholder="Nom"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          disabled={loading}
        />
      </div>
      <Button
        variant="hero"
        className="w-full"
        onClick={onSubmit}
        disabled={!firstName.trim() || !lastName.trim() || loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuer"}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </Button>
    </div>
  </div>
);

const AddressStep = ({
  address,
  setAddress,
  onSubmit,
  loading,
}: {
  address: string;
  setAddress: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <MapPin className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Votre adresse</h2>
      <p className="text-muted-foreground">
        L'adresse postale où sera installé votre ANR
      </p>
    </div>

    <div className="space-y-4">
      <Input
        placeholder="12 Rue des Lilas, 75011 Paris"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        disabled={loading}
      />
      <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-sm">
        <p className="text-warning font-medium">
          Si cette adresse existe déjà, vous serez ajouté comme second habitat (multi-logement)
        </p>
      </div>
      <Button
        variant="hero"
        className="w-full"
        onClick={onSubmit}
        disabled={!address.trim() || loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer mon ANR"}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </Button>
    </div>
  </div>
);

const SuccessStep = ({
  onGoToDashboard,
}: {
  onGoToDashboard: () => void;
}) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
        <MapPin className="w-8 h-8 text-success" />
      </div>
      <h2 className="text-2xl font-bold mb-2">ANR créé avec succès !</h2>
      <p className="text-muted-foreground">
        Votre interphone numérique est prêt à recevoir des appels
      </p>
    </div>

    <Button
      variant="hero"
      className="w-full"
      onClick={onGoToDashboard}
    >
      Accéder à mon tableau de bord
      <ArrowRight className="w-4 h-4" />
    </Button>
  </div>
);

export default RegisterForm;
