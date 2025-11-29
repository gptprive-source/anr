import { Users, Mic, MicOff, Video, VideoOff, Phone, PhoneOff } from "lucide-react";
import { CallParticipant } from "@/hooks/useMultiResidentCall";
import { Badge } from "@/components/ui/badge";

interface GroupCallPanelProps {
  participants: CallParticipant[];
  currentUserId?: string;
}

const GroupCallPanel = ({ participants, currentUserId }: GroupCallPanelProps) => {
  if (participants.length <= 1) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "answered":
      case "in_group":
        return "bg-green-500";
      case "ringing":
        return "bg-yellow-500 animate-pulse";
      case "declined":
      case "left":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "answered":
        return "En appel";
      case "in_group":
        return "Dans l'appel";
      case "ringing":
        return "Sonne...";
      case "declined":
        return "Refusé";
      case "transferred":
        return "Transféré";
      case "left":
        return "Parti";
      default:
        return status;
    }
  };

  return (
    <div className="absolute top-20 right-4 z-20 bg-background/80 backdrop-blur-sm rounded-lg border border-border p-3 min-w-48">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Participants ({participants.length})</span>
      </div>
      
      <div className="space-y-2">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className={`flex items-center gap-2 p-2 rounded-md ${
              participant.user_id === currentUserId ? "bg-primary/10" : "bg-secondary/50"
            }`}
          >
            {/* Status indicator */}
            <div className={`w-2 h-2 rounded-full ${getStatusColor(participant.status)}`} />
            
            {/* Role icon */}
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              {participant.role === "visitor" ? (
                <Phone className="w-4 h-4" />
              ) : (
                <Users className="w-4 h-4" />
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {participant.role === "visitor" 
                  ? "Visiteur" 
                  : participant.user_id === currentUserId 
                    ? "Vous" 
                    : "Résident"
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {getStatusLabel(participant.status)}
              </p>
            </div>
            
            {/* Media status */}
            {(participant.status === "answered" || participant.status === "in_group") && (
              <div className="flex gap-1">
                {participant.is_muted ? (
                  <MicOff className="w-3 h-3 text-destructive" />
                ) : (
                  <Mic className="w-3 h-3 text-green-500" />
                )}
                {participant.is_video_enabled ? (
                  <Video className="w-3 h-3 text-green-500" />
                ) : (
                  <VideoOff className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupCallPanel;
