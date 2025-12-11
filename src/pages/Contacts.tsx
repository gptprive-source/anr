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
  });
  const [deletingContact, setDeletingContact] = useState<ResidentContact | null>(null);
  const contactRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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
    });
    setEditingContact(contact);
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
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6" />
          Mes contacts ANR
        </h1>
        <p className="text-white/80 text-sm mt-1">
          {contacts.length} contact{contacts.length !== 1 ? "s" : ""} enregistré{contacts.length !== 1 ? "s" : ""}
        </p>
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
            className={filter !== "all" ? "border border-blue-500" : ""}
          >
            <Users className="w-4 h-4 mr-1" />
            Tous
          </Button>
          <Button
            variant={filter === "favorites" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("favorites")}
            className={filter !== "favorites" ? "border border-yellow-500" : ""}
          >
            <Star className="w-4 h-4 mr-1 text-yellow-500" />
            Favoris
          </Button>
          <Button
            variant={filter === "companies" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("companies")}
            className={filter !== "companies" ? "border border-orange-500" : ""}
          >
            <Building2 className="w-4 h-4 mr-1 text-orange-500" />
            Entreprises
          </Button>
          <Button
            variant={filter === "individuals" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("individuals")}
            className={filter !== "individuals" ? "border border-purple-500" : ""}
          >
            <User className="w-4 h-4 mr-1 text-purple-500" />
            Particuliers
          </Button>
        </div>

        {/* Contacts List */}
        {filteredContacts.length === 0 ? (
          <Card className="p-8 text-center border border-blue-500">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-foreground font-medium">
              {searchQuery || filter !== "all"
                ? "Aucun contact trouvé"
                : "Aucun contact enregistré"}
            </p>
            <p className="text-sm text-foreground/70 mt-1">
              Ajoutez des contacts depuis vos messages visiteurs
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredContacts.map((contact, index) => {
              // Cycle through colors: blue, orange, purple, pink, green, cyan
              const colorCycle = ["border-blue-500", "border-orange-500", "border-purple-500", "border-pink-500", "border-green-500", "border-cyan-500"];
              const borderColor = colorCycle[index % colorCycle.length];
              return (
              <Card 
                key={contact.id} 
                ref={(el) => { contactRefs.current[contact.id] = el; }}
                className={`p-4 border ${borderColor} transition-all`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <button
                    onClick={() => handleToggleFavorite(contact)}
                    className={`p-2 rounded-full transition-colors relative ${contact.contact_type === "company" ? "bg-orange-500/10 hover:bg-orange-500/20" : "bg-blue-500/10 hover:bg-blue-500/20"}`}
                  >
                    {contact.contact_type === "company" ? (
                      <Building2 className="w-5 h-5 text-orange-500" />
                    ) : (
                      <User className="w-5 h-5 text-blue-500" />
                    )}
                    {contact.is_favorite && (
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 absolute -top-1 -right-1" />
                    )}
                  </button>

                  {/* Info - Clickable to open conversation */}
                  <div 
                    className="flex-1 min-w-0 cursor-pointer hover:opacity-80"
                    onClick={() => {
                      // Use source_business_card_id, phone, or anr_code to navigate to conversation
                      const conversationId = contact.source_business_card_id || contact.phone || contact.anr_code;
                      if (conversationId) {
                        navigate(`/conversation/${conversationId}`);
                      } else {
                        toast({
                          title: "Conversation introuvable",
                          description: "Aucun identifiant de conversation disponible pour ce contact",
                          variant: "destructive",
                        });
                      }
                    }}
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
                    onClick={() => {
                      const conversationId = contact.source_business_card_id || contact.phone || contact.anr_code;
                      if (conversationId) {
                        navigate(`/conversation/${conversationId}`);
                      } else {
                        toast({
                          title: "Conversation introuvable",
                          description: "Aucun identifiant de conversation disponible",
                          variant: "destructive",
                        });
                      }
                    }}
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

      <BottomNav />
    </div>
  );
};

export default Contacts;
