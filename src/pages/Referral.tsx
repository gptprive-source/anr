import { useState } from "react";
import { 
  Gift, 
  Users, 
  Copy, 
  Check, 
  Share2, 
  MessageCircle, 
  Mail, 
  Loader2,
  Wallet,
  CreditCard,
  Clock,
  BadgeCheck,
  ChevronRight,
  ArrowLeft,
  Banknote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/layout/BottomNav";
import { useReferralCode } from "@/hooks/useReferralCode";
import { useReferrals } from "@/hooks/useReferrals";

const Referral = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { referralCode, loading: codeLoading, getReferralLink, getShareMessage } = useReferralCode();
  const { referrals, payouts, stats, iban, loading: referralsLoading, updateIban } = useReferrals();
  
  const [copied, setCopied] = useState(false);
  const [ibanInput, setIbanInput] = useState(iban || "");
  const [savingIban, setSavingIban] = useState(false);

  const loading = codeLoading || referralsLoading;

  const handleCopyLink = async () => {
    const link = getReferralLink();
    if (link) {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ title: "Lien copié !" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = (platform: "whatsapp" | "sms" | "email") => {
    const message = getShareMessage();
    const link = getReferralLink();

    switch (platform) {
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
        break;
      case "sms":
        window.open(`sms:?body=${encodeURIComponent(message)}`, "_blank");
        break;
      case "email":
        window.open(
          `mailto:?subject=${encodeURIComponent("Découvre ANR - L'interphone intelligent")}&body=${encodeURIComponent(message)}`,
          "_blank"
        );
        break;
    }
  };

  const handleSaveIban = async () => {
    if (!ibanInput.trim()) {
      toast({ title: "Erreur", description: "Veuillez entrer un IBAN valide", variant: "destructive" });
      return;
    }

    setSavingIban(true);
    const result = await updateIban(ibanInput.trim().toUpperCase());
    setSavingIban(false);

    if (result.success) {
      toast({ title: "IBAN enregistré", description: "Votre IBAN a été enregistré avec succès" });
    } else {
      toast({ title: "Erreur", description: result.error, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="pt-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/account")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gift className="w-6 h-6 text-purple-500" />
              Programme Parrainage
            </h1>
            <p className="text-sm text-muted-foreground">Gagnez 5€ par filleul inscrit</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 border-purple-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.currentBalance}€</p>
                <p className="text-xs text-muted-foreground">Solde actuel</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.paidReferrals}</p>
                <p className="text-xs text-muted-foreground">Filleuls validés</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-green-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalEarned}€</p>
                <p className="text-xs text-muted-foreground">Total gagné</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-orange-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingReferrals}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Progress to 50€ */}
        <Card className="p-6 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Progression vers le paiement</h3>
              <p className="text-sm text-muted-foreground">
                Paiement automatique à 50€ (10 filleuls)
              </p>
            </div>
            <Badge variant="outline" className="text-purple-500 border-purple-500">
              {stats.currentBalance}€ / 50€
            </Badge>
          </div>
          <Progress value={stats.progressToNextPayout} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {10 - stats.paidReferrals % 10} filleuls restants pour le prochain paiement
          </p>
        </Card>

        {/* Referral Link */}
        <Card className="p-6 border-cyan-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h3 className="font-semibold">Votre lien de parrainage</h3>
              <p className="text-sm text-muted-foreground">Partagez ce lien pour parrainer</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Input
              value={getReferralLink()}
              readOnly
              className="flex-1 text-sm bg-muted/50"
            />
            <Button variant="outline" onClick={handleCopyLink} className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="gap-2 bg-green-500/10 text-green-600 border-green-500 hover:bg-green-500/20"
              onClick={() => handleShare("whatsapp")}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              className="gap-2 bg-blue-500/10 text-blue-600 border-blue-500 hover:bg-blue-500/20"
              onClick={() => handleShare("sms")}
            >
              <MessageCircle className="w-4 h-4" />
              SMS
            </Button>
            <Button
              variant="outline"
              className="gap-2 bg-orange-500/10 text-orange-600 border-orange-500 hover:bg-orange-500/20"
              onClick={() => handleShare("email")}
            >
              <Mail className="w-4 h-4" />
              Email
            </Button>
          </div>
        </Card>

        {/* IBAN Section */}
        <Card className="p-6 border-green-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold">Coordonnées bancaires</h3>
              <p className="text-sm text-muted-foreground">
                {iban ? "IBAN enregistré pour les virements" : "Enregistrez votre IBAN pour recevoir les paiements"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="FR76 1234 5678 9123 4567 8901 234"
                value={ibanInput}
                onChange={(e) => setIbanInput(e.target.value)}
                className="uppercase"
              />
            </div>
            <Button 
              onClick={handleSaveIban} 
              disabled={savingIban || ibanInput === iban}
              className="gap-2"
            >
              {savingIban ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Enregistrer
            </Button>
          </div>
          {iban && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <BadgeCheck className="w-3 h-3" />
              IBAN enregistré : {iban.slice(0, 4)}...{iban.slice(-4)}
            </p>
          )}
        </Card>

        {/* Referrals List */}
        <Card className="p-6 border-blue-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold">Mes filleuls ({referrals.length})</h3>
              <p className="text-sm text-muted-foreground">Liste des personnes parrainées</p>
            </div>
          </div>

          {referrals.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Aucun filleul pour le moment. Partagez votre lien !
            </p>
          ) : (
            <div className="space-y-2">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {referral.referred_profile?.first_name || "Utilisateur"}{" "}
                        {referral.referred_profile?.last_name?.charAt(0) || ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(referral.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={referral.status === "paid" || referral.status === "credited" ? "default" : "secondary"}
                    className={
                      referral.status === "paid" || referral.status === "credited"
                        ? "bg-green-500"
                        : ""
                    }
                  >
                    {referral.status === "paid" || referral.status === "credited" 
                      ? `+${referral.reward_amount}€` 
                      : "En attente"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payouts History */}
        {payouts.length > 0 && (
          <Card className="p-6 border-yellow-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-semibold">Historique des virements</h3>
                <p className="text-sm text-muted-foreground">Paiements reçus</p>
              </div>
            </div>

            <div className="space-y-2">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{payout.amount}€</p>
                    <p className="text-xs text-muted-foreground">
                      {payout.referrals_count} filleuls •{" "}
                      {new Date(payout.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Badge
                    variant={payout.status === "completed" ? "default" : "secondary"}
                    className={payout.status === "completed" ? "bg-green-500" : ""}
                  >
                    {payout.status === "completed" 
                      ? "Effectué" 
                      : payout.status === "processing" 
                        ? "En cours" 
                        : "En attente"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Referral;
