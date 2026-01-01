import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Phone, Loader2, DoorOpen, ScanFace, QrCode, UserPlus, Home, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import VisitorFooter from "@/components/layout/VisitorFooter";
import logoAnr from "@/assets/logo-anr.png";
import { BleOpenDoorButton } from "@/components/door/BleOpenDoorButton";
import { FaceVerificationDialog } from "@/components/door/FaceVerificationDialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ResidentSelector } from "@/components/call/ResidentSelector";

interface ANRData {
  id: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  habitationCount: number;
  singleHabitationId?: string;
  singleHabitationResidentCount?: number;
}

interface ScheduledAccess {
  id: string;
  name: string;
  time_from: string;
  time_to: string;
  requireFaceRecognition: boolean;
}

const ANRLanding = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [anrData, setAnrData] = useState<ANRData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validAccess, setValidAccess] = useState<ScheduledAccess | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [faceVerificationOpen, setFaceVerificationOpen] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [showRegistrationChoice, setShowRegistrationChoice] = useState(false);
  const [showResidentSelector, setShowResidentSelector] = useState(false);
  const [hasBusinessCard, setHasBusinessCard] = useState<boolean | null>(null);

  // Check if user has a business card
  useEffect(() => {
    const checkBusinessCard = async () => {
      if (!user) {
        setHasBusinessCard(false);
        return;
      }
      
      const { data: card } = await supabase
        .from("visitor_business_cards")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      setHasBusinessCard(!!card);
    };
    
    checkBusinessCard();
  }, [user]);

  useEffect(() => {
    const fetchANR = async () => {
      if (!code) {
        setError("Code ANR manquant");
        setLoading(false);
        return;
      }

      try {
        // Fetch ANR by code
        const { data: anr, error: anrError } = await supabase
          .from("anrs")
          .select("id, code, address, latitude, longitude")
          .eq("code", code)
          .maybeSingle();

        if (anrError) throw anrError;

        if (!anr) {
          setError("ANR introuvable");
          setLoading(false);
          return;
        }

        // Count habitations and get single habitation details if only one
        const { data: habitations, count } = await supabase
          .from("habitations")
          .select("id", { count: "exact" })
          .eq("anr_id", anr.id);

        let singleHabitationId: string | undefined;
        let singleHabitationResidentCount = 0;

        if (count === 1 && habitations && habitations.length === 1) {
          singleHabitationId = habitations[0].id;
          // Count residents for this single habitation
          const { count: residentCount } = await supabase
            .from("residents")
            .select("id", { count: "exact", head: true })
            .eq("habitation_id", singleHabitationId)
            .eq("status", "verified");
          singleHabitationResidentCount = residentCount || 0;
        }

        setAnrData({
          ...anr,
          habitationCount: count || 0,
          singleHabitationId,
          singleHabitationResidentCount,
        });

        // Check if current user has valid scheduled access
        await checkScheduledAccess(anr.id);
      } catch (err) {
        console.error("[ANRLanding] Error:", err);
        setError("Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    };

    fetchANR();
  }, [code]);

  // Check if the authenticated user has a valid scheduled access for this ANR right now
  const checkScheduledAccess = async (anrId: string) => {
    setCheckingAccess(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCheckingAccess(false);
        return;
      }

      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
      const today = now.toISOString().split('T')[0]; // "YYYY-MM-DD"

      // First, get the user's ANR codes (as beneficiary might be identified by their ANR code)
      const { data: userResidences } = await supabase
        .from("residents")
        .select("habitation_id, habitations!inner(anr_id, anrs!inner(code))")
        .eq("user_id", user.id)
        .eq("status", "verified");

      const userAnrCodes = userResidences?.map((r: any) => r.habitations?.anrs?.code).filter(Boolean) || [];

      // Query scheduled accesses for this ANR:
      // 1. Granted directly to this user (granted_to_user = user.id)
      // 2. OR granted to beneficiary with matching ANR code (beneficiary_anr_code in user's ANR codes)
      const { data: accesses, error: accessError } = await supabase
        .from("door_scheduled_access")
        .select("id, name, time_from, time_to, days_of_week, valid_from, valid_until, is_active, granted_to_user, beneficiary_anr_code, require_face_recognition_entry")
        .eq("anr_id", anrId)
        .eq("is_active", true);

      if (accessError) {
        console.error("[ANRLanding] Error checking access:", accessError);
        setCheckingAccess(false);
        return;
      }

      // Filter accesses that match this user
      const userAccesses = accesses?.filter(access => {
        // Direct grant to user
        if (access.granted_to_user === user.id) return true;
        // Grant via beneficiary ANR code
        if (access.beneficiary_anr_code && userAnrCodes.includes(access.beneficiary_anr_code)) return true;
        return false;
      });

      // Find a valid access for current time
      const validAccessNow = userAccesses?.find(access => {
        // Check day of week
        if (access.days_of_week && !access.days_of_week.includes(currentDay)) {
          return false;
        }

        // Check date range
        if (access.valid_from && today < access.valid_from) return false;
        if (access.valid_until && today > access.valid_until) return false;

        // Check time range
        if (currentTime < access.time_from || currentTime > access.time_to) {
          return false;
        }

        return true;
      });

      if (validAccessNow) {
        setValidAccess({
          id: validAccessNow.id,
          name: validAccessNow.name,
          time_from: validAccessNow.time_from,
          time_to: validAccessNow.time_to,
          requireFaceRecognition: validAccessNow.require_face_recognition_entry || false,
        });
      }
    } catch (err) {
      console.error("[ANRLanding] Error checking scheduled access:", err);
    } finally {
      setCheckingAccess(false);
    }
  };

  const openNavigation = (app: 'apple' | 'google' | 'waze' | 'default') => {
    if (!anrData) return;
    
    const { latitude, longitude, address } = anrData;
    const encodedAddress = encodeURIComponent(address);
    
    switch (app) {
      case 'apple':
        window.location.href = `https://maps.apple.com/?daddr=${latitude},${longitude}&q=${encodedAddress}`;
        break;
      case 'google':
        window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
        break;
      case 'waze':
        window.location.href = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
        break;
      case 'default':
        // Use geo: URI for native app chooser (works on Android)
        window.location.href = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedAddress})`;
        break;
    }
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const handleCall = () => {
    if (!anrData) return;
    
    // Check if user is authenticated and has business card
    if (!user || hasBusinessCard === false) {
      setShowRegistrationChoice(true);
      return;
    }
    
    if (anrData.habitationCount > 1) {
      // Multi-habitat: go to selection page (pass code, not UUID)
      navigate(`/multi-habitat/${anrData.code}`);
    } else if (anrData.singleHabitationResidentCount && anrData.singleHabitationResidentCount > 1) {
      // Single habitat with multiple residents: show resident selector
      setShowResidentSelector(true);
    } else {
      // Single habitat with single resident: go directly to call (pass code, not UUID)
      navigate(`/call/${anrData.code}`);
    }
  };

  const handleResidentSelect = (targetUserId: string | null) => {
    if (!anrData) return;
    navigate(`/call/${anrData.code}`, {
      state: {
        habitationId: anrData.singleHabitationId,
        targetUserId,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !anrData) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="p-8 rounded-2xl border-2 border-destructive bg-card text-center max-w-md">
            <img src={logoAnr} alt="ANR" className="w-24 h-24 mb-6 opacity-50 mx-auto" />
            <h1 className="text-xl font-semibold text-destructive mb-2">
              {error || "ANR introuvable"}
            </h1>
            <p className="text-muted-foreground mb-6">
              Ce code ANR n'existe pas ou a été supprimé.
            </p>
            <Button onClick={() => navigate("/visitor")} variant="outline" className="border-2 border-blue-500">
              <QrCode className="w-4 h-4 mr-2 text-blue-500" />
              Scanner un autre ANR
            </Button>
          </div>
        </div>
        <VisitorFooter />
      </div>
    );
  }

  // Show resident selector for single habitation with multiple residents
  if (showResidentSelector && anrData.singleHabitationId) {
    return (
      <ResidentSelector
        anrCode={anrData.code}
        habitationId={anrData.singleHabitationId}
        habitationName={anrData.address}
        address={anrData.address}
        onSelect={handleResidentSelect}
        onBack={() => setShowResidentSelector(false)}
      />
    );
  }

  // Show registration choice screen
  if (showRegistrationChoice) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/20">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRegistrationChoice(false)}
            className="absolute top-4 left-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>

          {/* Logo */}
          <img src={logoAnr} alt="ANR" className="w-16 h-16 mb-6" />
          
          <h1 className="text-2xl font-bold text-center mb-2">
            Bienvenue sur ANR
          </h1>
          <p className="text-muted-foreground text-center mb-8 max-w-sm">
            Pour appeler ce résident, choisissez comment vous souhaitez continuer :
          </p>

          <div className="w-full max-w-md space-y-4">
            {/* Option 1: Free visitor registration */}
            <Card className="border-2 border-primary hover:border-primary/80 transition-colors cursor-pointer" onClick={() => navigate("/visitor-login", { state: { returnTo: `/anr/${code}` } })}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      M'inscrire gratuitement
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Créez votre carte de visite numérique avec votre email pour contacter les résidents.
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        100% gratuit
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Appels vidéo illimités
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Messages aux résidents
                      </li>
                    </ul>
                  </div>
                </div>
                <Button className="w-full mt-4" variant="default">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Créer ma carte de visite gratuite
                </Button>
              </CardContent>
            </Card>

            {/* Option 2: Subscribe and create interphone */}
            <Card className="border-2 border-amber-500 hover:border-amber-500/80 transition-colors cursor-pointer" onClick={() => navigate("/register", { state: { returnTo: `/anr/${code}` } })}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Home className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      Créer mon Interphone Numérique
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Abonnez-vous et recevez votre propre ANR pour votre domicile ou entreprise.
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Votre propre code ANR
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Réception de colis sécurisée
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Gestion des accès à distance
                      </li>
                    </ul>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-white">
                  <Home className="w-4 h-4 mr-2" />
                  M'abonner et créer mon ANR
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Already have account */}
          <p className="text-sm text-muted-foreground mt-8">
            Déjà inscrit ?{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={() => navigate("/login", { state: { returnTo: `/anr/${code}` } })}
            >
              Se connecter
            </Button>
          </p>
        </div>
        <VisitorFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/20">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Logo */}
        <img src={logoAnr} alt="ANR" className="w-20 h-20 mb-6" />
        
        {/* ANR Code */}
        <div className="bg-white rounded-2xl px-6 py-3 mb-4 shadow-sm border-2 border-primary">
          <p className="text-2xl font-mono font-bold tracking-wider text-slate-900">
            {anrData.code}
          </p>
        </div>

        {/* Address */}
        <Card className="w-full max-w-md mb-8 border-2 border-blue-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Adresse</p>
                <p className="font-medium">{anrData.address}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="w-full max-w-md space-y-4">
          {/* Open Door Button - Only for users with valid scheduled access */}
          {validAccess && (
            <div className="space-y-2 p-4 rounded-lg border-2 border-green-500 bg-green-500/5">
              <div className="text-center">
                <p className="text-sm text-green-600 font-medium">
                  Accès autorisé : {validAccess.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {validAccess.time_from} - {validAccess.time_to}
                </p>
                {validAccess.requireFaceRecognition && (
                  <p className="text-xs text-amber-600 mt-1">
                    <ScanFace className="inline h-3 w-3 mr-1" />
                    Reconnaissance faciale requise
                  </p>
                )}
              </div>
              
              {/* If face recognition required and not yet verified, show verification button */}
              {validAccess.requireFaceRecognition && !faceVerified ? (
                <Button
                  onClick={() => setFaceVerificationOpen(true)}
                  className="w-full h-24 text-lg bg-amber-600 hover:bg-amber-700"
                  size="lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <ScanFace className="h-6 w-6" />
                    <span>Vérifier mon identité</span>
                  </div>
                </Button>
              ) : (
                <BleOpenDoorButton 
                  anrId={anrData.id} 
                  anrCode={anrData.code}
                />
              )}
            </div>
          )}

          {isIOS ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full h-14 text-base gap-3 border-2 border-yellow-500">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-yellow-500" />
                  </div>
                  Naviguer vers cette adresse
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72">
                <DropdownMenuItem onClick={() => openNavigation('apple')}>
                  Plans (Apple Maps)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openNavigation('google')}>
                  Google Maps
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openNavigation('waze')}>
                  Waze
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => openNavigation('default')}
              variant="outline"
              className="w-full h-14 text-base gap-3 border-2 border-yellow-500"
            >
              <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-yellow-500" />
              </div>
              Naviguer vers cette adresse
            </Button>
          )}

          <Button
            onClick={handleCall}
            variant={validAccess ? "outline" : "hero"}
            className={`w-full h-14 text-base gap-3 ${validAccess ? "border-2 border-purple-500" : ""}`}
          >
            <div className={`w-8 h-8 rounded-full ${validAccess ? "bg-purple-500/10" : "bg-white/20"} flex items-center justify-center`}>
              <Phone className={`w-4 h-4 ${validAccess ? "text-purple-500" : "text-white"}`} />
            </div>
            Appeler cet interphone
          </Button>
        </div>

        {/* Info text */}
        <p className="text-xs text-muted-foreground text-center mt-8 max-w-sm">
          {anrData.habitationCount > 1 
            ? `${anrData.habitationCount} résidences à cette adresse`
            : "1 résidence à cette adresse"
          }
        </p>
      </div>

      {/* Face Verification Dialog */}
      <FaceVerificationDialog
        open={faceVerificationOpen}
        onOpenChange={setFaceVerificationOpen}
        onVerified={() => {
          setFaceVerified(true);
          setFaceVerificationOpen(false);
        }}
        action="ENTRY"
      />

      <VisitorFooter />
    </div>
  );
};

export default ANRLanding;