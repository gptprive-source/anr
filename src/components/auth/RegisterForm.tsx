import { useState, useEffect, useRef } from "react";
import { Mail, User, MapPin, ArrowRight, ArrowLeft, Loader2, Lock, CheckCircle, CreditCard, Plus, Minus, FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { geocodeAddress } from "@/lib/geocoding";
import { useAuth } from "@/hooks/useAuth";
type Step = "credentials" | "email-sent" | "profile" | "address" | "payment" | "success";
interface AddressData {
  address: string;
  latitude: number;
  longitude: number;
  isNewAnr: boolean;
  existingAnrId?: string;
  habitationName: string;
}
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
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    user,
    loading: authLoading,
    signOut
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleFinishLater = async () => {
    // Save current step to localStorage for resume
    localStorage.setItem("anr_register_step", step);
    if (addressData) {
      localStorage.setItem("anr_register_address_data", JSON.stringify(addressData));
    }
    await signOut();
    toast({
      title: "À bientôt !",
      description: "Vous pourrez reprendre votre inscription en vous reconnectant."
    });
    navigate("/");
  };

  // Lock to prevent multiple verify calls
  const isVerifyingRef = useRef(false);
  const hasProcessedSessionRef = useRef<string | null>(null);

  // Handle Stripe return
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");

    // Skip if already processing or already processed this session
    if (isVerifyingRef.current) {
      console.log("[RegisterForm] Already verifying, skipping");
      return;
    }
    if (sessionId && hasProcessedSessionRef.current === sessionId) {
      console.log("[RegisterForm] Session already processed locally, skipping");
      return;
    }
    if (paymentStatus === "success" && sessionId) {
      // Mark as processing immediately
      hasProcessedSessionRef.current = sessionId;
      // Clear URL params immediately to prevent re-triggers on refresh
      window.history.replaceState({}, "", "/register");
      verifyPaymentAndFinalize(sessionId);
    } else if (paymentStatus === "cancelled") {
      window.history.replaceState({}, "", "/register");
      toast({
        title: "Paiement annulé",
        description: "Vous pouvez réessayer quand vous le souhaitez",
        variant: "destructive"
      });
      setStep("payment");
    }
  }, [searchParams]);
  const verifyPaymentAndFinalize = async (sessionId: string, retryCount = 0) => {
    // Prevent multiple simultaneous calls
    if (isVerifyingRef.current) {
      console.log("[RegisterForm] Already verifying, skipping duplicate call");
      return;
    }
    isVerifyingRef.current = true;
    setLoading(true);
    try {
      // Try to get session, but don't fail if not available
      // The verify-payment function can work without auth using Stripe metadata
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      console.log("[RegisterForm] Verifying payment, session available:", !!session);
      const {
        data,
        error
      } = await supabase.functions.invoke("verify-payment", {
        body: {
          sessionId
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Clear localStorage data
      localStorage.removeItem("anr_register_address_data");
      localStorage.removeItem("anr_register_step");
      localStorage.removeItem("anr_pending_session_id");
      toast({
        title: data.alreadyProcessed ? "Inscription déjà finalisée" : data.isNewAnr ? "ANR créé avec succès !" : "Habitation ajoutée !",
        description: "Votre paiement a été validé"
      });
      setStep("success");
    } catch (error: any) {
      console.error("Payment verification error:", error);

      // If it's a session/auth error and we haven't retried, try to refresh auth
      if (retryCount === 0 && (error.message?.includes("Session") || error.message?.includes("Auth"))) {
        console.log("[RegisterForm] Auth error, attempting refresh...");
        try {
          await supabase.auth.refreshSession();
          isVerifyingRef.current = false; // Reset to allow retry
          // Retry once after refresh
          return verifyPaymentAndFinalize(sessionId, 1);
        } catch (refreshError) {
          console.error("Session refresh failed:", refreshError);
        }
      }
      toast({
        title: "Erreur de vérification",
        description: error.message || "Impossible de vérifier le paiement. Contactez le support avec votre numéro de session.",
        variant: "destructive"
      });

      // Store session ID for manual recovery if needed
      localStorage.setItem("anr_pending_session_id", sessionId);
      setStep("payment");
    } finally {
      setLoading(false);
      isVerifyingRef.current = false;
    }
  };

  // Check if user is returning after email verification
  useEffect(() => {
    if (authLoading || initialCheckDone) return;
    if (searchParams.get("payment")) return; // Don't check if handling payment return

    const checkUserState = async () => {
      const savedStep = localStorage.getItem("anr_register_step") as Step | null;
      const savedAddressData = localStorage.getItem("anr_register_address_data");
      if (user && savedStep) {
        localStorage.removeItem("anr_register_step");
        if (savedAddressData) {
          setAddressData(JSON.parse(savedAddressData));
          localStorage.removeItem("anr_register_address_data");
        }
        setStep(savedStep);
        setInitialCheckDone(true);
        return;
      }
      if (user) {
        try {
          const {
            data: profile
          } = await supabase.from("profiles").select("first_name, last_name").eq("id", user.id).single();
          const {
            data: resident
          } = await supabase.from("residents").select("id").eq("user_id", user.id).maybeSingle();
          if (!profile?.first_name || !profile?.last_name) {
            setStep("profile");
          } else if (!resident) {
            setStep("address");
          } else {
            navigate("/dashboard", {
              replace: true
            });
            return;
          }
        } catch (error) {
          console.error("Error checking user state:", error);
        }
      }
      setInitialCheckDone(true);
    };
    checkUserState();
  }, [user, authLoading, initialCheckDone, navigate, searchParams]);
  const handleCredentialsSubmit = async () => {
    const emailValidation = emailSchema.safeParse(email);
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
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email,
        password
      });
      if (error) throw error;
      setStep("email-sent");
    } catch (error: any) {
      if (error.message?.includes("already registered") || error.message?.includes("User already registered")) {
        toast({
          title: "Compte existant",
          description: "Cet email est déjà associé à un compte. Redirection vers la connexion..."
        });
        setTimeout(() => {
          navigate("/login");
        }, 2000);
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
  const handleResendEmail = async () => {
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.resend({
        type: 'signup',
        email
      });
      if (error) throw error;
      toast({
        title: "Email renvoyé",
        description: "Vérifiez votre boîte mail"
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de renvoyer l'email",
        variant: "destructive"
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
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const {
        data: {
          user: currentUser
        }
      } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error("Utilisateur non connecté");
      }
      const {
        error
      } = await supabase.from("profiles").update({
        first_name: firstName.trim(),
        last_name: lastName.trim()
      }).eq("id", currentUser.id);
      if (error) throw error;
      setStep("address");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de sauvegarder le profil",
        variant: "destructive"
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
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const {
        data: {
          user: currentUser
        }
      } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error("Utilisateur non connecté");
      }
      const {
        data: profile
      } = await supabase.from("profiles").select("first_name, last_name").eq("id", currentUser.id).single();
      const userFirstName = profile?.first_name || firstName;
      const userLastName = profile?.last_name || lastName;
      const geoResult = await geocodeAddress(address.trim());
      if (!geoResult) {
        toast({
          title: "Adresse non trouvée",
          description: "Impossible de localiser cette adresse. Vérifiez et réessayez.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      const {
        latitude,
        longitude
      } = geoResult;

      // Check if ANR already exists for this address
      const {
        data: existingAnr
      } = await supabase.from("anrs").select("id").eq("address", address.trim()).maybeSingle();
      let isNewAnr = !existingAnr;
      let existingAnrId = existingAnr?.id;

      // Count existing habitations for this ANR to determine residence number
      let residenceNumber = 1;
      if (existingAnrId) {
        const {
          count
        } = await supabase.from("habitations").select("*", {
          count: "exact",
          head: true
        }).eq("anr_id", existingAnrId);
        residenceNumber = (count || 0) + 1;
      }
      const habitationName = `Résidence ${residenceNumber} - ${userFirstName} ${userLastName}`;

      // Store address data for payment step (don't create anything in DB yet)
      const newAddressData: AddressData = {
        address: address.trim(),
        latitude,
        longitude,
        isNewAnr,
        existingAnrId,
        habitationName
      };
      setAddressData(newAddressData);
      // Save to localStorage in case user refreshes
      localStorage.setItem("anr_register_address_data", JSON.stringify(newAddressData));
      setStep("payment");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de vérifier l'adresse",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking user state
  if (!initialCheckDone && authLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }

  // Show loading while verifying payment
  if (loading && searchParams.get("payment") === "success") {
    return <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Vérification du paiement...</p>
      </div>;
  }
  return <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {["credentials", "email-sent", "profile", "address", "payment", "success"].map((s, i) => <div key={s} className={`h-1 w-8 rounded-full transition-colors ${["credentials", "email-sent", "profile", "address", "payment", "success"].indexOf(step) >= i ? "bg-primary" : "bg-secondary"}`} />)}
        </div>

        <div className="glass-effect rounded-3xl p-8 card-shadow">
          {step === "credentials" && <CredentialsStep email={email} password={password} setEmail={setEmail} setPassword={setPassword} onSubmit={handleCredentialsSubmit} loading={loading} />}
          {step === "email-sent" && <EmailSentStep email={email} onResend={handleResendEmail} onBack={() => setStep("credentials")} loading={loading} />}
          {step === "profile" && <ProfileStep firstName={firstName} lastName={lastName} setFirstName={setFirstName} setLastName={setLastName} onSubmit={handleProfileSubmit} loading={loading} onFinishLater={handleFinishLater} />}
          {step === "address" && <AddressStep address={address} setAddress={setAddress} onSubmit={handleAddressSubmit} onBack={() => setStep("profile")} loading={loading} onFinishLater={handleFinishLater} />}
          {step === "payment" && addressData && <PaymentStep addressData={addressData} onBack={() => setStep("address")} loading={loading} setLoading={setLoading} onFinishLater={handleFinishLater} />}
          {step === "success" && <SuccessStep onGoToDashboard={() => navigate("/dashboard")} />}
        </div>

        {step === "credentials" && <p className="text-center text-sm text-muted-foreground mt-6">
            Déjà inscrit ?{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/login")}>
              Se connecter
            </Button>
          </p>}
      </div>
    </div>;
};
const CredentialsStep = ({
  email,
  password,
  setEmail,
  setPassword,
  onSubmit,
  loading
}: {
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) => <div className="space-y-6">
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
        <Input id="email" type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input id="password" type="password" placeholder="Minimum 6 caractères" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" disabled={loading} />
        </div>
      </div>

      <Button variant="hero" className="w-full" onClick={onSubmit} disabled={!email.trim() || !password.trim() || loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuer"}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </Button>
    </div>
  </div>;
const EmailSentStep = ({
  email,
  onResend,
  onBack,
  loading
}: {
  email: string;
  onResend: () => void;
  onBack: () => void;
  loading: boolean;
}) => <div className="space-y-6">
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
  </div>;
const ProfileStep = ({
  firstName,
  lastName,
  setFirstName,
  setLastName,
  onSubmit,
  loading,
  onFinishLater
}: {
  firstName: string;
  lastName: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  onFinishLater: () => void;
}) => <div className="space-y-6">
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
        <Input id="firstName" placeholder="Prénom" value={firstName} onChange={e => setFirstName(e.target.value)} disabled={loading} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Nom</Label>
        <Input id="lastName" placeholder="Nom" value={lastName} onChange={e => setLastName(e.target.value)} disabled={loading} />
      </div>
      <Button variant="hero" className="w-full" onClick={onSubmit} disabled={!firstName.trim() || !lastName.trim() || loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuer"}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </Button>
      <Button variant="ghost" className="w-full text-muted-foreground" onClick={onFinishLater}>
        <LogOut className="w-4 h-4 mr-2" />
        Terminer plus tard
      </Button>
    </div>
  </div>;
const AddressStep = ({
  address,
  setAddress,
  onSubmit,
  onBack,
  loading,
  onFinishLater
}: {
  address: string;
  setAddress: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
  onFinishLater: () => void;
}) => <div className="space-y-6">
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
      <Input placeholder="12 Rue des Lilas, 75011 Paris" value={address} onChange={e => setAddress(e.target.value)} disabled={loading} />
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
        <Button variant="hero" className="flex-1" onClick={onSubmit} disabled={!address.trim() || loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuer"}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
      <Button variant="ghost" className="w-full text-muted-foreground" onClick={onFinishLater}>
        <LogOut className="w-4 h-4 mr-2" />
        Terminer plus tard
      </Button>
    </div>
  </div>;
const PaymentStep = ({
  addressData,
  onBack,
  loading,
  setLoading,
  onFinishLater
}: {
  addressData: AddressData;
  onBack: () => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  onFinishLater: () => void;
}) => {
  const [extraDomings, setExtraDomings] = useState(0);
  const [acceptedCGU, setAcceptedCGU] = useState(false);
  const {
    toast
  } = useToast();
  const subscriptionPrice = 12; // 12€
  const domingPrice = 7; // 7€
  const extraDomingsTotal = extraDomings * domingPrice;
  const total = subscriptionPrice + extraDomingsTotal;
  const handlePayment = async () => {
    if (!acceptedCGU) {
      toast({
        title: "Conditions requises",
        description: "Veuillez accepter les conditions générales d'utilisation",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          extraDomings,
          isNewAnr: addressData.isNewAnr,
          addressData: {
            address: addressData.address,
            latitude: addressData.latitude,
            longitude: addressData.longitude
          },
          habitationName: addressData.habitationName,
          existingAnrId: addressData.existingAnrId
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        // Redirect to Stripe Checkout in new tab
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la session de paiement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Récapitulatif</h2>
        <p className="text-muted-foreground">
          Votre commande ANR
        </p>
      </div>

      {/* Order summary */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="p-4 space-y-3">
          {/* Subscription */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Abonnement ANR (1 an)</p>
              <p className="text-xs text-muted-foreground">Reconduction tacite annuelle</p>
            </div>
            <p className="font-semibold">{subscriptionPrice},00 €</p>
          </div>

          {/* Free Doming */}
          {addressData.isNewAnr && <div className="flex justify-between items-center text-success">
              <div>
                <p className="font-medium">Doming QR/NFC</p>
                <p className="text-xs opacity-80">Inclus pour nouvelle ANR</p>
              </div>
              <p className="font-semibold">OFFERT</p>
            </div>}

          <div className="border-t border-border my-2" />

          {/* Extra Domings */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Domings supplémentaires</p>
                <p className="text-xs text-muted-foreground">{domingPrice}€ / pièce</p>
              </div>
              <p className="font-semibold">{extraDomingsTotal},00 €</p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setExtraDomings(Math.max(0, extraDomings - 1))} disabled={extraDomings === 0}>
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-12 text-center font-semibold text-lg">{extraDomings}</span>
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setExtraDomings(extraDomings + 1)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="bg-primary/5 p-4 border-t border-border">
          <div className="flex justify-between items-center">
            <p className="font-bold text-lg">TOTAL</p>
            <p className="font-bold text-xl text-primary">{total},00 €</p>
          </div>
        </div>
      </div>

      {/* CGU Checkbox */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox id="cgu" checked={acceptedCGU} onCheckedChange={checked => setAcceptedCGU(checked === true)} />
          <label htmlFor="cgu" className="text-sm leading-relaxed cursor-pointer">
            J'accepte les{" "}
            <a href="/cgu" target="_blank" className="text-primary underline">
              conditions générales d'utilisation
            </a>{" "}
            et la reconduction tacite annuelle de mon abonnement.
          </label>
        </div>

        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <FileText className="w-4 h-4 flex-shrink-0 text-primary" />
            <p>
              Votre abonnement sera renouvelé automatiquement chaque année au tarif en vigueur. 
              Vous pouvez annuler à tout moment depuis votre compte.
            </p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-3 mb-[29px]">
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onBack} disabled={loading}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <Button variant="hero" className="flex-1" onClick={handlePayment} disabled={!acceptedCGU || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
                Payer {total},00 €
                <ArrowRight className="w-4 h-4" />
              </>}
          </Button>
        </div>
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={onFinishLater}>
          <LogOut className="w-4 h-4 mr-2" />
          Terminer plus tard
        </Button>
      </div>
    </div>;
};
const SuccessStep = ({
  onGoToDashboard
}: {
  onGoToDashboard: () => void;
}) => <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-success" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Paiement validé !</h2>
      <p className="text-muted-foreground">
        Votre ANR est créé et votre Doming sera expédié prochainement
      </p>
    </div>

    <Button variant="hero" className="w-full" onClick={onGoToDashboard}>
      Accéder à mon tableau de bord
      <ArrowRight className="w-4 h-4" />
    </Button>
  </div>;
export default RegisterForm;