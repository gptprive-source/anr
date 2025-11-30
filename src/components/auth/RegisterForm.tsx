import { useState, useEffect } from "react";
import { Mail, Phone, User, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { geocodeAddress } from "@/lib/geocoding";

type Step = "credentials" | "profile" | "address" | "verification";

const phoneSchema = z.string().regex(/^\+?[0-9]{10,15}$/, "Numéro de téléphone invalide");
const emailSchema = z.string().email("Email invalide");

// Generate or retrieve device token
const getDeviceToken = (): string => {
  let token = localStorage.getItem("anr_device_token");
  if (!token) {
    token = `device-${crypto.randomUUID()}`;
    localStorage.setItem("anr_device_token", token);
  }
  return token;
};

const RegisterForm = () => {
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const formatPhone = (value: string) => {
    return value.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  };

  const handleCredentialsSubmit = async () => {
    const formattedPhone = formatPhone(phone);
    const phoneValidation = phoneSchema.safeParse(formattedPhone);
    const emailValidation = emailSchema.safeParse(email);
    
    if (!phoneValidation.success) {
      toast({
        title: "Erreur",
        description: phoneValidation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (!emailValidation.success) {
      toast({
        title: "Erreur",
        description: emailValidation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setPhone(formattedPhone);
    setLoading(true);
    
    try {
      // Sign up with email
      const { data, error } = await supabase.auth.signUp({
        email,
        password: crypto.randomUUID(), // Auto-generated password (user will use magic link)
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            phone_number: formattedPhone,
            device_token: getDeviceToken(),
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Update profile with phone number
        await supabase
          .from("profiles")
          .update({ 
            phone_number: formattedPhone,
            phone_verified: false,
          })
          .eq("id", data.user.id);
      }

      setStep("profile");
      toast({
        title: "Compte créé",
        description: "Complétez maintenant votre profil",
      });
    } catch (error: any) {
      // Handle "user already registered" error
      if (error.message?.includes("already registered")) {
        toast({
          title: "Email déjà utilisé",
          description: "Cet email est déjà associé à un compte. Connectez-vous.",
          variant: "destructive",
        });
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

      // Check if ANR already exists
      const { data: existingAnr } = await supabase
        .from("anrs")
        .select("id")
        .eq("address", address.trim())
        .maybeSingle();

      let anrId: string;

      if (existingAnr) {
        anrId = existingAnr.id;
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

      // Create habitation
      const habitationName = `${firstName} ${lastName}`;
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

      // Move to verification step
      setStep("verification");
      
      toast({
        title: "ANR créé",
        description: existingAnr 
          ? "Vous avez été ajouté comme habitant à cette adresse"
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

  const handleResendEmail = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        },
      });

      if (error) throw error;

      toast({
        title: "Email envoyé",
        description: "Vérifiez votre boîte de réception",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email",
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
          {["credentials", "profile", "address", "verification"].map((s, i) => (
            <div
              key={s}
              className={`h-1 w-12 rounded-full transition-colors ${
                ["credentials", "profile", "address", "verification"].indexOf(step) >= i
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
              phone={phone}
              setEmail={setEmail}
              setPhone={setPhone}
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
          {step === "verification" && (
            <VerificationStep
              email={email}
              onResend={handleResendEmail}
              loading={loading}
            />
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
  phone,
  setEmail,
  setPhone,
  onSubmit,
  loading,
}: {
  email: string;
  phone: string;
  setEmail: (v: string) => void;
  setPhone: (v: string) => void;
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
        Entrez votre email et numéro de téléphone
      </p>
    </div>

    <div className="space-y-4">
      <Input
        type="email"
        placeholder="votre@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="text-center text-lg"
        disabled={loading}
      />
      <Input
        type="tel"
        placeholder="+33 6 12 34 56 78"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="text-center text-lg"
        disabled={loading}
      />
      <Button
        variant="hero"
        className="w-full"
        onClick={onSubmit}
        disabled={!email.trim() || !phone.trim() || loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuer"}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </Button>
    </div>

    <p className="text-xs text-center text-muted-foreground">
      Un email de vérification vous sera envoyé
    </p>
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
      <Input
        placeholder="Prénom"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        disabled={loading}
      />
      <Input
        placeholder="Nom"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        disabled={loading}
      />
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

const VerificationStep = ({
  email,
  onResend,
  loading,
}: {
  email: string;
  onResend: () => void;
  loading: boolean;
}) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Mail className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Vérifiez votre email</h2>
      <p className="text-muted-foreground">
        Un email a été envoyé à <strong>{email}</strong>
      </p>
    </div>

    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm space-y-2">
      <p className="font-semibold text-primary">⚠️ Important</p>
      <p className="text-muted-foreground">
        Ouvrez l'email <strong>depuis votre téléphone</strong> (celui où vous utilisez l'application) pour valider votre numéro.
      </p>
      <p className="text-muted-foreground">
        Ne cliquez pas sur le lien depuis un ordinateur.
      </p>
    </div>

    <div className="space-y-4">
      <Button
        variant="secondary"
        className="w-full"
        onClick={onResend}
        disabled={loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Renvoyer l'email"}
      </Button>
    </div>
  </div>
);

export default RegisterForm;
