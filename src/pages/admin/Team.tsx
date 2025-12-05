import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { UserPlus, Shield, Trash2, User, ChevronDown, Briefcase, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type AppRole = 'admin' | 'super_admin' | 'moderator' | 'analyst';

const roleLabels: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Modérateur',
  analyst: 'Analyste',
};

const roleDescriptions: Record<AppRole, string> = {
  super_admin: 'Accès complet, gestion des admins',
  admin: 'Configuration, FAQ, modération',
  moderator: 'Lecture seule, support utilisateurs',
  analyst: 'Analytics uniquement',
};

type Department = 'administratif' | 'commercial' | 'partenariat' | 'presse' | 'investisseurs' | 'communication' | 'informatique' | 'collectivites';

const departmentLabels: Record<Department, string> = {
  administratif: 'Administratif',
  commercial: 'Commercial',
  partenariat: 'Partenariat',
  presse: 'Presse',
  investisseurs: 'Investisseurs',
  communication: 'Communication',
  informatique: 'Informatique',
  collectivites: 'Collectivités',
};

const allDepartments: Department[] = [
  'administratif', 'commercial', 'partenariat', 'presse', 
  'investisseurs', 'communication', 'informatique', 'collectivites'
];

interface NewMemberForm {
  firstName: string;
  lastName: string;
  email: string;
  role: AppRole;
  departments: Department[];
}

