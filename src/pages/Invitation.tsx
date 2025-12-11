import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle, Home, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import logoAnr from "@/assets/logo-anr.png";

interface InvitationData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  habitation_id: string;
  expires_at: string;
  used_at: string | null;
  habitation?: {
    name: string;
    anrs: {
      address: string;
    };
  };
}

const Invitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"loading" | "register" | "success" | "error">("loading");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Get code and clean it (fix quoted-printable encoding artifacts like "3dXXX" instead of "XXX")
  let code = searchParams.get("code");
  if (code && code.toLowerCase().startsWith("3d")) {
    // This happens when email clients don't properly decode quoted-printable "=3d" → "="
    console.log("[Invitation] Detected quoted-printable artifact, cleaning code:", code);
    code = code.substring(2); // Remove "3d" prefix
  }

  useEffect(() => {
    if (code) {
      validateInvitation();
    } else {
      setError("Code d'invitation manquant");
      setStep("error");
      setLoading(false);
    }
  }, [code]);

  // If user is already logged in and invitation is valid, try to accept it
  useEffect(() => {
    if (user && invitation && step === "register") {
      acceptInvitationForExistingUser();
    }
  }, [user, invitation, step]);

  const validateInvitation = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("resident_invitations")
        .select(`
          id,
          email,
          first_name,
          last_name,
          habitation_id,
          expires_at,
          used_at,
          habitations (
            name,
            anrs (
              address
            )
          )
        `)
        .eq("code", code)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError("Invitation invalide ou expirée");
        setStep("error");
        return;
      }

      // Check if already used
      if (data.used_at) {
        setError("Cette invitation a déjà été utilisée");
        setStep("error");
        return;
      }

      // Check expiration
      if (new Date(data.expires_at) < new Date()) {
        setError("Cette invitation a expiré");
        setStep("error");
        return;
      }

      console.log("[Invitation] Data received:", JSON.stringify(data, null, 2));
      console.log("[Invitation] first_name:", data.first_name);
      console.log("[Invitation] last_name:", data.last_name);
      
      setInvitation({
        ...data,
        habitation: data.habitations as any,
      });
      // Pre-fill form fields from invitation
      setEmail(data.email || "");
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      
      console.log("[Invitation] Setting firstName to:", data.first_name || "");
      console.log("[Invitation] Setting lastName to:", data.last_name || "");
      
      setStep("register");
    } catch (err: any) {
      console.error("[Invitation] Error:", err);
      setError(err.message || "Erreur lors de la validation");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitationForExistingUser = async () => {
    if (!user || !invitation) return;

    setSubmitting(true);
    try {
      // Check if user email matches invitation
      if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        toast({
          title: "Email incorrect",
          description: "Vous êtes connecté avec un email différent de l'invitation",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Call edge function to accept invitation
      const { data, error } = await supabase.functions.invoke("accept-invitation", {
        body: {
          code,
          userId: user.id,
          email: user.email,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStep("success");
      toast({
        title: "Bienvenue !",
        description: "Vous avez rejoint l'habitation avec succès",
      });
    } catch (err: any) {
      console.error("[Invitation] Accept error:", err);
      
      if (err.message?.includes("Déjà résident")) {
        toast({
          title: "Déjà résident",
          description: "Vous êtes déjà résident de cette habitation",
        });
        navigate("/dashboard");
        return;
      }

      toast({
        title: "Erreur",
        description: err.message || "Impossible de rejoindre l'habitation",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!invitation) return;

    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir votre prénom et nom",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Mot de passe trop court",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Call edge function to create user and accept invitation
      const { data, error } = await supabase.functions.invoke("accept-invitation", {
        body: {
          code,
          email: invitation.email,
          firstName,
          lastName,
          password,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStep("success");
      toast({
        title: "Compte créé !",
        description: "Vous pouvez maintenant vous connecter",
      });
    } catch (err: any) {
      console.error("[Invitation] Register error:", err);
      
      if (err.message?.includes("déjà enregistré") || err.message?.includes("already registered")) {
        toast({
          title: "Email déjà utilisé",
          description: "Connectez-vous avec votre compte existant",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      toast({
        title: "Erreur",
        description: err.message || "Impossible de créer le compte",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 p-6 rounded-2xl border-2 border-destructive bg-card">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto border-2 border-destructive">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Invitation invalide</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => navigate("/")} variant="outline" className="border-2 border-blue-500">
            <Home className="w-4 h-4 mr-2 text-blue-500" />
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 p-6 rounded-2xl border-2 border-green-500 bg-card">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto border-2 border-green-500">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold">Bienvenue !</h1>
          <p className="text-muted-foreground">
            Vous avez rejoint l'habitation avec succès.
            {!user && " Vérifiez votre email pour activer votre compte."}
          </p>
          <Button onClick={() => navigate(user ? "/dashboard" : "/login")} className="bg-green-500 hover:bg-green-600">
            {user ? "Aller au tableau de bord" : "Se connecter"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img src={logoAnr} alt="ANR" className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Invitation à rejoindre</h1>
        </div>

        {/* Habitation info */}
        {invitation?.habitation && (
          <div className="p-4 rounded-lg bg-green-500/10 border-2 border-green-500 text-center">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <Home className="w-5 h-5 text-green-500" />
            </div>
            <p className="font-semibold">{invitation.habitation.name}</p>
            <p className="text-sm text-muted-foreground">
              {invitation.habitation.anrs?.address}
            </p>
          </div>
        )}

        {/* Already logged in */}
        {user ? (
          <div className="space-y-4 p-4 rounded-lg border-2 border-purple-500">
            <p className="text-center text-muted-foreground">
              Connecté en tant que <strong>{user.email}</strong>
            </p>
            <Button
              onClick={acceptInvitationForExistingUser}
              disabled={submitting}
              className="w-full bg-purple-500 hover:bg-purple-600"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Rejoindre cette habitation"
              )}
            </Button>
          </div>
        ) : (
          /* Registration form */
          <div className="space-y-4 p-4 rounded-lg border-2 border-blue-500">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-3 h-3 text-blue-500" />
                </div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="pl-12 bg-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <User className="w-3 h-3 text-orange-500" />
                  </div>
                  <Input
                    id="firstName"
                    value={firstName}
                    disabled
                    className="pl-12 bg-muted"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Lock className="w-3 h-3 text-purple-500" />
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="pl-12"
                  disabled={submitting}
                />
              </div>
            </div>

            <Button
              onClick={handleRegister}
              disabled={submitting || !firstName || !lastName || !password}
              className="w-full"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Créer mon compte et rejoindre"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Vous avez déjà un compte ?{" "}
              <Button variant="link" className="p-0 h-auto text-blue-500" onClick={() => navigate("/login")}>
                Connectez-vous
              </Button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invitation;