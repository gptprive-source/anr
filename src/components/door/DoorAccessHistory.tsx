import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  MapPin,
  User,
  Building2,
  Clock,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DoorAccessLog {
  id: string;
  action: string;
  result: string;
  method: string | null;
  timestamp_server: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_distance_meters: number | null;
  visitor_user_id: string | null;
  employee_id: string | null;
  error_code: string | null;
  error_details: string | null;
  face_verified: boolean | null;
  face_confidence: number | null;
}

interface DoorAccessHistoryProps {
  logs: DoorAccessLog[];
  loading: boolean;
  onRefresh: () => void;
}

export function DoorAccessHistory({ logs, loading, onRefresh }: DoorAccessHistoryProps) {
  const getResultIcon = (result: string) => {
    switch (result) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'denied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Succès</Badge>;
      case 'denied':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Refusé</Badge>;
      default:
        return <Badge variant="secondary">{result}</Badge>;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'DOOR_OPEN':
        return 'Ouverture porte';
      case 'ENTRY':
        return 'Entrée';
      case 'EXIT':
        return 'Sortie';
      case 'TOKEN_VALIDATE':
        return 'Validation token';
      case 'FACE_VERIFY':
        return 'Vérification faciale';
      default:
        return action;
    }
  };

  const getMethodLabel = (method: string | null) => {
    switch (method) {
      case 'BLE':
        return 'Bluetooth';
      case 'NFC':
        return 'NFC';
      case 'QR':
        return 'QR Code';
      case 'MANUAL':
        return 'Manuel';
      default:
        return method || '-';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des accès
          </CardTitle>
          <CardDescription>
            Derniers événements d'ouverture de porte
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun historique d'accès</p>
            <p className="text-sm">
              Les événements d'accès apparaîtront ici
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {logs.map((log) => (
                <Card key={log.id} className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getResultIcon(log.result)}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getActionLabel(log.action)}</span>
                            {getResultBadge(log.result)}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {log.timestamp_server 
                                ? format(new Date(log.timestamp_server), 'dd/MM/yyyy HH:mm:ss', { locale: fr })
                                : '-'
                              }
                            </span>
                            
                            <Badge variant="outline" className="text-xs">
                              {getMethodLabel(log.method)}
                            </Badge>
                          </div>

                          {/* Infos GPS */}
                          {log.gps_latitude && log.gps_longitude && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {log.gps_distance_meters 
                                  ? `${Math.round(log.gps_distance_meters)}m de l'ANR`
                                  : `${log.gps_latitude.toFixed(4)}, ${log.gps_longitude.toFixed(4)}`
                                }
                              </span>
                            </div>
                          )}

                          {/* Infos utilisateur/employé */}
                          {log.visitor_user_id && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>Utilisateur: {log.visitor_user_id.substring(0, 8)}...</span>
                            </div>
                          )}

                          {log.employee_id && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              <span>Employé: {log.employee_id.substring(0, 8)}...</span>
                            </div>
                          )}

                          {/* Reconnaissance faciale */}
                          {log.face_verified !== null && (
                            <div className="flex items-center gap-2 text-xs">
                              <Badge 
                                variant="outline"
                                className={log.face_verified ? 'text-green-500' : 'text-red-500'}
                              >
                                Face: {log.face_verified ? 'Vérifié' : 'Échec'}
                                {log.face_confidence && ` (${Math.round(log.face_confidence * 100)}%)`}
                              </Badge>
                            </div>
                          )}

                          {/* Erreur */}
                          {log.error_code && (
                            <div className="flex items-center gap-1 text-xs text-red-500">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{log.error_code}: {log.error_details || 'Erreur inconnue'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
