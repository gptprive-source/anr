import { useState } from "react";
import { Phone, User, MapPin, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

type Step = "phone" | "verification" | "profile" | "address";

const RegisterForm = () => {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const navigate = useNavigate();

  const handlePhoneSubmit = () => {
    // In real app, this would trigger SMS validation
    setStep("verification");
  };

  const handleVerificationSubmit = () => {
    setStep("profile");
  };

  const handleProfileSubmit = () => {
    setStep("address");
  };

  const handleAddressSubmit = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {["phone", "verification", "profile", "address"].map((s, i) => (
            <div
              key={s}
              className={`h-1 w-12 rounded-full transition-colors ${
                ["phone", "verification", "profile", "address"].indexOf(step) >= i
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
            />
          )}
          {step === "verification" && (
            <VerificationStep
              phone={phone}
              code={verificationCode}
              setCode={setVerificationCode}
              onSubmit={handleVerificationSubmit}
              onBack={() => setStep("phone")}
            />
          )}
          {step === "profile" && (
            <ProfileStep
              firstName={firstName}
              lastName={lastName}
              setFirstName={setFirstName}
              setLastName={setLastName}
              onSubmit={handleProfileSubmit}
            />
          )}
          {step === "address" && (
            <AddressStep
              address={address}
              setAddress={setAddress}
              onSubmit={handleAddressSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const PhoneStep = ({
  phone,
  setPhone,
  onSubmit,
}: {
  phone: string;
  setPhone: (v: string) => void;
  onSubmit: () => void;
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
      />
      <Button
        variant="hero"
        className="w-full"
        onClick={onSubmit}
        disabled={!phone.trim()}
      >
        Continuer
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>

    <p className="text-xs text-center text-muted-foreground">
      <Shield className="w-3 h-3 inline mr-1" />
      Validation sécurisée par SMS crypté
    </p>
  </div>
);

const VerificationStep = ({
  phone,
  code,
  setCode,
  onSubmit,
  onBack,
}: {
  phone: string;
  code: string;
  setCode: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Shield className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Validation SMS</h2>
      <p className="text-muted-foreground">
        Un SMS va être envoyé depuis votre téléphone vers notre serveur
      </p>
    </div>

    <div className="p-4 rounded-xl bg-secondary/50 text-sm">
      <p className="font-medium mb-2">Comment ça marche ?</p>
      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
        <li>Cliquez sur "Envoyer le SMS"</li>
        <li>Votre app SMS s'ouvrira automatiquement</li>
        <li>Appuyez sur "Envoyer" (ne modifiez pas le message)</li>
        <li>Votre numéro sera validé automatiquement</li>
      </ol>
    </div>

    <div className="space-y-4">
      <Button variant="hero" className="w-full" onClick={onSubmit}>
        Envoyer le SMS de validation
      </Button>
      <Button variant="ghost" className="w-full" onClick={onBack}>
        Modifier le numéro
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
}: {
  firstName: string;
  lastName: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  onSubmit: () => void;
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
      />
      <Input
        placeholder="Nom"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
      />
      <Button
        variant="hero"
        className="w-full"
        onClick={onSubmit}
        disabled={!firstName.trim() || !lastName.trim()}
      >
        Continuer
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

const AddressStep = ({
  address,
  setAddress,
  onSubmit,
}: {
  address: string;
  setAddress: (v: string) => void;
  onSubmit: () => void;
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
        disabled={!address.trim()}
      >
        Créer mon ANR
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

export default RegisterForm;
