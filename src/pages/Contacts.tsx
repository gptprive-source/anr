import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useResidentContacts, ResidentContact } from "@/hooks/useResidentContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/layout/BottomNav";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import AvatarUpload from "@/components/ui/AvatarUpload";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Search,
  Star,
  Building2,
  User,
  Phone,
  Mail,
  Home,
  Trash2,
  Edit,
  MoreVertical,
  Loader2,
  MessageSquare,
  ArrowLeft,
  MapPin,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FilterType = "all" | "favorites" | "companies" | "individuals";

interface HabitationOption {
  id: string;
  name: string;
  address: string;
}

const Contacts = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { contacts, loading, updateContact, deleteContact, toggleFavorite } = useResidentContacts();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [editingContact, setEditingContact] = useState<ResidentContact | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    job_title: "",
    phone: "",
    email: "",
    notes: "",
    avatar_url: null as string | null,
  });
  const [deletingContact, setDeletingContact] = useState<ResidentContact | null>(null);
  const contactRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // State for habitation selection dialog
  const [habitationsToSelect, setHabitationsToSelect] = useState<HabitationOption[]>([]);
  const [showHabitationDialog, setShowHabitationDialog] = useState(false);
  const [navigatingContact, setNavigatingContact] = useState<ResidentContact | null>(null);

  // Scroll to contact if scrollTo param is present
  useEffect(() => {
    const scrollTo = searchParams.get("scrollTo");
    if (scrollTo && !loading && contacts.length > 0) {
      // Find contact by email, phone, or id
      const contact = contacts.find(
        (c) => c.email === scrollTo || c.phone === scrollTo || c.id === scrollTo
      );
      if (contact && contactRefs.current[contact.id]) {
        setTimeout(() => {
          contactRefs.current[contact.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
          // Highlight effect
          contactRefs.current[contact.id]?.classList.add("ring-2", "ring-primary");
          setTimeout(() => {
            contactRefs.current[contact.id]?.classList.remove("ring-2", "ring-primary");
          }, 2000);
        }, 100);
      }
    }
  }, [searchParams, loading, contacts]);

  const filteredContacts = contacts.filter((contact) => {
    // Apply filter
    if (filter === "favorites" && !contact.is_favorite) return false;
    if (filter === "companies" && contact.contact_type !== "company") return false;
    if (filter === "individuals" && contact.contact_type !== "individual") return false;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchFields = [
        contact.first_name,
        contact.last_name,
        contact.company_name,
        contact.email,
        contact.phone,
        contact.job_title,
      ].filter(Boolean).join(" ").toLowerCase();
      return searchFields.includes(query);
    }

    return true;
  });

  const handleToggleFavorite = async (contact: ResidentContact) => {
    const result = await toggleFavorite(contact.id);
    if (result.success) {
      toast({
        title: contact.is_favorite ? "Retiré des favoris" : "Ajouté aux favoris",
      });
    }
  };

  const handleEditSave = async () => {
    if (!editingContact) return;
    const result = await updateContact(editingContact.id, {
      first_name: editForm.first_name || null,
      last_name: editForm.last_name || null,
      company_name: editForm.company_name || null,
      job_title: editForm.job_title || null,
      phone: editForm.phone || null,
      email: editForm.email || null,
      notes: editForm.notes || null,
      avatar_url: editForm.avatar_url,
    });
    if (result.success) {
      toast({ title: "Contact mis à jour" });
      setEditingContact(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingContact) return;
    const result = await deleteContact(deletingContact.id);
    if (result.success) {
      toast({ title: "Contact supprimé" });
      setDeletingContact(null);
    }
  };

  const openEdit = (contact: ResidentContact) => {
    setEditForm({
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      company_name: contact.company_name || "",
      job_title: contact.job_title || "",
      phone: contact.phone || "",
      email: contact.email || "",
      notes: contact.notes || "",
      avatar_url: contact.avatar_url || null,
    });
    setEditingContact(contact);
  };

  // Navigate to conversation - resolve ANR code to habitation_id if needed
  const handleNavigateToConversation = async (contact: ResidentContact) => {
    // PRIORITY 1: If we have an anr_code, resolve it to habitation_id (allows creating new conversation)
    if (contact.anr_code) {
      try {
        // Find the ANR by code
        const { data: anr, error: anrError } = await supabase
          .from("anrs")
          .select("id, address")
          .eq("code", contact.anr_code.toUpperCase())
          .maybeSingle();

        if (anrError || !anr) {
          toast({
            title: "ANR introuvable",
            description: "Le code ANR de ce contact n'existe plus",
            variant: "destructive",
          });
          return;
        }

        // Get habitations for this ANR
        const { data: habitations, error: habError } = await supabase
          .from("habitations")
          .select("id, name")
          .eq("anr_id", anr.id);

        if (habError || !habitations || habitations.length === 0) {
          toast({
            title: "Aucune habitation",
            description: "Aucune habitation trouvée pour ce code ANR",
            variant: "destructive",
          });
          return;
        }

        // If only one habitation, navigate directly
        if (habitations.length === 1) {
          navigate(`/conversation/${habitations[0].id}`);
          return;
        }

        // Multiple habitations - show selection dialog
        setHabitationsToSelect(habitations.map(h => ({
          id: h.id,
          name: h.name,
          address: anr.address
        })));
        setNavigatingContact(contact);
        setShowHabitationDialog(true);
        return;

      } catch (err) {
        console.error("Error resolving ANR:", err);
        toast({
          title: "Erreur",
          description: "Impossible de résoudre l'ANR de ce contact",
          variant: "destructive",
        });
        return;
      }
    }

    // PRIORITY 2: If we have source_business_card_id (contact from received message without ANR), use it
    if (contact.source_business_card_id) {
      navigate(`/conversation/${contact.source_business_card_id}`);
      return;
    }

    // No valid identifier
    toast({
      title: "Conversation introuvable",
      description: "Ce contact n'a pas de code ANR pour lui envoyer un message",
      variant: "destructive",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Mes contacts ANR</h1>
            <p className="text-primary-foreground/70 text-xs">
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""} enregistré{contacts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            <Users className="w-4 h-4 mr-1" />
            Tous
          </Button>
          <Button
            variant={filter === "favorites" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("favorites")}
          >
            <Star className="w-4 h-4 mr-1" />
            Favoris
          </Button>
          <Button
            variant={filter === "companies" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("companies")}
          >
            <Building2 className="w-4 h-4 mr-1" />
            Entreprises
          </Button>
          <Button
            variant={filter === "individuals" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("individuals")}
          >
            <User className="w-4 h-4 mr-1" />
            Particuliers
          </Button>
        </div>

        {/* Contacts List */}
        {filteredContacts.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 shadow-neumorphic-inset">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <p className="text-foreground font-medium">
              {searchQuery || filter !== "all"
                ? "Aucun contact trouvé"
                : "Aucun contact enregistré"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Ajoutez des contacts depuis vos messages visiteurs
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredContacts.map((contact) => {
              return (
              <Card 
                key={contact.id} 
                ref={(el) => { contactRefs.current[contact.id] = el; }}
                className="p-4 transition-all hover:shadow-neumorphic-pressed"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <button
                    onClick={() => handleToggleFavorite(contact)}
                    className="relative flex-shrink-0"
                  >
                    <Avatar className="h-11 w-11">
                      {contact.avatar_url ? (
                        <AvatarImage src={contact.avatar_url} alt={contact.first_name || contact.company_name || "Contact"} />
                      ) : null}
                      <AvatarFallback className={contact.contact_type === "company" ? "bg-orange-500/10" : "bg-blue-500/10"}>
                        {contact.contact_type === "company" ? (
                          <Building2 className="w-5 h-5 text-orange-500" />
                        ) : (
                          <User className="w-5 h-5 text-blue-500" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {contact.is_favorite && (
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 absolute -top-1 -right-1" />
                    )}
                  </button>

                  {/* Info - Clickable to open conversation */}
                  <div 
                    className="flex-1 min-w-0 cursor-pointer hover:opacity-80"
                    onClick={() => handleNavigateToConversation(contact)}
                  >
                    {contact.contact_type === "company" ? (
                      <>
                        <p className="font-medium truncate">{contact.company_name}</p>
                        {contact.first_name && (
                          <p className="text-sm text-muted-foreground truncate">
                            {contact.first_name} {contact.last_name}
                            {contact.job_title && ` - ${contact.job_title}`}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-medium truncate">
                          {contact.first_name} {contact.last_name}
                        </p>
                        {contact.job_title && (
                          <p className="text-sm text-muted-foreground truncate">
                            {contact.job_title}
                          </p>
                        )}
                      </>
                    )}

                    {/* Contact Methods */}
                    <div className="flex flex-wrap gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        >
                          <Phone className="w-3 h-3" /> {contact.phone}
                        </a>
                      )}
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        >
                          <Mail className="w-3 h-3" /> {contact.email}
                        </a>
                      )}
                      {contact.anr_code && (
                        <Badge variant="outline" className="text-xs">
                          <Home className="w-3 h-3 mr-1" />
                          ANR: {contact.anr_code}
                        </Badge>
                      )}
                    </div>

                    {/* Notes */}
                    {contact.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
                        {contact.notes}
                      </p>
                    )}
                  </div>

                  {/* Message Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => handleNavigateToConversation(contact)}
                  >
                    <MessageSquare className="w-5 h-5" />
                  </Button>

                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggleFavorite(contact)}>
                        <Star className="w-4 h-4 mr-2" />
                        {contact.is_favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(contact)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier les notes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletingContact(contact)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Avatar upload */}
            <div className="flex justify-center">
              <AvatarUpload
                currentUrl={editForm.avatar_url}
                onUpload={(url) => setEditForm({ ...editForm, avatar_url: url })}
                onRemove={() => setEditForm({ ...editForm, avatar_url: null })}
                fallbackText={editingContact?.contact_type === "company" ? editForm.company_name : `${editForm.first_name} ${editForm.last_name}`}
                size="lg"
              />
            </div>

            {editingContact?.contact_type === "company" && (
              <div className="space-y-2">
                <Label>Nom de l'entreprise</Label>
                <Input
                  value={editForm.company_name}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  placeholder="Nom de l'entreprise"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  placeholder="Prénom"
                />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  placeholder="Nom"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Poste / Fonction</Label>
              <Input
                value={editForm.job_title}
                onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                placeholder="Ex: Livreur, Plombier..."
              />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="Numéro de téléphone"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="Adresse email"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes personnelles</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
                placeholder="Ajoutez des notes sur ce contact..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)}>
              Annuler
            </Button>
            <Button onClick={handleEditSave}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingContact} onOpenChange={(open) => !open && setDeletingContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce contact ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le contact sera définitivement supprimé de votre carnet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Habitation Selection Dialog */}
      <Dialog open={showHabitationDialog} onOpenChange={setShowHabitationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-primary" />
              Sélectionner une habitation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              Plusieurs habitations sont liées à ce code ANR. Sélectionnez celle que vous souhaitez contacter :
            </p>
            {habitationsToSelect.map((hab) => (
              <div
                key={hab.id}
                onClick={() => {
                  navigate(`/conversation/${hab.id}`);
                  setShowHabitationDialog(false);
                  setHabitationsToSelect([]);
                  setNavigatingContact(null);
                }}
                className="p-3 rounded-lg border border-border cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Home className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{hab.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {hab.address}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Contacts;
