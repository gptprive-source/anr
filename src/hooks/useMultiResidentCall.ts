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
    if (!habitationId || !mountedRef.current) return;

    try {
      // Step 1: Fetch residents
      const { data: residents, error: resError } = await supabase
        .from("residents")
        .select("id, user_id, habitation_id, is_owner")
        .eq("habitation_id", habitationId)
        .eq("status", "verified");

      if (resError) throw resError;
      if (!residents || residents.length === 0 || !mountedRef.current) return;

      // Step 2: Fetch profiles separately (may fail due to RLS but that's ok)
      const userIds = residents.map(r => r.user_id).filter(Boolean);
      let profiles: any[] = [];
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", userIds);
        profiles = profilesData || [];
      }

      // Step 3: Combine data
      const residentsWithProfiles = residents.map(r => ({
        ...r,
        profiles: profiles.find(p => p.id === r.user_id) || null,
      }));

      logger.log("[MultiResident] Available residents:", residentsWithProfiles.filter(r => r.user_id !== userId));
      setAvailableResidents(residentsWithProfiles.filter(r => r.user_id !== userId));
    } catch (error) {
      logger.error("[MultiResident] Fetch residents error:", error);
    }
  }, [habitationId, userId]);

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

  // Invite a single resident to join the call
  const inviteResident = useCallback(async (targetUserId: string) => {
    logger.log("[MultiResident] Inviting resident:", targetUserId);

    try {
      // Check if already invited/in call
      const existing = participants.find(
        p => p.user_id === targetUserId && ["answered", "in_group", "ringing"].includes(p.status)
      );
      if (existing) {
        logger.log("[MultiResident] Resident already in call or ringing");
        return;
      }

      // Update current user's status to in_group
      if (userId) {
        await supabase
          .from("call_participants")
          .update({ status: "in_group" })
          .eq("call_id", callId)
          .eq("user_id", userId)
          .eq("role", "resident");
      }

      // Insert new participant for invited resident
      const { error: insertError } = await supabase
        .from("call_participants")
        .insert({
          call_id: callId,
          user_id: targetUserId,
          habitation_id: habitationId,
          role: "resident",
          status: "ringing",
        });

      if (insertError) {
        logger.error("[MultiResident] Insert invite error:", insertError);
        return;
      }

      // Get habitation name for notification
      const { data: hab } = await supabase
        .from("habitations")
        .select("name")
        .eq("id", habitationId)
        .single();

      // Send push notification
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_ids: [targetUserId],
          title: "📞 Invitation à rejoindre l'appel",
          body: `Vous êtes invité à rejoindre l'appel en cours${hab?.name ? ` - ${hab.name}` : ""}`,
          data: { type: "incoming_call", callId, habitationId },
        },
      });

      logger.log("[MultiResident] Invited resident successfully");
      setIsGroupCall(true);
    } catch (error) {
      logger.error("[MultiResident] Invite resident error:", error);
    }
  }, [callId, habitationId, userId, participants]);

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
    inviteResident,
    joinGroupCall,
    updateMuteStatus,
    updateVideoStatus,
    leaveCall,
    fetchParticipants,
  };
};
