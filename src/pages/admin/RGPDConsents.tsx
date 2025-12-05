import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Search, Download, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Consent {
  id: string;
  user_id: string;
  consent_type: string;
  version: string;
  consented: boolean;
  consented_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

const consentTypeLabels: Record<string, string> = {
  cgu: "CGU",
  privacy_policy: "Politique de confidentialité",
  tacit_renewal: "Reconduction tacite",
  ai_chatbot: "Chatbot IA",
  geolocation: "Géolocalisation"
};

const RGPDConsents = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: consents, isLoading } = useQuery({
    queryKey: ['rgpd_consents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_consents')
        .select('*')
        .order('consented_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Consent[];
    }
  });

  // Get consent stats
  const { data: stats } = useQuery({
    queryKey: ['rgpd_consent_stats'],
    queryFn: async () => {
      const results: Record<string, { total: number; accepted: number }> = {};
      
      for (const type of Object.keys(consentTypeLabels)) {
        const { count: total } = await supabase
          .from('user_consents')
          .select('*', { count: 'exact', head: true })
          .eq('consent_type', type);
        
        const { count: accepted } = await supabase
          .from('user_consents')
          .select('*', { count: 'exact', head: true })
          .eq('consent_type', type)
          .eq('consented', true);
        
        results[type] = { total: total || 0, accepted: accepted || 0 };
      }
      
      return results;
    }
  });

  const handleExport = () => {
    if (!consents) return;
    
    const csvContent = [
      ["Date", "User ID", "Type", "Version", "Accepté", "IP"].join(";"),
      ...consents.map(c => [
        format(new Date(c.consented_at), "dd/MM/yyyy HH:mm"),
        c.user_id,
        consentTypeLabels[c.consent_type] || c.consent_type,
        c.version,
        c.consented ? "Oui" : "Non",
        c.ip_address || ""
      ].map(v => `"${v}"`).join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consentements-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const filteredConsents = consents?.filter(c => 
    c.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    consentTypeLabels[c.consent_type]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Historique des consentements</h1>
              <p className="text-muted-foreground">Traçabilité des acceptations utilisateurs</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(consentTypeLabels).map(([type, label]) => {
            const stat = stats?.[type];
            const rate = stat?.total ? Math.round((stat.accepted / stat.total) * 100) : 0;
            return (
              <Card key={type}>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{rate}%</span>
                    <span className="text-xs text-muted-foreground">
                      ({stat?.accepted || 0}/{stat?.total || 0})
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher par ID utilisateur ou type..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredConsents?.length || 0} consentement(s)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConsents?.map((consent) => (
                      <TableRow key={consent.id}>
                        <TableCell className="text-sm">
                          {format(new Date(consent.consented_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {consent.user_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {consentTypeLabels[consent.consent_type] || consent.consent_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {consent.version}
                        </TableCell>
                        <TableCell>
                          {consent.consented ? (
                            <Badge className="bg-success gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Accepté
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="w-3 h-3" />
                              Refusé
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {consent.ip_address || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default RGPDConsents;