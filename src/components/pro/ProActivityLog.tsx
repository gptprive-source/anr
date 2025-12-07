import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProCompany } from "@/hooks/useProCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DoorOpen, DoorClosed, Clock, AlertTriangle, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const ACTION_CONFIG: Record<string, { label: string; icon: typeof DoorOpen; color: string }> = {
  ENTRY: { label: "Entrée", icon: DoorOpen, color: "text-green-500" },
  EXIT: { label: "Sortie", icon: DoorClosed, color: "text-blue-500" },
  CLOCK_IN: { label: "Pointage entrée", icon: Clock, color: "text-green-500" },
  CLOCK_OUT: { label: "Pointage sortie", icon: Clock, color: "text-orange-500" },
  ERROR: { label: "Erreur", icon: AlertTriangle, color: "text-destructive" },
};

export const ProActivityLog = () => {
  const { company, employees } = useProCompany();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['pro_activity_logs', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('door_access_logs')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const getEmployee = (employeeId: string | null) => {
    if (!employeeId) return null;
    return employees.find((e) => e.id === employeeId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal d'activité</CardTitle>
      </CardHeader>
      <CardContent>
        {!logs || logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucune activité enregistrée
          </p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {logs.map((log) => {
                const actionConfig = ACTION_CONFIG[log.action] || {
                  label: log.action,
                  icon: User,
                  color: "text-muted-foreground",
                };
                const ActionIcon = actionConfig.icon;
                const employee = getEmployee(log.employee_id);

                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 rounded border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded ${actionConfig.color} bg-current/10`}>
                        <ActionIcon className={`h-4 w-4 ${actionConfig.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {employee
                              ? `${employee.first_name} ${employee.last_name}`
                              : "Utilisateur"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {actionConfig.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {log.method && `Via ${log.method}`}
                          {log.result !== 'success' && (
                            <span className="text-destructive ml-2">
                              {log.error_code || log.result}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM HH:mm:ss", {
                        locale: fr,
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
