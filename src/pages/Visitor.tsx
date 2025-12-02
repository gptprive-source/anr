import ANRScanner from "@/components/visitor/ANRScanner";
import BottomNav from "@/components/layout/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Visitor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {/* Header pour visiteurs non connectés */}
      {!user && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border p-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Mode visiteur</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Accueil
            </Button>
          </div>
        </div>
      )}
      <ANRScanner />
      {user && <BottomNav />}
    </>
  );
};

export default Visitor;
