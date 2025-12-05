import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Bot, BookOpen, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";

type ChatbotUsage = {
  id: string;
  created_at: string;
  source: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  query_text: string | null;
  response_preview: string | null;
};

const ChatbotStats = () => {
  const [period, setPeriod] = useState<string>("7");

  const { data: usage, isLoading } = useQuery({
    queryKey: ["chatbot-usage", period],
    queryFn: async () => {
      const startDate = startOfDay(subDays(new Date(), parseInt(period)));
      
      const { data, error } = await supabase
        .from("chatbot_usage")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ChatbotUsage[];
    },
  });

  // Calculate stats
  const stats = usage?.reduce(
    (acc, item) => {
      if (item.source === "faq") {
        acc.faqCount++;
      } else {
        acc.openaiCount++;
        acc.totalInputTokens += item.input_tokens || 0;
        acc.totalOutputTokens += item.output_tokens || 0;
        acc.totalCost += Number(item.estimated_cost) || 0;
      }
      return acc;
    },
    {
      faqCount: 0,
      openaiCount: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
    }
  ) || { faqCount: 0, openaiCount: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0 };

  const totalRequests = stats.faqCount + stats.openaiCount;
  const faqPercentage = totalRequests > 0 ? ((stats.faqCount / totalRequests) * 100).toFixed(1) : "0";
  const avgCostPerRequest = stats.openaiCount > 0 ? (stats.totalCost / stats.openaiCount).toFixed(6) : "0";
  const savingsEstimate = stats.faqCount * 0.0005; // Estimated cost if FAQ used OpenAI

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Statistiques Chatbot</h1>
            <p className="text-muted-foreground">Suivi des coûts et performances du chatbot hybride</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Aujourd'hui</SelectItem>
              <SelectItem value="7">7 jours</SelectItem>
              <SelectItem value="30">30 jours</SelectItem>
              <SelectItem value="90">90 jours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Total requêtes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRequests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                FAQ (gratuit)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.faqCount}</div>
              <p className="text-xs text-muted-foreground">{faqPercentage}% des requêtes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Bot className="w-4 h-4" />
                OpenAI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.openaiCount}</div>
              <p className="text-xs text-muted-foreground">{stats.totalInputTokens + stats.totalOutputTokens} tokens</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Coût total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalCost.toFixed(4)}</div>
              <p className="text-xs text-muted-foreground">~${avgCostPerRequest}/req OpenAI</p>
            </CardContent>
          </Card>
        </div>

        {/* Savings Card */}
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Économies estimées grâce à la FAQ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${savingsEstimate.toFixed(4)}</div>
            <p className="text-sm text-green-600/80">
              {stats.faqCount} requêtes traitées gratuitement par la FAQ au lieu d'OpenAI
            </p>
          </CardContent>
        </Card>

        {/* Usage Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Historique des requêtes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : usage && usage.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Question</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Coût</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usage.slice(0, 50).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(item.created_at), "dd/MM HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          {item.source === "faq" ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              📚 FAQ
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              🤖 OpenAI
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={item.query_text || ""}>
                          {item.query_text?.slice(0, 50)}
                          {(item.query_text?.length || 0) > 50 && "..."}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.source === "openai" ? (
                            <span className="text-sm">
                              {item.input_tokens + item.output_tokens}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.source === "openai" ? (
                            <span className="font-mono text-sm">
                              ${Number(item.estimated_cost).toFixed(6)}
                            </span>
                          ) : (
                            <span className="text-green-600 font-medium">Gratuit</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Aucune donnée d'utilisation pour cette période
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ChatbotStats;