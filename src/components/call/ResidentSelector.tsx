import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, User, Phone, ArrowLeft, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import logoAnr from "@/assets/logo-anr.png";
import VisitorFooter from "@/components/layout/VisitorFooter";

interface Resident {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface ResidentSelectorProps {
  anrCode: string;
  habitationId: string;
  habitationName: string;
  address: string;
  onSelect: (targetUserId: string | null) => void;
  onBack?: () => void;
}

export const ResidentSelector = ({
  anrCode,
  habitationId,
  habitationName,
  address,
  onSelect,
  onBack,
}: ResidentSelectorProps) => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchResidents = async () => {
      try {
        // Step 1: Fetch verified residents user_ids
        const { data: residentsData, error: residentsError } = await supabase
          .from("residents")
          .select("user_id")
          .eq("habitation_id", habitationId)
          .eq("status", "verified");

        if (residentsError) {
          console.error("[ResidentSelector] Residents query error:", residentsError);
          throw residentsError;
        }

        if (!residentsData || residentsData.length === 0) {
          setResidents([]);
          setLoading(false);
          return;
        }

        const userIds = residentsData.map(r => r.user_id);

        // Step 2: Fetch profiles for these user_ids
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", userIds);

        if (profilesError) {
          console.error("[ResidentSelector] Profiles query error:", profilesError);
          throw profilesError;
        }

        // Map profiles by id for easy lookup
        const profilesMap = new Map(
          (profilesData || []).map(p => [p.id, p])
        );

        // Step 3: Fetch avatar_urls from visitor_business_cards
        const { data: cardsData } = await supabase
          .from("visitor_business_cards")
          .select("user_id, avatar_url")
          .in("user_id", userIds);

        const cardsMap = new Map(
          (cardsData || []).map(c => [c.user_id, c.avatar_url])
        );

        const formattedResidents = residentsData.map(r => {
          const profile = profilesMap.get(r.user_id);
          return {
            user_id: r.user_id,
            first_name: profile?.first_name || null,
            last_name: profile?.last_name || null,
            avatar_url: cardsMap.get(r.user_id) || null,
          };
        });

        console.log("[ResidentSelector] Formatted residents:", formattedResidents);
        setResidents(formattedResidents);
      } catch (error) {
        console.error("[ResidentSelector] Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResidents();
  }, [habitationId]);

  const filteredResidents = residents.filter((r) => {
    if (!search) return true;
    const fullName = `${r.first_name || ""} ${r.last_name || ""}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${(firstName || "")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase() || "?";
  };

  const getDisplayName = (resident: Resident) => {
    if (resident.first_name || resident.last_name) {
      return `${resident.first_name || ""} ${resident.last_name || ""}`.trim();
    }
    return "Résident";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/20">
      <div className="flex-1 p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <img src={logoAnr} alt="ANR" className="w-10 h-10" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{habitationName}</h1>
            <p className="text-xs text-muted-foreground">{address}</p>
          </div>
        </div>

        {/* Question */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold mb-2">Qui souhaitez-vous appeler ?</h2>
          <p className="text-sm text-muted-foreground">
            Choisissez d'appeler toute la résidence ou un résident spécifique
          </p>
        </div>

        {/* Search */}
        {residents.length > 3 && (
          <Input
            type="text"
            placeholder="Rechercher un résident..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />
        )}

        {/* Options */}
        <div className="space-y-3">
          {/* Option: Call everyone */}
          <button
            onClick={() => onSelect(null)}
            className="w-full p-4 rounded-xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors flex items-center gap-4 text-left"
          >
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-base">Toute la résidence</p>
              <p className="text-sm text-muted-foreground">
                {residents.length} résident{residents.length > 1 ? "s" : ""} seront notifiés
              </p>
            </div>
            <Phone className="w-5 h-5 text-primary" />
          </button>

          {/* Separator */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">OU APPELER EN PRIVÉ</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Individual residents */}
          {filteredResidents.map((resident) => (
            <button
              key={resident.user_id}
              onClick={() => onSelect(resident.user_id)}
              className="w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 bg-card hover:bg-accent/50 transition-colors flex items-center gap-4 text-left group"
            >
              <Avatar className="w-14 h-14 border-2 border-border">
                {resident.avatar_url ? (
                  <AvatarImage src={resident.avatar_url} alt={getDisplayName(resident)} />
                ) : null}
                <AvatarFallback className="text-lg font-semibold bg-secondary">
                  {getInitials(resident.first_name, resident.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-base">{getDisplayName(resident)}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Appel privé - seul(e) à recevoir
                </p>
              </div>
              <Phone className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          ))}

          {filteredResidents.length === 0 && search && (
            <p className="text-center text-muted-foreground py-8">
              Aucun résident trouvé pour "{search}"
            </p>
          )}
        </div>
      </div>

      <VisitorFooter />
    </div>
  );
};

// Standalone page wrapper for ResidentSelector
const ResidentSelectorPage = () => {
  const { anrId } = useParams<{ anrId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const habitationId = location.state?.habitationId;
  const habitationName = location.state?.habitationName || "Résidence";
  const address = location.state?.address || "";
  const fromScanner = location.state?.fromScanner;

  if (!habitationId || !anrId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Données manquantes</p>
      </div>
    );
  }

  const handleSelect = (targetUserId: string | null) => {
    if (targetUserId) {
      // Specific resident: go to chat with ANR context
      navigate(`/chat/${targetUserId}`, {
        state: {
          anrCode: anrId,
          habitationId,
          address,
        }
      });
    } else {
      // All residents (group call): go to call page
      navigate(`/call/${anrId}`, {
        state: {
          habitationId,
          targetUserId: null,
        },
      });
    }
  };

  return (
    <ResidentSelector
      anrCode={anrId}
      habitationId={habitationId}
      habitationName={habitationName}
      address={address}
      onSelect={handleSelect}
      onBack={() => navigate(-1)}
    />
  );
};

export default ResidentSelectorPage;
