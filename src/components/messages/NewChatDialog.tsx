import { useState, useEffect } from "react";
import { QrCode, Users, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Html5QrcodeScanner } from "html5-qrcode";
import { toast } from "sonner";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectRecipient: (recipientId: string) => void;
}

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

const NewChatDialog = ({ open, onOpenChange, onSelectRecipient }: NewChatDialogProps) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<"menu" | "scan" | "contacts">("menu");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scanning, setScanning] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setMode("menu");
      setSearchQuery("");
      setScanning(false);
    }
  }, [open]);

  // Fetch contacts (users from past chats + residents from same habitation)
  useEffect(() => {
    const fetchContacts = async () => {
      if (!user || mode !== "contacts") return;
      
      setLoading(true);
      try {
        // Get users from existing chats
        const { data: chats } = await supabase
          .from("chats")
          .select("participant1_id, participant2_id")
          .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

        const otherUserIds = new Set<string>();
        chats?.forEach(chat => {
          if (chat.participant1_id !== user.id) otherUserIds.add(chat.participant1_id);
          if (chat.participant2_id !== user.id) otherUserIds.add(chat.participant2_id);
        });

        // Get residents from same habitation
        const { data: myResident } = await supabase
          .from("residents")
          .select("habitation_id")
          .eq("user_id", user.id)
          .eq("status", "verified")
          .maybeSingle();

        if (myResident?.habitation_id) {
          const { data: coResidents } = await supabase
            .from("residents")
            .select("user_id")
            .eq("habitation_id", myResident.habitation_id)
            .eq("status", "verified")
            .neq("user_id", user.id);

          coResidents?.forEach(r => otherUserIds.add(r.user_id));
        }

        // Fetch profiles for all contacts
        if (otherUserIds.size > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, avatar_url")
            .in("id", Array.from(otherUserIds));

          setContacts(profiles || []);
        } else {
          setContacts([]);
        }
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [user, mode]);

  // Initialize QR scanner
  useEffect(() => {
    if (mode !== "scan" || !open) return;

    let scanner: Html5QrcodeScanner | null = null;
    
    const initScanner = () => {
      setScanning(true);
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
        },
        false
      );

      scanner.render(
        async (decodedText) => {
          // Parse ANR code from QR
          // Expected format: https://app.example.com/visitor?anr=CODE or just CODE
          let anrCode = decodedText;
          
          try {
            const url = new URL(decodedText);
            anrCode = url.searchParams.get("anr") || decodedText;
          } catch {
            // Not a URL, use as-is
          }

          // Find habitation and residents for this ANR
          const { data: anr } = await supabase
            .from("anrs")
            .select("id")
            .eq("code", anrCode.toUpperCase())
            .maybeSingle();

          if (!anr) {
            toast.error("Code ANR non trouvé");
            return;
          }

          const { data: habitation } = await supabase
            .from("habitations")
            .select("id")
            .eq("anr_id", anr.id)
            .maybeSingle();

          if (!habitation) {
            toast.error("Aucune habitation associée à ce code ANR");
            return;
          }

          const { data: residents } = await supabase
            .from("residents")
            .select("user_id")
            .eq("habitation_id", habitation.id)
            .eq("status", "verified")
            .limit(1);

          if (!residents?.length) {
            toast.error("Aucun résident trouvé pour cette habitation");
            return;
          }

          // Navigate to chat with first resident
          scanner?.clear();
          onSelectRecipient(residents[0].user_id);
        },
        (error) => {
          // Ignore scan errors (they happen frequently during scanning)
          console.debug("QR scan error:", error);
        }
      );
    };

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(initScanner, 100);

    return () => {
      clearTimeout(timeout);
      if (scanner) {
        scanner.clear().catch(console.error);
      }
      setScanning(false);
    };
  }, [mode, open, onSelectRecipient]);

  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery.trim()) return true;
    const name = `${contact.first_name || ""} ${contact.last_name || ""}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const getInitials = (contact: Contact) => {
    const first = contact.first_name?.[0] || "";
    const last = contact.last_name?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "menu" && "Nouvelle conversation"}
            {mode === "scan" && "Scanner un code ANR"}
            {mode === "contacts" && "Choisir un contact"}
          </DialogTitle>
        </DialogHeader>

        {mode === "menu" && (
          <div className="grid gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 justify-start gap-4"
              onClick={() => setMode("scan")}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">Scanner un ANR</p>
                <p className="text-sm text-muted-foreground">
                  Scannez le QR code pour contacter un résident
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 justify-start gap-4"
              onClick={() => setMode("contacts")}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">Contacts récents</p>
                <p className="text-sm text-muted-foreground">
                  Choisissez parmi vos contacts existants
                </p>
              </div>
            </Button>
          </div>
        )}

        {mode === "scan" && (
          <div className="space-y-4">
            <div id="qr-reader" className="w-full" />
            {scanning && (
              <p className="text-center text-sm text-muted-foreground">
                Placez le code QR dans le cadre
              </p>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMode("menu")}
            >
              Retour
            </Button>
          </div>
        )}

        {mode === "contacts" && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "Aucun contact trouvé" : "Aucun contact disponible"}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => onSelectRecipient(contact.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contact.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(contact)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {contact.first_name} {contact.last_name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMode("menu")}
            >
              Retour
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewChatDialog;
