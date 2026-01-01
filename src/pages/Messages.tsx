import { Loader2, MessageSquare } from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";
import { Card } from "@/components/ui/card";

// Placeholder - will be rebuilt in Phase 4
const Messages = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary text-primary-foreground p-4 shadow-md">
        <h1 className="text-lg font-semibold">Messages</h1>
      </div>
      
      <div className="p-4">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <p className="text-foreground font-medium">Messagerie en cours de reconstruction</p>
          <p className="text-sm text-muted-foreground mt-1">Phase 4 à venir...</p>
        </Card>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Messages;
