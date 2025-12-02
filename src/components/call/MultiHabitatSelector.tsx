import { Search, Home, Loader2, User } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Resident {
  first_name: string | null;
  last_name: string | null;
}

interface Habitat {
  id: string;
  name: string;
  floor?: string | null;
  residents: Resident[];
}

const MultiHabitatSelector = () => {
  const { anrId } = useParams<{ anrId: string }>();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [habitats, setHabitats] = useState<Habitat[]>([]);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
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

      // Fetch all habitations for this ANR with their residents
      const { data: habitationsData } = await supabase
        .from("habitations")
        .select(`
          id, 
          name, 
          floor,
          residents (
            user_id,
            profiles:user_id (
              first_name,
              last_name
            )
          )
        `)
        .eq("anr_id", anr.id)
        .order("name");

      if (habitationsData) {
        const formattedHabitats: Habitat[] = habitationsData.map((hab: any) => ({
          id: hab.id,
          name: hab.name,
          floor: hab.floor,
          residents: hab.residents?.map((r: any) => ({
            first_name: r.profiles?.first_name || null,
            last_name: r.profiles?.last_name || null,
          })) || [],
        }));
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

  const handleSelect = (habitat: Habitat) => {
    navigate(`/call/${anrId}`, { 
      state: { 
        habitationId: habitat.id,
        visitorLat: location.state?.visitorLat,
        visitorLon: location.state?.visitorLon,
      } 
    });
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

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-primary" />
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

            return (
              <button
                key={habitat.id}
                onClick={() => handleSelect(habitat)}
                className="w-full glass-effect rounded-2xl p-4 flex items-center gap-4 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
              >
                {/* Residence number badge */}
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <span className="text-xs text-primary/70 font-medium">Rés.</span>
                  <span className="text-xl font-bold text-primary">{residenceNum}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{displayName}</p>
                  {habitat.floor && (
                    <p className="text-sm text-muted-foreground">{habitat.floor}</p>
                  )}
                  {habitat.residents.length > 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <User className="w-3 h-3 inline mr-1" />
                      {habitat.residents.length} résidents
                    </p>
                  )}
                </div>

                {/* Call indicator */}
                <div className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
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
