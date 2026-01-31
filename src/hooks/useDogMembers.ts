import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface DogMember {
  id: string;
  dog_id: string;
  user_id: string;
  role: "owner" | "coparent";
  status: "invited" | "active" | "removed";
  invited_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined profile data
  profile?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

export interface PendingInvite {
  id: string;
  dog_id: string;
  dog_name: string;
  dog_photo_url: string | null;
  inviter_name: string;
  invited_by: string;
  created_at: string;
}

export function useDogMembers(dogId: string | undefined) {
  const [members, setMembers] = useState<DogMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchMembers = useCallback(async () => {
    if (!dogId || !user) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("dog_members")
        .select("*")
        .eq("dog_id", dogId)
        .neq("status", "removed")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch profiles for members
      if (data && data.length > 0) {
        const userIds = data.map((m) => m.user_id);
        const { data: profiles } = await supabase.rpc("get_public_profiles");

        const membersWithProfiles = data.map((member) => {
          const profile = profiles?.find((p: any) => p.user_id === member.user_id);
          return {
            ...member,
            role: member.role as "owner" | "coparent",
            status: member.status as "invited" | "active" | "removed",
            profile: profile
              ? {
                  display_name: profile.display_name,
                  first_name: profile.first_name,
                  last_name: profile.last_name,
                  avatar_url: profile.avatar_url,
                }
              : undefined,
          };
        });

        setMembers(membersWithProfiles);
      } else {
        setMembers([]);
      }
    } catch (error: any) {
      console.error("Error fetching dog members:", error);
    } finally {
      setLoading(false);
    }
  }, [dogId, user]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const inviteMember = async (username: string): Promise<boolean> => {
    if (!dogId || !user) return false;

    try {
      // Use the security definer function to find users by display_name
      // This bypasses RLS since we need to find users we don't have relationships with yet
      const { data: profiles, error: profilesError } = await supabase.rpc("get_public_profiles");
      
      if (profilesError) throw profilesError;
      
      // Find user by display_name (case-insensitive)
      const matchedProfile = profiles?.find(
        (p: any) => p.display_name?.toLowerCase() === username.toLowerCase()
      );
      
      if (!matchedProfile) {
        toast({
          variant: "destructive",
          title: "User not found",
          description: "No user found with that username. Ask them to sign up first!",
        });
        return false;
      }
      
      const inviteeUserId = matchedProfile.user_id;

      

      // Check if already a member
      const { data: existing } = await supabase
        .from("dog_members")
        .select("id, status")
        .eq("dog_id", dogId)
        .eq("user_id", inviteeUserId)
        .maybeSingle();

      if (existing) {
        if (existing.status === "active") {
          toast({
            variant: "destructive",
            title: "Already a co-parent",
            description: "This user is already a co-parent of this dog.",
          });
          return false;
        } else if (existing.status === "invited") {
          toast({
            variant: "destructive",
            title: "Already invited",
            description: "This user already has a pending invite.",
          });
          return false;
        } else if (existing.status === "removed") {
          // Re-invite by updating status
          const { error } = await supabase
            .from("dog_members")
            .update({ status: "invited", invited_by: user.id })
            .eq("id", existing.id);

          if (error) throw error;
          
          toast({ title: "Invitation sent! 📧" });
          fetchMembers();
          return true;
        }
      }

      // Create new invite
      const { error } = await supabase.from("dog_members").insert({
        dog_id: dogId,
        user_id: inviteeUserId,
        role: "coparent",
        status: "invited",
        invited_by: user.id,
      });

      if (error) throw error;

      toast({ title: "Invitation sent! 📧" });
      fetchMembers();
      return true;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      return false;
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("dog_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({ title: "Member removed" });
      fetchMembers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return {
    members,
    loading,
    inviteMember,
    removeMember,
    refetch: fetchMembers,
  };
}

export function usePendingInvites() {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchInvites = useCallback(async () => {
    if (!user) {
      setInvites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("dog_members")
        .select("id, dog_id, invited_by, created_at")
        .eq("user_id", user.id)
        .eq("status", "invited");

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch dog details
        const dogIds = data.map((d) => d.dog_id);
        const { data: dogs } = await supabase
          .from("dogs")
          .select("id, name, photo_url")
          .in("id", dogIds);

        // Fetch inviter profiles
        const inviterIds = data.map((d) => d.invited_by).filter(Boolean);
        const { data: profiles } = await supabase.rpc("get_public_profiles");

        const invitesWithDetails = data.map((invite) => {
          const dog = dogs?.find((d) => d.id === invite.dog_id);
          const inviterProfile = profiles?.find(
            (p: any) => p.user_id === invite.invited_by
          );

          const inviterName =
            inviterProfile?.first_name && inviterProfile?.last_name
              ? `${inviterProfile.first_name} ${inviterProfile.last_name}`.trim()
              : inviterProfile?.display_name || "Someone";

          return {
            id: invite.id,
            dog_id: invite.dog_id,
            dog_name: dog?.name || "Unknown Dog",
            dog_photo_url: dog?.photo_url || null,
            inviter_name: inviterName,
            invited_by: invite.invited_by || "",
            created_at: invite.created_at,
          };
        });

        setInvites(invitesWithDetails);
      } else {
        setInvites([]);
      }
    } catch (error: any) {
      console.error("Error fetching invites:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const acceptInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("dog_members")
        .update({ status: "active" })
        .eq("id", inviteId);

      if (error) throw error;

      toast({ title: "You're now a co-parent! 🎉" });
      fetchInvites();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const declineInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from("dog_members")
        .update({ status: "removed" })
        .eq("id", inviteId);

      if (error) throw error;

      toast({ title: "Invitation declined" });
      fetchInvites();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return {
    invites,
    loading,
    acceptInvite,
    declineInvite,
    refetch: fetchInvites,
  };
}
