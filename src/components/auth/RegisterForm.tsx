import { useState, useEffect, useRef } from "react";
import { Mail, User, MapPin, ArrowRight, ArrowLeft, Loader2, Lock, CheckCircle, CreditCard, Plus, Minus, FileText, LogOut, Eye, EyeOff, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { geocodeAddress as geocodeAddressApi } from "@/lib/geocoding";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import RegistrationBusinessCardStep from "./RegistrationBusinessCardStep";

type Step = "credentials" | "email-sent" | "profile" | "address" | "payment" | "business-card" | "success";
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

interface RegisterFormProps {
  onBack?: () => void;
}

const RegisterForm = ({ onBack }: RegisterFormProps) => {
  const [step, setStep] = useState<Step>("credentials");
  const [anrCode, setAnrCode] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [addressFields, setAddressFields] = useState({
    streetNumber: "",
    streetNumberComplement: "",
    streetType: "",
    streetName: "",
    addressComplement: "",
    apartment: "",
    postalCode: "",
    city: ""
  });
  const [loading, setLoading] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  
  // Generate device ID on mount (for phone verification later)
  useEffect(() => {
    if (!localStorage.getItem("anr_device_id")) {
      const deviceId = crypto.randomUUID();
      localStorage.setItem("anr_device_id", deviceId);
      console.log("[RegisterForm] Generated device ID:", deviceId);
    }
  }, []);
  
  const [referralCode, setReferralCode] = useState<string | null>(() => {
    // Initialize from localStorage on mount (persists across tabs/sessions)
    return localStorage.getItem("anr_referral_code") || null;
  });
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

  // Store referral code from URL (using localStorage to persist across tabs/sessions)
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      setReferralCode(refCode);
      localStorage.setItem("anr_referral_code", refCode);
      console.log("[REFERRAL] Stored referral code in localStorage:", refCode);
      // Clean URL but keep ref in storage
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("ref");
      window.history.replaceState({}, "", `/register${newParams.toString() ? `?${newParams.toString()}` : ""}`);
    } else {
      // Check if we have a stored referral code
      const storedRef = localStorage.getItem("anr_referral_code");
      if (storedRef) {
        setReferralCode(storedRef);
        console.log("[REFERRAL] Retrieved referral code from localStorage:", storedRef);
      }
    }
  }, [searchParams]);

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
  const [isProcessingPayment, setIsProcessingPayment] = useState(() => {
    // Initialize as true if we detect payment params in URL
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("payment") === "success" && !!urlParams.get("session_id");
  });

  // CRITICAL: Runs ONCE on mount - checks URL and localStorage for pending payment
  useEffect(() => {
    // Read directly from window.location to avoid React state timing issues
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    const sessionIdFromUrl = urlParams.get("session_id");
    const pendingSessionId = localStorage.getItem("anr_pending_session_id");
    
    console.log("[RegisterForm] MOUNT CHECK - paymentStatus:", paymentStatus, "sessionIdFromUrl:", sessionIdFromUrl, "pendingSessionId:", pendingSessionId);
    
    // Determine which session ID to use (URL takes priority)
    const sessionToVerify = sessionIdFromUrl || pendingSessionId;
    
    if (!sessionToVerify) {
      console.log("[RegisterForm] No session to verify");
      return;
    }
    
    // Skip if already processing
    if (isVerifyingRef.current) {
      console.log("[RegisterForm] Already verifying, skipping");
      return;
    }
    if (hasProcessedSessionRef.current === sessionToVerify) {
      console.log("[RegisterForm] Session already processed:", sessionToVerify);
      return;
    }
    
    console.log("[RegisterForm] Starting payment verification for:", sessionToVerify);
    
    // Mark as processing
    hasProcessedSessionRef.current = sessionToVerify;
    setIsProcessingPayment(true);
    
    // Store in localStorage for recovery
    localStorage.setItem("anr_pending_session_id", sessionToVerify);
    
    // Clear URL immediately to prevent re-triggers
    if (paymentStatus) {
      window.history.replaceState({}, "", "/register");
    }
    
    // Call verify function
    verifyPaymentAndFinalize(sessionToVerify);
  }, []); // Empty deps = runs ONCE on mount

  // Handle cancelled payment (separate effect for searchParams changes)
  useEffect(() => {
    if (searchParams.get("payment") === "cancelled") {
      window.history.replaceState({}, "", "/register");
      toast({
        title: "Paiement annulé",
        description: "Vous pouvez réessayer quand vous le souhaitez",
        variant: "destructive"
      });
      setStep("payment");
    }
  }, [searchParams, toast]);

  const verifyPaymentAndFinalize = async (sessionId: string, retryCount = 0) => {
    // Prevent multiple simultaneous calls
    if (isVerifyingRef.current) {
      console.log("[RegisterForm] Already verifying, skipping duplicate call");
      return;
    }
    isVerifyingRef.current = true;
    setLoading(true);
    setIsProcessingPayment(true);
    
    console.log("[RegisterForm] ========== VERIFY PAYMENT START ==========");
    console.log("[RegisterForm] Session ID:", sessionId);
    console.log("[RegisterForm] Retry count:", retryCount);
    
    try {
      // Try to get session, but don't fail if not available
      // The verify-payment function can work without auth using Stripe metadata
      const { data: { session } } = await supabase.auth.getSession();
      console.log("[RegisterForm] Auth session available:", !!session);
      console.log("[RegisterForm] Calling verify-payment edge function...");
      
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { sessionId }
      });
      
      console.log("[RegisterForm] verify-payment response:", { data, error });
      
      if (error) {
        console.error("[RegisterForm] Edge function error:", error);
        throw error;
      }
      if (data?.error) {
        console.error("[RegisterForm] Data error:", data.error);
        throw new Error(data.error);
      }

      console.log("[RegisterForm] Payment verified successfully!");
      
      // Clear localStorage data on SUCCESS only
      localStorage.removeItem("anr_register_address_data");
      localStorage.removeItem("anr_register_step");
      localStorage.removeItem("anr_pending_session_id");
      sessionStorage.removeItem("anr_referral_code");
      
      // Get ANR code for business card step
      if (data.anrCode) {
        setAnrCode(data.anrCode);
      }
      
      toast({
        title: data.alreadyProcessed ? "Inscription déjà finalisée" : data.isNewAnr ? "ANR créé avec succès !" : "Habitation ajoutée !",
        description: "Continuez avec votre carte de visite"
      });
      
      // Go to business card step instead of dashboard
      setStep("business-card");
    } catch (error: any) {
      console.error("[RegisterForm] ========== VERIFY PAYMENT ERROR ==========");
      console.error("[RegisterForm] Error:", error);
      console.error("[RegisterForm] Error message:", error?.message);

      // If it's a session/auth error and we haven't retried, try to refresh auth
      if (retryCount === 0 && (error.message?.includes("Session") || error.message?.includes("Auth"))) {
        console.log("[RegisterForm] Auth error, attempting refresh...");
        try {
          await supabase.auth.refreshSession();
          isVerifyingRef.current = false; // Reset to allow retry
          // Retry once after refresh
          return verifyPaymentAndFinalize(sessionId, 1);
        } catch (refreshError) {
          console.error("[RegisterForm] Session refresh failed:", refreshError);
        }
      }
      
      // Keep session ID in localStorage for manual recovery
      console.log("[RegisterForm] Keeping pending session ID for recovery:", sessionId);
      
      toast({
        title: "Erreur de vérification",
        description: error.message || "Impossible de vérifier le paiement. Contactez le support.",
        variant: "destructive"
      });

      setStep("payment");
    } finally {
      setLoading(false);
      setIsProcessingPayment(false);
      isVerifyingRef.current = false;
      console.log("[RegisterForm] ========== VERIFY PAYMENT END ==========");
    }
  };

  // Check if user is returning after email verification
  useEffect(() => {
    if (authLoading || initialCheckDone) return;
    if (searchParams.get("payment") || isProcessingPayment) return; // Don't check if handling payment return

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
          
          // Pre-fill name fields if available from profile
          if (profile?.first_name) setFirstName(profile.first_name);
          if (profile?.last_name) setLastName(profile.last_name);
          
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
  }, [user, authLoading, initialCheckDone, navigate, searchParams, isProcessingPayment]);
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
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://anr.lovable.app/register'
        }
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
    // Build address for geocoding (without apartment/complement that confuse Nominatim)
    const geocodeAddressParts = [
      `${addressFields.streetNumber}${addressFields.streetNumberComplement ? ' ' + addressFields.streetNumberComplement : ''}`,
      addressFields.streetType,
      addressFields.streetName
    ];
    const geocodeAddressStr = `${geocodeAddressParts.join(' ')}, ${addressFields.postalCode} ${addressFields.city}`;
    
    // Build full address for display (includes complements)
    const displayAddressParts = [...geocodeAddressParts];
    if (addressFields.addressComplement) {
      displayAddressParts.push(addressFields.addressComplement);
    }
    if (addressFields.apartment) {
      displayAddressParts.push(addressFields.apartment);
    }
    const fullAddress = `${displayAddressParts.join(' ')}, ${addressFields.postalCode} ${addressFields.city}`;
    
    if (!addressFields.streetNumber.trim() || !addressFields.streetType.trim() || 
        !addressFields.streetName.trim() || !addressFields.postalCode.trim() || 
        !addressFields.city.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir les champs obligatoires",
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
      const geoResult = await geocodeAddressApi(geocodeAddressStr);
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
      } = await supabase.from("anrs").select("id").eq("address", fullAddress).maybeSingle();
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
        address: fullAddress,
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

  // Show loading while verifying payment - MUST BE FIRST to prevent auth blocking
  if (isProcessingPayment || searchParams.get("payment") === "success") {
    return <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Vérification du paiement...</p>
      </div>;
  }

  // Show loading while checking user state
  if (!initialCheckDone && authLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {["credentials", "email-sent", "profile", "address", "payment", "business-card", "success"].map((s, i) => <div key={s} className={`h-1 w-8 rounded-full transition-colors ${["credentials", "email-sent", "profile", "address", "payment", "business-card", "success"].indexOf(step) >= i ? "bg-primary" : "bg-secondary"}`} />)}
        </div>

        <div className="glass-effect rounded-3xl p-8 card-shadow">
          {step === "credentials" && <CredentialsStep email={email} password={password} confirmPassword={confirmPassword} setEmail={setEmail} setPassword={setPassword} setConfirmPassword={setConfirmPassword} onSubmit={handleCredentialsSubmit} loading={loading} onBack={onBack} />}
          {step === "email-sent" && <EmailSentStep email={email} onResend={handleResendEmail} onBack={() => setStep("credentials")} loading={loading} />}
          {step === "profile" && <ProfileStep firstName={firstName} lastName={lastName} setFirstName={setFirstName} setLastName={setLastName} onSubmit={handleProfileSubmit} loading={loading} onFinishLater={handleFinishLater} />}
          {step === "address" && <AddressStep addressFields={addressFields} setAddressFields={setAddressFields} onSubmit={handleAddressSubmit} onBack={() => setStep("profile")} loading={loading} onFinishLater={handleFinishLater} />}
          {step === "payment" && addressData && <PaymentStep addressData={addressData} onBack={() => setStep("address")} loading={loading} setLoading={setLoading} onFinishLater={handleFinishLater} referralCode={referralCode} />}
          {step === "business-card" && <RegistrationBusinessCardStep userType="particulier" anrCode={anrCode} onComplete={() => navigate("/dashboard", { replace: true })} />}
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
  confirmPassword,
  setEmail,
  setPassword,
  setConfirmPassword,
  onSubmit,
  loading,
  onBack
}: {
  email: string;
  password: string;
  confirmPassword: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setConfirmPassword: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  onBack?: () => void;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
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
          <Input id="email" type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              id="password" 
              type={showPassword ? "text" : "password"} 
              placeholder="Minimum 6 caractères" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="pl-10 pr-10" 
              disabled={loading} 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              id="confirmPassword" 
              type={showConfirmPassword ? "text" : "password"} 
              placeholder="Confirmez votre mot de passe" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              className="pl-10 pr-10" 
              disabled={loading} 
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
          )}
        </div>

        {onBack && (
          <Button variant="outline" className="w-full" onClick={onBack} disabled={loading}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        )}

        <Button variant="hero" className="w-full" onClick={onSubmit} disabled={!email.trim() || !password.trim() || !confirmPassword.trim() || password !== confirmPassword || loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuer"}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};
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
interface AddressFields {
  streetNumber: string;
  streetNumberComplement: string;
  streetType: string;
  streetName: string;
  addressComplement: string;
  apartment: string;
  postalCode: string;
  city: string;
}

const STREET_TYPES = [
  "Rue", "Avenue", "Boulevard", "Allée", "Chemin", "Impasse", "Passage", 
  "Place", "Cours", "Voie", "Route", "Square", "Résidence", "Lotissement"
];

const AddressStep = ({
  addressFields,
  setAddressFields,
  onSubmit,
  onBack,
  loading,
  onFinishLater
}: {
  addressFields: AddressFields;
  setAddressFields: (v: AddressFields) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
  onFinishLater: () => void;
}) => {
  const updateField = (field: keyof AddressFields, value: string) => {
    setAddressFields({ ...addressFields, [field]: value });
  };

  const isValid = addressFields.streetNumber.trim() && 
                  addressFields.streetType.trim() && 
                  addressFields.streetName.trim() && 
                  addressFields.postalCode.trim() && 
                  addressFields.city.trim();

  return (
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

      <div className="space-y-3">
        {/* Numéro et complément */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="streetNumber" className="text-xs">Numéro de voie *</Label>
            <Input 
              id="streetNumber"
              placeholder="12" 
              value={addressFields.streetNumber} 
              onChange={e => updateField('streetNumber', e.target.value)} 
              disabled={loading} 
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="streetNumberComplement" className="text-xs">Complément</Label>
            <Input 
              id="streetNumberComplement"
              placeholder="bis, ter..." 
              value={addressFields.streetNumberComplement} 
              onChange={e => updateField('streetNumberComplement', e.target.value)} 
              disabled={loading} 
            />
          </div>
        </div>

        {/* Type de voie */}
        <div className="space-y-1">
          <Label htmlFor="streetType" className="text-xs">Type de voie *</Label>
          <Input 
            id="streetType"
            placeholder="Rue, Avenue, Boulevard..." 
            value={addressFields.streetType} 
            onChange={e => updateField('streetType', e.target.value)} 
            disabled={loading} 
          />
        </div>

        {/* Nom de la voie */}
        <div className="space-y-1">
          <Label htmlFor="streetName" className="text-xs">Nom de la voie *</Label>
          <Input 
            id="streetName"
            placeholder="des Lilas" 
            value={addressFields.streetName} 
            onChange={e => updateField('streetName', e.target.value)} 
            disabled={loading} 
          />
        </div>

        {/* Complément d'adresse */}
        <div className="space-y-1">
          <Label htmlFor="addressComplement" className="text-xs">Complément d'adresse</Label>
          <Input 
            id="addressComplement"
            placeholder="Bâtiment A, Entrée 2..." 
            value={addressFields.addressComplement} 
            onChange={e => updateField('addressComplement', e.target.value)} 
            disabled={loading} 
          />
        </div>

        {/* Appartement / étage */}
        <div className="space-y-1">
          <Label htmlFor="apartment" className="text-xs">Appartement / étage / porte</Label>
          <Input 
            id="apartment"
            placeholder="Apt 12, 3ème étage..." 
            value={addressFields.apartment} 
            onChange={e => updateField('apartment', e.target.value)} 
            disabled={loading} 
          />
        </div>

        {/* Code postal et Commune */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="postalCode" className="text-xs">Code postal *</Label>
            <Input 
              id="postalCode"
              placeholder="75011" 
              value={addressFields.postalCode} 
              onChange={e => updateField('postalCode', e.target.value)} 
              disabled={loading} 
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="city" className="text-xs">Commune *</Label>
            <Input 
              id="city"
              placeholder="Paris" 
              value={addressFields.city} 
              onChange={e => updateField('city', e.target.value)} 
              disabled={loading} 
            />
          </div>
        </div>

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
          <Button variant="hero" className="flex-1" onClick={onSubmit} disabled={!isValid || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuer"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </Button>
        </div>
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={onFinishLater}>
          <LogOut className="w-4 h-4 mr-2" />
          Terminer plus tard
        </Button>
      </div>
    </div>
  );
};
const PaymentStep = ({
  addressData,
  onBack,
  loading,
  setLoading,
  onFinishLater,
  referralCode
}: {
  addressData: AddressData;
  onBack: () => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  onFinishLater: () => void;
  referralCode?: string | null;
}) => {
  const [extraDomings, setExtraDomings] = useState(0);
  const [acceptedCGU, setAcceptedCGU] = useState(false);
  const {
    toast
  } = useToast();
  const subscriptionPrice = 36; // 36€/an (prix annuel)
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
          existingAnrId: addressData.existingAnrId,
          referralCode: referralCode || localStorage.getItem("anr_referral_code") || undefined,
          deviceId: localStorage.getItem("anr_device_id") || undefined
        }
      });
      console.log("[REFERRAL] Sent referralCode to checkout:", referralCode || localStorage.getItem("anr_referral_code"));
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        // Clear referral code from storage after successful checkout creation
        localStorage.removeItem("anr_referral_code");
        console.log("[REFERRAL] Cleared referral code from localStorage");
        // Redirect to Stripe Checkout - use location.href for mobile compatibility
        window.location.href = data.url;
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

      {/* Referral badge */}
      {referralCode && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
          <Gift className="w-5 h-5 text-purple-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Code parrain appliqué</p>
            <p className="text-xs text-muted-foreground">Votre parrain sera récompensé après votre paiement</p>
          </div>
          <Badge className="bg-purple-500 text-white">{referralCode}</Badge>
        </div>
      )}

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