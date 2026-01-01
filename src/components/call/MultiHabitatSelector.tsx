import { Search, Home, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ResidentSelector } from "./ResidentSelector";

interface Resident {
  first_name: string | null;
  last_name: string | null;
  user_id?: string;
}

interface Habitat {
  id: string;
  name: string;
  floor?: string | null;
  residents: Resident[];
  residentCount: number;
}

const COLORS = ["blue", "orange", "purple", "green", "pink", "cyan"] as const;

const MultiHabitatSelector = () => {
  const { anrId } = useParams<{ anrId: string }>();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [habitats, setHabitats] = useState<Habitat[]>([]);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedHabitat, setSelectedHabitat] = useState<Habitat | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHabitats = async () => {
      if (!anrId) return;

      // First find the ANR by code
      const { data: anr } = await supabase
        .from("anrs")
        .select("id, address")
        .ilike("code", anrId)
        .maybeSingle();

      if (!anr) {
        setLoading(false);
        return;
      }

      setAddress(anr.address);

      // Fetch all habitations for this ANR
      const { data: habitationsData } = await supabase
        .from("habitations")
        .select(`id, name, floor`)
        .eq("anr_id", anr.id)
        .order("name");

      if (habitationsData && habitationsData.length > 0) {
        const habitationIds = habitationsData.map(h => h.id);
        
        // Step 1: Fetch all residents (not just owners) for count
        const { data: allResidentsData } = await supabase
          .from("residents")
          .select("habitation_id, user_id")
          .in("habitation_id", habitationIds)
          .eq("status", "verified");

        // Step 2: Fetch owners (only user_id and habitation_id)
        const { data: ownersData } = await supabase
          .from("residents")
          .select("habitation_id, user_id")
          .in("habitation_id", habitationIds)
          .eq("is_owner", true);

        // Step 3: Fetch profiles for all owner user_ids
        const ownerUserIds = (ownersData || []).map(o => o.user_id);
        let profilesMap = new Map<string, { first_name: string | null; last_name: string | null }>();
        
        if (ownerUserIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", ownerUserIds);
          
          profilesMap = new Map(
            (profilesData || []).map(p => [p.id, { first_name: p.first_name, last_name: p.last_name }])
          );
        }

        // Combine habitations with their owners and resident counts
        const formattedHabitats: Habitat[] = habitationsData.map((hab) => {
          const owners = ownersData?.filter(r => r.habitation_id === hab.id) || [];
          const allResidents = allResidentsData?.filter(r => r.habitation_id === hab.id) || [];
          return {
            id: hab.id,
            name: hab.name,
            floor: hab.floor,
            residents: owners.map((r) => {
              const profile = profilesMap.get(r.user_id);
              return {
                first_name: profile?.first_name || null,
                last_name: profile?.last_name || null,
                user_id: r.user_id,
              };
            }),
            residentCount: allResidents.length,
          };
        });
        console.log("[MultiHabitatSelector] Formatted habitats:", formattedHabitats.map(h => ({ name: h.name, residentCount: h.residentCount })));
        setHabitats(formattedHabitats);
      }
      setLoading(false);
    };

    fetchHabitats();
  }, [anrId]);

  const filteredHabitats = habitats
    .filter((h) => {
      const searchLower = search.toLowerCase();
      const nameMatch = h.name.toLowerCase().includes(searchLower);
      const residentMatch = h.residents.some(
        (r) =>
          r.first_name?.toLowerCase().includes(searchLower) ||
          r.last_name?.toLowerCase().includes(searchLower)
      );
      return nameMatch || residentMatch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSelect = async (habitat: Habitat) => {
    console.log("[MultiHabitatSelector] Selected habitat:", habitat.name, "residentCount:", habitat.residentCount);
    // If more than 1 resident, show resident selector
    if (habitat.residentCount > 1) {
      console.log("[MultiHabitatSelector] Showing resident selector");
      setSelectedHabitat(habitat);
    } else {
      // Single resident - get user_id and go to chat
      console.log("[MultiHabitatSelector] Getting single resident for chat");
      const { data: residents } = await supabase
        .from("residents")
        .select("user_id")
        .eq("habitation_id", habitat.id)
        .eq("status", "verified")
        .limit(1)
        .maybeSingle();
      
      if (residents?.user_id) {
        navigate(`/chat/${residents.user_id}`, { 
          state: { 
            anrCode: anrId,
            habitationId: habitat.id,
            address,
          } 
        });
      } else {
        // No residents - go to call page as fallback
        navigate(`/call/${anrId}`, { 
          state: { 
            habitationId: habitat.id,
            targetUserId: null,
          } 
        });
      }
    }
  };

  const handleResidentSelect = (targetUserId: string | null) => {
    if (!selectedHabitat) return;
    
    if (targetUserId) {
      // Specific resident: go to chat
      navigate(`/chat/${targetUserId}`, { 
        state: { 
          anrCode: anrId,
          habitationId: selectedHabitat.id,
          address,
        } 
      });
    } else {
      // All residents (group call): go to call page
      navigate(`/call/${anrId}`, { 
        state: { 
          habitationId: selectedHabitat.id,
          targetUserId: null,
        } 
      });
    }
  };

  // Extract residence number from name (e.g., "Résidence 2 - Jean Dupont" -> "2")
  const getResidenceNumber = (name: string): string => {
    const match = name.match(/Résidence\s*(\d+)/i);
    return match ? match[1] : "";
  };

  // Get display name without "Résidence N -" prefix
  const getDisplayName = (habitat: Habitat): string => {
    // Try to get names from residents first
    if (habitat.residents.length > 0) {
      const names = habitat.residents
        .filter((r) => r.first_name || r.last_name)
        .map((r) => `${r.first_name || ""} ${r.last_name || ""}`.trim())
        .filter(Boolean);
      if (names.length > 0) {
        return names.join(", ");
      }
    }
    // Fallback: extract from habitation name
    const withoutPrefix = habitat.name.replace(/Résidence\s*\d+\s*-\s*/i, "");
    return withoutPrefix || habitat.name;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show resident selector if a habitat is selected
  if (selectedHabitat) {
    return (
      <ResidentSelector
        anrCode={anrId || ""}
        habitationId={selectedHabitat.id}
        habitationName={selectedHabitat.name}
        address={address}
        onSelect={handleResidentSelect}
        onBack={() => setSelectedHabitat(null)}
      />
    );
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4 border-2 border-blue-500">
            <Home className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Choisissez la résidence</h1>
          <p className="text-muted-foreground text-sm">
            {address || "Plusieurs habitations à cette adresse"}
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Habitat list */}
        <div className="space-y-3">
          {filteredHabitats.map((habitat, index) => {
            const residenceNum = getResidenceNumber(habitat.name) || String(index + 1);
            const displayName = getDisplayName(habitat);
            const color = COLORS[index % COLORS.length];

            return (
              <button
                key={habitat.id}
                onClick={() => handleSelect(habitat)}
                className={`w-full glass-effect rounded-2xl p-4 flex items-center gap-4 transition-all text-left group border-2 border-${color}-500 hover:bg-${color}-500/5`}
              >
                {/* Residence number badge */}
                <div className={`w-14 h-14 rounded-xl bg-${color}-500/10 flex flex-col items-center justify-center group-hover:bg-${color}-500/20 transition-colors`}>
                  <span className={`text-xs text-${color}-500/70 font-medium`}>Rés.</span>
                  <span className={`text-xl font-bold text-${color}-500`}>{residenceNum}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{displayName}</p>
                  {habitat.floor && (
                    <p className="text-sm text-muted-foreground">{habitat.floor}</p>
                  )}
                  {/* Show resident count */}
                  <p className="text-xs text-muted-foreground mt-1">
                    {habitat.residentCount} résident{habitat.residentCount > 1 ? "s" : ""}
                  </p>
                </div>

                {/* Call indicator */}
                <div className={`text-${color}-500 opacity-0 group-hover:opacity-100 transition-opacity`}>
                  <span className="text-sm font-medium">Sonner →</span>
                </div>
              </button>
            );
          })}
        </div>

        {filteredHabitats.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Aucune résidence trouvée
          </div>
        )}

        {/* Info */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          {habitats.length} résidence{habitats.length > 1 ? "s" : ""} à cette adresse
        </p>
      </div>
    </div>
  );
};

export default MultiHabitatSelector;