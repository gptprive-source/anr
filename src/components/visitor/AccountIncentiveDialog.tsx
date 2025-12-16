import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus, MessageSquare, Bell, History, Smartphone, X } from "lucide-react";

interface AccountIncentiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AccountIncentiveDialog = ({
  open,
  onOpenChange
}: AccountIncentiveDialogProps) => {
  const navigate = useNavigate();
  
  const handleCreateAccount = () => {
    onOpenChange(false);
    navigate("/register");
  };

  const handleViewMessages = () => {
    onOpenChange(false);
    navigate("/visitor-messages");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5 text-primary" />
            Message envoyé !
          </DialogTitle>
          <DialogDescription>
            Vous pouvez suivre les réponses sur cet appareil
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current device info */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Sur cet appareil</p>
                <p className="text-xs text-muted-foreground">
                  Retrouvez vos conversations et les réponses des résidents
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleViewMessages}
              className="w-full mt-3"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Voir mes messages
            </Button>
          </div>

          {/* Benefits of creating account */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Avec un compte ANR
            </p>
            
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Notifications push</p>
                <p className="text-xs text-muted-foreground">
                  Alerté instantanément des réponses, même app fermée
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                <History className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Accès multi-appareils</p>
                <p className="text-xs text-muted-foreground">
                  Retrouvez vos conversations sur tous vos appareils
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                <UserPlus className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Contacter tout abonné ANR</p>
                <p className="text-xs text-muted-foreground">
                  Envoyez des messages à n'importe quel abonné
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-2 pt-2">
            <Button onClick={handleCreateAccount} className="w-full">
              <UserPlus className="w-4 h-4 mr-2" />
              Créer mon compte ANR
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full text-muted-foreground">
              Plus tard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountIncentiveDialog;
