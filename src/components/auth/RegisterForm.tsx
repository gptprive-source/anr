import { useState, useEffect } from "react";
import { Mail, User, MapPin, ArrowRight, ArrowLeft, Loader2, Lock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { geocodeAddress } from "@/lib/geocoding";
import { useAuth } from "@/hooks/useAuth";

type Step = "credentials" | "email-sent" | "profile" | "address" | "success";

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
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Check if user is returning after email verification
  useEffect(() => {
    if (authLoading || initialCheckDone) return;

    const checkUserState = async () => {
      // Check localStorage for saved step
      const savedStep = localStorage.getItem("anr_register_step") as Step | null;
      
      if (user && savedStep) {
        // User is authenticated and has a saved step - resume registration
        localStorage.removeItem("anr_register_step");
        setStep(savedStep);
        setInitialCheckDone(true);
        return;
      }

      if (user) {
        // User is logged in but no saved step - check their profile state
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", user.id)
            .single();

          const { data: resident } = await supabase
            .from("residents")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!profile?.first_name || !profile?.last_name) {
            setStep("profile");
          } else if (!resident) {
            setStep("address");
          } else {
            // User is fully registered - redirect to dashboard
            navigate("/dashboard", { replace: true });
            return;
          }
        } catch (error) {
          console.error("Error checking user state:", error);
        }
      }
      
      setInitialCheckDone(true);
    };

    checkUserState();
  }, [user, authLoading, initialCheckDone, navigate]);

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

      // Show email verification step
      setStep("email-sent");
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

  const handleResendEmail = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      toast({
        title: "Email renvoyé",
        description: "Vérifiez votre boîte mail",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de renvoyer l'email",
        variant: "destructive",
      });
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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error("Utilisateur non connecté");
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        })
        .eq("id", currentUser.id);

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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error("Utilisateur non connecté");
      }

      // Get profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", currentUser.id)
        .single();

      const userFirstName = profile?.first_name || firstName;
      const userLastName = profile?.last_name || lastName;

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
      const habitationName = `Résidence ${residenceNumber} - ${userFirstName} ${userLastName}`;

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
          user_id: currentUser.id,
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

  // Show loading while checking user state
  if (!initialCheckDone && authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {["credentials", "email-sent", "profile", "address", "success"].map((s, i) => (
            <div
              key={s}
              className={`h-1 w-10 rounded-full transition-colors ${
                ["credentials", "email-sent", "profile", "address", "success"].indexOf(step) >= i
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
          {step === "email-sent" && (
            <EmailSentStep 
              email={email} 
              onResend={handleResendEmail}
              onBack={() => setStep("credentials")}
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
              onBack={() => setStep("profile")}
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
      <h2 className="text-2xl font-bold mb-2">Activez votre ANR</h2>
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

const EmailSentStep = ({ email, onResend, onBack, loading }: { email: string; onResend: () => void; onBack: () => void; loading: boolean }) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-success" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Vérifiez votre email</h2>
      <p className="text-muted-foreground">
        Un email de confirmation a été envoyé à
      </p>
      <p className="font-semibold text-primary mt-2">{email}</p>
    </div>

    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm space-y-2">
      <p className="font-medium">Pour continuer :</p>
      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
        <li>Ouvrez votre boîte mail</li>
        <li>Cliquez sur le lien de confirmation</li>
        <li>Complétez votre profil et adresse</li>
      </ol>
    </div>

    <div className="p-3 rounded-xl bg-secondary/50 border border-border text-sm text-center">
      <p className="text-muted-foreground">
        Après confirmation, vous pourrez vous connecter avec votre <span className="font-medium text-foreground">email et mot de passe</span>
      </p>
    </div>

    <p className="text-xs text-center text-muted-foreground">
      Pensez à vérifier vos spams si vous ne trouvez pas l'email
    </p>

    <div className="flex gap-3">
      <Button variant="outline" className="flex-1" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour
      </Button>
      <Button variant="hero" className="flex-1" onClick={onResend} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Renvoyer l'email"}
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
  onBack,
  loading,
}: {
  address: string;
  setAddress: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
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
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <Button
          variant="hero"
          className="flex-1"
          onClick={onSubmit}
          disabled={!address.trim() || loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer mon ANR"}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
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
