import { useState, useEffect } from "react";
import { Mail, Users, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ResidentWithProfile {
  id: string;
  user_id: string;
  is_owner: boolean;
  receive_visitor_messages: boolean;
  profile?: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface ResidentMessagingSettingsProps {
  habitationId: string;
}

export function ResidentMessagingSettings({ habitationId }: ResidentMessagingSettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [residents, setResidents] = useState<ResidentWithProfile[]>([]);

  const fetchResidents = async () => {
    try {
      const { data, error } = await supabase
        .from("residents")
        .select("id, user_id, is_owner, receive_visitor_messages")
        .eq("habitation_id", habitationId)
        .eq("status", "verified");

      if (error) throw error;

      // Fetch profiles for each resident
      const residentsWithProfiles: ResidentWithProfile[] = await Promise.all(
        (data || []).map(async (resident) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", resident.user_id)
            .single();
          
          return {
            ...resident,
            profile: profile || undefined
          };
        })
      );

      // Filter out the owner (they always receive messages)
      setResidents(residentsWithProfiles.filter(r => !r.is_owner));
    } catch (error) {
      console.error("Error fetching residents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (habitationId) {
      fetchResidents();
    }
  }, [habitationId]);

  const handleToggle = async (residentId: string, currentValue: boolean) => {
    setUpdating(residentId);
    try {
      const { error } = await supabase
        .from("residents")
        .update({ receive_visitor_messages: !currentValue })
        .eq("id", residentId);

      if (error) throw error;

      setResidents(prev => prev.map(r => 
        r.id === residentId ? { ...r, receive_visitor_messages: !currentValue } : r
      ));

      toast({
        title: "Paramètre mis à jour",
        description: !currentValue 
          ? "Ce résident recevra les messages des visiteurs" 
          : "Ce résident ne recevra plus les messages des visiteurs"
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (residents.length === 0) {
    return null; // No invited residents to configure
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-neumorphic-inset">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Messages visiteurs</CardTitle>
            <CardDescription className="text-xs">
              Configurez qui reçoit les messages des visiteurs interphone
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          En tant que propriétaire, vous recevez toujours les messages. 
          Activez cette option pour que vos invités les reçoivent également.
        </p>
        
        <div className="space-y-3">
          {residents.map((resident) => {
            const name = resident.profile 
              ? `${resident.profile.first_name || ""} ${resident.profile.last_name || ""}`.trim() || "Sans nom"
              : "Sans nom";
            
            return (
              <div 
                key={resident.id} 
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <Label htmlFor={`toggle-${resident.id}`} className="font-medium cursor-pointer">
                    {name}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  {updating === resident.id && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                  <Switch
                    id={`toggle-${resident.id}`}
                    checked={resident.receive_visitor_messages}
                    onCheckedChange={() => handleToggle(resident.id, resident.receive_visitor_messages)}
                    disabled={updating === resident.id}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
