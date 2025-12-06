import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Phone, Loader2, MessageSquare } from "lucide-react";
import VisitorMessageDialog from "@/components/visitor/VisitorMessageDialog";
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

interface ANRData {
  id: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  habitationCount: number;
}

const ANRLanding = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [anrData, setAnrData] = useState<ANRData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [firstHabitationId, setFirstHabitationId] = useState<string | null>(null);

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

        // Count habitations and get first one for messages
        const { data: habitations, count } = await supabase
          .from("habitations")
          .select("id", { count: "exact" })
          .eq("anr_id", anr.id)
          .limit(1);

        if (habitations && habitations.length > 0) {
          setFirstHabitationId(habitations[0].id);
        }

        setAnrData({
          ...anr,
          habitationCount: count || 0,
        });
      } catch (err) {
        console.error("[ANRLanding] Error:", err);
        setError("Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    };

    fetchANR();
  }, [code]);

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
          {isIOS ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full h-16 text-lg gap-3">
                  <MapPin className="w-6 h-6" />
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
              className="w-full h-16 text-lg gap-3"
            >
              <MapPin className="w-6 h-6" />
              Naviguer vers cette adresse
            </Button>
          )}

          <Button
            onClick={handleCall}
            variant="hero"
            className="w-full h-16 text-lg gap-3"
          >
            <Phone className="w-6 h-6" />
            Appeler cet interphone
          </Button>

          {/* Message button */}
          {firstHabitationId && (
            <Button
              onClick={() => setMessageDialogOpen(true)}
              variant="outline"
              className="w-full h-14 text-base gap-3"
            >
              <MessageSquare className="w-5 h-5" />
              Laisser un message
            </Button>
          )}
        </div>

        {/* Info text */}
        <p className="text-xs text-muted-foreground text-center mt-8 max-w-sm">
          {anrData.habitationCount > 1 
            ? `${anrData.habitationCount} résidences à cette adresse`
            : "1 résidence à cette adresse"
          }
        </p>
      </div>

      {/* Message Dialog */}
      {firstHabitationId && (
        <VisitorMessageDialog
          open={messageDialogOpen}
          onOpenChange={setMessageDialogOpen}
          habitationId={firstHabitationId}
        />
      )}

      <VisitorFooter />
    </div>
  );
};

export default ANRLanding;
