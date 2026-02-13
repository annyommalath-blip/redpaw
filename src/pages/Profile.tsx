import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Dog, Settings, LogOut, Edit, Camera, HandHeart, Loader2, Plus, Save, MapPin, Archive, ChevronRight, ArchiveX, AlertTriangle, Bell, ChevronDown, AtSign, Menu, Languages, Grid3X3, Bookmark, Repeat2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DogSelector } from "@/components/dog/DogSelector";
import { DogCard } from "@/components/dog/DogCard";
import { LostModeDialog } from "@/components/dog/LostModeDialog";
import { PendingInvitesCard } from "@/components/dog/PendingInvitesCard";
import { AnimatedItem } from "@/components/ui/animated-list";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { checkMedicationNotifications } from "@/lib/notificationUtils";
import UsernameSetupDialog from "@/components/UsernameSetupDialog";
import ProfilePhotoCropDialog from "@/components/profile/ProfilePhotoCropDialog";
import { isValidImageType, isHeicFile, processImageFile } from "@/lib/imageUtils";
import PostCard from "@/components/feed/PostCard";
import type { PostData } from "@/components/feed/PostCard";
import SendPostSheet from "@/components/feed/SendPostSheet";
import { cn } from "@/lib/utils";

const ACTIVE_DOG_STORAGE_KEY = "redpaw_active_dog_id";

interface UserDog {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
  is_lost: boolean;
}

interface OwnerProfile {
  display_name: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  postal_code: string | null;
  username: string | null;
  bio: string | null;
}

interface MyCareRequest {
  id: string;
  care_type: "walk" | "watch" | "overnight" | "check-in";
  time_window: string;
  status: "open" | "closed";
  assigned_sitter_id: string | null;
  owner_id: string;
  created_at: string;
  request_date: string | null;
  end_time: string | null;
  archived_at: string | null;
  dogs: { name: string; breed: string | null } | null;
}

interface ArchivedLostAlert {
  id: string;
  title: string;
  created_at: string;
  resolved_at: string | null;
  dogs: { name: string; breed: string | null } | null;
}

const isRequestArchived = (request: MyCareRequest): boolean => {
  if (request.archived_at) return true;
  if (!request.request_date || !request.end_time) return false;
  const [hours, minutes] = request.end_time.split(':').map(Number);
  const endDateTime = new Date(request.request_date);
  endDateTime.setHours(hours, minutes, 0, 0);
  const archiveTime = new Date(endDateTime.getTime() + 60 * 60 * 1000);
  return new Date() > archiveTime;
};


