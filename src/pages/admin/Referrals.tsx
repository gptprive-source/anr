import { useState, useEffect } from "react";
import { 
  Gift, 
  Users, 
  Wallet,
  Banknote,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Download,
  Loader2,
  RefreshCcw,
  BadgeCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminLayout from "./AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Referrer {
  user_id: string;
  code: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  referral_balance: number;
  iban: string | null;
  total_referrals: number;
  paid_referrals: number;
}

interface Payout {
  id: string;
  user_id: string;
  amount: number;
  referrals_count: number;
  status: string;
  iban: string | null;
  processed_at: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

interface GlobalStats {
  totalReferrers: number;
  totalReferrals: number;
  totalRewardsGenerated: number;
  pendingPayouts: number;
  completedPayouts: number;
  totalPaidOut: number;
}

const Referrals = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<GlobalStats>({
    totalReferrers: 0,
    totalReferrals: 0,
    totalRewardsGenerated: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    totalPaidOut: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [payoutFilter, setPayoutFilter] = useState<string>("all");
  const [processingPayout, setProcessingPayout] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch referral codes with user info
      const { data: codesData, error: codesError } = await supabase
        .from("referral_codes")
        .select("user_id, code, is_active");

      if (codesError) throw codesError;

      // Fetch profiles for balance and IBAN
      const userIds = codesData?.map((c) => c.user_id) || [];
      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, referral_balance, iban")
          .in("id", userIds);

        if (profiles) {
          profiles.forEach((p) => {
            profilesMap[p.id] = p;
          });
        }
      }

      // Fetch all referrals for counts
      const { data: referralsData } = await supabase
        .from("referrals")
        .select("referrer_id, status, reward_amount");

      const referralsByReferrer: Record<string, { total: number; paid: number }> = {};
      let totalRewards = 0;

      (referralsData || []).forEach((r) => {
        if (!referralsByReferrer[r.referrer_id]) {
          referralsByReferrer[r.referrer_id] = { total: 0, paid: 0 };
        }
        referralsByReferrer[r.referrer_id].total++;
        if (r.status === "paid" || r.status === "credited") {
          referralsByReferrer[r.referrer_id].paid++;
          totalRewards += Number(r.reward_amount);
        }
      });

      // Build referrers list
      const referrersList: Referrer[] = (codesData || []).map((code) => {
        const profile = profilesMap[code.user_id] || {};
        const counts = referralsByReferrer[code.user_id] || { total: 0, paid: 0 };
        return {
          user_id: code.user_id,
          code: code.code,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: null, // We'd need to fetch from auth.users
          referral_balance: Number(profile.referral_balance || 0),
          iban: profile.iban,
          total_referrals: counts.total,
          paid_referrals: counts.paid,
        };
      });

      setReferrers(referrersList.sort((a, b) => b.paid_referrals - a.paid_referrals));

      // Fetch payouts
      const { data: payoutsData, error: payoutsError } = await supabase
        .from("referral_payouts")
        .select("*")
        .order("created_at", { ascending: false });

      if (payoutsError) throw payoutsError;

      // Enrich payouts with user info
      const payoutUserIds = payoutsData?.map((p) => p.user_id) || [];
      let payoutProfilesMap: Record<string, any> = {};

      if (payoutUserIds.length > 0) {
        const { data: payoutProfiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", payoutUserIds);

        if (payoutProfiles) {
          payoutProfiles.forEach((p) => {
            payoutProfilesMap[p.id] = p;
          });
        }
      }

      const enrichedPayouts: Payout[] = (payoutsData || []).map((p) => {
        const profile = payoutProfilesMap[p.user_id] || {};
        return {
          ...p,
          user_name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
        };
      });

      setPayouts(enrichedPayouts);

      // Calculate stats
      const pendingPayouts = enrichedPayouts.filter((p) => p.status === "pending");
      const completedPayouts = enrichedPayouts.filter((p) => p.status === "completed");
      const totalPaidOut = completedPayouts.reduce((sum, p) => sum + Number(p.amount), 0);

      setStats({
        totalReferrers: referrersList.length,
        totalReferrals: referralsData?.length || 0,
        totalRewardsGenerated: totalRewards,
        pendingPayouts: pendingPayouts.length,
        completedPayouts: completedPayouts.length,
        totalPaidOut,
      });
    } catch (err: any) {
      console.error("Error fetching referral data:", err);
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkPayoutCompleted = async (payoutId: string) => {
    setProcessingPayout(payoutId);
    try {
      const { error } = await supabase
        .from("referral_payouts")
        .update({ 
          status: "completed", 
          processed_at: new Date().toISOString() 
        })
        .eq("id", payoutId);

      if (error) throw error;

      toast({ title: "Succès", description: "Paiement marqué comme effectué" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setProcessingPayout(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Parrain", "Code", "Filleuls", "Solde", "IBAN"];
    const rows = referrers.map((r) => [
      `${r.first_name || ""} ${r.last_name || ""}`.trim(),
      r.code,
      r.paid_referrals,
      r.referral_balance,
      r.iban || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parrainages-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredReferrers = referrers.filter((r) => {
    const name = `${r.first_name || ""} ${r.last_name || ""} ${r.code}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const filteredPayouts = payouts.filter((p) => {
    if (payoutFilter === "all") return true;
    return p.status === payoutFilter;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gift className="w-6 h-6 text-purple-500" />
              Gestion des Affiliations
            </h1>
            <p className="text-muted-foreground">Programme de parrainage 5€/filleul</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} className="gap-2">
              <RefreshCcw className="w-4 h-4" />
              Actualiser
            </Button>
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Exporter CSV
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="p-4 border-purple-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalReferrers}</p>
                <p className="text-xs text-muted-foreground">Parrains actifs</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalReferrals}</p>
                <p className="text-xs text-muted-foreground">Total filleuls</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-green-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalRewardsGenerated}€</p>
                <p className="text-xs text-muted-foreground">Récompenses générées</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-orange-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingPayouts}</p>
                <p className="text-xs text-muted-foreground">Paiements en attente</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-cyan-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completedPayouts}</p>
                <p className="text-xs text-muted-foreground">Paiements effectués</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-yellow-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalPaidOut}€</p>
                <p className="text-xs text-muted-foreground">Total versé</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Referrers Table */}
        <Card className="p-6 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Parrains</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parrain</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-center">Filleuls</TableHead>
                <TableHead className="text-center">Solde</TableHead>
                <TableHead>IBAN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferrers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aucun parrain trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredReferrers.map((referrer) => (
                  <TableRow key={referrer.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-purple-500" />
                        </div>
                        <span className="font-medium">
                          {referrer.first_name || ""} {referrer.last_name || ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {referrer.code}
                      </code>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {referrer.paid_referrals} / {referrer.total_referrals}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={referrer.referral_balance >= 50 ? "text-green-500 font-bold" : ""}>
                        {referrer.referral_balance}€
                      </span>
                    </TableCell>
                    <TableCell>
                      {referrer.iban ? (
                        <span className="text-xs flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3 text-green-500" />
                          {referrer.iban.slice(0, 4)}...{referrer.iban.slice(-4)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Non renseigné</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Payouts Table */}
        <Card className="p-6 border-yellow-500">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Paiements</h2>
            <Select value={payoutFilter} onValueChange={setPayoutFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filtrer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="processing">En cours</SelectItem>
                <SelectItem value="completed">Effectués</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Parrain</TableHead>
                <TableHead className="text-center">Montant</TableHead>
                <TableHead className="text-center">Filleuls</TableHead>
                <TableHead>IBAN</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Aucun paiement
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="text-sm">
                      {new Date(payout.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>{payout.user_name}</TableCell>
                    <TableCell className="text-center font-bold">{payout.amount}€</TableCell>
                    <TableCell className="text-center">{payout.referrals_count}</TableCell>
                    <TableCell>
                      {payout.iban ? (
                        <span className="text-xs">
                          {payout.iban.slice(0, 4)}...{payout.iban.slice(-4)}
                        </span>
                      ) : (
                        <span className="text-xs text-destructive">Non renseigné</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={payout.status === "completed" ? "default" : "secondary"}
                        className={
                          payout.status === "completed"
                            ? "bg-green-500"
                            : payout.status === "processing"
                            ? "bg-blue-500"
                            : ""
                        }
                      >
                        {payout.status === "completed"
                          ? "Effectué"
                          : payout.status === "processing"
                          ? "En cours"
                          : "En attente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {payout.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkPayoutCompleted(payout.id)}
                          disabled={processingPayout === payout.id}
                          className="gap-1"
                        >
                          {processingPayout === payout.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          Marquer effectué
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Referrals;
