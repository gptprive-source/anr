import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  CheckCircle, 
  Clock,
  Search,
  BookPlus,
  Sparkles,
  BookOpen,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ChatbotUsage {
  id: string;
  query_text: string | null;
  response_preview: string | null;
  user_rating: string | null;
  admin_correction: string | null;
  corrected_by: string | null;
  corrected_at: string | null;
  is_reviewed: boolean | null;
  created_at: string;
  source: string;
  conversation_id: string | null;
}

const ChatbotCorrections = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "negative" | "unreviewed">("unreviewed");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsage, setSelectedUsage] = useState<ChatbotUsage | null>(null);
  const [correction, setCorrection] = useState("");
  const [addToFaq, setAddToFaq] = useState(false);
  const [faqSection, setFaqSection] = useState("Général");

  // Fetch chatbot usage with feedback
  const { data: usages, isLoading } = useQuery({
    queryKey: ["chatbot-usage", filter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("chatbot_usage")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter === "negative") {
        query = query.eq("user_rating", "negative");
      } else if (filter === "unreviewed") {
        query = query.eq("is_reviewed", false);
      }

      if (searchQuery.trim()) {
        query = query.ilike("query_text", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ChatbotUsage[];
    }
  });

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ["chatbot-stats"],
    queryFn: async () => {
      const { data: all } = await supabase
        .from("chatbot_usage")
        .select("user_rating, is_reviewed", { count: "exact" });
      
      const total = all?.length || 0;
      const positive = all?.filter(u => u.user_rating === "positive").length || 0;
      const negative = all?.filter(u => u.user_rating === "negative").length || 0;
      const unreviewed = all?.filter(u => u.is_reviewed === false && u.user_rating).length || 0;
      
      return { total, positive, negative, unreviewed };
    }
  });

  // Mutation to save correction
  const saveCorrectionMutation = useMutation({
    mutationFn: async ({ usageId, correction, addToFaq, faqSection }: {
      usageId: string;
      correction: string;
      addToFaq: boolean;
      faqSection: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update chatbot_usage with correction
      const { error: updateError } = await supabase
        .from("chatbot_usage")
        .update({
          admin_correction: correction,
          corrected_by: user?.id,
          corrected_at: new Date().toISOString(),
          is_reviewed: true
        })
        .eq("id", usageId);
      
      if (updateError) throw updateError;

      // Optionally add to FAQ
      if (addToFaq && selectedUsage?.query_text) {
        const { error: faqError } = await supabase
          .from("faq_items")
          .insert({
            section: faqSection,
            question: selectedUsage.query_text,
            answer: correction,
            is_active: true,
            created_by: user?.id
          });
        
        if (faqError) throw faqError;
      }
    },
    onSuccess: () => {
      toast.success(addToFaq ? "Correction enregistrée et ajoutée à la FAQ" : "Correction enregistrée");
      queryClient.invalidateQueries({ queryKey: ["chatbot-usage"] });
      queryClient.invalidateQueries({ queryKey: ["chatbot-stats"] });
      setSelectedUsage(null);
      setCorrection("");
      setAddToFaq(false);
    },
    onError: (error) => {
      console.error("Error saving correction:", error);
      toast.error("Erreur lors de l'enregistrement");
    }
  });

  // Mark as reviewed without correction
  const markReviewedMutation = useMutation({
    mutationFn: async (usageId: string) => {
      const { error } = await supabase
        .from("chatbot_usage")
        .update({ is_reviewed: true })
        .eq("id", usageId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marqué comme révisé");
      queryClient.invalidateQueries({ queryKey: ["chatbot-usage"] });
      queryClient.invalidateQueries({ queryKey: ["chatbot-stats"] });
    }
  });

  const openCorrection = (usage: ChatbotUsage) => {
    setSelectedUsage(usage);
    setCorrection(usage.admin_correction || "");
    setAddToFaq(false);
  };

  const getRatingBadge = (rating: string | null) => {
    if (rating === "positive") return <Badge className="bg-green-500/20 text-green-700"><ThumbsUp className="w-3 h-3 mr-1" /> Positif</Badge>;
    if (rating === "negative") return <Badge className="bg-red-500/20 text-red-700"><ThumbsDown className="w-3 h-3 mr-1" /> Négatif</Badge>;
    return <Badge variant="outline">Non noté</Badge>;
  };

  const satisfactionRate = stats ? (stats.positive / (stats.positive + stats.negative) * 100 || 0) : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Corrections Chatbot</h1>
          <p className="text-muted-foreground">Améliorez les réponses du chatbot avec vos corrections</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total échanges</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{satisfactionRate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Satisfaction</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <ThumbsDown className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats?.negative || 0}</p>
                  <p className="text-xs text-muted-foreground">Réponses négatives</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{stats?.unreviewed || 0}</p>
                  <p className="text-xs text-muted-foreground">À réviser</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher une question..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les échanges</SelectItem>
                  <SelectItem value="unreviewed">À réviser</SelectItem>
                  <SelectItem value="negative">Feedbacks négatifs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>Échanges ({usages?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : usages?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Aucun échange trouvé</div>
            ) : (
              <div className="space-y-3">
                {usages?.map((usage) => (
                  <div 
                    key={usage.id} 
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                      usage.user_rating === "negative" && !usage.is_reviewed ? "border-red-500/50 bg-red-500/5" : ""
                    }`}
                    onClick={() => openCorrection(usage)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getRatingBadge(usage.user_rating)}
                          {usage.is_reviewed && (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" /> Révisé
                            </Badge>
                          )}
                          {usage.admin_correction && (
                            <Badge variant="outline" className="text-blue-600">
                              <BookPlus className="w-3 h-3 mr-1" /> Corrigé
                            </Badge>
                          )}
                          <Badge variant="outline">
                            {usage.source === "faq" ? (
                              <><BookOpen className="w-3 h-3 mr-1" /> FAQ</>
                            ) : (
                              <><Sparkles className="w-3 h-3 mr-1" /> IA</>
                            )}
                          </Badge>
                        </div>
                        <p className="font-medium truncate">{usage.query_text || "Question non enregistrée"}</p>
                        <p className="text-sm text-muted-foreground truncate">{usage.response_preview}</p>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(usage.created_at), "dd MMM HH:mm", { locale: fr })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Correction Dialog */}
        <Dialog open={!!selectedUsage} onOpenChange={(open) => !open && setSelectedUsage(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Corriger la réponse</DialogTitle>
            </DialogHeader>
            
            {selectedUsage && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Question de l'utilisateur :</p>
                  <p>{selectedUsage.query_text}</p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Réponse originale :</p>
                  <p className="text-sm">{selectedUsage.response_preview}</p>
                </div>

                <div>
                  <Label>Correction (réponse améliorée)</Label>
                  <Textarea
                    value={correction}
                    onChange={(e) => setCorrection(e.target.value)}
                    placeholder="Entrez la réponse corrigée..."
                    className="mt-2 min-h-[120px]"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="addToFaq" 
                    checked={addToFaq} 
                    onCheckedChange={(checked) => setAddToFaq(checked as boolean)} 
                  />
                  <Label htmlFor="addToFaq" className="cursor-pointer">
                    Ajouter cette Q&A à la FAQ
                  </Label>
                </div>

                {addToFaq && (
                  <div>
                    <Label>Section FAQ</Label>
                    <Select value={faqSection} onValueChange={setFaqSection}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Général">Général</SelectItem>
                        <SelectItem value="ANR">ANR</SelectItem>
                        <SelectItem value="Interphone">Interphone</SelectItem>
                        <SelectItem value="Abonnement">Abonnement</SelectItem>
                        <SelectItem value="Doming">Doming</SelectItem>
                        <SelectItem value="Sécurité">Sécurité</SelectItem>
                        <SelectItem value="Technique">Technique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedUsage) {
                    markReviewedMutation.mutate(selectedUsage.id);
                    setSelectedUsage(null);
                  }
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Marquer comme révisé
              </Button>
              <Button
                onClick={() => {
                  if (selectedUsage && correction.trim()) {
                    saveCorrectionMutation.mutate({
                      usageId: selectedUsage.id,
                      correction: correction.trim(),
                      addToFaq,
                      faqSection
                    });
                  }
                }}
                disabled={!correction.trim() || saveCorrectionMutation.isPending}
              >
                <BookPlus className="w-4 h-4 mr-2" />
                Enregistrer la correction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default ChatbotCorrections;