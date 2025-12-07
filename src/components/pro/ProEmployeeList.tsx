import { useProCompany } from "@/hooks/useProCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, Mail, Phone, UserX, UserCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const ProEmployeeList = () => {
  const { employees, updateEmployee, isAdmin } = useProCompany();

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const toggleEmployeeStatus = (id: string, isActive: boolean) => {
    updateEmployee({ id, is_active: !isActive });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liste des employés ({employees.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun employé enregistré
          </p>
        ) : (
          <div className="space-y-3">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={employee.photo_url || undefined} />
                    <AvatarFallback>
                      {getInitials(employee.first_name, employee.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <Badge variant={employee.is_active ? "default" : "secondary"}>
                        {employee.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {employee.role && <span>{employee.role}</span>}
                      {employee.employee_number && (
                        <span>#{employee.employee_number}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground mr-4">
                    {employee.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {employee.email}
                      </span>
                    )}
                    {employee.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {employee.phone}
                      </span>
                    )}
                  </div>

                  {employee.last_activity_at && (
                    <span className="text-xs text-muted-foreground">
                      Dernière activité:{" "}
                      {format(new Date(employee.last_activity_at), "dd/MM HH:mm", {
                        locale: fr,
                      })}
                    </span>
                  )}

                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            toggleEmployeeStatus(employee.id, employee.is_active)
                          }
                        >
                          {employee.is_active ? (
                            <>
                              <UserX className="h-4 w-4 mr-2" />
                              Désactiver
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Activer
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
