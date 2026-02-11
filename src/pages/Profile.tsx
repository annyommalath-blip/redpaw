import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom"; 
import { User, Dog, Settings, LogOut, Edit, Camera, HandHeart, Loader2, Plus, Save, MapPin, Archive, ChevronRight, ArchiveX, AlertTriangle, Syringe, PlusCircle, Bell, ChevronDown, AtSign } from "lucide-react";

import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/glass-card";
import { Skeleton } from "@/components/ui/skeleton";
import { DogSelector } from "@/components/dog/DogSelector";
import { DogCard } from "@/components/dog/DogCard";
import { QuickActions } from "@/components/dog/QuickActions";
import { HealthLogCard } from "@/components/dog/HealthLogCard";
import { MedRecordCardReadOnly } from "@/components/med/MedRecordCardReadOnly";
import { ExpirationNotices } from "@/components/med/ExpirationNotices";
import { LostModeDialog } from "@/components/dog/LostModeDialog";
import { MedRecordEditDialog } from "@/components/med/MedRecordEditDialog";
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
import { enrichRecordWithStatus, MedRecordWithStatus } from "@/lib/medRecordUtils";
import { checkMedicationNotifications } from "@/lib/notificationUtils";
import UsernameSetupDialog from "@/components/UsernameSetupDialog";

const ACTIVE_DOG_STORAGE_KEY = "redpaw_active_dog_id";

interface UserDog {
  id: string;
  name: string;
  breed: string | null;
  photo_url: string | null;
  is_lost: boolean;
}

interface HealthLog {
  id: string;
  dog_id: string;
  log_type: "walk" | "food" | "meds" | "mood" | "symptom";
  value: string | null;
  created_at: string;
}

interface OwnerProfile {
  display_name: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  postal_code: string | null;
  username: string | null;
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
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [medRecords, setMedRecords] = useState<MedRecordWithStatus[]>([]);
  const [myCareRequests, setMyCareRequests] = useState<MyCareRequest[]>([]);
  const [archivedLostAlerts, setArchivedLostAlerts] = useState<ArchivedLostAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [lostModeDialogOpen, setLostModeDialogOpen] = useState(false);
  const [editingMedRecord, setEditingMedRecord] = useState<MedRecordWithStatus | null>(null);
  const [deletingMedRecord, setDeletingMedRecord] = useState<MedRecordWithStatus | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [showOwnerProfile, setShowOwnerProfile] = useState(false);
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

  const activeDog = dogs.find(d => d.id === activeDogId) || null;
  const filteredLogs = logs.filter(l => l.dog_id === activeDogId);
  const filteredMedRecords = medRecords.filter(r => r.dog_id === activeDogId);

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

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, first_name, last_name, city, postal_code, username")
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

