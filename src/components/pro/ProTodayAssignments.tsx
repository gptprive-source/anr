import { useProCompany } from "@/hooks/useProCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, MapPin, CheckCircle, PlayCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  assigned: { label: "Assigné", variant: "outline", icon: Clock },
  in_progress: { label: "En cours", variant: "default", icon: PlayCircle },
  completed: { label: "Terminé", variant: "secondary", icon: CheckCircle },
  cancelled: { label: "Annulé", variant: "destructive", icon: AlertCircle },
};

export const ProTodayAssignments = () => {
  const { todayAssignments, schedules } = useProCompany();

  const getSchedule = (scheduleId: string) => {
    return schedules.find((s) => s.id === scheduleId);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Missions du {format(new Date(), "EEEE d MMMM", { locale: fr })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {todayAssignments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucune mission programmée aujourd'hui
          </p>
        ) : (
          <div className="space-y-3">
            {todayAssignments.map((assignment) => {
              const schedule = getSchedule(assignment.schedule_id);
              const statusConfig = STATUS_CONFIG[assignment.status] || STATUS_CONFIG.assigned;
              const StatusIcon = statusConfig.icon;
              const employee = assignment.employee;

              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {employee && (
                      <Avatar>
                        <AvatarImage src={employee.photo_url || undefined} />
                        <AvatarFallback>
                          {getInitials(employee.first_name, employee.last_name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <p className="font-medium">
                        {employee
                          ? `${employee.first_name} ${employee.last_name}`
                          : "Employé inconnu"}
                      </p>
                      {schedule && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {schedule.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      {assignment.time_from && (
                        <p className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {assignment.time_from.slice(0, 5)}
                          {assignment.time_to && ` - ${assignment.time_to.slice(0, 5)}`}
                        </p>
                      )}
                      {assignment.duration_minutes && (
                        <p className="text-xs text-muted-foreground">
                          Durée: {Math.floor(assignment.duration_minutes / 60)}h
                          {assignment.duration_minutes % 60}min
                        </p>
                      )}
                    </div>

                    <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