export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [dogs, setDogs] = useState<UserDog[]>([]);
  const [activeDogId, setActiveDogId] = useState<string | null>(null);
  const [myCareRequests, setMyCareRequests] = useState<MyCareRequest[]>([]);
  const [archivedLostAlerts, setArchivedLostAlerts] = useState<ArchivedLostAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [lostModeDialogOpen, setLostModeDialogOpen] = useState(false);
  const [showCareRequests, setShowCareRequests] = useState(false);
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    city: "",
    postal_code: "",
    username: "",
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { unreadCount: notificationCount } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Profile stats
  const [postCount, setPostCount] = useState(0);
  const [careJobCount, setCareJobCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [showFollowList, setShowFollowList] = useState<"following" | "followers" | null>(null);
  const [followListUsers, setFollowListUsers] = useState<{ user_id: string; display_name: string | null; avatar_url: string | null; username: string | null }[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  // Posts tab state
  const [myPosts, setMyPosts] = useState<PostData[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  
  // Reposts tab state
  const [myReposts, setMyReposts] = useState<PostData[]>([]);
  const [repostsLoading, setRepostsLoading] = useState(false);

  // Saved tab state
  const [savedPosts, setSavedPosts] = useState<PostData[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("posts");

  // Share post sheet
  const [sharePost, setSharePost] = useState<PostData | null>(null);

  // My Dogs collapsible
  const [showMyDogs, setShowMyDogs] = useState(true);

  const activeDog = dogs.find(d => d.id === activeDogId) || null;

  const handleSelectDog = useCallback((dogId: string) => {
    setActiveDogId(dogId);
    localStorage.setItem(ACTIVE_DOG_STORAGE_KEY, dogId);
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
      checkMedicationNotifications(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchMyPosts();
      fetchMyReposts();
      fetchSavedPosts();
    }
  }, [user]);

  const fetchMyReposts = async () => {
    if (!user) return;
    setRepostsLoading(true);
    try {
      // Get user's reposts (posts where repost_id is not null)
      const { data: repostsData } = await supabase
        .from("posts")
        .select("id, user_id, caption, photo_url, photo_urls, repost_id, created_at, visibility")
        .eq("user_id", user.id)
        .not("repost_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!repostsData || repostsData.length === 0) { setMyReposts([]); setRepostsLoading(false); return; }

      // Get original posts
      const originalIds = repostsData.map(p => p.repost_id!).filter(Boolean);
      const { data: originals } = await supabase
        .from("posts")
        .select("id, user_id, caption, photo_url, photo_urls, repost_id, created_at, visibility")
        .in("id", originalIds);

      const { data: profiles } = await supabase.rpc("get_public_profiles");
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const allPostIds = [...repostsData.map(p => p.id), ...originalIds];
      const { data: userLikes } = await supabase
        .from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", allPostIds);
      const likedSet = new Set((userLikes || []).map(l => l.post_id));

      const { data: likeCounts } = await supabase
        .from("post_likes").select("post_id").in("post_id", allPostIds);
      const likeCountMap = new Map<string, number>();
      (likeCounts || []).forEach(l => likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) || 0) + 1));

      const { data: commentCounts } = await supabase
        .from("post_comments").select("post_id").in("post_id", allPostIds);
      const commentCountMap = new Map<string, number>();
      (commentCounts || []).forEach(c => commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1));

      const originalMap = new Map((originals || []).map(o => [o.id, o]));

      const enriched: PostData[] = repostsData.map(p => {
        const orig = p.repost_id ? originalMap.get(p.repost_id) : null;
        return {
          ...p,
          author: profileMap.get(p.user_id) || undefined,
          like_count: likeCountMap.get(p.id) || 0,
          comment_count: commentCountMap.get(p.id) || 0,
          repost_count: 0,
          is_liked: likedSet.has(p.id),
          original_post: orig ? {
            ...orig,
            author: profileMap.get(orig.user_id) || undefined,
            like_count: likeCountMap.get(orig.id) || 0,
            comment_count: commentCountMap.get(orig.id) || 0,
            repost_count: 0,
            is_liked: likedSet.has(orig.id),
            original_post: null,
          } : null,
        };
      });

      setMyReposts(enriched);
    } catch (err) {
      console.error("Error fetching reposts:", err);
    } finally {
      setRepostsLoading(false);
    }
  };

  const fetchMyPosts = async () => {
    if (!user) return;
    setPostsLoading(true);
    try {
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, user_id, caption, photo_url, photo_urls, repost_id, created_at, visibility")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!postsData) { setPostsLoading(false); return; }

      const { data: profiles } = await supabase.rpc("get_public_profiles");
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const postIds = postsData.map(p => p.id);
      const { data: userLikes } = await supabase
        .from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      const likedSet = new Set((userLikes || []).map(l => l.post_id));

      const { data: likeCounts } = await supabase
        .from("post_likes").select("post_id").in("post_id", postIds);
      const likeCountMap = new Map<string, number>();
      (likeCounts || []).forEach(l => likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) || 0) + 1));

      const { data: commentCounts } = await supabase
        .from("post_comments").select("post_id").in("post_id", postIds);
      const commentCountMap = new Map<string, number>();
      (commentCounts || []).forEach(c => commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1));

      const enriched: PostData[] = postsData.map(p => ({
        ...p,
        author: profileMap.get(p.user_id) || undefined,
        like_count: likeCountMap.get(p.id) || 0,
        comment_count: commentCountMap.get(p.id) || 0,
        repost_count: 0,
        is_liked: likedSet.has(p.id),
        original_post: null,
      }));

      setMyPosts(enriched);
      setPostCount(enriched.length);
    } catch (err) {
      console.error("Error fetching my posts:", err);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchSavedPosts = async () => {
    if (!user) return;
    setSavedLoading(true);
    try {
      const { data: savedData } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!savedData || savedData.length === 0) { setSavedPosts([]); setSavedLoading(false); return; }

      const postIds = savedData.map(s => s.post_id);
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, user_id, caption, photo_url, photo_urls, repost_id, created_at, visibility")
        .in("id", postIds);

      if (!postsData) { setSavedPosts([]); setSavedLoading(false); return; }

      const { data: profiles } = await supabase.rpc("get_public_profiles");
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const { data: userLikes } = await supabase
        .from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
      const likedSet = new Set((userLikes || []).map(l => l.post_id));

      const { data: likeCounts } = await supabase
        .from("post_likes").select("post_id").in("post_id", postIds);
      const likeCountMap = new Map<string, number>();
      (likeCounts || []).forEach(l => likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) || 0) + 1));

      const { data: commentCounts } = await supabase
        .from("post_comments").select("post_id").in("post_id", postIds);
      const commentCountMap = new Map<string, number>();
      (commentCounts || []).forEach(c => commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1));

      const postMap = new Map(postsData.map(p => [p.id, p]));
      const ordered = savedData.map(s => postMap.get(s.post_id)).filter(Boolean) as typeof postsData;

      const enriched: PostData[] = ordered.map(p => ({
        ...p,
        author: profileMap.get(p.user_id) || undefined,
        like_count: likeCountMap.get(p.id) || 0,
        comment_count: commentCountMap.get(p.id) || 0,
        repost_count: 0,
        is_liked: likedSet.has(p.id),
        is_saved: true,
        original_post: null,
      }));

      setSavedPosts(enriched);
    } catch (err) {
      console.error("Error fetching saved posts:", err);
    } finally {
      setSavedLoading(false);
    }
  };

  const handlePostLikeToggle = async (postId: string, liked: boolean) => {
    if (!user) return;
    setMyPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, is_liked: liked, like_count: p.like_count + (liked ? 1 : -1) } : p
    ));
    if (liked) {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    } else {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    }
  };

  const handlePostDelete = async (postId: string) => {
    await supabase.from("posts").delete().eq("id", postId);
    setMyPosts(prev => prev.filter(p => p.id !== postId));
    setPostCount(prev => prev - 1);
  };

  const handlePostRepost = async (originalPostId: string) => {
    if (!user) return;
    const { error } = await supabase.from("posts").insert({ user_id: user.id, repost_id: originalPostId });
    if (!error) fetchMyPosts();
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, first_name, last_name, city, postal_code, username, bio")
        .eq("user_id", user.id)
        .maybeSingle();

      setProfile(profileData);
      if (profileData) {
        setEditForm({
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          city: profileData.city || "",
          postal_code: profileData.postal_code || "",
          username: profileData.username || "",
        });
        if (!profileData.username) {
          setShowUsernameSetup(true);
        }
      }

      const { data: ownedDogs } = await supabase
        .from("dogs")
        .select("id, name, breed, photo_url, is_lost")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });

      const { data: coParentedMemberships } = await supabase
        .from("dog_members")
        .select("dog_id")
        .eq("user_id", user.id)
        .eq("status", "active");

      let coParentedDogs: UserDog[] = [];
      if (coParentedMemberships && coParentedMemberships.length > 0) {
        const dogIds = coParentedMemberships.map((m) => m.dog_id);
        const { data: sharedDogs } = await supabase
          .from("dogs")
          .select("id, name, breed, photo_url, is_lost")
          .in("id", dogIds)
          .order("created_at", { ascending: true });
        coParentedDogs = (sharedDogs || []) as UserDog[];
      }

      const allDogs = [...(ownedDogs || []), ...coParentedDogs];
      const uniqueDogs = allDogs.filter(
        (dog, index, self) => self.findIndex((d) => d.id === dog.id) === index
      );
      setDogs(uniqueDogs);

      if (uniqueDogs.length > 0) {
        const savedDogId = localStorage.getItem(ACTIVE_DOG_STORAGE_KEY);
        const savedDogExists = uniqueDogs.some(d => d.id === savedDogId);
        if (savedDogId && savedDogExists) {
          setActiveDogId(savedDogId);
        } else {
          setActiveDogId(uniqueDogs[0].id);
          localStorage.setItem(ACTIVE_DOG_STORAGE_KEY, uniqueDogs[0].id);
        }
      }

      const { data: ownedRequests } = await supabase
        .from("care_requests")
        .select("*, dogs (name, breed)")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      const { data: assignedRequests } = await supabase
        .from("care_requests")
        .select("*, dogs (name, breed)")
        .eq("assigned_sitter_id", user.id)
        .order("created_at", { ascending: false });

      const allRequests = [...(ownedRequests || []), ...(assignedRequests || [])];
      const uniqueRequests = allRequests.filter((request, index, self) =>
        index === self.findIndex((r) => r.id === request.id)
      );
      uniqueRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setMyCareRequests(uniqueRequests as MyCareRequest[]);
      setCareJobCount(uniqueRequests.length);

      const { data: resolvedAlerts } = await supabase
        .from("lost_alerts")
        .select("id, title, created_at, resolved_at, dogs (name, breed)")
        .eq("owner_id", user.id)
        .eq("status", "resolved")
        .order("resolved_at", { ascending: false });

      setArchivedLostAlerts((resolvedAlerts as any) || []);

      // Fetch follow counts
      const { count: fwingCount } = await supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id);
      setFollowingCount(fwingCount || 0);

      const { count: fwerCount } = await supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id);
      setFollowerCount(fwerCount || 0);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openFollowList = async (type: "following" | "followers") => {
    if (!user) return;
    setShowFollowList(type);
    setFollowListLoading(true);
    setFollowListUsers([]);

    try {
      let userIds: string[] = [];
      if (type === "following") {
        const { data } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", user.id);
        userIds = (data || []).map((d) => d.following_id);
      } else {
        const { data } = await supabase
          .from("user_follows")
          .select("follower_id")
          .eq("following_id", user.id);
        userIds = (data || []).map((d) => d.follower_id);
      }

      if (userIds.length > 0) {
        const { data: profiles } = await supabase.rpc("get_public_profiles");
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        const users = userIds
          .map((id) => profileMap.get(id))
          .filter(Boolean) as typeof followListUsers;
        setFollowListUsers(users);
      }
    } catch (err) {
      console.error("Error fetching follow list:", err);
    } finally {
      setFollowListLoading(false);
    }
  };

  const handleLostModeToggle = (dogId: string, currentlyLost: boolean) => {
    if (currentlyLost) {
      handleEndLostMode(dogId);
    } else {
      setLostModeDialogOpen(true);
    }
  };

  const handleEndLostMode = async (dogId: string) => {
    try {
      const { error: dogError } = await supabase
        .from("dogs")
        .update({ is_lost: false })
        .eq("id", dogId);
      if (dogError) throw dogError;
      await supabase
        .from("lost_alerts")
        .update({ status: "resolved" })
        .eq("dog_id", dogId)
        .eq("status", "active");
      setDogs((prev) =>
        prev.map((d) => (d.id === dogId ? { ...d, is_lost: false } : d))
      );
      toast({
        title: t("home.lostModeDeactivated"),
        description: t("home.gladPupSafe"),
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleLostModeSuccess = () => {
    fetchData();
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: editForm.first_name.trim() || null,
          last_name: editForm.last_name.trim() || null,
          city: editForm.city.trim() || null,
          postal_code: editForm.postal_code.trim() || null,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      setProfile(prev => prev ? {
        ...prev,
        first_name: editForm.first_name.trim() || null,
        last_name: editForm.last_name.trim() || null,
        city: editForm.city.trim() || null,
        postal_code: editForm.postal_code.trim() || null,
      } : null);
      setIsEditing(false);
      toast({
        title: t("profile.profileUpdated"),
        description: t("profile.profileSaved"),
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: t("common.error"),
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatName = (): string => {
    const parts = [profile?.first_name, profile?.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "";
  };

  const formatLocation = (): string => {
    const parts = [profile?.city, profile?.postal_code].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "";
  };

  const handleProfilePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!isValidImageType(file)) {
      toast({ variant: "destructive", title: "Invalid file type", description: "Please use JPG, PNG, WebP, or HEIC." });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Maximum 50MB." });
      return;
    }

    try {
      const processed = await processImageFile(file, { targetSize: 5 * 1024 * 1024 });
      const url = URL.createObjectURL(processed);
      setCropImageSrc(url);
      setCropDialogOpen(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message || "Could not process image." });
    }
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropDialogOpen(false);
    if (!user) return;
    setUploadingPhoto(true);
    try {
      const ext = "png";
      const storagePath = `${user.id}/profile-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("dog-photos")
        .upload(storagePath, blob, { cacheControl: "3600", upsert: false, contentType: "image/png" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("dog-photos").getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast({ title: "Profile photo updated! 📸" });
    } catch (err: any) {
      console.error("Profile photo upload error:", err);
      toast({ variant: "destructive", title: "Upload failed", description: err.message });
    } finally {
      setUploadingPhoto(false);
      if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc("");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: t("auth.signOut"),
      description: t("auth.seeYouSoon"),
    });
    navigate("/auth");
  };

  const handleArchiveRequest = async (requestId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("care_requests")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", requestId);
      if (error) throw error;
      setMyCareRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, archived_at: new Date().toISOString() } : r)
      );
      toast({
        title: t("profile.archived"),
        description: t("profile.careRequestArchived"),
      });
    } catch (error) {
      console.error("Error archiving request:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: "Failed to archive request.",
      });
    }
  };

  const careTypeLabels: Record<string, string> = {
    walk: `🚶 ${t("care.walk")}`,
    watch: `👀 ${t("care.watch")}`,
    overnight: `🌙 ${t("care.overnight")}`,
    "check-in": `👋 ${t("care.checkIn")}`,
  };


  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />
        <div className="p-4 space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
      </MobileLayout>
    );
  }

  const displayName = profile?.display_name || formatName() || user?.email?.split("@")[0] || "Dog Lover";

  return (
    <MobileLayout>
      <PageHeader 
        title={t("profile.title")} 
        subtitle={t("profile.subtitle")}
        action={
          <div className="flex items-center -space-x-1">
            <Button size="icon" variant="ghost" onClick={() => navigate("/notifications")} className="relative rounded-xl h-9 w-9">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs border-2 border-card"
                >
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Badge>
              )}
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-xl h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px] p-0">
                <SheetHeader className="p-4 pb-2">
                  <SheetTitle>{t("profile.settings")}</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col">
                  <button 
                    className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left"
                    onClick={() => navigate("/settings")}
                  >
                    <Languages className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground">Language Setting</span>
                  </button>
                  <Separator />
                  <button 
                    className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors text-left"
                    onClick={() => setShowArchive(!showArchive)}
                  >
                    <div className="flex items-center gap-3">
                      <Archive className="h-5 w-5 text-muted-foreground" />
                      <span className="text-foreground">{t("profile.archive")}</span>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showArchive ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {showArchive && (
                    <div className="border-t bg-muted/30 p-4 space-y-4">
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          {t("profile.archivedCareRequests")}
                        </h3>
                        {(() => {
                          const archivedRequests = myCareRequests.filter(r => isRequestArchived(r));
                          return archivedRequests.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">{t("profile.noArchivedCareRequests")}</p>
                          ) : (
                            <div className="space-y-2">
                              {archivedRequests.map((request) => {
                                const isOwner = request.owner_id === user?.id;
                                const isAssignedSitter = request.assigned_sitter_id === user?.id;
                                return (
                                  <Card
                                    key={request.id}
                                    className="cursor-pointer hover:border-primary transition-colors opacity-70"
                                    onClick={() => navigate(`/care-request/${request.id}`)}
                                  >
                                    <CardContent className="p-3 flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <HandHeart className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                          <p className="text-sm font-medium text-foreground">
                                            {careTypeLabels[request.care_type]}
                                            {request.dogs?.name && (
                                              <span className="text-muted-foreground font-normal"> - {request.dogs.name}</span>
                                            )}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {request.time_window}
                                            {!isOwner && isAssignedSitter && ` • ${t("profile.youWereTheSitter")}`}
                                          </p>
                                        </div>
                                      </div>
                                      <Badge variant="secondary">{t("common.completed")}</Badge>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          {t("profile.resolvedLostAlerts")}
                        </h3>
                        {archivedLostAlerts.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">{t("profile.noResolvedAlerts")}</p>
                        ) : (
                          <div className="space-y-2">
                            {archivedLostAlerts.map((alert) => (
                              <Card
                                key={alert.id}
                                className="cursor-pointer hover:border-primary transition-colors opacity-70"
                                onClick={() => navigate(`/lost-alert/${alert.id}`)}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-center gap-3">
                                    <AlertTriangle className="h-5 w-5 text-success shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {alert.dogs?.name || "Unknown"} - {t("profile.found")}! ✅
                                      </p>
                                      <div className="text-xs text-muted-foreground space-y-0.5">
                                        <p>{t("profile.lost")}: {format(new Date(alert.created_at), "MMM d, yyyy")}</p>
                                        {alert.resolved_at && (
                                          <p>{t("profile.found")}: {format(new Date(alert.resolved_at), "MMM d, yyyy")}</p>
                                        )}
                                      </div>
                                    </div>
                                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                                      {t("common.resolved")}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  <button
                    className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-5 w-5" />
                    <span>{t("auth.signOut")}</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        }
      />

      <div className="p-4 space-y-4">
        {/* Pending Invites */}
        <PendingInvitesCard onInviteAccepted={fetchData} />

        {/* ═══════════════════════════════════════════════
            PROFILE HEADER CARD
            ═══════════════════════════════════════════════ */}
        <AnimatedItem>
          <GlassCard variant="light" className="overflow-hidden">
            <div className="p-5">
              {/* Avatar + Name row */}
              <div className="flex items-start gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-2 border-border">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full z-10 bg-background border border-input shadow-sm flex items-center justify-center cursor-pointer hover:bg-accent transition-colors">
                    {uploadingPhoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingPhoto}
                      onChange={handleProfilePhotoSelect}
                    />
                  </label>
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <button className="text-left w-full" onClick={() => setIsEditing(!isEditing)}>
                    {profile?.username && (
                      <h2 className="text-xl font-bold text-foreground truncate">{profile.username}</h2>
                    )}
                    <p className="text-sm text-muted-foreground">{displayName}</p>
                    {formatLocation() && (
                      <p className="text-xs text-muted-foreground">{formatLocation()}</p>
                    )}
                  </button>
                  <div className="flex items-center gap-0 -mt-0.5 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                    <button className="hover:text-foreground transition-colors" onClick={() => openFollowList("followers")}>
                      <span className="font-semibold text-foreground">{followerCount}</span> Followers
                    </button>
                    <span className="mx-1">·</span>
                    <button className="hover:text-foreground transition-colors" onClick={() => openFollowList("following")}>
                      <span className="font-semibold text-foreground">{followingCount}</span> Following
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center mt-4 border-t border-b border-border/50 py-3">
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold text-foreground">{postCount}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold text-foreground">{dogs.length}</p>
                  <p className="text-xs text-muted-foreground">Pets</p>
                </div>
                <div className="w-px h-8 bg-border/50" />
                <button 
                  className="flex-1 text-center"
                  onClick={() => setShowCareRequests(!showCareRequests)}
                >
                  <p className="text-lg font-bold text-foreground">{careJobCount}</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-xs text-muted-foreground">Care Jobs</p>
                    <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", showCareRequests && "rotate-180")} />
                  </div>
                </button>
              </div>

              {/* Care requests dropdown */}
              {showCareRequests && (
                <div className="mt-3 space-y-2">
                  {(() => {
                    const activeRequests = myCareRequests.filter(r => !isRequestArchived(r));
                    return activeRequests.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">{t("profile.noCareRequests")}</p>
                    ) : (
                      activeRequests.map((request) => {
                        const isOwner = request.owner_id === user?.id;
                        const isAssignedSitter = request.assigned_sitter_id === user?.id;
                        return (
                          <div
                            key={request.id}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => navigate(`/care-request/${request.id}`)}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <HandHeart className="h-4 w-4 text-primary shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">
                                  {careTypeLabels[request.care_type]}
                                  {request.dogs?.name && <span className="text-muted-foreground font-normal"> - {request.dogs.name}</span>}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">{request.time_window}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge className={cn("text-[10px] px-1.5 py-0", request.assigned_sitter_id ? "bg-primary" : "bg-warning")}>
                                {request.assigned_sitter_id ? t("common.assigned") : t("common.open")}
                              </Badge>
                              <button
                                onClick={(e) => handleArchiveRequest(request.id, e)}
                                className="p-1 rounded-md hover:bg-background transition-colors"
                              >
                                <ArchiveX className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    );
                  })()}
                </div>
              )}


              {/* Edit profile form (inline) */}
              {isEditing && (
                <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="first_name" className="text-xs text-muted-foreground">{t("profile.firstName")}</Label>
                      <Input id="first_name" value={editForm.first_name} onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))} placeholder={t("profile.firstName")} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="last_name" className="text-xs text-muted-foreground">{t("profile.lastName")}</Label>
                      <Input id="last_name" value={editForm.last_name} onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))} placeholder={t("profile.lastName")} className="h-9" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="city" className="text-xs text-muted-foreground">{t("profile.city")}</Label>
                      <Input id="city" value={editForm.city} onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))} placeholder="Seattle" className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="postal_code" className="text-xs text-muted-foreground">{t("profile.postalCode")}</Label>
                      <Input id="postal_code" value={editForm.postal_code} onChange={(e) => setEditForm(prev => ({ ...prev, postal_code: e.target.value }))} placeholder="98125" className="h-9" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveProfile} disabled={saving} className="flex-1" size="sm">
                      {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("profile.saving")}</> : <><Save className="h-4 w-4 mr-2" />{t("profile.saveProfile")}</>}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      setIsEditing(false);
                      setEditForm({ first_name: profile?.first_name || "", last_name: profile?.last_name || "", city: profile?.city || "", postal_code: profile?.postal_code || "", username: profile?.username || "" });
                    }}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </AnimatedItem>

        {/* ═══════════════════════════════════════════════
            MY DOGS SECTION (Collapsible)
            ═══════════════════════════════════════════════ */}
        <AnimatedItem delay={0.1}>
          <section>
            <button
              onClick={() => setShowMyDogs(!showMyDogs)}
              className="w-full flex items-center justify-between mb-3"
            >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("home.myDogs")}
              </h2>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", showMyDogs && "rotate-180")} />
            </button>

            {showMyDogs && (
              <>
                {dogs.length > 0 && activeDog ? (
                  <div className="space-y-3">
                    {dogs.map(dog => (
                      <div key={dog.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
                        onClick={() => navigate(`/dog/${dog.id}`)}
                      >
                        <div className={cn(
                          "h-16 w-16 rounded-2xl overflow-hidden bg-muted flex items-center justify-center shrink-0",
                          dog.is_lost && "ring-2 ring-lost ring-offset-2 ring-offset-card"
                        )}>
                          {dog.photo_url ? (
                            <img src={dog.photo_url} alt={dog.name} className="h-full w-full object-cover" />
                          ) : (
                            <Dog className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground">{dog.name}</h3>
                          <p className="text-sm text-muted-foreground">{dog.breed || t("common.mixedBreed")}</p>
                          {dog.is_lost && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lost/15 text-lost text-xs font-semibold mt-1">
                              🚨 {t("dogs.lostModeActive")}
                            </span>
                          )}
                        </div>
                        <button
                          className={cn(
                            "shrink-0 relative flex items-center h-8 w-[72px] rounded-full border-2 transition-colors duration-300 p-0.5",
                            dog.is_lost
                              ? "bg-lost border-lost/60"
                              : "bg-muted border-border"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectDog(dog.id);
                            if (dog.is_lost) {
                              handleEndLostMode(dog.id);
                            } else {
                              setActiveDogId(dog.id);
                              setLostModeDialogOpen(true);
                            }
                          }}
                        >
                          <span className={cn(
                            "absolute text-[9px] font-bold uppercase tracking-wide transition-opacity duration-200",
                            dog.is_lost ? "opacity-100 right-2.5 text-white" : "opacity-0 right-2.5 text-white"
                          )}>
                            ON
                          </span>
                          <span className={cn(
                            "absolute text-[9px] font-bold uppercase tracking-wide transition-opacity duration-200",
                            !dog.is_lost ? "opacity-100 left-2 text-muted-foreground" : "opacity-0 left-2 text-muted-foreground"
                          )}>
                            OFF
                          </span>
                          <span className={cn(
                            "block h-6 w-8 rounded-full bg-background shadow-md transition-transform duration-300 z-10",
                            dog.is_lost ? "translate-x-[32px]" : "translate-x-0"
                          )} />
                        </button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => navigate("/profile/add-dog")}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      {t("profile.addDog")}
                    </Button>
                  </div>
                ) : (
                  <EmptyState
                    icon={<Dog className="h-10 w-10 text-muted-foreground" />}
                    title={t("home.noDogProfile")}
                    description={t("home.addFurryFriend")}
                    action={{
                      label: t("home.addMyDog"),
                      onClick: () => navigate("/profile/add-dog"),
                    }}
                  />
                )}
              </>
            )}
          </section>
        </AnimatedItem>

        {/* ═══════════════════════════════════════════════
            CONTENT TABS: Posts / Saved / Activity
            ═══════════════════════════════════════════════ */}
        <AnimatedItem delay={0.2}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
              <TabsTrigger
                value="posts"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none py-2.5 text-sm font-medium"
              >
                Posts
              </TabsTrigger>
              <TabsTrigger
                value="saved"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none py-2.5 text-sm font-medium"
              >
                Saved
              </TabsTrigger>
              <TabsTrigger
                value="reposts"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none py-2.5 text-sm font-medium"
              >
                Reposts
              </TabsTrigger>
            </TabsList>

            {/* ── Posts Tab ── */}
            <TabsContent value="posts" className="mt-3">

              {/* Posts list */}
              {postsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-48 w-full rounded-2xl" />
                  <Skeleton className="h-48 w-full rounded-2xl" />
                </div>
              ) : myPosts.length === 0 ? (
                <EmptyState
                  icon={<Grid3X3 className="h-10 w-10 text-muted-foreground" />}
                  title="No posts yet"
                  description="Share your first post with the community!"
                  action={{
                    label: "Create Post",
                    onClick: () => navigate("/create"),
                  }}
                />
              ) : (
                <div className="space-y-4">
                  {myPosts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLikeToggle={handlePostLikeToggle}
                      onRepost={handlePostRepost}
                      onDelete={handlePostDelete}
                      onShare={(p) => setSharePost(p)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Saved Tab ── */}
            <TabsContent value="saved" className="mt-3">
              {savedLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-48 w-full rounded-2xl" />
                  <Skeleton className="h-48 w-full rounded-2xl" />
                </div>
              ) : savedPosts.length === 0 ? (
                <EmptyState
                  icon={<Bookmark className="h-10 w-10 text-muted-foreground" />}
                  title="No saved posts"
                  description="Save posts from the community to view them later"
                />
              ) : (
                <div className="space-y-4">
                  {savedPosts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLikeToggle={handlePostLikeToggle}
                      onRepost={handlePostRepost}
                      onDelete={handlePostDelete}
                      onShare={(p) => setSharePost(p)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Reposts Tab ── */}
            <TabsContent value="reposts" className="mt-3">
              {repostsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-48 w-full rounded-2xl" />
                  <Skeleton className="h-48 w-full rounded-2xl" />
                </div>
              ) : myReposts.length === 0 ? (
                <EmptyState
                  icon={<Repeat2 className="h-10 w-10 text-muted-foreground" />}
                  title="No reposts yet"
                  description="Repost content from the community to share it with your followers"
                />
              ) : (
                <div className="space-y-4">
                  {myReposts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onLikeToggle={handlePostLikeToggle}
                      onRepost={handlePostRepost}
                      onDelete={handlePostDelete}
                      onShare={(p) => setSharePost(p)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </AnimatedItem>

        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>RedPaw v1.0.0 🐾</p>
          <p className="mt-1">{t("profile.madeWithLove")}</p>
        </div>
      </div>

      {/* Lost mode dialog */}
      {activeDog && (
        <LostModeDialog
          open={lostModeDialogOpen}
          onOpenChange={setLostModeDialogOpen}
          dog={{
            id: activeDog.id,
            name: activeDog.name,
            breed: activeDog.breed,
            photo_url: activeDog.photo_url,
          }}
          onSuccess={handleLostModeSuccess}
        />
      )}

      <UsernameSetupDialog
        open={showUsernameSetup}
        onComplete={(username) => {
          setShowUsernameSetup(false);
          setProfile(prev => prev ? { ...prev, username } : null);
          setEditForm(prev => ({ ...prev, username }));
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleProfilePhotoSelect}
      />

      <ProfilePhotoCropDialog
        open={cropDialogOpen}
        imageSrc={cropImageSrc}
        onConfirm={handleCropConfirm}
        onCancel={() => {
          setCropDialogOpen(false);
          if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
          setCropImageSrc("");
        }}
      />

      {sharePost && (
        <SendPostSheet
          open={!!sharePost}
          onOpenChange={(open) => { if (!open) setSharePost(null); }}
          postId={sharePost.id}
          postCaption={sharePost.caption}
          postPhotoUrl={sharePost.photo_url}
          postPhotoUrls={sharePost.photo_urls}
          postAuthorName={
            sharePost.author?.username ? `@${sharePost.author.username}` : sharePost.author?.display_name || null
          }
        />
      )}

      {/* Followers / Following Sheet */}
      <Sheet open={!!showFollowList} onOpenChange={(open) => { if (!open) setShowFollowList(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle>
              {showFollowList === "followers" ? "Followers" : "Following"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-3 max-h-[55vh] overflow-y-auto space-y-1">
            {followListLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : followListUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {showFollowList === "followers" ? "No followers yet" : "Not following anyone yet"}
              </p>
            ) : (
              followListUsers.map((u) => {
                const name = u.username ? `@${u.username}` : u.display_name || "User";
                return (
                  <button
                    key={u.user_id}
                    onClick={() => { setShowFollowList(null); navigate(`/user/${u.user_id}`); }}
                    className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-sm font-medium text-foreground block truncate">{name}</span>
                      {u.username && u.display_name && (
                        <span className="text-xs text-muted-foreground block truncate">{u.display_name}</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </MobileLayout>
  );
}
