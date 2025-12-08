import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Phone, Loader2, DoorOpen } from "lucide-react";
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

interface ANRData {
  id: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  habitationCount: number;
}

interface ScheduledAccess {
  id: string;
  name: string;
  time_from: string;
  time_to: string;
}

const ANRLanding = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [anrData, setAnrData] = useState<ANRData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validAccess, setValidAccess] = useState<ScheduledAccess | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(false);

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

        // Count habitations
        const { count } = await supabase
          .from("habitations")
          .select("id", { count: "exact", head: true })
          .eq("anr_id", anr.id);

        setAnrData({
          ...anr,
          habitationCount: count || 0,
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

      // Query scheduled accesses granted to this user for this ANR
      const { data: accesses, error: accessError } = await supabase
        .from("door_scheduled_access")
        .select("id, name, time_from, time_to, days_of_week, valid_from, valid_until, is_active")
        .eq("anr_id", anrId)
        .eq("granted_to_user", user.id)
        .eq("is_active", true);

      if (accessError) {
        console.error("[ANRLanding] Error checking access:", accessError);
        setCheckingAccess(false);
        return;
      }

      // Find a valid access for current time
      const validAccessNow = accesses?.find(access => {
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
    
    if (anrData.habitationCount > 1) {
      // Multi-habitat: go to selection page (pass code, not UUID)
      navigate(`/multi-habitat/${anrData.code}`);
    } else {
      // Single habitat: go directly to call (pass code, not UUID)
      navigate(`/call/${anrData.code}`);
    }
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
          <img src={logoAnr} alt="ANR" className="w-24 h-24 mb-6 opacity-50" />
          <h1 className="text-xl font-semibold text-destructive mb-2">
            {error || "ANR introuvable"}
          </h1>
          <p className="text-muted-foreground text-center mb-6">
            Ce code ANR n'existe pas ou a été supprimé.
          </p>
          <Button onClick={() => navigate("/visitor")} variant="outline">
            Scanner un autre ANR
          </Button>
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
        <div className="bg-white rounded-2xl px-6 py-3 mb-4 shadow-sm">
          <p className="text-2xl font-mono font-bold tracking-wider text-slate-900">
            {anrData.code}
          </p>
        </div>

        {/* Address */}
        <Card className="w-full max-w-md mb-8">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
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
            <div className="space-y-2">
              <div className="text-center">
                <p className="text-sm text-green-600 font-medium">
                  Accès autorisé : {validAccess.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {validAccess.time_from} - {validAccess.time_to}
                </p>
              </div>
              <BleOpenDoorButton 
                anrId={anrData.id} 
                anrCode={anrData.code}
              />
            </div>
          )}

          {isIOS ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full h-14 text-base gap-3">
                  <MapPin className="w-5 h-5" />
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
              className="w-full h-14 text-base gap-3"
            >
              <MapPin className="w-5 h-5" />
              Naviguer vers cette adresse
            </Button>
          )}

          <Button
            onClick={handleCall}
            variant={validAccess ? "outline" : "hero"}
            className="w-full h-14 text-base gap-3"
          >
            <Phone className="w-5 h-5" />
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

      <VisitorFooter />
    </div>
  );
};

export default ANRLanding;
