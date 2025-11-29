import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface CallParticipant {
  id: string;
  call_id: string;
  user_id: string | null;
  habitation_id: string;
  role: string;
  status: string;
  joined_at: string | null;
  left_at: string | null;
  is_muted: boolean;
  is_video_enabled: boolean;
  created_at: string;
  // Joined data
  user_name?: string;
}

interface UseMultiResidentCallProps {
  callId: string;
  habitationId: string;
  userId?: string;
  isVisitor?: boolean;
}

export const useMultiResidentCall = ({
  callId,
  habitationId,
  userId,
  isVisitor = false,
}: UseMultiResidentCallProps) => {
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState<CallParticipant | null>(null);
  const [answeredBy, setAnsweredBy] = useState<CallParticipant | null>(null);
  const [isGroupCall, setIsGroupCall] = useState(false);
  const [availableResidents, setAvailableResidents] = useState<any[]>([]);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const participantIdRef = useRef<string | null>(null);

  // Test mode: skip DB operations when habitationId is empty
  const isTestMode = !habitationId;

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    if (isTestMode) {
      console.log("[MultiResident] Test mode - skipping fetchParticipants");
      return;
    }

    const { data, error } = await supabase
      .from("call_participants")
      .select("*")
      .eq("call_id", callId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[MultiResident] Error fetching participants:", error);
      return;
    }

    setParticipants(data || []);
    
    // Find who answered
    const answered = data?.find(p => p.status === "answered" || p.status === "in_group");
    setAnsweredBy(answered || null);
    
    // Check if it's a group call
    const inGroupCount = data?.filter(p => p.status === "in_group").length || 0;
    setIsGroupCall(inGroupCount > 1);

    // Find current participant
    if (participantIdRef.current) {
      const current = data?.find(p => p.id === participantIdRef.current);
      setCurrentParticipant(current || null);
    }
  }, [callId, isTestMode]);

  // Fetch available residents for transfer
  const fetchAvailableResidents = useCallback(async () => {
    if (isTestMode) {
      console.log("[MultiResident] Test mode - skipping fetchAvailableResidents");
      return;
    }

    const { data, error } = await supabase
      .from("residents")
      .select(`
        id,
        user_id,
        habitation_id,
        is_owner,
        profiles:user_id (
          first_name,
          last_name
        )
      `)
      .eq("habitation_id", habitationId)
      .eq("status", "verified");

    if (error) {
      console.error("[MultiResident] Error fetching residents:", error);
      return;
    }

    // Filter out current user
    const others = data?.filter(r => r.user_id !== userId) || [];
    setAvailableResidents(others);
  }, [habitationId, userId, isTestMode]);

  // Join as participant
  const joinCall = useCallback(async (role: "visitor" | "resident" = "resident") => {
    if (isTestMode) {
      console.log("[MultiResident] Test mode - skipping joinCall");
      return null;
    }

    console.log("[MultiResident] Joining call as", role);
    
    const { data, error } = await supabase
      .from("call_participants")
      .insert({
        call_id: callId,
        user_id: isVisitor ? null : userId,
        habitation_id: habitationId,
        role,
        status: isVisitor ? "answered" : "ringing",
        joined_at: isVisitor ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("[MultiResident] Error joining call:", error);
      return null;
    }

    participantIdRef.current = data.id;
    setCurrentParticipant(data);
    return data;
  }, [callId, habitationId, userId, isVisitor, isTestMode]);

  // Answer the call
  const answerCall = useCallback(async () => {
    if (!participantIdRef.current) return;

    console.log("[MultiResident] Answering call");
    
    const { error } = await supabase
      .from("call_participants")
      .update({
        status: "answered",
        joined_at: new Date().toISOString(),
      })
      .eq("id", participantIdRef.current);

    if (error) {
      console.error("[MultiResident] Error answering call:", error);
    }
  }, []);

  // Decline the call
  const declineCall = useCallback(async () => {
    if (!participantIdRef.current) return;

    console.log("[MultiResident] Declining call");
    
    const { error } = await supabase
      .from("call_participants")
      .update({
        status: "declined",
        left_at: new Date().toISOString(),
      })
      .eq("id", participantIdRef.current);

    if (error) {
      console.error("[MultiResident] Error declining call:", error);
    }
  }, []);

  // Transfer call to another resident
  const transferCall = useCallback(async (targetUserId: string) => {
    if (!participantIdRef.current) return;

    console.log("[MultiResident] Transferring call to", targetUserId);
    
    // Mark current participant as transferred
    await supabase
      .from("call_participants")
      .update({
        status: "transferred",
        left_at: new Date().toISOString(),
      })
      .eq("id", participantIdRef.current);

    // Create new participant entry for target
    const { error } = await supabase
      .from("call_participants")
      .insert({
        call_id: callId,
        user_id: targetUserId,
        habitation_id: habitationId,
        role: "resident",
        status: "ringing",
      });

    if (error) {
      console.error("[MultiResident] Error creating transfer participant:", error);
    }

    // Send signal to notify transfer
    await supabase.from("call_signals").insert({
      call_id: callId,
      sender_id: `transfer-${Date.now()}`,
      signal_type: "call-transferred",
      signal_data: { target_user_id: targetUserId, from_user_id: userId },
    });
  }, [callId, habitationId, userId]);

  // Start group call (invite all residents)
  const startGroupCall = useCallback(async () => {
    if (!participantIdRef.current) return;

    console.log("[MultiResident] Starting group call");
    
    // Update current participant to in_group
    await supabase
      .from("call_participants")
      .update({ status: "in_group" })
      .eq("id", participantIdRef.current);

    // Invite all other residents
    for (const resident of availableResidents) {
      // Check if already a participant
      const existing = participants.find(p => p.user_id === resident.user_id);
      if (!existing) {
        await supabase
          .from("call_participants")
          .insert({
            call_id: callId,
            user_id: resident.user_id,
            habitation_id: habitationId,
            role: "resident",
            status: "ringing",
          });
      } else if (existing.status === "ringing") {
        // Send notification to ring again
        await supabase.from("call_signals").insert({
          call_id: callId,
          sender_id: `group-invite-${Date.now()}`,
          signal_type: "group-invite",
          signal_data: { target_user_id: resident.user_id },
        });
      }
    }

    setIsGroupCall(true);
  }, [callId, habitationId, availableResidents, participants]);

  // Join group call
  const joinGroupCall = useCallback(async () => {
    if (!participantIdRef.current) return;

    console.log("[MultiResident] Joining group call");
    
    const { error } = await supabase
      .from("call_participants")
      .update({
        status: "in_group",
        joined_at: new Date().toISOString(),
      })
      .eq("id", participantIdRef.current);

    if (error) {
      console.error("[MultiResident] Error joining group call:", error);
    }
  }, []);

  // Update mute status
  const updateMuteStatus = useCallback(async (isMuted: boolean) => {
    if (!participantIdRef.current) return;

    await supabase
      .from("call_participants")
      .update({ is_muted: isMuted })
      .eq("id", participantIdRef.current);
  }, []);

  // Update video status
  const updateVideoStatus = useCallback(async (isVideoEnabled: boolean) => {
    if (!participantIdRef.current) return;

    await supabase
      .from("call_participants")
      .update({ is_video_enabled: isVideoEnabled })
      .eq("id", participantIdRef.current);
  }, []);

  // Leave call
  const leaveCall = useCallback(async () => {
    if (!participantIdRef.current) return;

    console.log("[MultiResident] Leaving call");
    
    await supabase
      .from("call_participants")
      .update({
        status: "left",
        left_at: new Date().toISOString(),
      })
      .eq("id", participantIdRef.current);
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    if (isTestMode) {
      console.log("[MultiResident] Test mode - skipping realtime subscription");
      return;
    }

    fetchParticipants();
    fetchAvailableResidents();

    const channel = supabase
      .channel(`call-participants-${callId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_participants",
          filter: `call_id=eq.${callId}`,
        },
        (payload) => {
          console.log("[MultiResident] Participant change:", payload);
          fetchParticipants();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [callId, fetchParticipants, fetchAvailableResidents, isTestMode]);

  // Get active participants (in call)
  const activeParticipants = participants.filter(
    p => p.status === "answered" || p.status === "in_group"
  );

  // Get ringing participants
  const ringingParticipants = participants.filter(p => p.status === "ringing");

  return {
    participants,
    activeParticipants,
    ringingParticipants,
    currentParticipant,
    answeredBy,
    isGroupCall,
    availableResidents,
    joinCall,
    answerCall,
    declineCall,
    transferCall,
    startGroupCall,
    joinGroupCall,
    updateMuteStatus,
    updateVideoStatus,
    leaveCall,
    fetchParticipants,
  };
};
