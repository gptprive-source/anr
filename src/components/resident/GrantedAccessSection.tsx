import { Key, Clock, MapPin, Phone, Shield, Calendar, ChevronDown, ChevronUp, Camera, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGrantedAccess } from "@/hooks/useGrantedAccess";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FaceRegistrationDialog } from "@/components/door/FaceRegistrationDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const COLORS = ["blue", "orange", "purple", "green", "pink", "cyan"] as const;

const GrantedAccessSection = () => {
  const { loading, grantedAccess, refetch } = useGrantedAccess();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [showFaceDialog, setShowFaceDialog] = useState(false);
  const [hasFaceRegistered, setHasFaceRegistered] = useState(false);
  const [checkingFace, setCheckingFace] = useState(true);

  // Check if user has registered their face
  useEffect(() => {
    const checkFaceRegistration = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('face_embeddings')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();
      
      setHasFaceRegistered(!!data);
      setCheckingFace(false);
    };

    checkFaceRegistration();
  }, [user]);

  // Check if any access requires face recognition
  const requiresFaceRecognition = grantedAccess.some(
    a => a.require_face_recognition_entry || a.require_face_recognition_exit
  );

  if (loading || grantedAccess.length === 0) {
    return null;
  }

  const displayedAccess = expanded ? grantedAccess : grantedAccess.slice(0, 2);

  return (
    <div className="bg-background/50 rounded-2xl p-4 border border-green-500">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
          <Key className="w-5 h-5 text-green-500" />
        </div>
        <div>
          <h3 className="font-semibold">Accès porte accordés</h3>
          <p className="text-xs text-muted-foreground">
            {grantedAccess.length} accès actif{grantedAccess.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {displayedAccess.map((access, index) => {
          const colorSets = [
            { border: "border-blue-500", text: "text-blue-500", borderLeft: "border-blue-500/30" },
            { border: "border-orange-500", text: "text-orange-500", borderLeft: "border-orange-500/30" },
            { border: "border-yellow-500", text: "text-yellow-500", borderLeft: "border-yellow-500/30" },
            { border: "border-purple-500", text: "text-purple-500", borderLeft: "border-purple-500/30" },
            { border: "border-green-500", text: "text-green-500", borderLeft: "border-green-500/30" },
            { border: "border-pink-500", text: "text-pink-500", borderLeft: "border-pink-500/30" },
            { border: "border-cyan-500", text: "text-cyan-500", borderLeft: "border-cyan-500/30" },
          ];
          const colorSet = colorSets[index % colorSets.length];
          return (
            <div 
              key={access.id} 
              className={`bg-background/50 rounded-xl p-3 border ${colorSet.border}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-sm text-foreground">{access.name}</p>
                  <p className="text-xs text-foreground/70 flex items-center gap-1">
                    <MapPin className={`w-3 h-3 ${colorSet.text}`} />
                    {access.anr.address}
                  </p>
                </div>
                <Badge variant="outline" className={`text-xs ${colorSet.border} ${colorSet.text}`}>
                  {access.anr.code}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="flex items-center gap-1 text-foreground/70">
                  <Clock className={`w-3 h-3 ${colorSet.text}`} />
                  {access.time_from.slice(0, 5)} - {access.time_to.slice(0, 5)}
                </span>
                
                {access.days_of_week && access.days_of_week.length < 7 && (
                  <span className="text-foreground/70">
                    {access.days_of_week.map(d => DAYS_FR[d]).join(', ')}
                  </span>
                )}

                {access.valid_until && (
                  <span className="flex items-center gap-1 text-foreground/70">
                    <Calendar className={`w-3 h-3 ${colorSet.text}`} />
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
                {(access.require_face_recognition_entry || access.require_face_recognition_exit) && (
                  <Badge 
                    variant={hasFaceRegistered ? "secondary" : "destructive"} 
                    className="text-xs"
                  >
                    {hasFaceRegistered ? (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    ) : (
                      <Shield className="w-3 h-3 mr-1" />
                    )}
                    Reconnaissance faciale {hasFaceRegistered ? "OK" : "requise"}
                  </Badge>
                )}
              </div>

              {access.instructions_for_visitor && (
                <p className={`text-xs text-foreground/70 mt-2 italic border-l-2 ${colorSet.borderLeft} pl-2`}>
                  {access.instructions_for_visitor}
                </p>
              )}

              <p className="text-xs text-foreground/70 mt-2">
                Accordé par {access.grantor?.first_name} {access.grantor?.last_name}
              </p>
            </div>
          );
        })}
      </div>

      {/* Face registration button if required but not registered */}
      {requiresFaceRecognition && !hasFaceRegistered && !checkingFace && (
        <Button
          className="w-full mt-3 border-2 border-orange-500 bg-orange-500 hover:bg-orange-600"
          onClick={() => setShowFaceDialog(true)}
        >
          <Camera className="w-4 h-4 mr-2" />
          Enregistrer mon visage
        </Button>
      )}

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

      {/* Face Registration Dialog */}
      <FaceRegistrationDialog
        open={showFaceDialog}
        onOpenChange={setShowFaceDialog}
        onRegistered={() => {
          setHasFaceRegistered(true);
          setShowFaceDialog(false);
        }}
      />
    </div>
  );
};

export default GrantedAccessSection;