import { Key, Clock, MapPin, Phone, Shield, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGrantedAccess } from "@/hooks/useGrantedAccess";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const GrantedAccessSection = () => {
  const { loading, grantedAccess } = useGrantedAccess();
  const [expanded, setExpanded] = useState(false);

  if (loading || grantedAccess.length === 0) {
    return null;
  }

  const displayedAccess = expanded ? grantedAccess : grantedAccess.slice(0, 2);

  return (
    <div className="glass-effect rounded-2xl p-4 border border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Key className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Accès porte accordés</h3>
          <p className="text-xs text-muted-foreground">
            {grantedAccess.length} accès actif{grantedAccess.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {displayedAccess.map((access) => (
          <div 
            key={access.id} 
            className="bg-background/50 rounded-xl p-3 border border-border/50"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-sm">{access.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {access.anr.address}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {access.anr.code}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                {access.time_from.slice(0, 5)} - {access.time_to.slice(0, 5)}
              </span>
              
              {access.days_of_week && access.days_of_week.length < 7 && (
                <span className="text-muted-foreground">
                  {access.days_of_week.map(d => DAYS_FR[d]).join(', ')}
                </span>
              )}

              {access.valid_until && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Jusqu'au {format(new Date(access.valid_until), 'dd MMM yyyy', { locale: fr })}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              {access.forward_calls_to_beneficiary && (
                <Badge variant="secondary" className="text-xs">
                  <Phone className="w-3 h-3 mr-1" />
                  Transfert d'appels
                </Badge>
              )}
              {access.require_face_recognition_entry && (
                <Badge variant="secondary" className="text-xs">
                  <Shield className="w-3 h-3 mr-1" />
                  Reconnaissance faciale
                </Badge>
              )}
            </div>

            {access.instructions_for_visitor && (
              <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-primary/30 pl-2">
                {access.instructions_for_visitor}
              </p>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              Accordé par {access.grantor?.first_name} {access.grantor?.last_name}
            </p>
          </div>
        ))}
      </div>

      {grantedAccess.length > 2 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Voir moins
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Voir {grantedAccess.length - 2} autre{grantedAccess.length - 2 > 1 ? 's' : ''}
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default GrantedAccessSection;
