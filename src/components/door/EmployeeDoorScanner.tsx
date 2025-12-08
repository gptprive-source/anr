import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DoorOpen, 
  LogIn, 
  LogOut, 
  Camera,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  MapPin,
  User,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { useEmployeeDoorAccess } from '@/hooks/useEmployeeDoorAccess';
import { FaceVerificationDialog } from './FaceVerificationDialog';
import { ClientSignatureDialog } from './ClientSignatureDialog';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useGeolocation } from '@/hooks/useGeolocation';

interface EmployeeDoorScannerProps {
  anrId: string;
  anrCode: string;
  anrAddress: string;
}

export function EmployeeDoorScanner({ anrId, anrCode, anrAddress }: EmployeeDoorScannerProps) {
  const [showFaceDialog, setShowFaceDialog] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'ENTRY' | 'EXIT' | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);

  const { 
    loading, 
    sessionInfo, 
    currentSession,
    checkSession, 
    performEntry, 
    performExit 
  } = useEmployeeDoorAccess();

  const { latitude, longitude, loading: gpsLoading, error: gpsError, getCurrentPosition } = useGeolocation();

  useEffect(() => {
    checkSession(anrId);
  }, [anrId, checkSession]);

  const handleEntryClick = async () => {
    if (sessionInfo?.require_face) {
      setPendingAction('ENTRY');
      setShowFaceDialog(true);
    } else {
      await performEntry(anrId, {
        gps_latitude: latitude || undefined,
        gps_longitude: longitude || undefined,
      });
      checkSession(anrId);
    }
  };

  const handleExitClick = async () => {
    if (!currentSession) return;

    if (sessionInfo?.require_face || sessionInfo?.require_signature) {
      setPendingAction('EXIT');
      if (sessionInfo.require_face) {
        setShowFaceDialog(true);
      } else if (sessionInfo.require_signature) {
        setShowSignatureDialog(true);
      }
    } else {
      await performExit(anrId, currentSession.id, {
        gps_latitude: latitude || undefined,
        gps_longitude: longitude || undefined,
      });
      checkSession(anrId);
    }
  };

  const handleFaceVerified = async (imageBase64: string) => {
    setFaceImage(imageBase64);
    setShowFaceDialog(false);

    if (pendingAction === 'ENTRY') {
      await performEntry(anrId, {
        gps_latitude: latitude || undefined,
        gps_longitude: longitude || undefined,
        face_verified: true, // Vérification faite localement
        schedule_id: sessionInfo?.schedule?.id,
      });
      checkSession(anrId);
    } else if (pendingAction === 'EXIT') {
      if (sessionInfo?.require_signature) {
        setShowSignatureDialog(true);
      } else if (currentSession) {
        await performExit(anrId, currentSession.id, {
          gps_latitude: latitude || undefined,
          gps_longitude: longitude || undefined,
          face_verified: true, // Vérification faite localement
        });
        checkSession(anrId);
      }
    }
    setPendingAction(null);
  };

  const handleSignatureComplete = async (signature: string, name: string, report?: string) => {
    setShowSignatureDialog(false);
    if (currentSession) {
      await performExit(anrId, currentSession.id, {
        gps_latitude: latitude || undefined,
        gps_longitude: longitude || undefined,
        face_verified: faceImage ? true : undefined, // Si vérification faciale faite
        client_signature: signature,
        client_signature_name: name,
        employee_report: report,
      });
      checkSession(anrId);
    }
    setFaceImage(null);
  };

  const isEntry = sessionInfo?.action === 'ENTRY';
  const isExit = sessionInfo?.action === 'EXIT';

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/10">
              <DoorOpen className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">{anrCode}</CardTitle>
          <CardDescription className="flex items-center justify-center gap-2">
            <MapPin className="h-4 w-4" />
            {anrAddress}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Statut GPS */}
      <Card className={gpsError ? 'border-yellow-500/50' : ''}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className={`h-4 w-4 ${gpsLoading ? 'animate-pulse' : ''}`} />
              <span className="text-sm">
                {gpsLoading ? 'Localisation...' : 
                 gpsError ? 'GPS indisponible' :
                 latitude && longitude ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : 'En attente'}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => getCurrentPosition()} disabled={gpsLoading}>
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Session active */}
      {currentSession && (
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Session en cours</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Entrée: {format(new Date(currentSession.entry_at), 'HH:mm', { locale: fr })}
                  </span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(currentSession.entry_at), { 
                      addSuffix: false, 
                      locale: fr 
                    })}
                  </span>
                </div>
              </div>
              <Badge className="bg-green-500/10 text-green-500">Actif</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {sessionInfo?.schedule?.instructions_for_visitor && (
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-500">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">{sessionInfo.schedule.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {sessionInfo.schedule.instructions_for_visitor}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mission assignment */}
      {sessionInfo?.assignment?.mission_notes && (
        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-purple-500">
                <User className="h-4 w-4" />
                <span className="font-medium">Mission du jour</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {sessionInfo.assignment.mission_notes}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Boutons d'action */}
      <div className="space-y-3">
        {isEntry && !currentSession && (
          <Button 
            onClick={handleEntryClick}
            disabled={loading || gpsLoading}
            className="w-full h-16 text-lg"
            size="lg"
          >
            {loading ? (
              <Loader2 className="h-6 w-6 mr-3 animate-spin" />
            ) : (
              <LogIn className="h-6 w-6 mr-3" />
            )}
            Pointer mon entrée
          </Button>
        )}

        {(isExit || currentSession) && (
          <Button 
            onClick={handleExitClick}
            disabled={loading || gpsLoading || !currentSession}
            variant="destructive"
            className="w-full h-16 text-lg"
            size="lg"
          >
            {loading ? (
              <Loader2 className="h-6 w-6 mr-3 animate-spin" />
            ) : (
              <LogOut className="h-6 w-6 mr-3" />
            )}
            Pointer ma sortie
          </Button>
        )}

        {/* Indicateurs de sécurité requis */}
        <div className="flex justify-center gap-4">
          {sessionInfo?.require_face && (
            <Badge variant="outline" className="gap-1">
              <Camera className="h-3 w-3" />
              Reconnaissance faciale
            </Badge>
          )}
          {sessionInfo?.require_signature && (
            <Badge variant="outline" className="gap-1">
              <User className="h-3 w-3" />
              Signature client
            </Badge>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <FaceVerificationDialog
        open={showFaceDialog}
        onOpenChange={setShowFaceDialog}
        onVerified={handleFaceVerified}
        action={pendingAction || 'ENTRY'}
      />

      <ClientSignatureDialog
        open={showSignatureDialog}
        onOpenChange={setShowSignatureDialog}
        onComplete={handleSignatureComplete}
      />
    </div>
  );
}
