import { Search, Home, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Habitat {
  id: string;
  name: string;
  floor?: string | null;
}

const MultiHabitatSelector = () => {
  const { anrId } = useParams<{ anrId: string }>();
  const [search, setSearch] = useState("");
  const [habitats, setHabitats] = useState<Habitat[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHabitats = async () => {
      if (!anrId) return;

      // First find the ANR by code
      const { data: anr } = await supabase
        .from("anrs")
        .select("id")
        .ilike("code", anrId)
        .maybeSingle();

      if (!anr) {
        setLoading(false);
        return;
      }

      // Then fetch all habitations for this ANR
      const { data: habitationsData } = await supabase
        .from("habitations")
        .select("id, name, floor")
        .eq("anr_id", anr.id)
        .order("name");

      if (habitationsData) {
        setHabitats(habitationsData);
      }
      setLoading(false);
    };

    fetchHabitats();
  }, [anrId]);

  const filteredHabitats = habitats
    .filter((h) =>
      h.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSelect = (habitat: Habitat) => {
    navigate(`/call/${anrId}`, { state: { habitationId: habitat.id } });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Sélectionnez l'habitat</h1>
          <p className="text-muted-foreground">
            Choisissez chez qui vous souhaitez sonner
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Habitat list */}
        <div className="space-y-3">
          {filteredHabitats.map((habitat) => (
            <button
              key={habitat.id}
              onClick={() => handleSelect(habitat)}
              className="w-full glass-effect rounded-2xl p-4 flex items-center gap-4 hover:border-primary/30 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{habitat.name}</p>
                {habitat.floor && (
                  <p className="text-sm text-muted-foreground">{habitat.floor}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {filteredHabitats.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Aucun habitat trouvé
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiHabitatSelector;