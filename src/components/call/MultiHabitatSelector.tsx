import { Search, Home } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

interface Habitat {
  id: string;
  name: string;
  floor?: string;
}

const mockHabitats: Habitat[] = [
  { id: "1", name: "Appartement Dupont", floor: "1er étage" },
  { id: "2", name: "Appartement Garcia", floor: "2ème étage" },
  { id: "3", name: "Appartement Martin", floor: "3ème étage" },
  { id: "4", name: "Appartement Petit", floor: "RDC" },
  { id: "5", name: "Appartement Robert", floor: "4ème étage" },
];

const MultiHabitatSelector = () => {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filteredHabitats = mockHabitats
    .filter((h) =>
      h.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSelect = (habitat: Habitat) => {
    navigate(`/call/${habitat.id}`);
  };

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
