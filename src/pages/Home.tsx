import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Dog, PlusCircle, Loader2, Syringe, ChevronRight, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { DogSelector } from "@/components/dog/DogSelector";
import { DogCard } from "@/components/dog/DogCard";
import { QuickActions } from "@/components/dog/QuickActions";
import { HealthLogCard } from "@/components/dog/HealthLogCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MedRecordCardReadOnly } from "@/components/med/MedRecordCardReadOnly";
import { ExpirationNotices } from "@/components/med/ExpirationNotices";
import { LostModeDialog } from "@/components/dog/LostModeDialog";
import { MedRecordEditDialog } from "@/components/med/MedRecordEditDialog";
import { PendingInvitesCard } from "@/components/dog/PendingInvitesCard";
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

interface MedRecordRaw {
  id: string;
  dog_id: string;
  name: string;
  record_type: "vaccine" | "medication";
  date_given: string;
  expires_on: string;
  duration_value: number;
  duration_unit: "days" | "months" | "years";
  notes: string | null;
}

export default function HomePage() {
  const { t } = useTranslation();
  const [dogs, setDogs] = useState<UserDog[]>([]);
  const [activeDogId, setActiveDogId] = useState<string | null>(null);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [medRecords, setMedRecords] = useState<MedRecordWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lostModeDialogOpen, setLostModeDialogOpen] = useState(false);
  
  // Edit/Delete states
  const [editingMedRecord, setEditingMedRecord] = useState<MedRecordWithStatus | null>(null);
  const [deletingMedRecord, setDeletingMedRecord] = useState<MedRecordWithStatus | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { unreadCount: notificationCount } = useNotifications();

  // Get the active dog object
  const activeDog = dogs.find(d => d.id === activeDogId) || null;

  // Filter logs and med records by active dog
  const filteredLogs = logs.filter(l => l.dog_id === activeDogId);
  const filteredMedRecords = medRecords.filter(r => r.dog_id === activeDogId);

  // Handle dog selection with localStorage persistence
  const handleSelectDog = useCallback((dogId: string) => {
    setActiveDogId(dogId);
    localStorage.setItem(ACTIVE_DOG_STORAGE_KEY, dogId);
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
      // Check for medication notifications on app open
      checkMedicationNotifications(user.id);
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch dogs the user owns
      const { data: ownedDogs } = await supabase
        .from("dogs")
        .select("id, name, breed, photo_url, is_lost")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });

      // Fetch dogs where user is an active co-parent
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

      // Combine and dedupe (user could be both owner and co-parent theoretically)
      const allDogs = [...(ownedDogs || []), ...coParentedDogs];
      const uniqueDogs = allDogs.filter(
        (dog, index, self) => self.findIndex((d) => d.id === dog.id) === index
      );
      
      setDogs(uniqueDogs);

      // Determine active dog
      if (uniqueDogs.length > 0) {
        const savedDogId = localStorage.getItem(ACTIVE_DOG_STORAGE_KEY);
        const savedDogExists = uniqueDogs.some(d => d.id === savedDogId);
        
        if (savedDogId && savedDogExists) {
          setActiveDogId(savedDogId);
        } else {
          // Default to first dog
          setActiveDogId(uniqueDogs[0].id);
          localStorage.setItem(ACTIVE_DOG_STORAGE_KEY, uniqueDogs[0].id);
        }
      }

      // Fetch all health logs and med records for all accessible dogs
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

  // Med Record handlers
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

  // Health Log handlers
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

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title={t("home.title")} subtitle={t("home.subtitle")} />
        <div className="p-4 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader
        title={t("home.title")}
        subtitle={t("home.subtitle")}
        action={
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => navigate("/notifications")} className="relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
                >
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Badge>
              )}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => navigate("/profile")}>
              <Dog className="h-5 w-5" />
            </Button>
          </div>
        }
      />

      <div className="p-4 space-y-6">
        {/* Pending Invites */}
        <PendingInvitesCard onInviteAccepted={fetchData} />

        {dogs.length > 0 && activeDog ? (
          <>
            {/* Expiration Notices for active dog */}
            <ExpirationNotices records={filteredMedRecords} />

            {/* My Dogs Section */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {dogs.length > 1 ? t("home.myDogs") : t("home.myDog")}
              </h2>
              
              {dogs.length > 1 ? (
                // Multiple dogs: show horizontal selector
                <DogSelector
                  dogs={dogs}
                  activeDogId={activeDogId!}
                  onSelectDog={handleSelectDog}
                />
              ) : (
                // Single dog: show full card
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

            {/* Active Dog Card (shown when multiple dogs) */}
            {dogs.length > 1 && (
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
            )}

            {/* Lost Mode Dialog */}
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

            {/* Quick Actions */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {t("home.quickActions")}
              </h2>
              <QuickActions
                dogId={activeDog.id}
                isLost={activeDog.is_lost}
                onToggleLost={() => handleLostModeToggle(activeDog.id, activeDog.is_lost)}
              />
            </section>

            {/* Medication Records for active dog */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Syringe className="h-4 w-4" />
                  {t("home.medicationRecords")}
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate("/create?type=meds")}
                  className="text-muted-foreground"
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
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("home.noMedRecordsYet")}
                </p>
              )}
            </section>

            {/* Recent Logs for active dog */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("home.recentLogs")}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => navigate("/create?type=log")}>
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
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("home.noHealthLogsYet")}
                </p>
              )}
            </section>
          </>
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
      </div>

      {/* Edit Med Record Dialog */}
      <MedRecordEditDialog
        record={editingMedRecord}
        open={!!editingMedRecord}
        onOpenChange={(open) => !open && setEditingMedRecord(null)}
        onSuccess={handleMedRecordUpdated}
      />

      {/* Delete Med Record Confirmation */}
      <AlertDialog open={!!deletingMedRecord} onOpenChange={(open) => !open && setDeletingMedRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("home.deleteRecord")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("home.deleteRecordConfirm", { name: deletingMedRecord?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMedRecord} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Log Confirmation */}
      <AlertDialog open={!!deletingLogId} onOpenChange={(open) => !open && setDeletingLogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("home.deleteLog")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("home.deleteLogConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLog} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
}