const Team = () => {
  const { user } = useAuth();
  const { isSuperAdmin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState<NewMemberForm>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'moderator',
    departments: [],
  });

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['admin_team'],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role');

      if (error) throw error;

      // Get profiles for these users
      const userIds = roles?.map(r => r.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, created_at')
        .in('id', userIds);

      // Get departments for these users
      const { data: departments } = await supabase
        .from('user_departments')
        .select('user_id, department')
        .in('user_id', userIds);

      return (roles || []).map(role => ({
        ...role,
        profile: profiles?.find(p => p.id === role.user_id),
        departments: departments?.filter(d => d.user_id === role.user_id).map(d => d.department) || [],
      }));
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: NewMemberForm) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Non authentifié");
      }

      const response = await supabase.functions.invoke('invite-admin-member', {
        body: data,
      });

      if (response.error) {
        throw new Error(response.error.message || "Erreur lors de l'invitation");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin_team'] });
      if (data.isExisting) {
        toast.success('Rôle administrateur ajouté à l\'utilisateur existant');
      } else {
        toast.success('Invitation envoyée avec succès');
      }
      setIsDialogOpen(false);
      setNewMember({
        firstName: '',
        lastName: '',
        email: '',
        role: 'moderator',
        departments: [],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erreur lors de l'invitation");
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);

      if (error) throw error;

      // Log audit
      await supabase.from('admin_audit_logs').insert({
        user_id: user?.id,
        action: 'role_update',
        entity_type: 'user_role',
        entity_id: userId,
        new_value: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_team'] });
      toast.success('Rôle mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // Log audit
      await supabase.from('admin_audit_logs').insert({
        user_id: user?.id,
        action: 'role_remove',
        entity_type: 'user_role',
        entity_id: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_team'] });
      toast.success('Membre retiré');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const toggleDepartmentMutation = useMutation({
    mutationFn: async ({ userId, department, add }: { userId: string; department: Department; add: boolean }) => {
      if (add) {
        const { error } = await supabase
          .from('user_departments')
          .insert({ user_id: userId, department });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_departments')
          .delete()
          .eq('user_id', userId)
          .eq('department', department);
        if (error) throw error;
      }

      // Log audit
      await supabase.from('admin_audit_logs').insert({
        user_id: user?.id,
        action: add ? 'department_add' : 'department_remove',
        entity_type: 'user_department',
        entity_id: userId,
        new_value: { department },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_team'] });
      toast.success('Départements mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'moderator':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const toggleNewMemberDepartment = (dept: Department) => {
    setNewMember(prev => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter(d => d !== dept)
        : [...prev.departments, dept],
    }));
  };

  const isFormValid = newMember.firstName.trim() && newMember.lastName.trim() && newMember.email.trim();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Équipe Admin</h1>
            <p className="text-muted-foreground">Gérez les accès administrateurs</p>
          </div>
          
          {isSuperAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Inviter un collaborateur
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Inviter un collaborateur</DialogTitle>
                  <DialogDescription>
                    Le collaborateur recevra un email avec un lien pour créer son mot de passe.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom *</Label>
                      <Input
                        id="firstName"
                        value={newMember.firstName}
                        onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })}
                        placeholder="Marie"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom *</Label>
                      <Input
                        id="lastName"
                        value={newMember.lastName}
                        onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })}
                        placeholder="Dupont"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email professionnel *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={newMember.email}
                        onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                        placeholder="marie.dupont@entreprise.com"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Rôle *</Label>
                    <Select
                      value={newMember.role}
                      onValueChange={(value: AppRole) => setNewMember({ ...newMember, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex flex-col">
                              <span>{label}</span>
                              <span className="text-xs text-muted-foreground">
                                {roleDescriptions[value as AppRole]}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Départements</Label>
                    <p className="text-xs text-muted-foreground">
                      Le collaborateur recevra les notifications des messages de contact pour ces départements.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {allDepartments.map((dept) => (
                        <div key={dept} className="flex items-center space-x-2">
                          <Checkbox
                            id={`new-${dept}`}
                            checked={newMember.departments.includes(dept)}
                            onCheckedChange={() => toggleNewMemberDepartment(dept)}
                          />
                          <Label 
                            htmlFor={`new-${dept}`}
                            className="text-sm cursor-pointer"
                          >
                            {departmentLabels[dept]}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={() => addMemberMutation.mutate(newMember)}
                    disabled={!isFormValid || addMemberMutation.isPending}
                    className="w-full"
                  >
                    {addMemberMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Envoyer l'invitation
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Role Descriptions */}
        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(roleLabels).map(([role, label]) => (
            <Card key={role}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {roleDescriptions[role as AppRole]}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle>Membres de l'équipe ({teamMembers?.length || 0})</CardTitle>
            <CardDescription>
              Administrateurs ayant accès au panel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {teamMembers?.map(member => (
              <Collapsible key={member.id}>
                <div className="border rounded-lg">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.profile?.first_name} {member.profile?.last_name}
                        </p>
                        {member.profile?.created_at && (
                          <p className="text-sm text-muted-foreground">
                            Inscrit le {format(new Date(member.profile.created_at), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        )}
                        {member.departments && member.departments.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {member.departments.map((dept: Department) => (
                              <Badge key={dept} variant="outline" className="text-xs">
                                {departmentLabels[dept]}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {isSuperAdmin && member.user_id !== user?.id ? (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(value: AppRole) => 
                              updateRoleMutation.mutate({ userId: member.user_id, role: value })
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(roleLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" size="icon">
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </CollapsibleTrigger>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm('Retirer cet administrateur ?')) {
                                removeMemberMutation.mutate(member.user_id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <Badge variant={getRoleBadgeVariant(member.role) as any}>
                          {roleLabels[member.role as AppRole]}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {isSuperAdmin && member.user_id !== user?.id && (
                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-2 border-t border-border">
                        <div className="flex items-center gap-2 mb-3">
                          <Briefcase className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Départements assignés</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Ce membre recevra les notifications des messages de contact pour les départements sélectionnés.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {Object.entries(departmentLabels).map(([dept, label]) => (
                            <div key={dept} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${member.user_id}-${dept}`}
                                checked={member.departments?.includes(dept as Department)}
                                onCheckedChange={(checked) => 
                                  toggleDepartmentMutation.mutate({ 
                                    userId: member.user_id, 
                                    department: dept as Department, 
                                    add: !!checked 
                                  })
                                }
                              />
                              <Label 
                                htmlFor={`${member.user_id}-${dept}`}
                                className="text-sm cursor-pointer"
                              >
                                {label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  )}
                </div>
              </Collapsible>
            ))}

            {teamMembers?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucun membre dans l'équipe
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Team;
