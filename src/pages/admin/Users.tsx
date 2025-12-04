import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, User, Home, CreditCard, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface UserDetails {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  created_at: string;
  residents: {
    id: string;
    is_owner: boolean;
    status: string;
    habitation: {
      id: string;
      name: string;
      anr: {
        code: string;
        address: string;
      };
    };
  }[];
  subscriptions: {
    id: string;
    status: string;
    current_period_end: string | null;
  }[];
  call_count: number;
}

const Users = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin_users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone_number, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get residents for each user
      const { data: residents } = await supabase
        .from('residents')
        .select(`
          id, user_id, is_owner, status,
          habitation:habitations(
            id, name,
            anr:anrs(code, address)
          )
        `);

      // Get subscriptions
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('id, user_id, status, current_period_end');

      // Get call counts
      const { data: callParticipants } = await supabase
        .from('call_participants')
        .select('user_id');

      const callCounts = (callParticipants || []).reduce((acc, cp) => {
        if (cp.user_id) {
          acc[cp.user_id] = (acc[cp.user_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return (profiles || []).map(profile => ({
        ...profile,
        residents: (residents || [])
          .filter(r => r.user_id === profile.id)
          .map(r => ({
            ...r,
            habitation: Array.isArray(r.habitation) ? r.habitation[0] : r.habitation,
          })),
        subscriptions: (subscriptions || []).filter(s => s.user_id === profile.id),
        call_count: callCounts[profile.id] || 0,
      })) as UserDetails[];
    },
  });

  const filteredUsers = users?.filter(user => {
    const term = searchTerm.toLowerCase();
    return (
      user.first_name?.toLowerCase().includes(term) ||
      user.last_name?.toLowerCase().includes(term) ||
      user.phone_number?.includes(term)
    );
  });

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
        <div>
          <h1 className="text-3xl font-bold">Utilisateurs</h1>
          <p className="text-muted-foreground">{users?.length || 0} utilisateurs inscrits</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Habitations</TableHead>
                  <TableHead>Abonnement</TableHead>
                  <TableHead>Appels</TableHead>
                  <TableHead>Inscrit le</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.phone_number || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Home className="w-4 h-4 text-muted-foreground" />
                        <span>{user.residents.length}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.subscriptions.length > 0 ? (
                        <Badge variant={user.subscriptions[0].status === 'active' ? 'default' : 'secondary'}>
                          {user.subscriptions[0].status}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Aucun</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{user.call_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.created_at), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            Détails
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>
                              {user.first_name} {user.last_name}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Téléphone</p>
                                <p className="font-medium">{user.phone_number || 'Non renseigné'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Inscrit le</p>
                                <p className="font-medium">
                                  {format(new Date(user.created_at), 'dd MMMM yyyy', { locale: fr })}
                                </p>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-3">Habitations ({user.residents.length})</h4>
                              {user.residents.length > 0 ? (
                                <div className="space-y-2">
                                  {user.residents.map(r => (
                                    <div key={r.id} className="p-3 border rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-medium">{r.habitation?.name}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {r.habitation?.anr?.address}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            ANR: {r.habitation?.anr?.code}
                                          </p>
                                        </div>
                                        <div className="flex gap-2">
                                          {r.is_owner && <Badge>Propriétaire</Badge>}
                                          <Badge variant="outline">{r.status}</Badge>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground">Aucune habitation</p>
                              )}
                            </div>

                            <div>
                              <h4 className="font-semibold mb-3">Abonnements</h4>
                              {user.subscriptions.length > 0 ? (
                                <div className="space-y-2">
                                  {user.subscriptions.map(sub => (
                                    <div key={sub.id} className="p-3 border rounded-lg flex items-center justify-between">
                                      <div>
                                        <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                                          {sub.status}
                                        </Badge>
                                      </div>
                                      {sub.current_period_end && (
                                        <p className="text-sm text-muted-foreground">
                                          Expire le {format(new Date(sub.current_period_end), 'dd MMM yyyy', { locale: fr })}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-muted-foreground">Aucun abonnement</p>
                              )}
                            </div>

                            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                              <Phone className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{user.call_count} appels</p>
                                <p className="text-sm text-muted-foreground">Total participations</p>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Users;
