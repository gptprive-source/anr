import { useState } from "react";
import { Phone, User, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { geocodeAddress } from "@/lib/geocoding";

type Step = "phone" | "profile" | "address";

const phoneSchema = z.string().regex(/^\+?[0-9]{10,15}$/, "Numéro de téléphone invalide");

const RegisterForm = () => {
  const [step, setStep] = useState<Step>("phone");
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

  const handlePhoneSubmit = async () => {
    const formattedPhone = formatPhone(phone);
    const validation = phoneSchema.safeParse(formattedPhone);
    
    if (!validation.success) {
      toast({
        title: "Erreur",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setPhone(formattedPhone);
    setLoading(true);
    
    try {
      // Créer un compte anonyme
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) throw error;

      if (data.user) {
        // Mettre à jour le profil avec le numéro
        await supabase
          .from("profiles")
          .update({ 
            phone_number: formattedPhone,
            phone_verified: false // Sera vérifié plus tard via appel OVH
          })
          .eq("id", data.user.id);
      }

      setStep("profile");
      toast({
        title: "Compte créé",
        description: "Complétez maintenant votre profil",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création du compte",
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

      if (error) {
        throw error;
      }

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

      // Geocode the address to get real GPS coordinates
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

      // Generate a unique ANR code
      const anrCode = `ANR-${Date.now().toString(36).toUpperCase()}`;
      const { latitude, longitude } = geoResult;

      // Check if ANR already exists for this address
      const { data: existingAnr } = await supabase
        .from("anrs")
        .select("id")
        .eq("address", address.trim())
        .maybeSingle();

      let anrId: string;

      if (existingAnr) {
        // ANR exists - add as new habitation
        anrId = existingAnr.id;
      } else {
        // Create new ANR
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

      toast({
        title: "ANR créé",
        description: existingAnr 
          ? "Vous avez été ajouté comme habitant à cette adresse"
          : "Votre ANR a été créé avec succès",
      });

      navigate("/dashboard");
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
          {["phone", "profile", "address"].map((s, i) => (
            <div
              key={s}
              className={`h-1 w-12 rounded-full transition-colors ${
                ["phone", "profile", "address"].indexOf(step) >= i
                  ? "bg-primary"
                  : "bg-secondary"
              }`}
            />
          ))}
        </div>

        <div className="glass-effect rounded-3xl p-8 card-shadow">
          {step === "phone" && (
            <PhoneStep
              phone={phone}
              setPhone={setPhone}
              onSubmit={handlePhoneSubmit}
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
        </div>

        {step === "phone" && (
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

const PhoneStep = ({
  phone,
  setPhone,
  onSubmit,
  loading,
}: {
  phone: string;
  setPhone: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Phone className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Créez votre ANR</h2>
      <p className="text-muted-foreground">
        Entrez votre numéro de téléphone pour commencer
      </p>
    </div>

    <div className="space-y-4">
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
        disabled={!phone.trim() || loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continuer"}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </Button>
    </div>

    <p className="text-xs text-center text-muted-foreground">
      La vérification du numéro sera effectuée ultérieurement
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

export default RegisterForm;
