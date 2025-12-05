import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "./AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Mail, 
  MailOpen, 
  Clock, 
  CheckCircle2, 
  Search,
  User,
  Building2,
  Phone,
  MapPin,
  Tag,
  FileText,
  Briefcase,
  Newspaper,
  TrendingUp,
  Megaphone,
  Monitor,
  Landmark,
  MessageSquare,
  Filter,
  StickyNote
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

type MessageStatus = "new" | "read" | "in_progress" | "resolved";
type Department = "administratif" | "commercial" | "partenariat" | "presse" | "investisseurs" | "communication" | "informatique" | "collectivites";
type SenderType = "particulier" | "societe" | "collectivites";

interface ContactMessage {
  id: string;
  sender_type: SenderType;
  company_name: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  anr_code: string | null;
  department: Department;
  subject: string | null;
  message: string;
  status: MessageStatus;
  internal_notes: string | null;
  assigned_to: string | null;
  read_at: string | null;
  read_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

const departmentConfig: Record<Department, { label: string; icon: React.ElementType; color: string }> = {
  administratif: { label: "Administratif", icon: FileText, color: "bg-slate-500" },
  commercial: { label: "Commercial", icon: Briefcase, color: "bg-blue-500" },
  partenariat: { label: "Partenariat", icon: Building2, color: "bg-purple-500" },
  presse: { label: "Presse", icon: Newspaper, color: "bg-pink-500" },
  investisseurs: { label: "Investisseurs", icon: TrendingUp, color: "bg-green-500" },
  communication: { label: "Communication", icon: Megaphone, color: "bg-orange-500" },
  informatique: { label: "Informatique", icon: Monitor, color: "bg-cyan-500" },
  collectivites: { label: "Collectivités", icon: Landmark, color: "bg-amber-500" },
};

const statusConfig: Record<MessageStatus, { label: string; icon: React.ElementType; color: string }> = {
  new: { label: "Nouveau", icon: Mail, color: "bg-red-500" },
  read: { label: "Lu", icon: MailOpen, color: "bg-blue-500" },
  in_progress: { label: "En cours", icon: Clock, color: "bg-yellow-500" },
  resolved: { label: "Résolu", icon: CheckCircle2, color: "bg-green-500" },
};

const Messages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [senderTypeFilter, setSenderTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["contact_messages", statusFilter, departmentFilter, senderTypeFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as MessageStatus);
      }
      if (departmentFilter !== "all") {
        query = query.eq("department", departmentFilter as Department);
      }
      if (senderTypeFilter !== "all") {
        query = query.eq("sender_type", senderTypeFilter as SenderType);
      }
      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,message.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContactMessage[];
    },
    refetchInterval: 30000,
  });

  // Stats
  const stats = {
    new: messages.filter(m => m.status === "new").length,
    in_progress: messages.filter(m => m.status === "in_progress").length,
    resolved: messages.filter(m => m.status === "resolved").length,
    total: messages.length,
  };

  const selectedMessage = messages.find(m => m.id === selectedMessageId);

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ messageId, status }: { messageId: string; status: MessageStatus }) => {
      const updates: any = { status };
      
      if (status === "read" || status === "in_progress") {
        updates.read_at = new Date().toISOString();
        updates.read_by = user?.id;
      }
      if (status === "resolved") {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user?.id;
      }

      const { error } = await supabase
        .from("contact_messages")
        .update(updates)
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact_messages"] });
      queryClient.invalidateQueries({ queryKey: ["pending_messages_count"] });
      toast.success("Statut mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async ({ messageId, notes }: { messageId: string; notes: string }) => {
      const { error } = await supabase
        .from("contact_messages")
        .update({ internal_notes: notes })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact_messages"] });
      toast.success("Notes enregistrées");
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });

  // Auto-mark as read when selecting
  const handleSelectMessage = async (message: ContactMessage) => {
    setSelectedMessageId(message.id);
    setInternalNotes(message.internal_notes || "");
    
    if (message.status === "new") {
      updateStatusMutation.mutate({ messageId: message.id, status: "read" });
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            Centre de Messages
          </h1>
          <p className="text-muted-foreground">Gérez tous les messages de contact</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setStatusFilter("new")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Nouveaux</p>
                  <p className="text-2xl font-bold text-red-500">{stats.new}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setStatusFilter("in_progress")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En cours</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.in_progress}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setStatusFilter("resolved")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Résolus</p>
                  <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setStatusFilter("all")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filtres :</span>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(statusConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Département" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les services</SelectItem>
                  {Object.entries(departmentConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={senderTypeFilter} onValueChange={setSenderTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="particulier">Particulier</SelectItem>
                  <SelectItem value="societe">Société</SelectItem>
                  <SelectItem value="collectivites">Collectivité</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1 min-w-48">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages Grid */}
        <div className="grid lg:grid-cols-3 gap-6 min-h-[600px]">
          {/* Messages List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Messages ({messages.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[550px]">
                {messages.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun message</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {messages.map((message) => {
                      const StatusIcon = statusConfig[message.status].icon;
                      const DeptIcon = departmentConfig[message.department].icon;
                      const isSelected = selectedMessageId === message.id;
                      
                      return (
                        <div
                          key={message.id}
                          onClick={() => handleSelectMessage(message)}
                          className={cn(
                            "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                            isSelected && "bg-muted",
                            message.status === "new" && "border-l-4 border-l-red-500"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", statusConfig[message.status].color)} />
                              <span className="font-medium text-sm truncate max-w-32">
                                {message.first_name} {message.last_name}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: fr })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <DeptIcon className="w-3 h-3" />
                              {departmentConfig[message.department].label}
                            </Badge>
                            {message.sender_type === "societe" && (
                              <Badge variant="secondary" className="text-xs">
                                <Building2 className="w-3 h-3 mr-1" />
                                Société
                              </Badge>
                            )}
                            {message.sender_type === "collectivites" && (
                              <Badge variant="secondary" className="text-xs">
                                <Landmark className="w-3 h-3 mr-1" />
                                Collectivité
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {message.subject || message.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Message Detail */}
          <Card className="lg:col-span-2">
            {selectedMessage ? (
              <>
                <CardHeader className="border-b border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedMessage.first_name} {selectedMessage.last_name}
                        {(selectedMessage.sender_type === "societe" || selectedMessage.sender_type === "collectivites") && selectedMessage.company_name && (
                          <span className="text-muted-foreground font-normal text-sm">
                            ({selectedMessage.company_name})
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        {(() => {
                          const DeptIcon = departmentConfig[selectedMessage.department].icon;
                          return (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <DeptIcon className="w-3 h-3" />
                              {departmentConfig[selectedMessage.department].label}
                            </Badge>
                          );
                        })()}
                        <span className="text-xs">
                          {format(new Date(selectedMessage.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedMessage.status}
                        onValueChange={(value) => 
                          updateStatusMutation.mutate({ messageId: selectedMessage.id, status: value as MessageStatus })
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([value, config]) => {
                            const Icon = config.icon;
                            return (
                              <SelectItem key={value} value={value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  {config.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Message Content */}
                    <div className="md:col-span-2 space-y-6">
                      {selectedMessage.subject && (
                        <div>
                          <h3 className="font-semibold mb-1">Objet</h3>
                          <p className="text-muted-foreground">{selectedMessage.subject}</p>
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold mb-2">Message</h3>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
                        </div>
                      </div>
                      
                      {/* Internal Notes */}
                      <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2">
                          <StickyNote className="w-4 h-4" />
                          Notes internes
                        </h3>
                        <Textarea
                          value={internalNotes}
                          onChange={(e) => setInternalNotes(e.target.value)}
                          placeholder="Ajoutez des notes internes (visibles uniquement par l'équipe)..."
                          rows={3}
                        />
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => updateNotesMutation.mutate({ messageId: selectedMessage.id, notes: internalNotes })}
                          disabled={updateNotesMutation.isPending}
                        >
                          Enregistrer les notes
                        </Button>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Informations contact
                        </h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <a href={`mailto:${selectedMessage.email}`} className="text-primary hover:underline">
                              {selectedMessage.email}
                            </a>
                          </div>
                          {selectedMessage.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <a href={`tel:${selectedMessage.phone}`} className="hover:underline">
                                {selectedMessage.phone}
                              </a>
                            </div>
                          )}
                          {selectedMessage.address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <span>{selectedMessage.address}</span>
                            </div>
                          )}
                          {selectedMessage.anr_code && (
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-muted-foreground" />
                              <Badge variant="outline">{selectedMessage.anr_code}</Badge>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="text-xs text-muted-foreground space-y-2">
                        <p>Type : {selectedMessage.sender_type === "particulier" ? "Particulier" : selectedMessage.sender_type === "collectivites" ? "Collectivité" : "Société"}</p>
                        {selectedMessage.read_at && (
                          <p>Lu le {format(new Date(selectedMessage.read_at), "dd/MM/yyyy HH:mm")}</p>
                        )}
                        {selectedMessage.resolved_at && (
                          <p>Résolu le {format(new Date(selectedMessage.resolved_at), "dd/MM/yyyy HH:mm")}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Sélectionnez un message pour voir les détails</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Messages;
