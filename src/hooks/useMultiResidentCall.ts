import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

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
  const mountedRef = useRef(true);

  const isTestMode = !habitationId;

  // Fetch participants
  const fetchParticipants = useCallback(async () => {
    if (isTestMode || !mountedRef.current) return;

    try {
      const { data, error } = await supabase
        .from("call_participants")
        .select("*")
        .eq("call_id", callId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!mountedRef.current) return;

      setParticipants(data || []);
      
      const answered = data?.find(p => p.status === "answered" || p.status === "in_group");
      setAnsweredBy(answered || null);
      
      const inGroupCount = data?.filter(p => p.status === "in_group").length || 0;
      setIsGroupCall(inGroupCount > 1);

      if (participantIdRef.current) {
        const current = data?.find(p => p.id === participantIdRef.current);
        setCurrentParticipant(current || null);
      }
    } catch (error) {
      logger.error("[MultiResident] Fetch error:", error);
    }
  }, [callId, isTestMode]);

  // Fetch available residents
  const fetchAvailableResidents = useCallback(async () => {
    if (isTestMode || !mountedRef.current) return;

    try {
      const { data, error } = await supabase
        .from("residents")
        .select(`id, user_id, habitation_id, is_owner, profiles:user_id (first_name, last_name)`)
        .eq("habitation_id", habitationId)
        .eq("status", "verified");

      if (error) throw error;
      if (!mountedRef.current) return;

      setAvailableResidents(data?.filter(r => r.user_id !== userId) || []);
    } catch (error) {
      logger.error("[MultiResident] Fetch residents error:", error);
    }
  }, [habitationId, userId, isTestMode]);

  // Join as participant
  const joinCall = useCallback(async (role: "visitor" | "resident" = "resident") => {
    if (isTestMode) return null;

    try {
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

      if (error) throw error;

      participantIdRef.current = data.id;
      setCurrentParticipant(data);
      return data;
    } catch (error) {
      logger.error("[MultiResident] Join error:", error);
      return null;
    }
  }, [callId, habitationId, userId, isVisitor, isTestMode]);

  // Answer the call
  const answerCall = useCallback(async () => {
    if (!participantIdRef.current) return;

    try {
      await supabase
        .from("call_participants")
        .update({ status: "answered", joined_at: new Date().toISOString() })
        .eq("id", participantIdRef.current);
    } catch (error) {
      logger.error("[MultiResident] Answer error:", error);
    }
  }, []);

  // Decline the call
  const declineCall = useCallback(async () => {
    if (!participantIdRef.current) return;

    try {
      await supabase
        .from("call_participants")
        .update({ status: "declined", left_at: new Date().toISOString() })
        .eq("id", participantIdRef.current);
    } catch (error) {
      logger.error("[MultiResident] Decline error:", error);
    }
  }, []);

  // Transfer call
  const transferCall = useCallback(async (targetUserId: string) => {
    if (!participantIdRef.current) return;

    try {
      // Batch: update current + insert new
      await Promise.all([
        supabase
          .from("call_participants")
          .update({ status: "transferred", left_at: new Date().toISOString() })
          .eq("id", participantIdRef.current),
        supabase
          .from("call_participants")
          .insert({
            call_id: callId,
            user_id: targetUserId,
            habitation_id: habitationId,
            role: "resident",
            status: "ringing",
          }),
      ]);
    } catch (error) {
      logger.error("[MultiResident] Transfer error:", error);
    }
  }, [callId, habitationId]);

  // Start group call - invite all other residents
  const startGroupCall = useCallback(async () => {
    logger.log("[MultiResident] Starting group call");

    try {
      // Update current user's status to in_group if they have a participant
      if (userId) {
        await supabase
          .from("call_participants")
          .update({ status: "in_group" })
          .eq("call_id", callId)
          .eq("user_id", userId)
          .eq("role", "resident");
      }

      // Find residents not yet in the call
      const residentsToInvite = availableResidents.filter(
        r => !participants.find(p => p.user_id === r.user_id && ["answered", "in_group", "ringing"].includes(p.status))
      );

      if (residentsToInvite.length === 0) {
        logger.log("[MultiResident] No residents to invite");
        return;
      }

      // Insert new participants for invited residents
      const invites = residentsToInvite.map(r => ({
        call_id: callId,
        user_id: r.user_id,
        habitation_id: habitationId,
        role: "resident",
        status: "ringing",
      }));

      const { error: insertError } = await supabase.from("call_participants").insert(invites);
      if (insertError) {
        logger.error("[MultiResident] Insert invites error:", insertError);
        return;
      }

      logger.log("[MultiResident] Invited", invites.length, "residents");

      // Send push notifications to invited residents
      const userIds = residentsToInvite.map(r => r.user_id);
      
      // Get habitation name for notification
      const { data: hab } = await supabase
        .from("habitations")
        .select("name")
        .eq("id", habitationId)
        .single();

      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_ids: userIds,
          title: "📞 Invitation à rejoindre l'appel",
          body: `Vous êtes invité à rejoindre l'appel en cours${hab?.name ? ` - ${hab.name}` : ""}`,
          data: { type: "incoming_call", callId, habitationId },
        },
      });

      logger.log("[MultiResident] Sent push notifications to", userIds.length, "residents");

      setIsGroupCall(true);
    } catch (error) {
      logger.error("[MultiResident] Start group error:", error);
    }
  }, [callId, habitationId, userId, availableResidents, participants]);

  // Join group call
  const joinGroupCall = useCallback(async () => {
    if (!participantIdRef.current) return;

    try {
      await supabase
        .from("call_participants")
        .update({ status: "in_group", joined_at: new Date().toISOString() })
        .eq("id", participantIdRef.current);
    } catch (error) {
      logger.error("[MultiResident] Join group error:", error);
    }
  }, []);

  // Update mute status (debounced)
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

    try {
      await supabase
        .from("call_participants")
        .update({ status: "left", left_at: new Date().toISOString() })
        .eq("id", participantIdRef.current);
    } catch (error) {
      logger.error("[MultiResident] Leave error:", error);
    }
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    mountedRef.current = true;
    
    if (isTestMode) return;

    fetchParticipants();
    fetchAvailableResidents();

    const channel = supabase
      .channel(`call-${callId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "call_participants",
          filter: `call_id=eq.${callId}`,
        },
        () => fetchParticipants()
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [callId, fetchParticipants, fetchAvailableResidents, isTestMode]);

  return {
    participants,
    activeParticipants: participants.filter(p => p.status === "answered" || p.status === "in_group"),
    ringingParticipants: participants.filter(p => p.status === "ringing"),
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
