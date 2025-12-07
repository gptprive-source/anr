import { useProCompany } from "@/hooks/useProCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Calendar, Fingerprint } from "lucide-react";

const DAYS_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export const ProScheduleList = () => {
  const { schedules } = useProCompany();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Autorisations d'accès ({schedules.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucune autorisation d'accès. Les résidents peuvent vous accorder l'accès depuis leur interface.
          </p>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="p-4 rounded-lg border bg-card space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{schedule.name}</h3>
                    {schedule.anr && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {schedule.anr.address} ({schedule.anr.code})
                      </p>
                    )}
                  </div>
                  <Badge variant={schedule.is_active ? "default" : "secondary"}>
                    {schedule.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {schedule.time_from.slice(0, 5)} - {schedule.time_to.slice(0, 5)}
                  </div>

                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex gap-1">
                      {schedule.days_of_week.map((day) => (
                        <Badge key={day} variant="outline" className="text-xs px-1">
                          {DAYS_LABELS[day]}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {(schedule.require_face_recognition_entry || schedule.require_face_recognition_exit) && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Fingerprint className="h-4 w-4" />
                      Reconnaissance faciale
                      {schedule.require_face_recognition_entry && schedule.require_face_recognition_exit
                        ? " (entrée/sortie)"
                        : schedule.require_face_recognition_entry
                        ? " (entrée)"
                        : " (sortie)"}
                    </div>
                  )}
                </div>

                {(schedule.valid_from || schedule.valid_until) && (
                  <p className="text-xs text-muted-foreground">
                    Validité: {schedule.valid_from || "∞"} → {schedule.valid_until || "∞"}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
