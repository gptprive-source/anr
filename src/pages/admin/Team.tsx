import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Shield, Trash2, User } from "lucide-react";
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

const Team = () => {
  const { user } = useAuth();
  const { isSuperAdmin } = useAdminAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({ email: '', role: 'analyst' as AppRole });

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

      return (roles || []).map(role => ({
        ...role,
        profile: profiles?.find(p => p.id === role.user_id),
      }));
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      // Note: In a real app, you'd need to look up user by email or invite them
      // For now, this is a simplified version
      toast.error('Fonctionnalité en cours de développement');
      throw new Error('Not implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_team'] });
      toast.success('Membre ajouté');
      setIsDialogOpen(false);
      setNewMember({ email: '', role: 'analyst' });
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
                  Ajouter un membre
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un administrateur</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email de l'utilisateur</Label>
                    <Input
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      placeholder="admin@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rôle</Label>
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
                            <div>
                              <p>{label}</p>
                              <p className="text-xs text-muted-foreground">
                                {roleDescriptions[value as AppRole]}
                              </p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={() => addMemberMutation.mutate(newMember)}
                    disabled={!newMember.email || addMemberMutation.isPending}
                    className="w-full"
                  >
                    Ajouter
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
              <div 
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
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
