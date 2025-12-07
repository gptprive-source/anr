import { useProCompany } from "@/hooks/useProCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, Clock, CheckCircle, PlayCircle, Building2, Plus } from "lucide-react";
import { ProEmployeeList } from "@/components/pro/ProEmployeeList";
import { ProScheduleList } from "@/components/pro/ProScheduleList";
import { ProTodayAssignments } from "@/components/pro/ProTodayAssignments";
import { ProActivityLog } from "@/components/pro/ProActivityLog";
import { AddEmployeeDialog } from "@/components/pro/AddEmployeeDialog";
import { useState } from "react";

const ProDashboard = () => {
  const { company, stats, isLoading, isAdmin } = useProCompany();
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Aucune entreprise</h2>
            <p className="text-muted-foreground">
              Vous n'êtes associé à aucune entreprise ANR PRO.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{company.name}</h1>
              <p className="text-muted-foreground">
                {company.plan_type === 'entreprise' ? 'Plan Entreprise' : 'Plan Pro'}
              </p>
            </div>
            <Badge variant={company.is_active ? "default" : "secondary"}>
              {company.is_active ? "Actif" : "Inactif"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalEmployees}</p>
                  <p className="text-xs text-muted-foreground">Employés</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeSchedules}</p>
                  <p className="text-xs text-muted-foreground">Autorisations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.todayAssignments}</p>
                  <p className="text-xs text-muted-foreground">Missions aujourd'hui</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <PlayCircle className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inProgressToday}</p>
                  <p className="text-xs text-muted-foreground">En cours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completedToday}</p>
                  <p className="text-xs text-muted-foreground">Terminées</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="today" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="today">Aujourd'hui</TabsTrigger>
              <TabsTrigger value="employees">Employés</TabsTrigger>
              <TabsTrigger value="schedules">Autorisations</TabsTrigger>
              <TabsTrigger value="activity">Activité</TabsTrigger>
            </TabsList>

            {isAdmin && (
              <Button onClick={() => setShowAddEmployee(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter employé
              </Button>
            )}
          </div>

          <TabsContent value="today" className="space-y-4">
            <ProTodayAssignments />
          </TabsContent>

          <TabsContent value="employees" className="space-y-4">
            <ProEmployeeList />
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4">
            <ProScheduleList />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <ProActivityLog />
          </TabsContent>
        </Tabs>
      </div>

      <AddEmployeeDialog 
        open={showAddEmployee} 
        onOpenChange={setShowAddEmployee} 
      />
    </div>
  );
};

export default ProDashboard;