      if (uniqueDogs.length > 0) {
        const dogIds = uniqueDogs.map((d) => d.id);
        const [logsResult, medResult] = await Promise.all([
          supabase
            .from("health_logs")
            .select("id, dog_id, log_type, value, created_at")
            .in("dog_id", dogIds)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("med_records")
            .select("*")
            .in("dog_id", dogIds)
            .order("expires_on", { ascending: true }),
        ]);
        setLogs((logsResult.data || []) as HealthLog[]);
        const enrichedRecords = (medResult.data || []).map((r) =>
          enrichRecordWithStatus(r as any)
        );
        setMedRecords(enrichedRecords);
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

      const { data: resolvedAlerts } = await supabase
        .from("lost_alerts")
        .select("id, title, created_at, resolved_at, dogs (name, breed)")
        .eq("owner_id", user.id)
        .eq("status", "resolved")
        .order("resolved_at", { ascending: false });

      setArchivedLostAlerts((resolvedAlerts as any) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
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

  const handleDeleteMedRecord = async () => {
    if (!deletingMedRecord) return;
    try {
      const { error } = await supabase
        .from("med_records")
        .delete()
        .eq("id", deletingMedRecord.id);
      if (error) throw error;
      setMedRecords((prev) => prev.filter((r) => r.id !== deletingMedRecord.id));
      toast({ title: t("home.recordDeleted") });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setDeletingMedRecord(null);
    }
  };

  const handleMedRecordUpdated = () => {
    fetchData();
    setEditingMedRecord(null);
  };

  const handleDeleteLog = async () => {
    if (!deletingLogId) return;
    try {
      const { error } = await supabase
        .from("health_logs")
        .delete()
        .eq("id", deletingLogId);
      if (error) throw error;
      setLogs((prev) => prev.filter((l) => l.id !== deletingLogId));
      toast({ title: t("home.logDeleted") });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setDeletingLogId(null);
    }
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

  return (
    <MobileLayout>
      <PageHeader 
        title={t("profile.title")} 
        subtitle={t("profile.subtitle")}
        action={
          <Button size="icon" variant="ghost" onClick={() => navigate("/notifications")} className="relative rounded-xl">
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
        }
      />

      <div className="p-4 space-y-6">
        {/* Pending Invites */}
        <AnimatedItem>
          <PendingInvitesCard onInviteAccepted={fetchData} />
        </AnimatedItem>

        {/* Owner Profile (Collapsible) */}
        <AnimatedItem delay={0.05}>
          <section>
            <button
              onClick={() => setShowOwnerProfile(!showOwnerProfile)}
              className="w-full flex items-center justify-between px-4 py-3 glass-card rounded-2xl hover:bg-white/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">
                    {profile?.display_name || user?.email?.split("@")[0] || t("profile.ownerProfile")}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("profile.viewOwnerProfile")}</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${showOwnerProfile ? "rotate-180" : ""}`} />
            </button>

            {showOwnerProfile && (
              <GlassCard variant="light" className="mt-3">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={profile?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <User className="h-8 w-8" />
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        size="icon"
                        variant="outline"
                        className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                      >
                        <Camera className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold text-foreground">
                        {profile?.display_name || user?.email?.split("@")[0] || "Dog Lover"}
                      </h2>
                      {profile?.username && (
                        <p className="text-sm text-primary font-medium">@{profile.username}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>

                  <Separator />

                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="first_name" className="text-xs text-muted-foreground">
                            {t("profile.firstName")}
                          </Label>
                          <Input
                            id="first_name"
                            value={editForm.first_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                            placeholder={t("profile.firstName")}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="last_name" className="text-xs text-muted-foreground">
                            {t("profile.lastName")}
                          </Label>
                          <Input
                            id="last_name"
                            value={editForm.last_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                            placeholder={t("profile.lastName")}
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="city" className="text-xs text-muted-foreground">
                            {t("profile.city")}
                          </Label>
                          <Input
                            id="city"
                            value={editForm.city}
                            onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="Seattle"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="postal_code" className="text-xs text-muted-foreground">
                            {t("profile.postalCode")}
                          </Label>
                          <Input
                            id="postal_code"
                            value={editForm.postal_code}
                            onChange={(e) => setEditForm(prev => ({ ...prev, postal_code: e.target.value }))}
                            placeholder="98125"
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveProfile} disabled={saving} className="flex-1" size="sm">
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {t("profile.saving")}
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              {t("profile.saveProfile")}
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditing(false);
                            setEditForm({
                              first_name: profile?.first_name || "",
                              last_name: profile?.last_name || "",
                              city: profile?.city || "",
                              postal_code: profile?.postal_code || "",
                              username: profile?.username || "",
                            });
                          }}
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {profile?.username && (
                        <div className="flex items-center gap-2">
                          <AtSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <span className="text-muted-foreground">Username: </span>
                            <span className="font-medium text-primary">@{profile.username}</span>
                          </span>
                        </div>
                      )}
                      {formatName() && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <span className="text-muted-foreground">{t("profile.name")}: </span>
                            <span className="font-medium text-foreground">{formatName()}</span>
                          </span>
                        </div>
                      )}
                      {formatLocation() && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <span className="text-muted-foreground">{t("profile.location")}: </span>
                            <span className="font-medium text-foreground">{formatLocation()}</span>
                          </span>
                        </div>
                      )}
                      {dogs.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Dog className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <span className="text-sm text-muted-foreground">{t("profile.ownerOf")}: </span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {dogs.map((dog) => (
                                <span
                                  key={dog.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                                >
                                  {dog.name} {dog.breed ? `(${dog.breed})` : ""}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {!formatName() && !formatLocation() && (
                        <p className="text-sm text-muted-foreground italic">{t("profile.editHint")}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </GlassCard>
            )}
          </section>
        </AnimatedItem>

        {/* Expiration Notices */}
        {activeDog && (
          <AnimatedItem delay={0.1}>
            <ExpirationNotices records={filteredMedRecords} />
          </AnimatedItem>
        )}

        {/* My Dogs Section with Dog Management */}
        {dogs.length > 0 && activeDog ? (
          <>
            <AnimatedItem delay={0.15}>
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="section-header">
                    {dogs.length > 1 ? t("home.myDogs") : t("home.myDog")}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/profile/add-dog")} className="text-primary rounded-xl">
                    <Plus className="h-4 w-4 mr-1" />
                    {t("profile.addDog")}
                  </Button>
                </div>
                
                {dogs.length > 1 ? (
                  <DogSelector
                    dogs={dogs}
                    activeDogId={activeDogId!}
                    onSelectDog={handleSelectDog}
                  />
                ) : (
                  <DogCard
                    name={activeDog.name}
                    breed={activeDog.breed || t("common.mixedBreed")}
                    photoUrl={activeDog.photo_url || ""}
                    isLost={activeDog.is_lost}
                    onLostToggle={() => handleLostModeToggle(activeDog.id, activeDog.is_lost)}
                    onClick={() => navigate(`/dog/${activeDog.id}`)}
                  />
                )}
              </section>
            </AnimatedItem>

            {dogs.length > 1 && (
              <AnimatedItem delay={0.2}>
                <section>
                  <DogCard
                    name={activeDog.name}
                    breed={activeDog.breed || t("common.mixedBreed")}
                    photoUrl={activeDog.photo_url || ""}
                    isLost={activeDog.is_lost}
                    onLostToggle={() => handleLostModeToggle(activeDog.id, activeDog.is_lost)}
                    onClick={() => navigate(`/dog/${activeDog.id}`)}
                  />
                </section>
              </AnimatedItem>
            )}

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

            <AnimatedItem delay={0.25}>
              <section>
                <h2 className="section-header mb-3">{t("profile.quickActions")}</h2>
                <QuickActions
                  dogId={activeDog.id}
                  isLost={activeDog.is_lost}
                  onToggleLost={() => handleLostModeToggle(activeDog.id, activeDog.is_lost)}
                />
              </section>
            </AnimatedItem>

            <AnimatedItem delay={0.3}>
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="section-header flex items-center gap-2">
                    <Syringe className="h-4 w-4" />
                    {t("profile.medicationRecords")}
                  </h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate("/create?type=meds")}
                    className="text-primary rounded-xl"
                  >
                    {t("common.add")}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                {filteredMedRecords.length > 0 ? (
                  <div className="space-y-3">
                    {filteredMedRecords.map((record) => (
                      <MedRecordCardReadOnly
                        key={record.id}
                        record={record}
                        onEdit={setEditingMedRecord}
                        onDelete={setDeletingMedRecord}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-2xl">
                    {t("profile.noMedRecordsYet")}
                  </p>
                )}
              </section>
            </AnimatedItem>

            <AnimatedItem delay={0.35}>
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="section-header">{t("profile.recentLogs")}</h2>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/create?type=log")} className="text-primary rounded-xl">
                    <PlusCircle className="h-4 w-4 mr-1" />
                    {t("common.add")}
                  </Button>
                </div>
                {filteredLogs.length > 0 ? (
                  <div className="space-y-3">
                    {filteredLogs.slice(0, 5).map((log) => (
                      <HealthLogCard
                        key={log.id}
                        id={log.id}
                        type={log.log_type}
                        value={log.value || ""}
                        createdAt={new Date(log.created_at)}
                        onDelete={setDeletingLogId}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-2xl">
                    {t("profile.noHealthLogsYet")}
                  </p>
                )}
              </section>
            </AnimatedItem>
          </>
        ) : (
          <AnimatedItem delay={0.15}>
            <EmptyState
              icon={<Dog className="h-10 w-10 text-muted-foreground" />}
              title={t("home.noDogProfile")}
              description={t("home.addFurryFriend")}
              action={{
                label: t("home.addMyDog"),
                onClick: () => navigate("/profile/add-dog"),
              }}
            />
          </AnimatedItem>
        )}

        {/* My Care Requests */}
        <AnimatedItem delay={0.4}>
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("profile.myCareRequests")}
              </h2>
            </div>
            {(() => {
              const activeRequests = myCareRequests.filter(r => !isRequestArchived(r));
              return activeRequests.length === 0 ? (
                <GlassCard variant="light">
                  <CardContent className="p-4 text-center text-muted-foreground">
                    <p>{t("profile.noCareRequests")}</p>
                  </CardContent>
                </GlassCard>
              ) : (
                <div className="space-y-2">
                  {activeRequests.map((request) => {
                    const isOwner = request.owner_id === user?.id;
                    const isAssignedSitter = request.assigned_sitter_id === user?.id;
                    return (
                      <GlassCard
                        key={request.id}
                        variant="light"
                        hover
                        className="cursor-pointer"
                        onClick={() => navigate(`/care-request/${request.id}`)}
                      >
                        <CardContent className="p-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <HandHeart className="h-5 w-5 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {careTypeLabels[request.care_type]}
                                {request.dogs?.name && (
                                  <span className="text-muted-foreground font-normal"> - {request.dogs.name}</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {request.time_window}
                                {!isOwner && isAssignedSitter && ` • ${t("profile.youreTheSitter")}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={request.assigned_sitter_id ? "bg-primary" : "bg-warning"}>
                              {request.assigned_sitter_id ? t("common.assigned") : t("common.open")}
                            </Badge>
                            <button
                              onClick={(e) => handleArchiveRequest(request.id, e)}
                              className="p-1.5 rounded-md hover:bg-muted transition-colors"
                              title={t("profile.archive")}
                            >
                              <ArchiveX className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </div>
                        </CardContent>
                      </GlassCard>
                    );
                  })}
                </div>
              );
            })()}
          </section>
        </AnimatedItem>

        {/* Settings */}
        <AnimatedItem delay={0.45}>
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t("profile.settings")}
            </h2>
            <GlassCard variant="light">
              <CardContent className="p-0">
                <button 
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left rounded-t-2xl"
                  onClick={() => navigate("/settings")}
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span className="text-foreground">{t("profile.appSettings")}</span>
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
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left text-destructive rounded-b-2xl"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                  <span>{t("auth.signOut")}</span>
                </button>
              </CardContent>
            </GlassCard>
          </section>
        </AnimatedItem>

        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>RedPaw v1.0.0 🐾</p>
          <p className="mt-1">{t("profile.madeWithLove")}</p>
        </div>
      </div>

      <MedRecordEditDialog
        record={editingMedRecord}
        open={!!editingMedRecord}
        onOpenChange={(open) => !open && setEditingMedRecord(null)}
        onSuccess={handleMedRecordUpdated}
      />

      <AlertDialog open={!!deletingMedRecord} onOpenChange={(open) => !open && setDeletingMedRecord(null)}>
        <AlertDialogContent className="glass-card-modal rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("home.deleteRecord")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("home.deleteRecordConfirm", { name: deletingMedRecord?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMedRecord} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingLogId} onOpenChange={(open) => !open && setDeletingLogId(null)}>
        <AlertDialogContent className="glass-card-modal rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("home.deleteLog")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("home.deleteLogConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLog} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <UsernameSetupDialog
        open={showUsernameSetup}
        onComplete={(username) => {
          setShowUsernameSetup(false);
          setProfile(prev => prev ? { ...prev, username } : null);
          setEditForm(prev => ({ ...prev, username }));
        }}
      />
    </MobileLayout>
  );
}
