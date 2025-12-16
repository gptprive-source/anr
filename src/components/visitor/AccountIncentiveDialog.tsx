import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus, MessageSquare, Bell, History, X } from "lucide-react";
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
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="w-5 h-5 text-primary" />
            Suivez vos conversations
          </DialogTitle>
          <DialogDescription>
            Créez un compte pour retrouver toutes vos conversations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Notifications de réponses</p>
                <p className="text-xs text-muted-foreground">
                  Recevez une notification quand le résident vous répond
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Accès à vos messages</p>
                <p className="text-xs text-muted-foreground">
                  Retrouvez toutes vos conversations depuis n'importe quel appareil
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                <History className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Historique complet</p>
                <p className="text-xs text-muted-foreground">
                  Consultez l'historique de vos échanges avec tous les résidents
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-2 pt-2">
            <Button onClick={handleCreateAccount} className="w-full">
              <UserPlus className="w-4 h-4 mr-2" />
              Créer mon compte 
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full text-muted-foreground">
              Non merci
            </Button>
          </div>

          
        </div>
      </DialogContent>
    </Dialog>;
};
export default AccountIncentiveDialog;