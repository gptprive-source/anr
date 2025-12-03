import { UserPlus, User, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CallParticipant } from "@/hooks/useMultiResidentCall";

interface ResidentInfo {
  id: string;
  user_id: string;
  habitation_id: string;
  is_owner: boolean;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface InviteResidentsPanelProps {
  availableResidents: ResidentInfo[];
  participants: CallParticipant[];
  onInviteAll: () => void;
  isInviting?: boolean;
}

const InviteResidentsPanel = ({
  availableResidents,
  participants,
  onInviteAll,
  isInviting = false,
}: InviteResidentsPanelProps) => {
  if (availableResidents.length === 0) return null;

  // Check which residents are already in the call
  const getResidentStatus = (userId: string) => {
    const participant = participants.find(p => p.user_id === userId);
    if (!participant) return "available";
    if (participant.status === "ringing") return "ringing";
    if (participant.status === "answered" || participant.status === "in_group") return "in_call";
    return "available";
  };

  const getResidentName = (resident: ResidentInfo) => {
    const firstName = resident.profiles?.first_name || "";
    const lastName = resident.profiles?.last_name || "";
    return `${firstName} ${lastName}`.trim() || "Résident";
  };

  const availableToInvite = availableResidents.filter(
    r => getResidentStatus(r.user_id) === "available"
  );

  return (
    <div className="absolute top-20 left-4 z-20 bg-background/90 backdrop-blur-sm rounded-lg border border-border p-3 min-w-56 max-w-72">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Inviter des résidents</span>
      </div>

      <div className="space-y-2 mb-3">
        {availableResidents.map((resident) => {
          const status = getResidentStatus(resident.user_id);
          const name = getResidentName(resident);

          return (
            <div
              key={resident.id}
              className={`flex items-center gap-2 p-2 rounded-md ${
                status === "in_call"
                  ? "bg-green-500/20"
                  : status === "ringing"
                  ? "bg-yellow-500/20"
                  : "bg-secondary/50"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {status === "in_call" && "Dans l'appel"}
                  {status === "ringing" && "Sonne..."}
                  {status === "available" && "Disponible"}
                </p>
              </div>

              {status === "in_call" && (
                <Check className="w-4 h-4 text-green-500" />
              )}
            </div>
          );
        })}
      </div>

      {availableToInvite.length > 0 && (
        <Button
          variant="default"
          size="sm"
          onClick={onInviteAll}
          disabled={isInviting}
          className="w-full"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {isInviting ? "Invitation en cours..." : `Inviter tous (${availableToInvite.length})`}
        </Button>
      )}
    </div>
  );
};

export default InviteResidentsPanel;
